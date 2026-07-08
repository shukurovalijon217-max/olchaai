import { motion } from "framer-motion";
import type { FrameStats } from "../engine/FrameOptimizer";
import type { ARMode } from "../hooks/useAREngine";

interface Props {
  stats: FrameStats;
  mode: ARMode;
  permission: string;
}

function FpsBadge({ fps }: { fps: number }) {
  const color = fps >= 55 ? "#00ff80" : fps >= 30 ? "#ffaa00" : "#ff4040";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
      <span className="font-mono text-xs font-bold" style={{ color }}>{fps}</span>
      <span className="text-[10px] text-white/30 font-mono">fps</span>
    </div>
  );
}

export function StatusHUD({ stats, mode, permission }: Props) {
  return (
    <>
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,229,255,0.2)" }}>
            <motion.div
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[11px] font-bold text-cyan-400 tracking-widest uppercase">
              {mode === "ar" ? "AR Mode" : "Demo"}
            </span>
          </div>
          <FpsBadge fps={stats.fps} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 text-[10px] font-mono text-white/30"
        >
          <span>{stats.frameTime}ms</span>
          <span>·</span>
          <span>{stats.totalFrames.toLocaleString()} frames</span>
          {stats.dropped > 0 && (
            <><span>·</span><span className="text-amber-400">{stats.dropped} drops</span></>
          )}
        </motion.div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-1.5 items-end"
        >
          <div className="px-3 py-1.5 rounded-xl text-[11px] font-mono text-white/40"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            GilosAI Spatial AR Engine v1.0
          </div>
          <div className="flex gap-1.5 text-[10px] font-mono text-white/25">
            {["Three.js", "WebGL2", "WebRTC"].map((t) => (
              <span key={t} className="px-2 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-end justify-between"
        >
          <div className="flex flex-col gap-1">
            <div className="flex gap-3 text-[10px] font-mono text-white/25">
              <span className="flex items-center gap-1">
                <span className="text-rose-400/60">X</span> Qizil o'q
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-400/60">Y</span> Yashil o'q
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-400/60">Z</span> Ko'k o'q
              </span>
            </div>
            {mode === "demo" && (
              <p className="text-[10px] text-white/20 font-mono">
                {/Mobi|Android|iPhone|iPad/.test(navigator.userAgent)
                  ? "Qurilmani harakatlantiring"
                  : "Sichqonchani harakatlantiring →"}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/20">
              <span className="w-1 h-1 rounded-full"
                style={{ background: permission === "granted" ? "#00e5ff" : "#555" }} />
              Kamera: {permission === "granted" ? "FAOL" : "Yo'q"}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/20">
              <span className="w-1 h-1 rounded-full bg-violet-400/50" />
              GPU: WebGL2 {typeof WebGL2RenderingContext !== "undefined" ? "OK" : "N/A"}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
