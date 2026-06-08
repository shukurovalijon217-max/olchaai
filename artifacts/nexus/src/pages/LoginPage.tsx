import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import NexusLogo from "@/components/NexusLogo";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(180,20,0,0.12) 0%, transparent 65%), radial-gradient(ellipse at 30% 70%, rgba(100,50,20,0.08) 0%, transparent 60%)"
        }} />
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex justify-center mb-8"
          >
            <NexusLogo size="xl" showText={false} />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mb-6"
          >
            <NexusLogo size="lg" textOnly showText />
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed"
          >
            The world's only unified AI-powered social universe. Every platform. One signal.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-2 justify-center"
          >
            {["Instagram", "TikTok", "Facebook", "Snapchat", "Telegram"].map((p, i) => (
              <motion.span
                key={p}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium border border-border"
              >
                {p}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <NexusLogo size="sm" showText={false} />
            <span
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                letterSpacing: "0.18em",
                fontWeight: 400,
                background: "linear-gradient(180deg, #c8a882 0%, #9a6840 35%, #c8a070 60%, #5a3020 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontSize: "1.25rem",
              }}
            >
              NEXUS
            </span>
          </div>

          <div className="flex bg-muted rounded-xl p-1 mb-8">
            {(["login", "signup"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name</label>
                <input className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors" placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
              <input type="email" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors" placeholder="you@nexus.io" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors pr-10" placeholder="••••••••" />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-primary hover:opacity-90 transition-all mt-2"
              >
                {tab === "login" ? "Enter NEXUS" : "Join NEXUS"}
              </motion.button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {tab === "login" ? "Don't have an account? " : "Already a member? "}
            <button onClick={() => setTab(tab === "login" ? "signup" : "login")} className="text-primary hover:underline font-semibold">
              {tab === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
