/*
  NEXUS Core — Self-Healing System Monitor
  Circuit breaker + traffic intelligence + auto-recovery.
  No dependencies outside Node stdlib.
*/

export interface EndpointStats {
  endpoint: string;
  totalRequests: number;
  errorCount: number;
  recentErrors: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  circuitState: "closed" | "open" | "half-open";
  circuitOpenAt?: number;
  lastErrorMsg?: string;
  lastErrorAt?: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  uptimeSec: number;
  totalRequests: number;
  globalErrorRate: number;
  avgLatencyMs: number;
  endpoints: EndpointStats[];
  healingEvents: HealingEvent[];
}

export interface HealingEvent {
  at: number;
  endpoint: string;
  action: "circuit_opened" | "circuit_closed" | "half_open_probe" | "auto_healed";
  detail: string;
}

export interface TrafficPattern {
  hourlyBuckets: number[];
  currentRpm: number;
  peakHour: number;
  valleyHour: number;
  recommendedCacheTtlSec: number;
  loadLevel: "low" | "medium" | "high";
}

const CIRCUIT_OPEN_ERRORS = 5;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_HALF_OPEN_MS = 30_000;

interface EndpointRecord {
  total: number;
  errors: number;
  recentErrorTimes: number[];
  latencies: number[];
  circuit: "closed" | "open" | "half-open";
  circuitOpenAt?: number;
  lastErrorMsg?: string;
  lastErrorAt?: number;
}

class SystemMonitorImpl {
  private readonly map = new Map<string, EndpointRecord>();
  private readonly hourly = new Array<number>(24).fill(0);
  private readonly recentTimes: number[] = [];
  private readonly events: HealingEvent[] = [];
  private readonly startedAt = Date.now();

  private get(endpoint: string): EndpointRecord {
    if (!this.map.has(endpoint)) {
      this.map.set(endpoint, {
        total: 0, errors: 0, recentErrorTimes: [],
        latencies: [], circuit: "closed",
      });
    }
    return this.map.get(endpoint)!;
  }

  record(endpoint: string, statusCode: number, latencyMs: number): void {
    const r = this.get(endpoint);
    const now = Date.now();

    r.total++;
    r.latencies.push(latencyMs);
    if (r.latencies.length > 200) r.latencies.shift();

    this.hourly[new Date().getUTCHours()]++;
    this.recentTimes.push(now);

    if (statusCode >= 500) {
      r.errors++;
      r.recentErrorTimes.push(now);
      r.lastErrorAt = now;
      r.lastErrorMsg = `HTTP ${statusCode}`;
      const cutoff = now - CIRCUIT_WINDOW_MS;
      r.recentErrorTimes = r.recentErrorTimes.filter(t => t > cutoff);

      if (r.circuit === "closed" && r.recentErrorTimes.length >= CIRCUIT_OPEN_ERRORS) {
        r.circuit = "open";
        r.circuitOpenAt = now;
        this.emit(endpoint, "circuit_opened",
          `${r.recentErrorTimes.length} errors/${Math.round(CIRCUIT_WINDOW_MS / 1000)}s`);
      }
    } else if (r.circuit === "half-open") {
      r.circuit = "closed";
      r.recentErrorTimes = [];
      this.emit(endpoint, "auto_healed", "Half-open probe succeeded — circuit closed");
    }

    if (r.circuit === "open" && r.circuitOpenAt &&
        now - r.circuitOpenAt >= CIRCUIT_HALF_OPEN_MS) {
      r.circuit = "half-open";
      this.emit(endpoint, "half_open_probe", "30s elapsed — probe request allowed");
    }
  }

  isOpen(endpoint: string): boolean {
    const r = this.map.get(endpoint);
    if (!r) return false;
    const now = Date.now();
    if (r.circuit === "open" && r.circuitOpenAt &&
        now - r.circuitOpenAt >= CIRCUIT_HALF_OPEN_MS) {
      r.circuit = "half-open";
      this.emit(endpoint, "half_open_probe", "Half-open probe via isOpen check");
    }
    return r.circuit === "open";
  }

  resetCircuit(endpoint: string): void {
    const r = this.map.get(endpoint);
    if (r) {
      r.circuit = "closed";
      r.recentErrorTimes = [];
      this.emit(endpoint, "circuit_closed", "Admin manual reset");
    }
  }

  health(): SystemHealth {
    const now = Date.now();
    const endpoints: EndpointStats[] = Array.from(this.map.entries()).map(([ep, r]) => {
      const s = [...r.latencies].sort((a, b) => a - b);
      const avg = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
      const p95 = s[Math.floor(s.length * 0.95)] ?? 0;
      if (r.circuit === "open" && r.circuitOpenAt &&
          now - r.circuitOpenAt >= CIRCUIT_HALF_OPEN_MS) {
        r.circuit = "half-open";
      }
      return {
        endpoint: ep, totalRequests: r.total, errorCount: r.errors,
        recentErrors: r.recentErrorTimes.filter(t => t > now - CIRCUIT_WINDOW_MS).length,
        avgLatencyMs: Math.round(avg), maxLatencyMs: s[s.length - 1] ?? 0, p95LatencyMs: p95,
        circuitState: r.circuit, circuitOpenAt: r.circuitOpenAt,
        lastErrorMsg: r.lastErrorMsg, lastErrorAt: r.lastErrorAt,
      };
    });

    const total = endpoints.reduce((a, s) => a + s.totalRequests, 0) || 1;
    const errs = endpoints.reduce((a, s) => a + s.errorCount, 0);
    const errorRate = errs / total;
    const avgLat = endpoints.length
      ? endpoints.reduce((a, s) => a + s.avgLatencyMs, 0) / endpoints.length : 0;
    const open = endpoints.filter(s => s.circuitState === "open").length;

    return {
      status: open > 2 || errorRate > 0.3 ? "critical"
            : open > 0 || errorRate > 0.1 ? "degraded"
            : "healthy",
      uptimeSec: Math.round((now - this.startedAt) / 1000),
      totalRequests: total,
      globalErrorRate: Math.round(errorRate * 1000) / 10,
      avgLatencyMs: Math.round(avgLat),
      endpoints: endpoints.sort((a, b) => b.recentErrors - a.recentErrors),
      healingEvents: this.events.slice(-50),
    };
  }

  traffic(): TrafficPattern {
    const now = Date.now();
    const cutoff = now - 5 * 60_000;
    while (this.recentTimes.length && this.recentTimes[0]! < cutoff) this.recentTimes.shift();
    const rpm = this.recentTimes.length / 5;
    const max = Math.max(...this.hourly, 1);
    const min = Math.min(...this.hourly.filter(v => v > 0), max);
    const peakHour = this.hourly.indexOf(max);
    const valleyHour = this.hourly.indexOf(min);
    const loadRatio = Math.min(rpm / Math.max(max / 60, 1), 1);
    return {
      hourlyBuckets: [...this.hourly],
      currentRpm: Math.round(rpm),
      peakHour,
      valleyHour,
      recommendedCacheTtlSec: Math.round(300 * (1 - loadRatio * 0.8)),
      loadLevel: loadRatio > 0.7 ? "high" : loadRatio > 0.3 ? "medium" : "low",
    };
  }

  private emit(endpoint: string, action: HealingEvent["action"], detail: string) {
    this.events.push({ at: Date.now(), endpoint, action, detail });
    if (this.events.length > 500) this.events.shift();
  }
}

export const systemMonitor = new SystemMonitorImpl();

/* ─── Normalise URL path for circuit-breaker key ────────────── */
export function normalisePath(method: string, path: string): string {
  return `${method} ${path.replace(/\/\d+/g, "/:id").replace(/\?.*/, "")}`;
}
