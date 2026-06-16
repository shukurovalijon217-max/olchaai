export interface FrameStats {
  fps: number;
  frameTime: number;
  totalFrames: number;
  dropped: number;
}

export type FrameCallback = (delta: number, stats: FrameStats) => void;

const TARGET_FPS = 60;
const FRAME_BUDGET = 1000 / TARGET_FPS;
const HISTORY_SIZE = 60;

export class FrameOptimizer {
  private rafId: number | null = null;
  private lastTime = 0;
  private frameHistory: number[] = [];
  private totalFrames = 0;
  private dropped = 0;
  private callback: FrameCallback | null = null;
  private running = false;

  get stats(): FrameStats {
    const avg =
      this.frameHistory.length > 0
        ? this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
        : FRAME_BUDGET;
    return {
      fps: Math.round(1000 / avg),
      frameTime: Math.round(avg * 10) / 10,
      totalFrames: this.totalFrames,
      dropped: this.dropped,
    };
  }

  start(callback: FrameCallback) {
    if (this.running) return;
    this.callback = callback;
    this.running = true;
    this.lastTime = performance.now();
    this.schedule();
  }

  private schedule() {
    this.rafId = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number) {
    if (!this.running || !this.callback) return;

    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameHistory.push(delta);
    if (this.frameHistory.length > HISTORY_SIZE) this.frameHistory.shift();

    this.totalFrames++;

    if (delta > FRAME_BUDGET * 2.5) {
      this.dropped++;
    }

    this.callback(Math.min(delta, 50), this.stats);
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callback = null;
  }

  reset() {
    this.frameHistory = [];
    this.totalFrames = 0;
    this.dropped = 0;
    this.lastTime = performance.now();
  }
}
