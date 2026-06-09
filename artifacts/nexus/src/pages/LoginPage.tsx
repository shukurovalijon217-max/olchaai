import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import NexusLogo from "@/components/NexusLogo";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0604" }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        {/* Subtle red ambient glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(180,10,0,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="relative z-10 text-center flex flex-col items-center gap-6">
          {/* Big OlCha-style logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <NexusLogo ringSize={130} showText={false} />
          </motion.div>

          {/* "NEXUS" text below the sphere — big serif, metallic */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <span style={{
              display: "block",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.35em",
              fontWeight: 400,
              fontSize: "2.6rem",
              background: "linear-gradient(180deg, #d4a96a 0%, #f0c060 28%, #a06030 62%, #6a3a18 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              NEXUS
            </span>
          </motion.div>

          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: "#6b5040", maxWidth: 320, lineHeight: 1.6, fontSize: "0.95rem" }}
          >
            The world's only unified AI-powered social universe. Every platform. One signal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {["Instagram", "TikTok", "Facebook", "Snapchat", "Telegram"].map((p, i) => (
              <motion.span
                key={p}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.65 + i * 0.07 }}
                style={{
                  padding: "3px 10px",
                  borderRadius: 8,
                  border: "1px solid #3a2010",
                  background: "rgba(60,30,10,0.4)",
                  color: "#7a5030",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                }}
              >
                {p}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6"
        style={{ background: "rgba(10,6,4,0.5)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <NexusLogo ringSize={38} showText={true} fontSize="1.1rem" letterSpacing="0.2em" />
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-7" style={{ background: "rgba(40,20,8,0.8)", border: "1px solid #2a1408" }}>
            {(["login", "signup"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={tab === t
                  ? { background: "rgba(80,40,16,0.9)", color: "#d4a96a", border: "1px solid #4a2810" }
                  : { color: "#5a3a20", border: "1px solid transparent" }
                }
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>Full Name</label>
                <input
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                placeholder="you@nexus.io"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors pr-10"
                  style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                  placeholder="••••••••"
                />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#5a3a20" }}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all mt-2"
                style={{
                  background: "linear-gradient(135deg, #8a1800 0%, #c02000 50%, #8a1800 100%)",
                  color: "#ffcca0",
                  border: "1px solid #aa2800",
                  boxShadow: "0 0 18px rgba(180,20,0,0.35)",
                  letterSpacing: "0.08em",
                }}
              >
                {tab === "login" ? "Enter NEXUS" : "Join NEXUS"}
              </motion.button>
            </Link>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "#4a2810" }}>
            {tab === "login" ? "Don't have an account? " : "Already a member? "}
            <button
              onClick={() => setTab(tab === "login" ? "signup" : "login")}
              style={{ color: "#c07030" }}
              className="hover:underline font-semibold"
            >
              {tab === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
