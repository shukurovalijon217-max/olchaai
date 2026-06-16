import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS = [
  { id: "home",    icon: "🏠", label: "Bosh",       color: "#00e5ff" },
  { id: "posts",   icon: "📝", label: "Postlar",    color: "#00e5ff" },
  { id: "story",   icon: "▶",  label: "Stories",    color: "#ff6b9d" },
  { id: "search",  icon: "⌕",  label: "Qidirish",   color: "#00e5ff" },
  { id: "chat",    icon: "◎",  label: "Chat",       color: "#4ecdc4" },
  { id: "ar",      icon: "⬡",  label: "AR Mode",    color: "#a78bfa" },
  { id: "notify",  icon: "◈",  label: "Bildirish",  color: "#ffd93d" },
  { id: "profile", icon: "◉",  label: "Profil",     color: "#00e5ff" },
];

interface HoloMenuProps { onSelect?: (id: string) => void; }

export function HoloMenu({ onSelect }: HoloMenuProps) {
  const [active, setActive]   = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const R = 100;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: 24, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20, width: 260, height: 260,
      }}
    >
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,229,255,0.04) 0%, transparent 70%)",
        boxShadow: "0 0 60px rgba(0,229,255,0.06) inset",
      }} />

      {/* Ring 1 */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: 0, border: "1px solid rgba(0,229,255,0.2)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      {/* Ring 2 */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: 22, border: "1px dashed rgba(0,229,255,0.1)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Center hub */}
      <motion.div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          inset: "50%",
          width: 44, height: 44,
          transform: "translate(-50%, -50%)",
          background: "rgba(0,8,24,0.9)",
          border: "2px solid rgba(0,229,255,0.5)",
          boxShadow: "0 0 16px rgba(0,229,255,0.25), 0 0 40px rgba(0,229,255,0.08) inset",
          pointerEvents: "auto",
          cursor: "default",
          zIndex: 2,
        }}
        animate={{ rotate: [0, 60, 0, -60, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span style={{ fontSize: 20, color: "rgba(0,229,255,0.9)" }}>◈</span>
      </motion.div>

      {/* Buttons */}
      {ITEMS.map((item, i) => {
        const angle = (i / ITEMS.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * R;
        const y = Math.sin(angle) * R;
        const isActive = active === item.id;
        const isPressed = pressed === item.id;

        return (
          <motion.button
            key={item.id}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: 46, height: 46,
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              borderRadius: "50%",
              background: isActive ? `${item.color}22` : "rgba(0,6,20,0.88)",
              border: `1.5px solid ${isActive ? item.color : "rgba(0,229,255,0.25)"}`,
              backdropFilter: "blur(12px)",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 0,
              boxShadow: isActive
                ? `0 0 16px ${item.color}55, 0 0 6px ${item.color}33 inset`
                : "none",
              pointerEvents: "auto",
              zIndex: 3,
            }}
            animate={{ scale: isPressed ? 0.88 : isActive ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onHoverStart={() => setActive(item.id)}
            onHoverEnd={() => setActive(null)}
            onPointerDown={() => setPressed(item.id)}
            onPointerUp={() => { setPressed(null); onSelect?.(item.id); }}
            onPointerLeave={() => setPressed(null)}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
          </motion.button>
        );
      })}

      {/* Active label */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            className="absolute pointer-events-none"
            style={{ bottom: -28, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(0,229,255,0.8)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {ITEMS.find((m) => m.id === active)?.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
