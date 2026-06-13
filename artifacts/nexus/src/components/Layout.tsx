import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useDragControls, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Home, Play, Compass, MessageCircle, Users, Bell,
  User, ShieldCheck, LogOut, Crown, Settings, Wallet, Radio,
  Search, ShoppingBag, Bot, BookOpen, ChevronRight, ChevronLeft,
  MoreHorizontal, X, Zap, Trophy, Ghost, Send, GitBranch, Globe, Brain, Sparkles,
} from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import FloatingAvatar from "@/components/FloatingAvatar";
import { useAuth } from "@/context/AuthContext";

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
  "/spaces":       { a: "#6366f1", b: "#a5b4fc", shadow: "rgba(99,102,241,0.65)" },
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

/* ─── 9D Mobile Bottom Button ────────────────────────────────── */
function MobileNavBtn({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  const glow = getGlow(href);
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.82, rotateX: 12 }}
        whileHover={{ scale: 1.1 }}
        style={{ perspective: 300, transformStyle: "preserve-3d" }}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl relative"
      >
        {/* Active bg orb */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at center, ${glow.a}55, ${glow.b}22)`,
                boxShadow: `0 0 18px ${glow.shadow}50, 0 0 36px ${glow.shadow}25`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          animate={active ? { y: [-1.5, 1.5, -1.5], scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <Icon
            className="w-5 h-5 transition-colors"
            style={{ color: active ? glow.a : undefined, filter: active ? `drop-shadow(0 0 6px ${glow.shadow})` : undefined }}
          />
        </motion.div>

        <span className="text-[9px] font-bold z-10 transition-colors" style={{ color: active ? glow.a : undefined }}>
          {label}
        </span>

        {/* Bottom glow line */}
        {active && (
          <motion.div
            layoutId="mob-line"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 24, height: 3, background: `linear-gradient(90deg, ${glow.a}, ${glow.b})`, boxShadow: `0 0 8px ${glow.shadow}` }}
          />
        )}
      </motion.div>
    </Link>
  );
}

/* ─── 9D Mobile Sheet Grid Button ────────────────────────────── */
function SheetGridBtn({ href, icon: Icon, label, active, onClick }: {
  href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void;
}) {
  const glow = getGlow(href);
  return (
    <Link href={href}>
      <motion.div
        onClick={onClick}
        whileTap={{ scale: 0.88, rotateX: 8 }}
        whileHover={{ scale: 1.06, translateY: -3 }}
        style={{ perspective: 300, transformStyle: "preserve-3d" }}
        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl cursor-pointer relative overflow-hidden ${
          active ? "text-white" : "text-foreground"
        }`}
      >
        {/* Card background */}
        <div
          className="absolute inset-0 rounded-2xl transition-all"
          style={active ? {
            background: `linear-gradient(145deg, ${glow.a}cc, ${glow.b}88)`,
            boxShadow: `0 4px 20px ${glow.shadow}55, 0 0 0 1px ${glow.a}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
          } : {
            background: "hsl(var(--muted) / 0.45)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        />

        {/* Holographic shimmer on active */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)", skewX: -15 }}
          />
        )}

        {/* Icon glow orb */}
        <div className="relative z-10" style={{ transform: "translateZ(6px)" }}>
          <div className="relative">
            <Icon className={`w-5 h-5 ${active ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" : ""}`} />
            {!active && (
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle, ${glow.a}40, transparent)`, filter: "blur(4px)" }} />
            )}
          </div>
        </div>

        <span className="text-[10px] font-bold text-center leading-tight z-10">{label}</span>
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

  const SUGGESTS = ["suggest_1", "suggest_2", "suggest_3", "suggest_4"];

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user" as const, content: text.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), conversationId: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setMsgs(prev => [...prev, { role: "assistant", content: data.response ?? data.message ?? "..." }]);
      }
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 right-4 z-[80] md:bottom-6 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 0 24px rgba(124,58,237,0.6), 0 0 48px rgba(59,130,246,0.3)" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Zap className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <motion.div className="absolute inset-0 rounded-full" animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.5), transparent)", pointerEvents: "none" }} />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-36 right-4 z-[79] md:bottom-24 w-[calc(100vw-2rem)] max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background: "hsl(var(--card))", border: "1px solid rgba(124,58,237,0.25)", boxShadow: "0 0 60px rgba(124,58,237,0.2), 0 24px 48px rgba(0,0,0,0.4)", maxHeight: "60vh" }}
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
  const [maxY, setMaxY] = useState(600);
  const y = useMotionValue(loadY());
  const dragControls = useDragControls();

  useEffect(() => {
    const update = () => setMaxY(Math.max(100, window.innerHeight - 360));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => { setMoreOpen(false); }, [location]);

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
                initial={{ x: "-100%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 38 }}
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

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 flex items-center justify-around py-1 px-1"
        style={{
          background: "hsl(var(--sidebar) / 0.92)",
          backdropFilter: "blur(32px)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25), 0 -1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {mobileNavMainItems.map(({ href, icon, key }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return <MobileNavBtn key={href} href={href} icon={icon} label={t(key)} active={active} />;
        })}

        {/* Ko'proq button */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          whileHover={{ scale: 1.08 }}
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl relative"
        >
          <motion.div
            animate={moreOpen ? { rotate: 90 } : { rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </motion.div>
          <span className="text-[9px] font-bold text-muted-foreground">{t("nav.more")}</span>
        </motion.button>
      </nav>

      {/* ── MOBILE "KO'PROQ" BOTTOM SHEET ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px]"
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61] rounded-t-[28px] overflow-hidden"
              style={{
                background: "hsl(var(--sidebar))",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)",
                boxShadow: "0 -20px 60px rgba(0,0,0,0.4), 0 -1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <motion.div
                  animate={{ width: [32, 48, 32] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="h-1 rounded-full bg-muted-foreground/30"
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/25">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-4 h-4 text-violet-400" />
                  </motion.div>
                  <p className="font-bold text-foreground text-base">{t("common.all_sections")}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.88, rotate: 90 }}
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </motion.button>
              </div>

              {/* All nav items grid */}
              <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-2">
                {allMobileNav.map(({ href, icon, key }) => {
                  const active = location === href || (href !== "/" && location.startsWith(href));
                  return (
                    <SheetGridBtn
                      key={href}
                      href={href}
                      icon={icon}
                      label={t(key)}
                      active={active}
                      onClick={() => setMoreOpen(false)}
                    />
                  );
                })}
              </div>

              {/* User + logout */}
              {user && (
                <div className="px-4 py-3 border-t border-border/25 mt-1 flex items-center justify-between">
                  <Link href="/profile" onClick={() => setMoreOpen(false)}>
                    <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        <div className="relative">
                          <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/30" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-sidebar" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-black text-white ring-2 ring-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.4)]">
                          {user.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-foreground">{user.displayName}</p>
                        <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                      </div>
                    </motion.div>
                  </Link>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold border border-red-500/20"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("auth.logout")}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <main className="min-h-screen pl-8 pb-20 md:pl-8 md:pb-0">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </main>

      {/* ── FLOATING USER AVATAR BUBBLE ── */}
      <FloatingAvatar />

      {/* ── MUNI FLOATING AI ── */}
      <MuniPanel />
    </div>
  );
}
