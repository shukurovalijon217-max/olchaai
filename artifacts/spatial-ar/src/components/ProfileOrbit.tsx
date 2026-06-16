import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OlChaProfile } from "../hooks/useOlChaData";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#ff6b6b,#ee5a24)",
  "linear-gradient(135deg,#4ecdc4,#44a08d)",
  "linear-gradient(135deg,#45b7d1,#2980b9)",
  "linear-gradient(135deg,#96ceb4,#6ab04c)",
  "linear-gradient(135deg,#dda0dd,#9b59b6)",
  "linear-gradient(135deg,#ffd93d,#f9ca24)",
];

const FALLBACK_PROFILES: OlChaProfile[] = [
  { id: "1", username: "sardor_m",   displayName: "Sardor M." },
  { id: "2", username: "zulfiya_k",  displayName: "Zulfiya K." },
  { id: "3", username: "bobur_t",    displayName: "Bobur T." },
  { id: "4", username: "malika_r",   displayName: "Malika R." },
  { id: "5", username: "jasur_a",    displayName: "Jasur A." },
  { id: "6", username: "kamola_u",   displayName: "Kamola U." },
];

interface ProfileOrbitProps {
  profiles?: OlChaProfile[];
}

export function ProfileOrbit({ profiles = FALLBACK_PROFILES }: ProfileOrbitProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const shown = profiles.slice(0, 6);

  return (
    <div
      style={{
        position: "absolute", right: 12, top: "50%",
        transform: "translateY(-50%)",
        zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}
    >
      {/* Header label */}
      <div style={{
        background: "rgba(0,8,24,0.7)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(0,229,255,0.2)",
        borderRadius: 8, padding: "4px 8px", marginBottom: 2,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <motion.div
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 5px #00ff88" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(0,229,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Online
        </span>
      </div>

      {/* Profile bubbles */}
      {shown.map((prof, i) => {
        const colorIdx = Number(prof.id) % AVATAR_COLORS.length;
        const initial = (prof.displayName || prof.username || "?")[0].toUpperCase();
        const isHovered = tooltip === prof.id;

        return (
          <motion.div
            key={prof.id}
            style={{ position: "relative" }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 24 }}
          >
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  style={{
                    position: "absolute", right: "calc(100% + 8px)", top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0,8,24,0.9)", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(0,229,255,0.3)",
                    borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{prof.displayName}</div>
                  <div style={{ color: "rgba(0,229,255,0.6)", fontSize: 10, fontFamily: "monospace" }}>@{prof.username}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar button */}
            <motion.button
              style={{
                position: "relative", width: 44, height: 44,
                borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                background: "transparent",
              }}
              whileHover={{ x: -6, scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onHoverStart={() => setTooltip(prof.id)}
              onHoverEnd={() => setTooltip(null)}
            >
              {/* Pulse ring */}
              <motion.div
                style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  border: "1px solid rgba(0,229,255,0.4)",
                  pointerEvents: "none",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              />

              {/* Avatar */}
              {prof.profileImage ? (
                <img
                  src={prof.profileImage}
                  alt={prof.displayName}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,229,255,0.5)", display: "block" }}
                />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: AVATAR_COLORS[colorIdx],
                  border: "2px solid rgba(0,229,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{initial}</span>
                </div>
              )}

              {/* Online indicator */}
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 11, height: 11, borderRadius: "50%",
                background: "#00ff88", border: "2px solid #000510",
                boxShadow: "0 0 5px #00ff88",
              }} />
            </motion.button>
          </motion.div>
        );
      })}

      {/* "More" indicator */}
      {profiles.length > 6 && (
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(0,229,255,0.08)",
          border: "1.5px dashed rgba(0,229,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, color: "rgba(0,229,255,0.6)", fontFamily: "monospace" }}>
            +{profiles.length - 6}
          </span>
        </div>
      )}
    </div>
  );
}
