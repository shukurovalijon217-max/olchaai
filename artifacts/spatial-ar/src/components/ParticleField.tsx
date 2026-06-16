import { useRef, useEffect } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string;
  type: "dust" | "spark" | "rain" | "data";
  trail: Array<[number, number]>;
  life: number; maxLife: number;
}

const PALETTE = ["#00e5ff", "#00e5ff", "#00e5ff", "#00c4d4", "#ff00ff", "#a78bfa", "#ffffff", "#00e5ff"];

function rand(min: number, max: number) { return min + Math.random() * (max - min); }

function spawn(w: number, h: number): Particle {
  const roll = Math.random();
  const type: Particle["type"] = roll < 0.55 ? "dust" : roll < 0.78 ? "spark" : roll < 0.92 ? "rain" : "data";
  return {
    x: type === "rain" || type === "data" ? rand(0, w) : rand(0, w),
    y: (type === "rain" || type === "data") ? rand(-20, 0) : rand(0, h),
    vx: type === "spark" ? rand(-2, 2) : type === "rain" ? rand(-0.3, 0.3) : rand(-0.3, 0.3),
    vy: (type === "rain" || type === "data") ? rand(1.2, 3.5) : rand(-1.2, -0.2),
    size: type === "rain" ? rand(1, 2) : type === "data" ? rand(2, 3) : type === "spark" ? rand(1, 2.5) : rand(0.5, 1.2),
    opacity: type === "dust" ? rand(0.1, 0.4) : rand(0.3, 0.9),
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    type,
    trail: [],
    life: 0,
    maxLife: rand(80, 240),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function dataChar(): string {
  const chars = "01アイウエオカキクケコ▲△◈◉◎●";
  return chars[Math.floor(Math.random() * chars.length)];
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();

    const N = Math.min(200, Math.floor(window.innerWidth * window.innerHeight / 8000));
    const particles: Particle[] = Array.from({ length: N }, () => spawn(canvas!.width, canvas!.height));
    const dataChars = new Map<Particle, string>();

    let raf = 0;

    function draw() {
      const W = canvas!.width, H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      // ── Grid lines ──
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,229,255,0.028)";
      for (let x = 0; x < W; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── Horizon glow ──
      const horizY = H * 0.55;
      const hg = ctx.createLinearGradient(0, horizY - 60, 0, horizY + 60);
      hg.addColorStop(0, "transparent");
      hg.addColorStop(0.5, "rgba(0,229,255,0.018)");
      hg.addColorStop(1, "transparent");
      ctx.fillStyle = hg;
      ctx.fillRect(0, horizY - 60, W, 120);

      // ── Particles ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        if (p.type === "spark" || p.type === "data") {
          p.trail.push([p.x, p.y]);
          if (p.trail.length > (p.type === "data" ? 14 : 7)) p.trail.shift();
        }

        p.x += p.vx;
        p.y += p.vy;

        const dead = p.life > p.maxLife || p.y < -30 || p.y > H + 30 || p.x < -30 || p.x > W + 30;
        if (dead) {
          particles[i] = spawn(W, H);
          dataChars.delete(p);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(p.life / 25, 1);
        const fadeOut = Math.min((p.maxLife - p.life) / 25, 1);
        const alpha = fadeIn * fadeOut * p.opacity;

        const [r, g, b] = hexToRgb(p.color);

        // Trail
        if (p.trail.length > 1 && (p.type === "spark" || p.type === "data")) {
          for (let t = 1; t < p.trail.length; t++) {
            const tAlpha = (t / p.trail.length) * alpha * 0.6;
            ctx.beginPath();
            ctx.moveTo(p.trail[t - 1][0], p.trail[t - 1][1]);
            ctx.lineTo(p.trail[t][0], p.trail[t][1]);
            ctx.strokeStyle = `rgba(${r},${g},${b},${tAlpha})`;
            ctx.lineWidth = p.type === "data" ? 1 : p.size * 0.5;
            ctx.stroke();
          }
        }

        // Data character
        if (p.type === "data") {
          if (!dataChars.has(p)) dataChars.set(p, dataChar());
          ctx.font = `${p.size * 5}px monospace`;
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.85})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(dataChars.get(p)!, p.x, p.y);
          continue;
        }

        // Particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();

        // Glow for sparks
        if (p.type === "spark" && alpha > 0.2) {
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          gr.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.4})`);
          gr.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = gr;
          ctx.fill();
        }

        // Pulse halo for dust near lifespan end
        if (p.type === "dust" && lifeRatio > 0.8) {
          const pulse = (lifeRatio - 0.8) / 0.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.3 * (1 - pulse)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ zIndex: 2, pointerEvents: "none" }}
    />
  );
}
