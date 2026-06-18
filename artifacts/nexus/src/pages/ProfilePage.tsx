import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon,
  Camera, Loader2, Radio, Bell, BellOff, Star, Check, X, Sparkles,
  ChevronRight, Pencil, Shield, HelpCircle, Globe, Users, Plus, Zap,
  Heart, MessageCircle, BarChart2, TrendingUp, Eye, Share2,
} from "lucide-react";
import { Link } from "wouter";
import {
  useGetUser, useListPosts, useFollowUser, useUpdateUser, getGetUserQueryKey,
  useListReels, useStartLive, useListCreatorPlans, useCheckCreatorSubscription,
  useSubscribeToCreator, useUnsubscribeFromCreator, useCreateCreatorPlan,
  getListCreatorPlansQueryKey, getCheckCreatorSubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, ReactNode, ElementType } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import ProfileOrb from "@/components/ProfileOrb";

interface ProfilePageProps { userId: number; }

const ORBIT_PARTICLES = [
  { radius: 64, color: "#D4A020", glow: "#C0392B", size: 9, dur: 5.5, delay: 0 },
  { radius: 72, color: "#B8860B", glow: "#C0392B", size: 7, dur: 7.5, delay: 1.8 },
  { radius: 80, color: "#C0392B", glow: "#B8860B", size: 6, dur: 9.5, delay: 3.5 },
];

/* ─── Ambient floating particles ───────────────────────────────── */
const AMBIENT = [
  { left: "8%",  top: "15%", dur: 4.2, del: 0,   size: 3, color: "#C0392B" },
  { left: "22%", top: "72%", dur: 3.5, del: 0.8,  size: 2, color: "#B8860B" },
  { left: "60%", top: "25%", dur: 5.1, del: 1.4,  size: 2.5, color: "#D4A020" },
  { left: "78%", top: "#0%", dur: 3.8, del: 0.3,  size: 2, color: "#C0392B" },
  { left: "90%", top: "60%", dur: 4.6, del: 2.1,  size: 3, color: "#B8860B" },
  { left: "45%", top: "88%", dur: 3.2, del: 1.0,  size: 2, color: "#D4A020" },
];

/* ─── 9D Neon Button ─────────────────────────────────────────── */
function NeonBtn({ children, onClick, disabled, gradient, glow, className = "" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  gradient: string; glow: string; className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9, rotateX: 8 }}
      whileHover={{ scale: 1.06, y: -2 }}
      style={{ perspective: 300 }}
      className={`relative overflow-hidden flex items-center gap-1.5 font-bold text-white text-xs rounded-full disabled:opacity-40 transition-all ${className}`}
    >
      <div className="absolute inset-0 rounded-full" style={{ background: gradient, boxShadow: `0 0 18px ${glow}, 0 4px 24px ${glow}55, inset 0 1px 0 rgba(255,255,255,0.28)` }} />
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{ x: ["-120%", "220%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", skewX: -20 }}
      />
      <span className="relative z-10 flex items-center gap-1.5 px-3 py-1.5">{children}</span>
    </motion.button>
  );
}

/* ─── Reusable bottom sheet ─────────────────────────────────── */
function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 480, damping: 42 }}
            className="relative w-full max-w-sm z-10 rounded-t-[28px] overflow-hidden"
            style={{
              background: "hsl(var(--card))",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.45), 0 -1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <motion.div
                animate={{ width: [32, 48, 32] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="h-[3px] rounded-full bg-muted-foreground/25"
              />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── 3D Avatar ─────────────────────────────────────────────── */
function Avatar3D({ avatarUrl, displayName, isVerified, isUploading, isOwner, onUploadClick }: {
  avatarUrl?: string | null; displayName: string; isVerified?: boolean;
  isUploading: boolean; isOwner: boolean; onUploadClick: () => void;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [22, -22]), { stiffness: 280, damping: 18 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-22, 22]), { stiffness: 280, damping: 18 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  return (
    <div style={{ perspective: "900px", width: 112, height: 112 }} className="relative"
      onMouseMove={handleMouseMove} onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}>
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="relative w-28 h-28">
        {/* Outer glow aura */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-8 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(192,57,43,0.45) 0%, rgba(184,134,11,0.28) 50%, transparent 72%)", filter: "blur(14px)" }} />

        {/* Activity rings */}
        <svg className="absolute pointer-events-none" style={{ top: -32, left: -32, width: 176, height: 176, overflow: "visible" }} viewBox="0 0 176 176">
          <defs>
            <linearGradient id="gr1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C0392B" /><stop offset="100%" stopColor="#D4A020" /></linearGradient>
            <linearGradient id="gr2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B8860B" /><stop offset="100%" stopColor="#D4A020" /></linearGradient>
            <linearGradient id="gr3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C0392B" /><stop offset="100%" stopColor="#B8860B" /></linearGradient>
          </defs>
          <circle cx="88" cy="88" r="82" fill="none" stroke="#C0392B15" strokeWidth="5" />
          <circle cx="88" cy="88" r="72" fill="none" stroke="#3b82f615" strokeWidth="4.5" />
          <circle cx="88" cy="88" r="62" fill="none" stroke="#10b98115" strokeWidth="4" />
          <motion.circle cx="88" cy="88" r="82" fill="none" stroke="url(#gr1)" strokeWidth="5" strokeLinecap="round" strokeDasharray="515 515"
            animate={{ strokeDashoffset: [515, 90, 515] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }} />
          <motion.circle cx="88" cy="88" r="72" fill="none" stroke="url(#gr2)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="452 452"
            animate={{ strokeDashoffset: [452, 70, 452] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }} />
          <motion.circle cx="88" cy="88" r="62" fill="none" stroke="url(#gr3)" strokeWidth="4" strokeLinecap="round" strokeDasharray="389 389"
            animate={{ strokeDashoffset: [389, 55, 389] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }} />
        </svg>

        {/* Orbit particles */}
        {ORBIT_PARTICLES.map(({ radius, color, glow, size, dur, delay }, i) => (
          <motion.div key={i} className="absolute" style={{ top: "50%", left: "50%", width: 0, height: 0 }}
            animate={{ rotate: 360 }} transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}>
            <div style={{
              position: "absolute", width: size, height: size, borderRadius: "50%", background: color,
              boxShadow: `0 0 ${size * 2.5}px ${glow}, 0 0 ${size * 5}px ${glow}50`,
              top: -radius - size / 2, left: -size / 2,
            }} />
          </motion.div>
        ))}

        {/* Spinning gradient border */}
        <div className="absolute inset-0 rounded-[22px] overflow-hidden" style={{ padding: "2.5px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className="absolute" style={{ width: "180%", height: "180%", top: "-40%", left: "-40%",
              background: "conic-gradient(from 0deg, #C0392B, #D4A020, #B8860B, #f59e0b, #C0392B, #ec4899, #C0392B, #D4A020)" }} />
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-background z-10 group/av cursor-pointer"
               onClick={isOwner ? onUploadClick : undefined}>
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "radial-gradient(circle at 35% 35%, rgba(192,57,43,0.3), rgba(184,134,11,0.2), rgba(212,160,32,0.15))" }}>
                <span className="text-3xl font-black text-primary drop-shadow-[0_0_8px_rgba(192,57,43,0.6)]">{displayName[0]}</span>
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity rounded-[20px]">
                <Camera className="w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              </div>
            )}
          </div>
        </div>

        {/* Sheen reflection */}
        <motion.div animate={{ opacity: [0.12, 0.32, 0.12] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-[22px] pointer-events-none z-20"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, transparent 50%)", transform: "translateZ(18px)" }} />

        {/* Verified badge */}
        {isVerified && (
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 }}
            className="absolute -bottom-2 -right-2 z-30" style={{ transform: "translateZ(26px)" }}>
            <motion.div animate={{ boxShadow: ["0 0 8px rgba(192,57,43,0.4)", "0 0 20px rgba(192,57,43,0.7)", "0 0 8px rgba(192,57,43,0.4)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-700 to-amber-700 flex items-center justify-center">
                <BadgeCheck className="w-4 h-4 text-white" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── 9D Stats Card ──────────────────────────────────────────── */
function StatCard({ label, value, color, glow, delay }: { label: string; value: number; color: string; glow: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-25, 25], [8, -8]), { stiffness: 280, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-25, 25], [-8, 8]), { stiffness: 280, damping: 22 });

  return (
    <div ref={ref}
      onMouseMove={(e) => { const r = ref.current?.getBoundingClientRect(); if (r) { mx.set(e.clientX - r.left - r.width / 2); my.set(e.clientY - r.top - r.height / 2); } }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      style={{ perspective: 300 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, type: "spring", stiffness: 280, damping: 22 }}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="text-center cursor-default rounded-2xl py-3 px-2 relative overflow-hidden"
      >
        {/* Glass card bg */}
        <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(145deg, ${glow}18, ${glow}08)`, border: `1px solid ${glow}25` }} />
        {/* Ambient glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${glow}30, transparent 65%)` }}
        />
        <motion.p
          className={`text-xl font-black relative z-10`}
          style={{ color, textShadow: `0 0 16px ${glow}80, 0 0 32px ${glow}40` }}
          animate={{ textShadow: [`0 0 8px ${glow}60`, `0 0 20px ${glow}90`, `0 0 8px ${glow}60`] }}
          transition={{ duration: 3, repeat: Infinity, delay }}
        >
          {(value ?? 0).toLocaleString()}
        </motion.p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold relative z-10">{label}</p>
      </motion.div>
    </div>
  );
}

/* ─── 9D Tab Button ──────────────────────────────────────────── */
function TabBtn({ active, icon: Icon, label, onClick }: { active: boolean; icon: ElementType; label: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93, rotateX: 6 }}
      whileHover={{ scale: 1.03, y: -1 }}
      style={{ perspective: 200 }}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
    >
      {active && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 rounded-xl"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          style={{
            background: "linear-gradient(135deg, rgba(192,57,43,0.25), rgba(59,130,246,0.18))",
            boxShadow: "0 0 16px rgba(192,57,43,0.25), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
            border: "1px solid rgba(192,57,43,0.3)",
          }}
        />
      )}
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", skewX: -20 }}
        />
      )}
      <Icon className={`w-4 h-4 relative z-10 ${active ? "text-amber-400 drop-shadow-[0_0_6px_rgba(184,134,11,0.8)]" : "text-muted-foreground"}`} />
      <span className={`relative z-10 ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </motion.button>
  );
}

/* ─── Live Sheet ─────────────────────────────────────────────── */
function LiveSheet({ open, onClose, liveTitle, setLiveTitle, onStart, starting }: {
  open: boolean; onClose: () => void; liveTitle: string;
  setLiveTitle: (v: string) => void; onStart: () => void; starting: boolean;
}) {
  const { t } = useTranslation();
  const LIVE_CATS = [
    t("live_explore.cat_music"),
    t("live_explore.cat_gaming"),
    t("live_explore.cat_talk"),
    t("live_explore.cat_sports"),
    t("live_explore.cat_art"),
    t("live_explore.cat_edu"),
  ];
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState<"public" | "subscribers">("public");

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400"
            />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            <Radio className="w-5 h-5 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
          </div>
          <h2 className="text-base font-bold">{t("live_explore.start_title")}</h2>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="mx-5 mb-4 h-28 rounded-2xl overflow-hidden relative border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center flex-col gap-1.5">
          <div className="w-10 h-10 rounded-full border-2 border-white/25 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white/50" />
          </div>
          <span className="text-white/40 text-xs font-medium">{t("live_explore.camera")}</span>
        </motion.div>
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 rounded-md px-2 py-0.5 shadow-[0_0_12px_rgba(220,38,38,0.6)]">
          <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="text-white text-[10px] font-black tracking-widest">LIVE</span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 rounded-md px-2 py-0.5">
          <Users className="w-3 h-3 text-white/70" /><span className="text-white/70 text-[10px] font-semibold">0</span>
        </div>
      </div>

      <div className="px-5 pb-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{t("live_explore.stream_title_label")}</label>
          <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onStart(); }}
            placeholder={t("live_explore.name_placeholder")} maxLength={80}
            className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 ring-red-500/60 placeholder:text-muted-foreground/50" autoFocus />
          <p className="text-right text-[10px] text-muted-foreground/50 mt-1">{liveTitle.length}/80</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">{t("live_explore.category")}</label>
          <div className="flex flex-wrap gap-1.5">
            {LIVE_CATS.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.92 }} onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${category === cat
                  ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">{t("live_explore.audience")}</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["public", Globe, t("live_explore.public"), t("live_explore.public_sub")],
              ["subscribers", Star, t("live_explore.subs_only"), t("live_explore.subs_sub")],
            ] as const).map(([val, Icon, label, sub]) => (
              <motion.button key={val} whileTap={{ scale: 0.97 }} onClick={() => setAudience(val)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${audience === val
                  ? "border-red-500/60 bg-red-500/10 text-foreground shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "border-border bg-muted/40 text-muted-foreground"}`}>
                <Icon className={`w-4 h-4 shrink-0 ${audience === val ? "text-red-500" : ""}`} />
                <div><p className="text-xs font-semibold">{label}</p><p className="text-[10px] opacity-60">{sub}</p></div>
              </motion.button>
            ))}
          </div>
        </div>
        <NeonBtn onClick={onStart} disabled={!liveTitle.trim() || starting}
          gradient="linear-gradient(135deg, #dc2626, #f87171)"
          glow="rgba(220,38,38,0.6)"
          className="w-full h-11 justify-center rounded-2xl text-sm">
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          {starting ? t("live_explore.connecting") : t("live_explore.go_live")}
        </NeonBtn>
      </div>
    </BottomSheet>
  );
}

/* ─── Subscription Sheet ─────────────────────────────────────── */
function SubscriptionSheet({ open, onClose, isOwner, plans, isSubscribed, subscribingPlanId, subError,
  onSubscribe, onUnsubscribe, onCreatePlan, newPlanName, setNewPlanName, newPlanDesc, setNewPlanDesc,
  newPlanPrice, setNewPlanPrice, newPlanPerks, setNewPlanPerks, creatingPlan }: {
  open: boolean; onClose: () => void; isOwner: boolean;
  plans: Array<{ id: number; name: string; description?: string | null; price?: number | null; perks?: string[] | null; subscriberCount?: number | null }>;
  isSubscribed: boolean; subscribingPlanId: number | null; subError: string | null;
  onSubscribe: (id: number) => void; onUnsubscribe: (id: number) => void;
  onCreatePlan: () => void;
  newPlanName: string; setNewPlanName: (v: string) => void;
  newPlanDesc: string; setNewPlanDesc: (v: string) => void;
  newPlanPrice: string; setNewPlanPrice: (v: string) => void;
  newPlanPerks: string; setNewPlanPerks: (v: string) => void;
  creatingPlan: boolean;
}) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const totalSubs = plans.reduce((s, p) => s + (p.subscriberCount ?? 0), 0);
  const monthlyRev = plans.reduce((s, p) => s + ((p.price ?? 0) / 100) * (p.subscriberCount ?? 0), 0);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.5)]">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </motion.div>
          <h2 className="text-base font-bold">{isOwner ? t("profile.plans_title") : t("profile.subscription")}</h2>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="px-5 pb-6 max-h-[65vh] overflow-y-auto space-y-3">
        {isOwner && plans.length > 0 && (
          <div className="rounded-2xl border border-yellow-500/25 p-3.5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(249,115,22,0.08))", boxShadow: "0 0 20px rgba(234,179,8,0.12)" }}>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{t("profile.monthly_revenue")}</p>
              <p className="text-lg font-black text-yellow-500" style={{ textShadow: "0 0 12px rgba(234,179,8,0.5)" }}>{monthlyRev.toLocaleString()} {t("market.som")}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{t("profile.stat_followers")}</p>
              <p className="text-lg font-black text-foreground">{totalSubs}</p>
            </div>
          </div>
        )}

        {subError && <p className="text-red-500 text-xs text-center bg-red-500/10 rounded-xl py-2">{subError}</p>}

        {plans.length === 0 && !creating ? (
          <div className="py-8 text-center text-muted-foreground">
            <motion.div animate={{ y: [-4, 4, -4], rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-12 rounded-full bg-yellow-500/10 mx-auto mb-3 flex items-center justify-center border border-yellow-500/20">
              <Star className="w-6 h-6 text-yellow-500/50" />
            </motion.div>
            <p className="text-sm font-medium">{isOwner ? t("profile.no_plans_yet") : t("profile.no_subs_yet")}</p>
            <p className="text-xs mt-1 opacity-60">{isOwner ? t("profile.create_first_plan") : t("profile.creator_no_plans")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {plans.map((plan, idx) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-yellow-500/20 bg-muted/25 p-3.5"
                style={{ boxShadow: "0 2px 12px rgba(234,179,8,0.08)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 4, repeat: Infinity }}
                      className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/25 flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{plan.name}</p>
                      {plan.description && <p className="text-[10px] text-muted-foreground">{plan.description}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-black text-yellow-500">{((plan.price ?? 0) / 100).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{t("profile.per_month")}</p>
                  </div>
                </div>
                {plan.perks && plan.perks.length > 0 && (
                  <ul className="space-y-1 mb-2.5">
                    {plan.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="w-3 h-3 text-green-400 shrink-0" /> {perk}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">{plan.subscriberCount ?? 0} {t("profile.sub_count")}</span>
                  {!isOwner && (
                    isSubscribed ? (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => onUnsubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />} {t("profile.cancel_sub")}
                      </motion.button>
                    ) : (
                      <NeonBtn onClick={() => onSubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                        gradient="linear-gradient(135deg, #f59e0b, #f97316)"
                        glow="rgba(245,158,11,0.55)" className="h-7 text-[11px]">
                        {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 fill-white" />} {t("profile.subscribe_label")}
                      </NeonBtn>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isOwner && (
          creating ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-yellow-500" /> {t("profile.new_plan")}</p>
                <motion.button whileTap={{ rotate: 90 }} onClick={() => setCreating(false)} className="text-muted-foreground"><X className="w-4 h-4" /></motion.button>
              </div>
              <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder={t("profile.plan_name_ph")}
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60" />
              <input value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} placeholder={t("profile.plan_desc_ph")}
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60" />
              <div className="relative">
                <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder={t("profile.plan_price_ph")}
                  className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60 pr-14" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("market.som")}</span>
              </div>
              <textarea value={newPlanPerks} onChange={e => setNewPlanPerks(e.target.value)} rows={2}
                placeholder={t("profile.plan_perks_ph")}
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60 resize-none" />
              <NeonBtn onClick={onCreatePlan} disabled={!newPlanName.trim() || !newPlanPrice || creatingPlan}
                gradient="linear-gradient(135deg, #f59e0b, #f97316)" glow="rgba(245,158,11,0.55)"
                className="w-full h-10 justify-center rounded-xl text-sm">
                {creatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t("profile.create_plan")}
              </NeonBtn>
            </motion.div>
          ) : (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCreating(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-yellow-500/30 text-yellow-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-yellow-500/8 transition-colors">
              <Plus className="w-4 h-4" /> {t("profile.add_plan")}
            </motion.button>
          )
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Settings Sheet ─────────────────────────────────────────── */
function SettingsSheet({ open, onClose, user, isOwner, onAvatarClick, onCoverClick, onOpenSubscription }: {
  open: boolean; onClose: () => void;
  user: { displayName: string; username: string; avatarUrl?: string | null };
  isOwner: boolean; onAvatarClick: () => void; onCoverClick: () => void;
  onOpenSubscription: () => void;
}) {
  const { t } = useTranslation();
  const rows = [
    { icon: Pencil, label: t("settings.edit_profile"), sub: t("settings.edit_profile_sub"), color: "#D4A020", glow: "rgba(184,134,11,0.4)", onClick: onAvatarClick },
    { icon: Bell, label: t("settings.notifications"), sub: t("settings.notifications_sub"), color: "#60a5fa", glow: "rgba(96,165,250,0.4)", onClick: () => {} },
    { icon: Shield, label: t("settings.privacy"), sub: t("settings.privacy_sub"), color: "#34d399", glow: "rgba(52,211,153,0.4)", onClick: () => {} },
    ...(isOwner ? [{ icon: Sparkles, label: t("settings.subs_plans"), sub: t("settings.subs_plans_sub"), color: "#fbbf24", glow: "rgba(251,191,36,0.4)", onClick: () => { onClose(); onOpenSubscription(); } }] : []),
    { icon: Zap, label: t("nav.premium"), sub: t("settings.premium_sub"), color: "#fb923c", glow: "rgba(251,146,60,0.4)", onClick: () => {} },
    { icon: HelpCircle, label: t("settings.title"), sub: t("settings.help_sub"), color: "#94a3b8", glow: "rgba(148,163,184,0.3)", onClick: () => {} },
  ];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pt-1 pb-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-muted border border-border/60 shrink-0 shadow-[0_0_12px_rgba(192,57,43,0.2)]">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/25 to-amber-500/20">
              <span className="text-lg font-black text-primary">{user.displayName[0]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="px-3 pb-6 space-y-0.5">
        {rows.map(({ icon: Icon, label, sub, color, glow, onClick }, i) => (
          <motion.button key={i} whileTap={{ scale: 0.97, x: 4 }} whileHover={{ x: 3 }} onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/50 transition-all text-left group">
            <motion.div
              whileHover={{ scale: 1.12, rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.3 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: `${glow.replace("0.4", "0.12")}`, border: `1px solid ${glow.replace("0.4", "0.25")}` }}
            >
              <Icon className="w-4 h-4" style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/35 shrink-0 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
          </motion.button>
        ))}

        {isOwner && (
          <>
            <div className="h-px bg-border/35 my-1.5 mx-3" />
            <motion.button whileTap={{ scale: 0.97, x: 4 }} whileHover={{ x: 3 }} onClick={onCoverClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/50 transition-all text-left group">
              <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("settings.change_cover")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.cover_sub")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/35 shrink-0 group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ProfilePage({ userId }: ProfilePageProps) {
  const { t } = useTranslation();
  const { data: user, isLoading } = useGetUser(userId, { query: { queryKey: getGetUserQueryKey(userId) } });
  const { data: posts = [] } = useListPosts({ userId });
  const { data: reels = [] } = useListReels({ userId });
  const [following, setFollowing] = useState(false);
  const follow = useFollowUser();
  const updateUser = useUpdateUser();
  const startLive = useStartLive();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reels" | "analytics">("posts");
  const { user: me } = useAuth();
  const isOwner = me?.id === userId;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const [showLive, setShowLive] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveStarting, setLiveStarting] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanPerks, setNewPlanPerks] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  const { data: plans = [] } = useListCreatorPlans(userId, { query: { queryKey: getListCreatorPlansQueryKey(userId) } });
  const { data: subCheck, refetch: refetchSub } = useCheckCreatorSubscription(userId, { query: { queryKey: getCheckCreatorSubscriptionQueryKey(userId), enabled: !isOwner && !!me } });
  const subscribeMutation = useSubscribeToCreator();
  const unsubscribeMutation = useUnsubscribeFromCreator();
  const createPlanMutation = useCreateCreatorPlan();
  const isSubscribed = subCheck?.isSubscribed ?? false;

  const { uploadFile: upAvatar, isUploading: avatarUploading } = useMediaUpload({
    onSuccess: r => updateUser.mutate({ id: userId, data: { avatarUrl: r.serveUrl } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }); },
    }),
  });
  const { uploadFile: upCover, isUploading: coverUploading } = useMediaUpload({
    onSuccess: r => updateUser.mutate({ id: userId, data: { coverUrl: r.serveUrl } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }); },
    }),
  });

  const handleFollow = () => {
    setFollowing(!following);
    follow.mutate({ id: userId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }) });
  };
  const handleGoLive = async () => {
    if (!liveTitle.trim()) return;
    setLiveStarting(true);
    try { const stream = await startLive.mutateAsync({ data: { title: liveTitle.trim() } }); navigate(`/live/${stream.id}`); }
    catch { setLiveStarting(false); }
  };
  const handleSubscribe = async (planId: number) => {
    setSubError(null); setSubscribingPlanId(planId);
    try { await subscribeMutation.mutateAsync({ planId }); await refetchSub(); setShowSub(false); }
    catch (err: any) { setSubError(err?.response?.data?.error ?? "Xatolik yuz berdi"); }
    finally { setSubscribingPlanId(null); }
  };
  const handleUnsubscribe = async (planId: number) => {
    setSubscribingPlanId(planId);
    try { await unsubscribeMutation.mutateAsync({ planId }); await refetchSub(); }
    catch {} finally { setSubscribingPlanId(null); }
  };
  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !newPlanPrice) return;
    setCreatingPlan(true);
    try {
      const perks = newPlanPerks.split("\n").map(p => p.trim()).filter(Boolean);
      await createPlanMutation.mutateAsync({ data: { name: newPlanName.trim(), description: newPlanDesc.trim() || undefined, price: Math.round(parseFloat(newPlanPrice) * 100), perks } });
      qc.invalidateQueries({ queryKey: getListCreatorPlansQueryKey(userId) });
      setNewPlanName(""); setNewPlanDesc(""); setNewPlanPrice(""); setNewPlanPerks("");
    } catch {} finally { setCreatingPlan(false); }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-52 bg-card rounded-2xl animate-pulse relative overflow-hidden">
          <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ skewX: -15 }} />
        </div>
        <div className="flex gap-4"><div className="w-28 h-28 rounded-full bg-muted animate-pulse -mt-14 ml-4" /></div>
      </div>
    );
  }
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const myPosts = posts.filter(p => p.author.id === userId);

  return (
    <div className="max-w-2xl mx-auto pb-10 relative">

      {/* Ambient floating particles */}
      {AMBIENT.map((p, i) => (
        <motion.div key={i}
          className="absolute rounded-full pointer-events-none z-0"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 4}px ${p.color}` }}
          animate={{ y: [-6, 6, -6], opacity: [0.25, 0.7, 0.25], scale: [1, 1.4, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: "easeInOut" }}
        />
      ))}

      {/* ── Cover ── */}
      <div className="h-52 overflow-hidden relative group/cover rounded-b-3xl z-10">
        <AnimatePresence mode="wait">
          {user.coverUrl ? (
            <motion.img key="cover-img" src={user.coverUrl} alt=""
              initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <motion.div key="cover-default" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 overflow-hidden bg-[#080816]">
              {/* Deep aurora blobs */}
              <motion.div animate={{ x: [0, 50, -15, 0], y: [0, -30, 12, 0], scale: [1, 1.2, 0.92, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-24 -left-24 w-96 h-96 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(192,57,43,0.65) 0%, transparent 68%)", filter: "blur(28px)" }} />
              <motion.div animate={{ x: [0, -35, 18, 0], y: [0, 22, -18, 0], scale: [1, 0.88, 1.15, 1] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 68%)", filter: "blur(24px)" }} />
              <motion.div animate={{ x: [0, 22, -22, 0], y: [0, 16, -12, 0], scale: [1, 1.1, 0.95, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/3 left-1/3 w-52 h-52 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(52,211,153,0.38) 0%, transparent 68%)", filter: "blur(20px)" }} />
              {/* Cyan accent */}
              <motion.div animate={{ x: [0, -18, 28, 0], y: [0, -12, 8, 0] }}
                transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                className="absolute top-0 right-1/4 w-40 h-40 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)", filter: "blur(18px)" }} />

              {/* Floating stars */}
              {[
                { left: "8%",  top: "20%", dur: 3.2, del: 0,   size: 4 },
                { left: "25%", top: "55%", dur: 4.1, del: 0.8,  size: 3 },
                { left: "50%", top: "18%", dur: 2.8, del: 1.5,  size: 5 },
                { left: "70%", top: "65%", dur: 3.6, del: 0.4,  size: 3 },
                { left: "85%", top: "30%", dur: 2.5, del: 2,    size: 4 },
                { left: "42%", top: "78%", dur: 4.4, del: 1.2,  size: 2 },
                { left: "92%", top: "72%", dur: 3.0, del: 0.6,  size: 3 },
              ].map((dot, i) => (
                <motion.div key={i} className="absolute rounded-full bg-white"
                  style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size, boxShadow: `0 0 ${dot.size * 3}px rgba(255,255,255,0.8)` }}
                  animate={{ y: [-5, 5, -5], opacity: [0.15, 0.85, 0.15], scale: [1, 1.5, 1] }}
                  transition={{ duration: dot.dur, repeat: Infinity, delay: dot.del }} />
              ))}

              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
              {/* Scan line */}
              <motion.div
                animate={{ y: ["-100%", "300%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent pointer-events-none"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent pointer-events-none" />

        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />
            <AnimatePresence>
              {coverUploading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-[4px] flex flex-col items-center justify-center gap-2.5 z-20">
                  <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ skewX: "-15deg" }} />
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <p className="text-white/80 text-xs font-semibold tracking-wide">{t("settings.cover_uploading")}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!coverUploading && (
              <div onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 opacity-0 group-hover/cover:opacity-100 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2.5 z-10"
                style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(1px)" }}>
                <motion.div whileHover={{ scale: 1.14, rotate: 6 }} whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-xl"
                  style={{ boxShadow: "0 0 20px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)" }}>
                  <Camera className="w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                </motion.div>
                <p className="text-white text-xs font-semibold drop-shadow-md tracking-wide">{t("settings.cover_change_btn")}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="px-5 relative z-10">
        {/* Avatar + action row */}
        <div className="flex items-end justify-between mb-4" style={{ marginTop: -44 }}>
          <div className="relative z-10">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
            <Avatar3D avatarUrl={user.avatarUrl} displayName={user.displayName} isVerified={user.isVerified}
              isUploading={avatarUploading} isOwner={isOwner} onUploadClick={() => avatarInputRef.current?.click()} />
          </div>

          {/* 9D Action buttons */}
          <div className="flex items-center gap-1.5 pb-1">
            {isOwner ? (
              <>
                <NeonBtn onClick={() => setShowLive(true)}
                  gradient="linear-gradient(135deg, #dc2626, #f87171)"
                  glow="rgba(220,38,38,0.65)" className="h-8 relative">
                  <motion.span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-300"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400" />
                  <Radio className="w-3 h-3" /> {t("profile.live_btn")}
                </NeonBtn>
                <NeonBtn onClick={() => setShowSub(true)}
                  gradient="linear-gradient(135deg, rgba(234,179,8,0.3), rgba(249,115,22,0.25))"
                  glow="rgba(234,179,8,0.4)" className="h-8 border border-yellow-500/30 text-yellow-500">
                  <Star className="w-3 h-3" /> {t("profile.plans_title")}
                </NeonBtn>
                <motion.button whileTap={{ scale: 0.88, rotate: 90 }} whileHover={{ scale: 1.1, rotate: 30 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  onClick={() => setShowSettings(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground border border-border/50 bg-muted/60 hover:bg-muted hover:border-primary/30 hover:text-foreground transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  <Settings className="w-3.5 h-3.5" />
                </motion.button>
              </>
            ) : (
              <>
                <NeonBtn onClick={handleFollow}
                  gradient={following
                    ? "linear-gradient(135deg, rgba(100,116,139,0.4), rgba(148,163,184,0.25))"
                    : "linear-gradient(135deg, #C0392B, #B8860B)"}
                  glow={following ? "rgba(148,163,184,0.3)" : "rgba(192,57,43,0.6)"}
                  className={`h-8 ${following ? "border border-border/50 text-muted-foreground" : ""}`}>
                  {following ? <><UserCheck className="w-3.5 h-3.5" /> {t("profile.following_btn")}</> : <><UserPlus className="w-3.5 h-3.5" /> {t("profile.follow_btn")}</>}
                </NeonBtn>
                <NeonBtn onClick={() => setShowSub(true)}
                  gradient={isSubscribed
                    ? "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.15))"
                    : "linear-gradient(135deg, rgba(100,116,139,0.3), rgba(148,163,184,0.2))"}
                  glow={isSubscribed ? "rgba(234,179,8,0.35)" : "rgba(148,163,184,0.2)"}
                  className={`h-8 border ${isSubscribed ? "border-yellow-500/30 text-yellow-500" : "border-border/40 text-muted-foreground"}`}>
                  {isSubscribed ? <><Check className="w-3.5 h-3.5" /> {t("profile.subscribed")}</> : <><Bell className="w-3.5 h-3.5" /> {t("profile.subscription")}</>}
                </NeonBtn>
              </>
            )}
          </div>
        </div>

        {/* Name / bio */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 22 }} className="mb-5 pl-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-black text-foreground">{user.displayName}</h1>
            {user.isVerified && (
              <motion.div animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 4px rgba(192,57,43,0.4))", "drop-shadow(0 0 10px rgba(192,57,43,0.8))", "drop-shadow(0 0 4px rgba(192,57,43,0.4))"] }}
                transition={{ duration: 2.5, repeat: Infinity }}>
                <BadgeCheck className="w-5 h-5 text-primary" />
              </motion.div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-1">@{user.username}</p>
          {user.bio && <p className="text-sm text-foreground/85 leading-relaxed">{user.bio}</p>}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pb-5 border-b border-border/40 mb-5">
          <StatCard label={t("profile.posts")} value={myPosts.length} color="#D4A020" glow="#C0392B" delay={0.22} />
          <StatCard label={t("profile.stat_followers")} value={user.followersCount ?? 0} color="#B8860B" glow="#C0392B" delay={0.30} />
          <StatCard label={t("profile.stat_following")} value={user.followingCount ?? 0} color="#D4A020" glow="#B8860B" delay={0.38} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted/50 rounded-2xl p-1 border border-border/30"
          style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)" }}>
          {([
            ["posts", Grid3X3, t("profile.posts") || "Posts"],
            ["reels", Play, "Reels"],
            ...(isOwner ? [["analytics", BarChart2, t("admin.analytics")]] : []),
          ] as [string, ElementType, string][]).map(([tabId, Icon, label]) => (
            <TabBtn key={tabId} active={tab === tabId} icon={Icon} label={label} onClick={() => setTab(tabId as "posts" | "reels" | "analytics")} />
          ))}
        </div>

        {/* Posts grid */}
        {tab === "posts" && (
          myPosts.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14 text-muted-foreground">
              <motion.div animate={{ y: [-4, 4, -4], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                <BookmarkIcon className="w-7 h-7 opacity-40" />
              </motion.div>
              <p className="text-sm font-medium">{t("profile.no_posts") || "No posts yet"}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {myPosts.map((post, i) => (
                <motion.div key={post.id}
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 22 }}>
                  <Link href={`/post/${post.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.04, y: -3, rotateX: 3 }}
                      whileTap={{ scale: 0.96 }}
                      style={{ perspective: 300, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
                      className="aspect-square rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer relative group/post"
                    >
                      {post.mediaUrl && post.type !== "video" ? (
                        <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : post.mediaUrl && post.type === "video" ? (
                        <div className="w-full h-full relative bg-black">
                          <video src={post.mediaUrl} className="w-full h-full object-cover" muted preload="none" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }}
                              className="w-9 h-9 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] ml-0.5" />
                            </motion.div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3"
                          style={{ background: "linear-gradient(135deg, rgba(192,57,43,0.18), rgba(59,130,246,0.12), rgba(16,185,129,0.08))" }}>
                          <p className="text-xs text-foreground/80 line-clamp-4 text-center leading-relaxed">{post.content}</p>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <motion.div
                        className="absolute inset-0 bg-black/55 backdrop-blur-[1px] opacity-0 group-hover/post:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-4 h-4 fill-white drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                          <span className="text-sm font-bold">{post.likesCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-4 h-4 fill-white drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]" />
                          <span className="text-sm font-bold">{post.commentsCount ?? 0}</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Reels grid */}
        {tab === "reels" && (
          reels.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14 text-muted-foreground">
              <motion.div animate={{ y: [-4, 4, -4], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                <Play className="w-7 h-7 opacity-40" />
              </motion.div>
              <p className="text-sm font-medium">{t("profile.no_reels")}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {reels.map((reel, i) => (
                <motion.div key={reel.id}
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 22 }}>
                  <Link href="/reels">
                    <motion.div
                      whileHover={{ scale: 1.04, y: -3 }}
                      whileTap={{ scale: 0.96 }}
                      className="aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer relative group/reel"
                      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
                    >
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : reel.videoUrl ? (
                        <video src={reel.videoUrl} className="w-full h-full object-cover" muted preload="none"
                          onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(192,57,43,0.2), rgba(59,130,246,0.15))" }}>
                          <Play className="w-8 h-8 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/reel:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center">
                        <motion.div whileHover={{ scale: 1.18 }}
                          className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm"
                          style={{ boxShadow: "0 0 16px rgba(255,255,255,0.3)" }}>
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </motion.div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-1 text-white">
                          <Play className="w-2.5 h-2.5 fill-white opacity-80" />
                          <span className="text-[10px] font-semibold opacity-90">
                            {(reel.viewsCount ?? 0) >= 1000 ? `${((reel.viewsCount ?? 0) / 1000).toFixed(1)}K` : reel.viewsCount ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                          <Heart className="w-2.5 h-2.5 fill-white opacity-80" />
                          <span className="text-[10px] font-semibold opacity-90">{reel.likesCount ?? 0}</span>
                        </div>
                      </div>
                      {reel.thumbnailUrl && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/55 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Analytics tab */}
        {tab === "analytics" && isOwner && (() => {
          const totalLikes = myPosts.reduce((s, p) => s + (p.likesCount ?? 0), 0) + reels.reduce((s, r) => s + (r.likesCount ?? 0), 0);
          const totalComments = myPosts.reduce((s, p) => s + (p.commentsCount ?? 0), 0);
          const totalViews = reels.reduce((s, r) => s + (r.viewsCount ?? 0), 0);
          const totalShares = myPosts.reduce((s, p) => s + ((p as any).sharesCount ?? 0), 0);
          const totalContent = myPosts.length + reels.length;
          const avgEng = totalContent > 0 ? Math.round((totalLikes + totalComments) / totalContent * 10) / 10 : 0;
          const topPost = [...myPosts].sort((a, b) => ((b.likesCount ?? 0) + (b.commentsCount ?? 0)) - ((a.likesCount ?? 0) + (a.commentsCount ?? 0)))[0];
          const topReel = [...reels].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))[0];

          const statCards = [
            { icon: Heart, label: t("profile.total_likes"), value: totalLikes.toLocaleString(), color: "#f472b6", glow: "rgba(244,114,182,0.55)" },
            { icon: MessageCircle, label: t("profile.total_comments"), value: totalComments.toLocaleString(), color: "#60a5fa", glow: "rgba(96,165,250,0.55)" },
            { icon: Eye, label: t("profile.total_views"), value: totalViews.toLocaleString(), color: "#c084fc", glow: "rgba(192,132,252,0.55)" },
            { icon: Share2, label: t("profile.total_shares"), value: totalShares.toLocaleString(), color: "#34d399", glow: "rgba(52,211,153,0.55)" },
            { icon: TrendingUp, label: t("profile.avg_engagement"), value: `${avgEng}`, color: "#fbbf24", glow: "rgba(251,191,36,0.55)" },
            { icon: BarChart2, label: t("profile.total_content"), value: totalContent.toString(), color: "#67e8f9", glow: "rgba(103,232,249,0.55)" },
          ];

          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pb-6">
              <div className="grid grid-cols-2 gap-2.5">
                {statCards.map(({ icon: Icon, label, value, color, glow }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, scale: 0.88, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 22 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    style={{
                      perspective: 200,
                      background: `linear-gradient(145deg, ${glow.replace("0.55", "0.12")}, ${glow.replace("0.55", "0.05")})`,
                      border: `1px solid ${glow.replace("0.55", "0.22")}`,
                      boxShadow: `0 4px 16px ${glow.replace("0.55", "0.1")}`,
                    }}
                    className="rounded-2xl p-3.5 relative overflow-hidden cursor-default"
                  >
                    <motion.div
                      animate={{ opacity: [0.25, 0.5, 0.25] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 20% 20%, ${glow.replace("0.55", "0.25")}, transparent 65%)` }}
                    />
                    <div className="flex items-center gap-2.5 relative z-10">
                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                        className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0"
                        style={{ boxShadow: `0 0 12px ${glow.replace("0.55", "0.3")}` }}>
                        <Icon className="w-4 h-4" style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} />
                      </motion.div>
                      <div>
                        <p className="text-lg font-black" style={{ color, textShadow: `0 0 12px ${glow}` }}>{value}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight font-semibold">{label}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {topPost && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className="rounded-2xl border border-yellow-500/20 p-4"
                  style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(249,115,22,0.04))", boxShadow: "0 4px 16px rgba(234,179,8,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <motion.div animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                    </motion.div>
                    <span className="text-xs font-bold text-foreground">{t("profile.top_post")}</span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{topPost.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{topPost.likesCount ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{topPost.commentsCount ?? 0}</span>
                  </div>
                </motion.div>
              )}

              {topReel && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
                  className="rounded-2xl border border-primary/20 p-4"
                  style={{ background: "linear-gradient(135deg, rgba(192,57,43,0.08), rgba(59,130,246,0.04))", boxShadow: "0 4px 16px rgba(192,57,43,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </motion.div>
                    <span className="text-xs font-bold text-foreground">{t("profile.top_reel")}</span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{topReel.caption ?? "Reel"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-amber-400" />{(topReel.viewsCount ?? 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{topReel.likesCount ?? 0}</span>
                  </div>
                </motion.div>
              )}

              {totalContent === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground">
                  <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }}>
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  </motion.div>
                  <p className="text-sm">{t("profile.no_content")}</p>
                </motion.div>
              )}
            </motion.div>
          );
        })()}
      </div>

      {/* ── Bottom Sheets ── */}
      <LiveSheet open={showLive} onClose={() => setShowLive(false)}
        liveTitle={liveTitle} setLiveTitle={setLiveTitle}
        onStart={handleGoLive} starting={liveStarting} />

      <SubscriptionSheet open={showSub} onClose={() => { setShowSub(false); setSubError(null); }}
        isOwner={isOwner} plans={plans} isSubscribed={isSubscribed}
        subscribingPlanId={subscribingPlanId} subError={subError}
        onSubscribe={handleSubscribe} onUnsubscribe={handleUnsubscribe}
        onCreatePlan={handleCreatePlan}
        newPlanName={newPlanName} setNewPlanName={setNewPlanName}
        newPlanDesc={newPlanDesc} setNewPlanDesc={setNewPlanDesc}
        newPlanPrice={newPlanPrice} setNewPlanPrice={setNewPlanPrice}
        newPlanPerks={newPlanPerks} setNewPlanPerks={setNewPlanPerks}
        creatingPlan={creatingPlan} />

      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)}
        user={user} isOwner={isOwner}
        onAvatarClick={() => { setShowSettings(false); avatarInputRef.current?.click(); }}
        onCoverClick={() => { setShowSettings(false); coverInputRef.current?.click(); }}
        onOpenSubscription={() => setShowSub(true)} />

      {/* ── Profile Orb — floating radial action menu ── */}
      <ProfileOrb
        targetUser={{
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
        }}
        targetUserId={userId}
        isOwner={isOwner}
      />
    </div>
  );
}
