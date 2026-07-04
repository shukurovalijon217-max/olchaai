import { motion } from "framer-motion";
import type { PermissionState } from "../engine/CameraStreamer";

interface Props {
  permission: PermissionState;
  isMobile: boolean;
  onGrant: () => void;
  onSkip: () => void;
}

export function PermissionGate({ permission, isMobile, onGrant, onSkip }: Props) {
  if (permission !== "idle" && permission !== "requesting") return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full"
            style={{
              top: `${i * 5}%`,
              background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.06), transparent)",
            }}
            animate={{ opacity: [0.3, 0.8, 0.3], x: ["-100%", "100%"] }}
            transition={{ duration: 3 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6 px-8 text-center max-w-sm"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="relative w-24 h-24"
        >
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30" />
          <motion.div
            className="absolute inset-2 rounded-full border border-cyan-400/60"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-1 tracking-wide">
            Spatial AR Engine
          </h2>
          <p className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest mb-3">
            OlchaAI · Hologram Interface
          </p>
          <p className="text-sm text-white/50 leading-relaxed">
            {isMobile
              ? "Kamera ruxsatini bering — haqiqiy AR hologramma rejimi faollashadi."
              : "Kamera ruxsatini bering yoki demo rejimda ishlating."}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGrant}
            disabled={permission === "requesting"}
            className="relative overflow-hidden w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,150,255,0.15))",
              border: "1px solid rgba(0,229,255,0.4)",
              color: "#00e5ff",
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)" }}
            />
            <span className="relative z-10">
              {permission === "requesting" ? "Kutilmoqda..." : "Kamera ruxsatini berish"}
            </span>
          </motion.button>

          <button
            onClick={onSkip}
            className="w-full py-2.5 rounded-xl text-sm text-white/35 hover:text-white/55 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Demo rejimda davom etish
          </button>
        </div>

        <div className="flex gap-4 text-[10px] text-white/25 font-mono">
          {["WebRTC", "Three.js", "WebGL2", "60 FPS"].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-cyan-400/40" />{t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
