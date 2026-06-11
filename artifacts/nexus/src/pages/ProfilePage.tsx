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

interface ProfilePageProps { userId: number; }

const ORBIT_PARTICLES = [
  { radius: 64, color: "#a78bfa", glow: "#7c3aed", size: 9, dur: 5.5, delay: 0 },
  { radius: 72, color: "#60a5fa", glow: "#3b82f6", size: 7, dur: 7.5, delay: 1.8 },
  { radius: 80, color: "#34d399", glow: "#10b981", size: 6, dur: 9.5, delay: 3.5 },
];

/* ─── Reusable bottom sheet ─────────────────────────────────── */
function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 480, damping: 42 }}
            className="relative w-full max-w-sm z-10 rounded-t-[28px] bg-card border-t border-x border-border/60 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-[3px] rounded-full bg-muted-foreground/25" />
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
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [18, -18]), { stiffness: 260, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-18, 18]), { stiffness: 260, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  return (
    <div style={{ perspective: "900px", width: 112, height: 112 }} className="relative"
      onMouseMove={handleMouseMove} onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}>
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="relative w-28 h-28">
        {/* Glow */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-6 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(59,130,246,0.25) 50%, transparent 75%)", filter: "blur(10px)" }} />
        {/* Activity rings */}
        <svg className="absolute pointer-events-none" style={{ top: -32, left: -32, width: 176, height: 176, overflow: "visible" }} viewBox="0 0 176 176">
          <defs>
            <linearGradient id="gr1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
            <linearGradient id="gr2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient>
            <linearGradient id="gr3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
          </defs>
          <circle cx="88" cy="88" r="82" fill="none" stroke="#7c3aed12" strokeWidth="5" />
          <circle cx="88" cy="88" r="72" fill="none" stroke="#3b82f612" strokeWidth="4.5" />
          <circle cx="88" cy="88" r="62" fill="none" stroke="#10b98112" strokeWidth="4" />
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
        {/* Particles */}
        {ORBIT_PARTICLES.map(({ radius, color, glow, size, dur, delay }, i) => (
          <motion.div key={i} className="absolute" style={{ top: "50%", left: "50%", width: 0, height: 0 }}
            animate={{ rotate: 360 }} transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}>
            <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color,
              boxShadow: `0 0 ${size * 2}px ${glow}, 0 0 ${size * 4}px ${glow}60`, top: -radius - size / 2, left: -size / 2 }} />
          </motion.div>
        ))}
        {/* Spinning gradient border */}
        <div className="absolute inset-0 rounded-[22px] overflow-hidden" style={{ padding: "2.5px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute" style={{ width: "180%", height: "180%", top: "-40%", left: "-40%",
              background: "conic-gradient(from 0deg, #7c3aed, #818cf8, #3b82f6, #06b6d4, #34d399, #f59e0b, #7c3aed)" }} />
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-background z-10 group/av cursor-pointer"
               onClick={isOwner ? onUploadClick : undefined}>
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 via-blue-500/15 to-cyan-500/20">
                <span className="text-3xl font-black text-primary">{displayName[0]}</span>
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity rounded-[20px]">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>
        {/* Sheen */}
        <motion.div animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-[22px] pointer-events-none z-20"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 50%)", transform: "translateZ(18px)" }} />
        {/* Verified badge */}
        {isVerified && (
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 }}
            className="absolute -bottom-2 -right-2 z-30" style={{ transform: "translateZ(24px)" }}>
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                <BadgeCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Live Sheet ─────────────────────────────────────────────── */
const LIVE_CATS = ["🎵 Musiqa", "🎮 O'yin", "💬 Suhbat", "⚽ Sport", "🎨 San'at", "📚 Ta'lim"];

function LiveSheet({ open, onClose, liveTitle, setLiveTitle, onStart, starting }: {
  open: boolean; onClose: () => void; liveTitle: string;
  setLiveTitle: (v: string) => void; onStart: () => void; starting: boolean;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("🎵 Musiqa");
  const [audience, setAudience] = useState<"public" | "subscribers">("public");

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Header */}
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            <Radio className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-base font-bold">{t("live_explore.start_title")}</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Camera preview simulation */}
      <div className="mx-5 mb-4 h-28 rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center flex-col gap-1.5">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white/50" />
          </div>
          <span className="text-white/40 text-xs font-medium">Kamera</span>
        </motion.div>
        {/* LIVE badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 rounded-md px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-[10px] font-black tracking-widest">LIVE</span>
        </div>
        {/* Viewer count placeholder */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 rounded-md px-2 py-0.5">
          <Users className="w-3 h-3 text-white/70" />
          <span className="text-white/70 text-[10px] font-semibold">0</span>
        </div>
      </div>

      <div className="px-5 pb-6 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Efir nomi</label>
          <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onStart(); }}
            placeholder="Masalan: Yangi kecha muzikasi 🎵"
            maxLength={80}
            className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 ring-red-500/60 placeholder:text-muted-foreground/50" autoFocus />
          <p className="text-right text-[10px] text-muted-foreground/50 mt-1">{liveTitle.length}/80</p>
        </div>

        {/* Categories */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Kategoriya</label>
          <div className="flex flex-wrap gap-1.5">
            {LIVE_CATS.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${category === cat
                  ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">{t("live_explore.audience")}</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["public", Globe, t("live_explore.public"), t("live_explore.public_sub")],
              ["subscribers", Star, t("live_explore.subs_only"), t("live_explore.subs_sub")],
            ] as const).map(([val, Icon, label, sub]) => (
              <motion.button key={val} whileTap={{ scale: 0.97 }} onClick={() => setAudience(val)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${audience === val
                  ? "border-red-500/60 bg-red-500/8 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border/80"}`}>
                <Icon className={`w-4 h-4 shrink-0 ${audience === val ? "text-red-500" : ""}`} />
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] opacity-60">{sub}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          disabled={!liveTitle.trim() || starting}
          className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 relative overflow-hidden"
        >
          {!starting && (
            <motion.div className="absolute inset-0 bg-white/10"
              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ skewX: -20 }} />
          )}
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          {starting ? t("live_explore.connecting") : t("live_explore.go_live")}
        </motion.button>
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
  const [creating, setCreating] = useState(false);
  const totalSubs = plans.reduce((s, p) => s + (p.subscriberCount ?? 0), 0);
  const monthlyRev = plans.reduce((s, p) => s + ((p.price ?? 0) / 100) * (p.subscriberCount ?? 0), 0);

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Header */}
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <h2 className="text-base font-bold">{isOwner ? "Obuna rejalari" : "Obuna"}</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pb-6 max-h-[65vh] overflow-y-auto space-y-3">
        {/* Owner revenue card */}
        {isOwner && plans.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border border-yellow-500/20 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Oylik daromad</p>
              <p className="text-lg font-black text-yellow-600 dark:text-yellow-400">{monthlyRev.toLocaleString()} so'm</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Obunachi</p>
              <p className="text-lg font-black text-foreground">{totalSubs}</p>
            </div>
          </div>
        )}

        {subError && (
          <p className="text-red-500 text-xs text-center bg-red-500/10 rounded-xl py-2">{subError}</p>
        )}

        {plans.length === 0 && !creating ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <Star className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium">{isOwner ? "Hali reja yo'q" : "Hozircha obuna yo'q"}</p>
            <p className="text-xs mt-1 opacity-60">{isOwner ? "Birinchi rejangizni yarating" : "Kreator hali reja qo'shmagan"}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {plans.map((plan, idx) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{plan.name}</p>
                      {plan.description && <p className="text-[10px] text-muted-foreground">{plan.description}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-black text-yellow-600 dark:text-yellow-400">{((plan.price ?? 0) / 100).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">so'm/oy</p>
                  </div>
                </div>
                {plan.perks && plan.perks.length > 0 && (
                  <ul className="space-y-1 mb-2.5">
                    {plan.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="w-3 h-3 text-green-500 shrink-0" /> {perk}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground">{plan.subscriberCount ?? 0} obunachi</span>
                  {!isOwner && (
                    isSubscribed ? (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => onUnsubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />} Bekor
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => onSubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md shadow-yellow-500/25 disabled:opacity-50">
                        {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 fill-white" />} Obuna
                      </motion.button>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create new plan (owner) */}
        {isOwner && (
          creating ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-yellow-500" /> Yangi reja</p>
                <button onClick={() => setCreating(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Reja nomi (masalan: Oltin ⭐)"
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60" />
              <input value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} placeholder="Qisqacha tavsif"
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60" />
              <div className="relative">
                <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder="Oylik narx"
                  className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60 pr-14" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">so'm</span>
              </div>
              <textarea value={newPlanPerks} onChange={e => setNewPlanPerks(e.target.value)} rows={2}
                placeholder="Imtiyozlar (har qatorda bir imtiyoz)"
                className="w-full bg-muted rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 ring-yellow-500/60 resize-none" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={onCreatePlan} disabled={!newPlanName.trim() || !newPlanPrice || creatingPlan}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Yaratish
              </motion.button>
            </motion.div>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCreating(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-yellow-500/5 transition-colors">
              <Plus className="w-4 h-4" /> Yangi reja qo'shish
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
  const rows = [
    { icon: Pencil, label: "Profilni tahrirlash", sub: "Ism, bio, avatar", color: "text-violet-400", onClick: onAvatarClick },
    { icon: Bell, label: "Bildirishnomalar", sub: "Push, email, SMS", color: "text-blue-400", onClick: () => {} },
    { icon: Shield, label: "Maxfiylik", sub: "Kim ko'ra oladi", color: "text-green-400", onClick: () => {} },
    ...(isOwner ? [{ icon: Sparkles, label: "Obuna rejalari", sub: "Daromad va rejalar", color: "text-yellow-400", onClick: () => { onClose(); onOpenSubscription(); } }] : []),
    { icon: Zap, label: "Premium", sub: "Kengaytirilgan imkoniyatlar", color: "text-orange-400", onClick: () => {} },
    { icon: HelpCircle, label: "Yordam", sub: "FAQ va qo'llab-quvvatlash", color: "text-muted-foreground", onClick: () => {} },
  ];

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* User card */}
      <div className="px-5 pt-1 pb-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-muted border border-border/60 shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-blue-500/20">
              <span className="text-lg font-black text-primary">{user.displayName[0]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings rows */}
      <div className="px-3 pb-6 space-y-0.5">
        {rows.map(({ icon: Icon, label, sub, color, onClick }, i) => (
          <motion.button key={i} whileTap={{ scale: 0.985 }} onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/60 transition-colors text-left">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          </motion.button>
        ))}

        {/* Divider + cover change */}
        {isOwner && (
          <>
            <div className="h-px bg-border/40 my-1.5 mx-3" />
            <motion.button whileTap={{ scale: 0.985 }} onClick={onCoverClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/60 transition-colors text-left">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Muqova rasmini o'zgartirish</p>
                <p className="text-[10px] text-muted-foreground">Profil banneringiz</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
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
    try {
      const stream = await startLive.mutateAsync({ data: { title: liveTitle.trim() } });
      navigate(`/live/${stream.id}`);
    } catch { setLiveStarting(false); }
  };

  const handleSubscribe = async (planId: number) => {
    setSubError(null); setSubscribingPlanId(planId);
    try {
      await subscribeMutation.mutateAsync({ planId });
      await refetchSub(); setShowSub(false);
    } catch (err: any) {
      setSubError(err?.response?.data?.error ?? "Xatolik yuz berdi");
    } finally { setSubscribingPlanId(null); }
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
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-4">
        <div className="h-44 bg-card rounded-2xl" />
        <div className="flex gap-4"><div className="w-28 h-28 rounded-full bg-muted -mt-14 ml-4" /></div>
      </div>
    );
  }
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const myPosts = posts.filter(p => p.author.id === userId);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Cover */}
      <div className="h-52 overflow-hidden relative group/cover rounded-b-3xl">
        {/* Background */}
        <AnimatePresence mode="wait">
          {user.coverUrl ? (
            <motion.img key="cover-img" src={user.coverUrl} alt=""
              initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <motion.div key="cover-default" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 overflow-hidden bg-[#0d0d1a]">
              {/* Aurora blobs */}
              <motion.div animate={{ x: [0, 40, -10, 0], y: [0, -25, 10, 0], scale: [1, 1.15, 0.95, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-24 -left-24 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%)", filter: "blur(24px)" }} />
              <motion.div animate={{ x: [0, -30, 15, 0], y: [0, 20, -15, 0], scale: [1, 0.9, 1.1, 1] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.50) 0%, transparent 70%)", filter: "blur(20px)" }} />
              <motion.div animate={{ x: [0, 20, -20, 0], y: [0, 15, -10, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/3 left-1/3 w-40 h-40 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(52,211,153,0.30) 0%, transparent 70%)", filter: "blur(16px)" }} />
              {/* Floating dots */}
              {[
                { left: "12%", top: "25%", dur: 3.2, del: 0 },
                { left: "35%", top: "55%", dur: 4.1, del: 0.8 },
                { left: "58%", top: "20%", dur: 2.8, del: 1.5 },
                { left: "75%", top: "65%", dur: 3.6, del: 0.4 },
                { left: "88%", top: "35%", dur: 2.5, del: 2 },
              ].map((dot, i) => (
                <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-white/30"
                  style={{ left: dot.left, top: dot.top }}
                  animate={{ y: [-4, 4, -4], opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: dot.dur, repeat: Infinity, delay: dot.del }} />
              ))}
              {/* Subtle grid */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

        {/* Owner: input + overlays */}
        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />

            {/* Upload progress */}
            <AnimatePresence>
              {coverUploading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/55 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2.5 z-20">
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                    animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    style={{ skewX: "-15deg" }} />
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <p className="text-white/80 text-xs font-semibold tracking-wide">Cover yuklanmoqda…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hover edit overlay */}
            {!coverUploading && (
              <div onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 opacity-0 group-hover/cover:opacity-100 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2.5 z-10"
                style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(1px)" }}>
                <motion.div whileHover={{ scale: 1.12, rotate: 5 }} whileTap={{ scale: 0.93 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-xl">
                  <Camera className="w-6 h-6 text-white" />
                </motion.div>
                <motion.p initial={{ opacity: 0, y: 4 }} whileHover={{ opacity: 1, y: 0 }}
                  className="text-white text-xs font-semibold drop-shadow-md tracking-wide">
                  Cover rasmini o'zgartirish
                </motion.p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="px-5">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between mb-4" style={{ marginTop: -44 }}>
          <div className="relative z-10">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
            <Avatar3D avatarUrl={user.avatarUrl} displayName={user.displayName} isVerified={user.isVerified}
              isUploading={avatarUploading} isOwner={isOwner} onUploadClick={() => avatarInputRef.current?.click()} />
          </div>

          {/* Compact action buttons */}
          <div className="flex items-center gap-1.5 pb-1">
            {isOwner ? (
              <>
                {/* Live button */}
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowLive(true)}
                  className="relative flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30">
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-300 animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400" />
                  <Radio className="w-3 h-3" /> Efir
                </motion.button>
                {/* Plans button */}
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowSub(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-xs font-bold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all">
                  <Star className="w-3 h-3" /> Obuna
                </motion.button>
                {/* Settings button */}
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowSettings(true)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button whileTap={{ scale: 0.93 }} onClick={handleFollow}
                  className={`flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all ${following ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-md shadow-primary/25"}`}>
                  {following ? <><UserCheck className="w-3.5 h-3.5" /> Kuzatmoqda</> : <><UserPlus className="w-3.5 h-3.5" /> Kuzatish</>}
                </motion.button>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowSub(true)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold transition-all border ${isSubscribed ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400" : "bg-muted border-border/60 text-muted-foreground"}`}>
                  {isSubscribed ? <><Check className="w-3.5 h-3.5" /> Obuna</> : <><Bell className="w-3.5 h-3.5" /> Obuna</>}
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Name / bio */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4 pl-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-foreground">{user.displayName}</h1>
            {user.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground mb-1.5">@{user.username}</p>
          {user.bio && <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-border mb-5">
          {[
            { label: "Post", value: myPosts.length, color: "text-primary" },
            { label: "Obunachi", value: user.followersCount, color: "text-violet-400" },
            { label: "Kuzatish", value: user.followingCount, color: "text-blue-400" },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }} className="text-center">
              <p className={`text-xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
          {([
            ["posts", Grid3X3, t("profile.posts") || "Posts"],
            ["reels", Play, "Reels"],
            ...(isOwner ? [["analytics", BarChart2, t("admin.analytics")]] : []),
          ] as [string, ElementType, string][]).map(([tabId, Icon, label]) => (
            <button key={tabId} onClick={() => setTab(tabId as "posts" | "reels" | "analytics")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === tabId ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          myPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("profile.no_posts") || "No posts yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {myPosts.map((post, i) => (
                <motion.div key={post.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}>
                  <Link href={`/post/${post.id}`}>
                    <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border/60 cursor-pointer relative group/post transition-transform hover:scale-[1.03] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                      {/* Media or text */}
                      {post.mediaUrl && post.type !== "video" ? (
                        <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : post.mediaUrl && post.type === "video" ? (
                        <div className="w-full h-full relative bg-black">
                          <video src={post.mediaUrl} className="w-full h-full object-cover" muted preload="none" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center p-3">
                          <p className="text-xs text-foreground/80 line-clamp-4 text-center leading-relaxed">{post.content}</p>
                        </div>
                      )}
                      {/* Hover stats overlay */}
                      <motion.div
                        initial={false}
                        className="absolute inset-0 bg-black/55 opacity-0 group-hover/post:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-4 h-4 fill-white" />
                          <span className="text-sm font-bold">{post.likesCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span className="text-sm font-bold">{post.commentsCount ?? 0}</span>
                        </div>
                      </motion.div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}

        {tab === "reels" && (
          reels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hali reel yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {reels.map((reel, i) => (
                <motion.div key={reel.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}>
                  <Link href={`/reels`}>
                    <div className="aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border/60 cursor-pointer relative group/reel transition-transform hover:scale-[1.03] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                      {/* Thumbnail or video preview */}
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : reel.videoUrl ? (
                        <video src={reel.videoUrl} className="w-full h-full object-cover" muted preload="none"
                          onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                          <Play className="w-8 h-8 text-primary/40" />
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/reel:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3">
                        <motion.div whileHover={{ scale: 1.15 }}
                          className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </motion.div>
                      </div>

                      {/* Bottom stats bar */}
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-1 text-white">
                          <Play className="w-2.5 h-2.5 fill-white opacity-80" />
                          <span className="text-[10px] font-semibold opacity-90">
                            {(reel.viewsCount ?? 0) >= 1000
                              ? `${((reel.viewsCount ?? 0) / 1000).toFixed(1)}K`
                              : reel.viewsCount ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                          <Heart className="w-2.5 h-2.5 fill-white opacity-80" />
                          <span className="text-[10px] font-semibold opacity-90">{reel.likesCount ?? 0}</span>
                        </div>
                      </div>

                      {/* Video indicator badge (if has thumbnail, show play icon top-right) */}
                      {reel.thumbnailUrl && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/50 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}
        {/* Analytics tab */}
        {tab === "analytics" && isOwner && (() => {
          const totalLikes = myPosts.reduce((s, p) => s + (p.likesCount ?? 0), 0)
            + reels.reduce((s, r) => s + (r.likesCount ?? 0), 0);
          const totalComments = myPosts.reduce((s, p) => s + (p.commentsCount ?? 0), 0);
          const totalViews = reels.reduce((s, r) => s + (r.viewsCount ?? 0), 0);
          const totalShares = myPosts.reduce((s, p) => s + ((p as any).sharesCount ?? 0), 0);
          const totalContent = myPosts.length + reels.length;
          const avgEng = totalContent > 0 ? Math.round((totalLikes + totalComments) / totalContent * 10) / 10 : 0;
          const topPost = [...myPosts].sort((a, b) => ((b.likesCount ?? 0) + (b.commentsCount ?? 0)) - ((a.likesCount ?? 0) + (a.commentsCount ?? 0)))[0];
          const topReel = [...reels].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))[0];

          const statCards = [
            { icon: Heart, label: "Jami Like", value: totalLikes.toLocaleString(), color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20" },
            { icon: MessageCircle, label: "Jami Izoh", value: totalComments.toLocaleString(), color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
            { icon: Eye, label: "Ko'rishlar", value: totalViews.toLocaleString(), color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
            { icon: Share2, label: "Ulashlar", value: totalShares.toLocaleString(), color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
            { icon: TrendingUp, label: "O'rt. Engagement", value: `${avgEng}`, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
            { icon: BarChart2, label: "Jami Kontent", value: totalContent.toString(), color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
          ];

          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-6">
              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-3">
                {statCards.map(({ icon: Icon, label, value, color, bg }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-2xl border p-3.5 ${bg} flex items-center gap-3`}>
                    <div className={`w-9 h-9 rounded-xl bg-card/60 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Top post */}
              {topPost && (
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-foreground">Eng yaxshi post</span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{topPost.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{topPost.likesCount ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{topPost.commentsCount ?? 0}</span>
                  </div>
                </div>
              )}

              {/* Top reel */}
              {topReel && (
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Play className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-foreground">Eng ko'p ko'rilgan reel</span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{topReel.caption ?? "Reel"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-violet-400" />{(topReel.viewsCount ?? 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{topReel.likesCount ?? 0}</span>
                  </div>
                </div>
              )}

              {totalContent === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Hali kontent yo'q</p>
                </div>
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
    </div>
  );
}
