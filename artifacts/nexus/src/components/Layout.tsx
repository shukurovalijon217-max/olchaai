import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useDragControls, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Home, Play, Compass, MessageCircle, Users, Bell,
  User, ShieldCheck, LogOut, Crown, Settings, Wallet, Radio,
  Search, ShoppingBag, Bot, BookOpen, ChevronRight, ChevronLeft,
  MoreHorizontal, X, Zap, Trophy, Ghost, Send, GitBranch, Globe, Brain, Sparkles, Star, Languages,
} from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import FloatingAvatar from "@/components/FloatingAvatar";
import { useDockedState } from "@/hooks/useDockedState";
import { useAuth } from "@/context/AuthContext";
import { countryFlag, getCountryByCode, getCountryByTimezone } from "@/lib/countries";

/* ─── Icon color palette ─────────────────────────────────────── */
const NAV_GLOW: Record<string, { a: string; b: string; shadow: string }> = {
  "/":             { a: "#7c3aed", b: "#a78bfa", shadow: "rgba(124,58,237,0.65)" },
  "/reels":        { a: "#ef4444", b: "#f87171", shadow: "rgba(239,68,68,0.65)" },
  "/explore":      { a: "#f59e0b", b: "#fbbf24", shadow: "rgba(245,158,11,0.65)" },
  "/search":       { a: "#06b6d4", b: "#67e8f9", shadow: "rgba(6,182,212,0.65)" },
  "/bozor":        { a: "#10b981", b: "#34d399", shadow: "rgba(16,185,129,0.65)" },
  "/ai-chat":      { a: "#3b82f6", b: "#93c5fd", shadow: "rgba(59,130,246,0.65)" },
  "/kutubxona":    { a: "#6366f1", b: "#a5b4fc", shadow: "rgba(99,102,241,0.65)" },
  "/live-explore": { a: "#dc2626", b: "#f87171", shadow: "rgba(220,38,38,0.65)" },
  "/messages":     { a: "#0ea5e9", b: "#7dd3fc", shadow: "rgba(14,165,233,0.65)" },
  "/groups":       { a: "#14b8a6", b: "#5eead4", shadow: "rgba(20,184,166,0.65)" },
  "/notifications":{ a: "#f97316", b: "#fdba74", shadow: "rgba(249,115,22,0.65)" },
  "/profile":      { a: "#8b5cf6", b: "#c4b5fd", shadow: "rgba(139,92,246,0.65)" },
  "/premium":      { a: "#eab308", b: "#fde047", shadow: "rgba(234,179,8,0.65)" },
  "/wallet":       { a: "#22c55e", b: "#86efac", shadow: "rgba(34,197,94,0.65)" },
  "/settings":     { a: "#94a3b8", b: "#cbd5e1", shadow: "rgba(148,163,184,0.65)" },
  "/admin":        { a: "#dc2626", b: "#fca5a5", shadow: "rgba(220,38,38,0.65)" },
  "/quests":       { a: "#f59e0b", b: "#fbbf24", shadow: "rgba(245,158,11,0.65)" },
  "/anon":         { a: "#64748b", b: "#94a3b8", shadow: "rgba(100,116,139,0.65)" },
  "/multiscene":   { a: "#7c3aed", b: "#a78bfa", shadow: "rgba(124,58,237,0.65)" },
  "/mood":         { a: "#06b6d4", b: "#67e8f9", shadow: "rgba(6,182,212,0.65)" },
  "/twin":         { a: "#3b82f6", b: "#93c5fd", shadow: "rgba(59,130,246,0.65)" },
  "/factcheck":    { a: "#10b981", b: "#34d399", shadow: "rgba(16,185,129,0.65)" },
  "/spaces":          { a: "#6366f1", b: "#a5b4fc", shadow: "rgba(99,102,241,0.65)" },
  "/muni":            { a: "#f59e0b", b: "#fbbf24", shadow: "rgba(245,158,11,0.65)" },
  "/voice-translate": { a: "#ec4899", b: "#f9a8d4", shadow: "rgba(236,72,153,0.65)" },
};

function getGlow(href: string) {
  return NAV_GLOW[href] ?? { a: "#7c3aed", b: "#a78bfa", shadow: "rgba(124,58,237,0.65)" };
}

/* ─── 9D Icon Orb (desktop sidebar) ─────────────────────────── */
function NavOrb3D({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  const glow = getGlow(href);
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-30, 30], [10, -10]), { stiffness: 300, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-30, 30], [-10, 10]), { stiffness: 300, damping: 22 });

  const handleMouse = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };
  const resetMouse = () => { mx.set(0); my.set(0); };

  return (
    <div ref={ref} onMouseMove={handleMouse} onMouseLeave={resetMouse} style={{ perspective: 400 }}>
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-sm relative overflow-visible ${
          active ? "text-white" : "text-sidebar-foreground hover:text-white"
        }`}
      >
        {/* Active background with 9D glow */}
        <AnimatePresence>
          {active && (
            <motion.div
              layoutId="sidebar-active-bg"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${glow.a}cc, ${glow.b}88)`,
                boxShadow: `0 0 20px ${glow.shadow}, 0 0 40px ${glow.shadow}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Hover glow (non-active) */}
        {!active && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${glow.a}30, ${glow.b}18)`,
              boxShadow: `0 0 12px ${glow.shadow}30`,
            }}
          />
        )}

        {/* Icon with depth translate */}
        <div className="relative z-10" style={{ transform: "translateZ(8px)" }}>
          <div className={`relative flex items-center justify-center ${active ? "w-5 h-5" : "w-4 h-4"}`}>
            <Icon className={active ? "w-5 h-5 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" : "w-4 h-4"} />
            {/* Pulsing glow dot on icon when active */}
            {active && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: `radial-gradient(circle, ${glow.a}99 0%, transparent 70%)`, filter: "blur(3px)" }}
              />
            )}
          </div>
        </div>

        <span className="font-semibold relative z-10" style={{ transform: "translateZ(4px)" }}>{label}</span>

        {/* Active floating orb */}
        {active && (
          <motion.div
            className="ml-auto relative z-10"
            animate={{ y: [-2, 2, -2], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Glass Orb Nav Icon (icon-only, compact) ───────────────── */
function MobileNavBtn({ href, icon: Icon, active, onNav }: {
  href: string; icon: React.ElementType; active: boolean; onNav?: () => void;
}) {
  const glow = getGlow(href);
  return (
    <Link href={href}>
      <motion.div
        onClick={onNav}
        whileTap={{ scale: 0.78 }}
        className="relative flex items-center justify-center select-none"
        style={{ width: 44, height: 44, borderRadius: "50%", overflow: "visible" }}
      >
        {/* Active bg glow */}
        <motion.div
          animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `radial-gradient(circle, ${glow.a}40, ${glow.b}20)`,
            boxShadow: active ? `0 0 16px ${glow.shadow}55` : "none",
          }}
        />
        {/* Pulse ring when active */}
        {active && (
          <motion.div
            animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -2, borderRadius: "50%",
              border: `1.5px solid ${glow.a}66`, pointerEvents: "none",
            }}
          />
        )}
        {/* Icon */}
        <Icon
          className="w-[17px] h-[17px] relative z-10"
          style={{
            color: active ? glow.a : "rgba(200,210,230,0.65)",
            filter: active ? `drop-shadow(0 0 5px ${glow.shadow})` : "none",
            transition: "color 0.25s, filter 0.25s",
          }}
        />
        {/* Active indicator dot */}
        <AnimatePresence>
          {active && (
            <motion.div
              key="dot"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
              style={{
                position: "absolute", bottom: -5, left: "50%", x: "-50%",
                width: 4, height: 4, borderRadius: "50%",
                background: glow.a,
                boxShadow: `0 0 6px ${glow.shadow}, 0 0 12px ${glow.shadow}66`,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}

/* ─── Holographic Sheet Card ─────────────────────────────────── */
function SheetGridBtn({ href, icon: Icon, label, active, onClick, entryDelay = 0, entryDir = "up" }: {
  href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void;
  entryDelay?: number; entryDir?: "up" | "left" | "right" | "down";
}) {
  const glow = getGlow(href);
  const initOffset = entryDir === "left" ? { x: -28, y: 0 } : entryDir === "right" ? { x: 28, y: 0 } : entryDir === "down" ? { x: 0, y: 20 } : { x: 0, y: -20 };
  return (
    <Link href={href}>
      <motion.div
        onClick={onClick}
        initial={{ ...initOffset, opacity: 0, scale: 0.78 }}
        animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 480, damping: 28, delay: entryDelay }}
        whileTap={{ scale: 0.84, rotateX: 10 }}
        whileHover={{ scale: 1.07, y: -4 }}
        style={{ perspective: 400, transformStyle: "preserve-3d" }}
        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl cursor-pointer relative overflow-hidden ${
          active ? "text-white" : "text-foreground"
        }`}
      >
        {/* Card BG */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={active ? {
            background: `linear-gradient(145deg, ${glow.a}ee, ${glow.b}99)`,
            boxShadow: `0 4px 24px ${glow.shadow}60, 0 0 0 1px ${glow.a}55, inset 0 1px 0 rgba(255,255,255,0.28)`,
          } : {
            background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: `0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        />

        {/* Holographic sweep — always on, subtle */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: active ? 2.2 : 4, repeat: Infinity, ease: "easeInOut", repeatDelay: active ? 1.2 : 3 + entryDelay }}
          style={{ background: `linear-gradient(90deg, transparent, ${active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"}, transparent)`, skewX: -18 }}
        />

        {/* Icon + glow */}
        <div className="relative z-10" style={{ transform: "translateZ(8px)" }}>
          <Icon
            className="w-5 h-5"
            style={{
              color: active ? "white" : glow.a,
              filter: active ? "drop-shadow(0 0 8px rgba(255,255,255,0.9))" : `drop-shadow(0 0 5px ${glow.shadow}88)`,
            }}
          />
          {/* Glow bloom under icon */}
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.5 + entryDelay * 0.3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              background: `radial-gradient(circle, ${glow.a}55, transparent)`,
              filter: "blur(5px)", pointerEvents: "none",
            }}
          />
        </div>

        <span className="text-[10px] font-semibold text-center leading-tight z-10"
          style={{ color: active ? "white" : "rgba(255,255,255,0.75)" }}>
          {label}
        </span>
      </motion.div>
    </Link>
  );
}

const navItems = [
  { href: "/", icon: Home, key: "nav.home" },
  { href: "/reels", icon: Play, key: "nav.reels" },
  { href: "/explore", icon: Compass, key: "nav.explore" },
  { href: "/search", icon: Search, key: "nav.search" },
  { href: "/bozor", icon: ShoppingBag, key: "nav.marketplace" },
  { href: "/ai-chat", icon: Bot, key: "nav.ai_chat" },
  { href: "/kutubxona", icon: BookOpen, key: "nav.library" },
  { href: "/live-explore", icon: Radio, key: "nav.live" },
  { href: "/messages", icon: MessageCircle, key: "nav.messages" },
  { href: "/groups", icon: Users, key: "nav.groups" },
  { href: "/notifications", icon: Bell, key: "nav.notifications" },
  { href: "/profile", icon: User, key: "nav.profile" },
  { href: "/premium", icon: Crown, key: "nav.premium" },
  { href: "/wallet", icon: Wallet, key: "nav.wallet" },
  { href: "/quests", icon: Trophy, key: "nav.quests" },
  { href: "/anon", icon: Ghost, key: "nav.anon" },
  { href: "/multiscene", icon: GitBranch, key: "nav.multiscene" },
  { href: "/mood", icon: Globe, key: "nav.mood" },
  { href: "/twin", icon: Brain, key: "nav.twin" },
  { href: "/factcheck", icon: ShieldCheck, key: "nav.factcheck" },
  { href: "/spaces", icon: Sparkles, key: "nav.spaces" },
  { href: "/muni", icon: Star, key: "nav.muni" },
  { href: "/voice-translate", icon: Languages, key: "nav.voice_translate" },
];

const bottomNavItems = [
  { href: "/settings", icon: Settings, key: "nav.settings" },
];

const adminNavItems = [
  { href: "/admin", icon: ShieldCheck, key: "nav.admin" },
];

const mobileNavMainItems = [
  { href: "/", icon: Home, key: "nav.home" },
  { href: "/explore", icon: Compass, key: "nav.explore" },
  { href: "/ai-chat", icon: Bot, key: "nav.ai_chat" },
  { href: "/messages", icon: MessageCircle, key: "nav.messages" },
];

/* ─── Muni AI Floating Panel ────────────────────────────────── */
const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function MuniPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { edged, dock } = useDockedState();

  /* Auto-close panel when dock hides all orbs */
  useEffect(() => { if (edged) setOpen(false); }, [edged]);

  const SUGGESTS = ["suggest_1", "suggest_2", "suggest_3", "suggest_4"];

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user" as const, content: text.trim() };
    setMsgs(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const history = msgs.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/api/muni/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), mode: "wisdom", history }),
      });
      if (!res.ok || !res.body) { setLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(part.slice(6)) as { content?: string; done?: boolean };
            if (json.content) {
              setMsgs(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + json.content };
                }
                return copy;
              });
              setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <>
      {/* ── Jarvis orb toggle — same size & glow as FloatingAvatar ── */}
      {!edged && (
        <motion.button
          onClick={() => setOpen(v => !v)}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_: unknown, info: { offset: { x: number } }) => {
            if (info.offset.x > 36) dock();
          }}
          whileTap={{ scale: 0.88 }}
          className="fixed z-[80] md:hidden"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)",
            right: 16,
            width: 62, height: 62, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Pulsing glow rings */}
          {[0,1,2].map(i=>(
            <motion.div key={i}
              style={{
                position:"absolute", inset:-(i*8+5), borderRadius:"50%", pointerEvents:"none",
                border:`${1.5-i*0.3}px solid rgba(180,50,245,${0.42-i*0.1})`,
                boxShadow:`0 0 ${12+i*10}px rgba(155,30,220,${0.32-i*0.08})`,
              }}
              animate={{scale:[1,1.05+i*0.025,1],opacity:[0.5-i*0.1,0.88-i*0.16,0.5-i*0.1]}}
              transition={{duration:2.3+i*0.6,repeat:Infinity,ease:"easeInOut",delay:i*0.45+1.0}}
            />
          ))}
          {/* Glass body */}
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            background:open
              ?"rgba(255,255,255,0.07)"
              :"radial-gradient(circle at 38% 32%, rgba(180,50,245,0.22) 0%, rgba(80,20,160,0.12) 100%)",
            border:`1.5px solid ${open?"rgba(255,255,255,0.15)":"rgba(180,50,245,0.55)"}`,
            boxShadow:open?"none":"inset 0 2px 12px rgba(0,0,0,0.5), 0 0 20px rgba(155,30,220,0.4)",
            backdropFilter:"blur(18px)",
          }}/>
          {/* Glass shine */}
          <div style={{
            position:"absolute", top:8, left:9,
            width:"38%", height:"34%",
            borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
            background:"radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.5) 0%, transparent 70%)",
            pointerEvents:"none", zIndex:10,
          }}/>
          {/* Icon */}
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="x"
                initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}}
                style={{position:"relative",zIndex:5}}>
                <X style={{width:22,height:22,color:"rgba(220,120,255,0.9)"}}/>
              </motion.div>
            ) : (
              <motion.div key="zap"
                initial={{rotate:90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:-90,opacity:0}}
                style={{position:"relative",zIndex:5}}>
                <Zap style={{width:22,height:22,color:"rgba(220,120,255,0.9)"}}/>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.88, rotateX: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 32, scale: 0.88, rotateX: 10, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-[200px] right-4 z-[79] md:bottom-20 w-[calc(100vw-2rem)] max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ perspective: 800, background: "hsl(var(--card))", border: "1px solid rgba(124,58,237,0.25)", boxShadow: "0 0 60px rgba(124,58,237,0.2), 0 24px 48px rgba(0,0,0,0.4)", maxHeight: "60vh" }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2.5"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.08))" }}>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.5)]">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">{t("jarvis.title")}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {msgs.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground mb-3">{t("jarvis.welcome")}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUGGESTS.map(k => (
                      <button key={k} onClick={() => send(t(`jarvis.${k}`))}
                        className="px-3 py-2 rounded-xl text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition text-left border border-violet-500/20">
                        {t(`jarvis.${k}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user" ? "bg-violet-600 text-white" : "bg-muted text-foreground"
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl bg-muted text-xs flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-border/30 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
                placeholder={t("jarvis.placeholder")}
                className="flex-1 px-3 py-2 rounded-xl bg-muted text-xs outline-none focus:ring-2 ring-violet-500/50" />
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => send(input)}
                className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition flex-shrink-0">
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const Y_KEY = "olcha_nav_y";
const OPEN_KEY = "olcha_nav_open";

function loadY() {
  try { return Math.max(10, parseInt(localStorage.getItem(Y_KEY) ?? "80", 10)); }
  catch { return 80; }
}
function loadOpen() {
  try { return localStorage.getItem(OPEN_KEY) !== "false"; }
  catch { return true; }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(loadOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [isMd, setIsMd] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* ── Live clock ──────────────────────────────────────────────── */
  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const userTz = user?.timezone || undefined;
  const clockTime = useMemo(() => {
    try {
      return clockNow.toLocaleTimeString("en-GB", { timeZone: userTz, hour: "2-digit", minute: "2-digit", hour12: false });
    } catch { return clockNow.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }); }
  }, [clockNow, userTz]);
  const clockDate = useMemo(() => {
    try {
      return clockNow.toLocaleDateString("en-GB", { timeZone: userTz, day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
    } catch { return clockNow.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "."); }
  }, [clockNow, userTz]);
  const countryDisplay = useMemo(() => {
    if (user?.country) {
      const c = getCountryByCode(user.country);
      if (c) return `${countryFlag(c.code)} ${c.name}`;
    }
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const c = getCountryByTimezone(tz);
      if (c) return `${countryFlag(c.code)} ${c.name}`;
    } catch { /* ignore */ }
    return null;
  }, [user?.country]);
  const [maxY, setMaxY] = useState(600);
  const y = useMotionValue(loadY());
  const dragControls = useDragControls();

  useEffect(() => {
    const update = () => setMaxY(Math.max(100, window.innerHeight - 360));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => { setMoreOpen(false); setNavExpanded(false); }, [location]);

  const saveY = () => {
    try { localStorage.setItem(Y_KEY, String(Math.round(y.get()))); } catch {}
  };

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try { localStorage.setItem(OPEN_KEY, String(next)); } catch {}
  };

  const allMobileNav = [
    ...navItems,
    ...bottomNavItems,
    ...(user?.isAdmin ? adminNavItems : []),
  ];

  return (
    <div className="bg-background min-h-screen">

      {/* ── DESKTOP FLOATING SIDEBAR ── */}
      <div className="hidden md:block">
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={{ top: 10, bottom: maxY }}
          style={{ position: "fixed", left: 0, top: 0, y, zIndex: 50 }}
          onDragEnd={saveY}
          className="flex items-start select-none"
        >
          {/* Sidebar panel */}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.aside
                key="sidebar"
                initial={{ x: "-100%", opacity: 0, filter: "blur(10px)", skewX: -4 }}
                animate={{ x: 0, opacity: 1, filter: "blur(0px)", skewX: 0 }}
                exit={{ x: "-100%", opacity: 0, filter: "blur(8px)", skewX: 4 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                className="w-52 flex flex-col rounded-r-2xl shadow-2xl overflow-hidden border-y border-r border-border/50"
                style={{
                  maxHeight: "calc(100vh - 24px)",
                  background: "hsl(var(--sidebar))",
                  backdropFilter: "blur(24px)",
                  boxShadow: "4px 0 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              >
                {/* Drag handle header */}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-border/30 cursor-grab active:cursor-grabbing"
                  style={{ background: "hsl(var(--sidebar-accent) / 0.25)" }}
                >
                  <Link href="/">
                    <NexusLogo ringSize={30} showText={true} fontSize="0.85rem" letterSpacing="0.15em" />
                  </Link>
                  <div className="flex flex-col gap-[3px] pr-0.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-[3px]">
                        <div className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                        <div className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* User chip */}
                {user && (
                  <Link href="/profile">
                    <motion.div
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 mx-2 my-1.5 px-2.5 py-1.5 rounded-xl bg-muted/40 hover:bg-gradient-to-r hover:from-violet-500/15 hover:to-blue-500/10 cursor-pointer transition-all border border-transparent hover:border-violet-500/20"
                    >
                      {user.avatarUrl ? (
                        <div className="relative">
                          <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-violet-500/40" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-sidebar" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 ring-1 ring-violet-500/40 shadow-[0_0_8px_rgba(124,58,237,0.4)]">
                          {user.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{user.displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </motion.div>
                  </Link>
                )}

                {/* Nav items */}
                <nav className="flex-1 px-1.5 py-1 space-y-0.5 overflow-y-auto scrollbar-none">
                  {navItems.map(({ href, icon, key }) => {
                    const active = location === href || (href !== "/" && location.startsWith(href));
                    return (
                      <Link key={href} href={href}>
                        <NavOrb3D href={href} icon={icon} label={t(key)} active={active} />
                      </Link>
                    );
                  })}
                </nav>

                {/* Bottom actions */}
                <div className="px-1.5 pb-2 pt-1 border-t border-border/30 space-y-0.5">
                  {[...bottomNavItems, ...(user?.isAdmin ? adminNavItems : [])].map(({ href, icon, key }) => {
                    const active = location.startsWith(href);
                    return (
                      <Link key={href} href={href}>
                        <NavOrb3D href={href} icon={icon} label={t(key)} active={active} />
                      </Link>
                    );
                  })}
                  <motion.button
                    onClick={logout}
                    whileHover={{ x: 2, scale: 1.01 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{t("auth.logout")}</span>
                  </motion.button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Toggle tab + drag strip */}
          <div className="flex flex-col items-center mt-3 gap-1">
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center justify-center w-6 h-12 rounded-r-xl shadow-xl border border-border/50 border-l-0 transition-colors overflow-hidden relative"
              style={{ background: "hsl(var(--sidebar))", backdropFilter: "blur(16px)" }}
              title={isOpen ? t("common.close") : t("common.open")}
            >
              <motion.div animate={{ x: isOpen ? 0 : [0, 2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                {isOpen
                  ? <ChevronLeft className="w-3.5 h-3.5 text-sidebar-foreground" />
                  : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground" />}
              </motion.div>
            </motion.button>

            <div
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
              className="flex flex-col items-center gap-[3px] py-2 px-1.5 rounded-r-lg cursor-ns-resize border border-border/40 border-l-0 shadow"
              style={{ background: "hsl(var(--sidebar) / 0.85)", backdropFilter: "blur(12px)" }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50" />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══ GLASS PILL MOBILE NAV ════════════════════════════════ */}
      <div
        className="md:hidden fixed bottom-0 right-0 z-50 flex items-end justify-end"
        style={{ padding: "0 16px calc(env(safe-area-inset-bottom, 0px) + 14px) 0" }}
      >
        {/* Glass pill — grows leftward as items expand */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 440, damping: 34 }}
          className="flex items-center gap-1.5 relative overflow-visible"
          style={{
            background: "rgba(12, 12, 24, 0.45)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            borderRadius: 28,
            padding: "7px 7px 7px 10px",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* ── Quick nav icons (expand left from Ko'proq) ─ */}
          <AnimatePresence mode="popLayout">
            {navExpanded && mobileNavMainItems.map(({ href, icon, key }, i) => {
              const active = location === href || (href !== "/" && location.startsWith(href));
              const delay = (mobileNavMainItems.length - 1 - i) * 0.055;
              return (
                <motion.div
                  key={href}
                  layout
                  initial={{ opacity: 0, scale: 0.35, x: 28 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.35, x: 28 }}
                  transition={{ type: "spring", stiffness: 520, damping: 30, delay }}
                >
                  <MobileNavBtn
                    href={href}
                    icon={icon}
                    active={active}
                    onNav={() => setNavExpanded(false)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Divider line (only when expanded) */}
          <AnimatePresence>
            {navExpanded && (
              <motion.div
                key="divider"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.22 }}
                style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", borderRadius: 1, flexShrink: 0 }}
              />
            )}
          </AnimatePresence>

          {/* ── Plasma Core "Ko'proq" Button ─ */}
          <motion.button
            onClick={() => { if (!navExpanded) setNavExpanded(true); else setMoreOpen(true); }}
            whileTap={{ scale: 0.78 }}
            className="relative flex items-center justify-center select-none flex-shrink-0"
            style={{ width: 44, height: 44 }}
          >
            {/* Ring 1 — CW */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(139,92,246,0.5)", pointerEvents: "none" }}
            />
            {/* Ring 2 — CCW dashed */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 5, borderRadius: "50%", border: "1px dashed rgba(59,130,246,0.4)", pointerEvents: "none" }}
            />
            {/* Core glow */}
            <motion.div
              animate={{
                scale: navExpanded ? [1, 1.18, 1] : [1, 1.06, 1],
                opacity: navExpanded ? [0.7, 1, 0.7] : [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 9, borderRadius: "50%",
                background: navExpanded
                  ? "radial-gradient(circle, rgba(139,92,246,0.65), rgba(59,130,246,0.4))"
                  : "radial-gradient(circle, rgba(139,92,246,0.28), rgba(59,130,246,0.14))",
                boxShadow: navExpanded ? "0 0 14px rgba(139,92,246,0.7)" : "none",
                transition: "background 0.35s, box-shadow 0.35s",
              }}
            />
            {/* Icon */}
            <AnimatePresence mode="wait">
              {navExpanded ? (
                <motion.div key="grid" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
                  <MoreHorizontal className="w-[14px] h-[14px] text-violet-300" />
                </motion.div>
              ) : (
                <motion.div key="more" initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
                  <MoreHorizontal className="w-[14px] h-[14px] text-violet-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>

      {/* Tap-outside to collapse nav */}
      <AnimatePresence>
        {navExpanded && !moreOpen && (
          <motion.div
            key="nav-dismiss"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[49]"
            onClick={() => setNavExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* ══ 9D HOLOGRAM PORTAL — KO'PROQ SHEET ════════════════════ */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* ── Quantum backdrop ── */}
            <motion.div
              key="qbackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,5,0.82)", backdropFilter: "blur(4px)" }}
            >
              {/* Animated nebula particles in backdrop */}
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0, 0.18, 0], x: [0, (i % 2 === 0 ? 1 : -1) * 30, 0], y: [0, -20, 0] }}
                  transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    left: `${10 + i * 18}%`, top: `${15 + (i % 3) * 22}%`,
                    width: 120, height: 120, borderRadius: "50%",
                    background: ["rgba(124,58,237,0.4)", "rgba(59,130,246,0.3)", "rgba(16,185,129,0.25)", "rgba(234,179,8,0.25)", "rgba(239,68,68,0.2)"][i],
                    filter: "blur(40px)", pointerEvents: "none",
                  }}
                />
              ))}
            </motion.div>

            {/* ── 9D Portal Sheet ── */}
            <motion.div
              key="qsheet"
              initial={{ y: "100%", scale: 0.88, borderRadius: "48px 48px 0 0", opacity: 0.4 }}
              animate={{ y: 0, scale: 1, borderRadius: "28px 28px 0 0", opacity: 1 }}
              exit={{ y: "105%", scale: 0.92, opacity: 0, borderRadius: "48px 48px 0 0" }}
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61] overflow-hidden"
              style={{
                maxHeight: "88vh",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
                background: "linear-gradient(180deg, #0a0818 0%, #060610 40%, #04040e 100%)",
                boxShadow: "0 -32px 80px rgba(124,58,237,0.18), 0 -2px 0 rgba(139,92,246,0.35)",
              }}
            >
              {/* Holographic top border */}
              <motion.div
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, #7c3aed, #3b82f6, #10b981, #eab308, #ef4444, #7c3aed)",
                  backgroundSize: "200% 100%",
                }}
              />

              {/* Handle */}
              <div className="flex justify-center pt-4 pb-0">
                <motion.div
                  animate={{ width: [28, 44, 28], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ height: 4, borderRadius: 2, background: "rgba(139,92,246,0.6)" }}
                />
              </div>

              {/* HUD Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-4">
                <div className="flex items-center gap-3">
                  {/* Rotating 9D icon */}
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        border: "1.5px solid rgba(139,92,246,0.6)",
                      }}
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      style={{
                        position: "absolute", inset: 3, borderRadius: "50%",
                        border: "1px dashed rgba(59,130,246,0.5)",
                      }}
                    />
                    <motion.div
                      animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(139,92,246,0.9), rgba(59,130,246,0.6))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 12px rgba(139,92,246,0.7)",
                      }}
                    >
                      <Zap className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  </div>
                  <div>
                    <motion.p
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="font-black text-base tracking-wide"
                      style={{ background: "linear-gradient(90deg, #a78bfa, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%" }}
                    >
                      {t("common.all_sections")}
                    </motion.p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-mono">NEXUS ONLINE</span>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  onClick={() => setMoreOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-2xl"
                  style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)" }}
                >
                  <X className="w-4 h-4 text-violet-400" />
                </motion.button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 120px)" }}>

                {/* ── Category sections ── */}
                {(
                  [
                    {
                      label: t("nav.sect_main"),
                      color: "#7c3aed",
                      shadow: "rgba(124,58,237,0.5)",
                      hrefs: ["/", "/explore", "/search", "/messages"],
                      dir: "left" as const,
                    },
                    {
                      label: t("nav.sect_social"),
                      color: "#0ea5e9",
                      shadow: "rgba(14,165,233,0.5)",
                      hrefs: ["/groups", "/notifications", "/reels", "/live-explore"],
                      dir: "right" as const,
                    },
                    {
                      label: t("nav.sect_ai"),
                      color: "#3b82f6",
                      shadow: "rgba(59,130,246,0.5)",
                      hrefs: ["/ai-chat", "/twin", "/muni", "/voice-translate", "/factcheck", "/multiscene"],
                      dir: "left" as const,
                    },
                    {
                      label: t("nav.sect_discover"),
                      color: "#10b981",
                      shadow: "rgba(16,185,129,0.5)",
                      hrefs: ["/bozor", "/kutubxona", "/mood", "/spaces"],
                      dir: "right" as const,
                    },
                    {
                      label: t("nav.sect_premium"),
                      color: "#eab308",
                      shadow: "rgba(234,179,8,0.5)",
                      hrefs: ["/profile", "/premium", "/wallet", "/quests", "/anon"],
                      dir: "left" as const,
                    },
                    {
                      label: t("nav.sect_settings"),
                      color: "#94a3b8",
                      shadow: "rgba(148,163,184,0.5)",
                      hrefs: ["/settings", ...(user?.isAdmin ? ["/admin"] : [])],
                      dir: "right" as const,
                    },
                  ] as { label: string; color: string; shadow: string; hrefs: string[]; dir: "left" | "right" | "up" | "down" }[]
                ).map((cat, catIdx) => {
                  const catItems = allMobileNav.filter(item => cat.hrefs.includes(item.href));
                  if (!catItems.length) return null;
                  return (
                    <div key={cat.label} className="px-4 mb-4">
                      {/* Category label */}
                      <motion.div
                        initial={{ opacity: 0, x: cat.dir === "left" ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 + catIdx * 0.07, type: "spring", stiffness: 400, damping: 28 }}
                        className="flex items-center gap-2 mb-2"
                      >
                        <motion.div
                          animate={{ width: [16, 28, 16], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2.5 + catIdx * 0.3, repeat: Infinity, ease: "easeInOut" }}
                          style={{ height: 2, borderRadius: 1, background: cat.color }}
                        />
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: cat.color, textShadow: `0 0 8px ${cat.shadow}` }}>
                          {cat.label}
                        </span>
                        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${cat.color}44, transparent)` }} />
                      </motion.div>

                      {/* Items grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {catItems.map((item, itemIdx) => {
                          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                          return (
                            <SheetGridBtn
                              key={item.href}
                              href={item.href}
                              icon={item.icon}
                              label={t(item.key)}
                              active={active}
                              onClick={() => setMoreOpen(false)}
                              entryDelay={0.1 + catIdx * 0.06 + itemIdx * 0.04}
                              entryDir={cat.dir}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* ── User card ── */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 380, damping: 28 }}
                    className="mx-4 mt-2 mb-2 rounded-2xl overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.08))", border: "1px solid rgba(139,92,246,0.22)" }}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <Link href="/profile" onClick={() => setMoreOpen(false)}>
                        <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2.5">
                          {user.avatarUrl ? (
                            <div className="relative">
                              <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/40" />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0818]" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-black text-white ring-2 ring-violet-500/40 shadow-[0_0_12px_rgba(124,58,237,0.5)]">
                              {user.displayName[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold" style={{ color: "rgba(167,139,250,0.9)" }}>@{user.username}</span>
                              <span className="text-[10px] font-mono" style={{ color: "rgba(125,211,252,0.85)" }}>{clockTime}</span>
                              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{clockDate}</span>
                            </div>
                            {countryDisplay ? (
                              <p className="text-[10px] mt-0.5 truncate font-medium" style={{ color: "rgba(134,239,172,0.85)" }}>{countryDisplay}</p>
                            ) : (
                              <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.28)" }}>uz O'zbekiston</p>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={logout}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "rgb(248,113,113)" }}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t("auth.logout")}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <main
        className="min-h-screen pb-28 md:pb-0 transition-[padding] duration-300"
        style={{ paddingLeft: isMd ? (isOpen ? "220px" : "40px") : "8px" }}
      >
        <motion.div
          key={location}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </main>

      {/* ── FLOATING USER AVATAR BUBBLE ── */}
      <FloatingAvatar />

      {/* ── MUNI FLOATING AI ── */}
      <MuniPanel />

      {/* ── SHARED DOCK EDGE TAB — restores all three orbs at once ── */}
      <DockEdgeTab />
    </div>
  );
}

/* ─── Shared transparent glass tab — shown when all orbs are docked ── */
function DockEdgeTab() {
  const { edged, undock } = useDockedState();
  return (
    <AnimatePresence>
      {edged && (
        <motion.div
          key="dock-edge-tab"
          className="fixed cursor-pointer"
          style={{ right: 0, bottom: "calc(env(safe-area-inset-bottom, 0px) + 56px)", zIndex: 9993 }}
          initial={{ x: 60 }} animate={{ x: 0 }} exit={{ x: 60 }}
          transition={{ type:"spring", stiffness:360, damping:28 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDragEnd={(_: unknown, info: { offset: { x: number } }) => {
            if (info.offset.x < -22) undock();
          }}
          onClick={undock}
        >
          <div style={{
            width: 10,
            height: 222,
            borderRadius: "8px 0 0 8px",
            background: "rgba(140,40,220,0.10)",
            border: "1.5px solid rgba(180,50,245,0.32)",
            borderRight: "none",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "-3px 0 24px rgba(140,30,220,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 3, height: 52, borderRadius: 99,
              background: "linear-gradient(to bottom, transparent 0%, rgba(200,80,255,0.65) 30%, rgba(200,80,255,0.65) 70%, transparent 100%)",
            }}/>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
