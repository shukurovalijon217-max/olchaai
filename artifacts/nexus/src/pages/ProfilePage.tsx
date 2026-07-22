import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import PostViewer from "@/components/PostViewer";
import {
  BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon,
  Camera, Loader2, Radio, Bell, BellOff, Star, Check, X, Sparkles,
  ChevronRight, Pencil, Shield, HelpCircle, Globe, Users, Plus, Zap,
  Heart, MessageCircle, BarChart2, TrendingUp, Eye, Share2,
  Lock, Palette, Languages, DollarSign, ArrowUpRight,
} from "lucide-react";
import { Link } from "wouter";
import {
  useGetUser, useListPosts, useFollowUser, useUpdateUser, getGetUserQueryKey,
  useListReels, useStartLive, useListCreatorPlans, useCheckCreatorSubscription,
  useSubscribeToCreator, useUnsubscribeFromCreator, useCreateCreatorPlan,
  getListCreatorPlansQueryKey, getCheckCreatorSubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect, ReactNode, ElementType } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { resolveApiUrl } from "@/lib/utils";
import ProfileOrb from "@/components/ProfileOrb";

interface ProfilePageProps { userId: number; }

/* ─── MirrorPanel ─────────────────────────────────────────────── */
interface MirrorField { field: string; reason: string; }
interface MirrorData {
  profile: {
    displayName: string; username: string; avatarUrl: string | null;
    coverUrl: string | null; isVerified: boolean; bio: string | null;
    followersCount: number | null; followingCount: number | null; postsCount: number;
    isPrivate: boolean;
  };
  mirrorMeta: {
    isPrivate: boolean; isGhost: boolean; ghostUntil: string | null;
    hiddenFields: MirrorField[]; visibleFields: string[];
  };
}

const FIELD_KEY: Record<string, string> = {
  displayName: "profile.mirror_field_displayName",
  username: "profile.mirror_field_username",
  avatarUrl: "profile.mirror_field_avatarUrl",
  coverUrl: "profile.mirror_field_coverUrl",
  isVerified: "profile.mirror_field_isVerified",
  bio: "profile.mirror_field_bio",
  followersCount: "profile.mirror_field_followersCount",
  followingCount: "profile.mirror_field_followingCount",
  onlineStatus: "profile.mirror_field_onlineStatus",
  posts: "profile.mirror_field_posts",
  email: "profile.mirror_field_email",
  phone: "profile.mirror_field_phone",
};

function MirrorPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [data, setData] = useState<MirrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}/mirror-view`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: MirrorData | null) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="mx-4 my-2 rounded-2xl border border-cyan-500/20 bg-[#080614] px-4 py-5 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
        <span className="text-cyan-400/70 text-xs">{t("profile.mirror_loading")}</span>
      </div>
    );
  }
  if (!data) return null;

  const { mirrorMeta, profile } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 28 }}
      className="mx-4 my-2 rounded-2xl border border-cyan-500/25 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.06), rgba(8,6,20,0.98))" }}
    >
      {/* Warnings */}
      {mirrorMeta.isPrivate && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cyan-500/15 bg-amber-500/10">
          <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-[11px] font-semibold">{t("profile.mirror_private_warning")}</p>
        </div>
      )}
      {mirrorMeta.isGhost && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cyan-500/15 bg-slate-500/10">
          <Eye className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <p className="text-slate-300 text-[11px] font-semibold">{t("profile.mirror_ghost_warning")}</p>
        </div>
      )}

      {/* Stranger's profile preview */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          {profile.avatarUrl ? (
            <img src={resolveApiUrl(profile.avatarUrl)} className="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-500/30" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg">
              {profile.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-sm">{profile.displayName}</span>
              {profile.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />}
            </div>
            <span className="text-white/40 text-[11px]">@{profile.username}</span>
            {profile.bio && <p className="text-white/60 text-[11px] mt-0.5 line-clamp-1">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mb-4">
          {[
            { label: t("profile.mirror_field_followersCount"), val: profile.followersCount },
            { label: t("profile.mirror_field_followingCount"), val: profile.followingCount },
            { label: t("profile.mirror_field_posts"), val: profile.postsCount },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              {val !== null ? (
                <span className="text-white font-bold text-sm">{val}</span>
              ) : (
                <Lock className="w-3.5 h-3.5 text-white/30 mx-auto" />
              )}
              <p className="text-white/40 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Visible / Hidden breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Visible */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-emerald-400 text-[10px] font-black tracking-wider uppercase mb-2">
              ✅ {t("profile.mirror_stranger_sees")}
            </p>
            <div className="space-y-1">
              {mirrorMeta.visibleFields.map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-white/70 text-[11px]">{t(FIELD_KEY[f] ?? `profile.mirror_field_${f}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="text-rose-400 text-[10px] font-black tracking-wider uppercase mb-2">
              🔒 {t("profile.mirror_hidden_from")}
            </p>
            <div className="space-y-1">
              {mirrorMeta.hiddenFields.map(f => (
                <div key={f.field} className="group relative flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                  <span className="text-white/50 text-[11px] line-through decoration-rose-400/50">
                    {t(FIELD_KEY[f.field] ?? `profile.mirror_field_${f.field}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-white/30 text-[10px]">{t("profile.mirror_tip")}</p>
          <button
            onClick={() => navigate("/settings?tab=privacy")}
            className="flex-shrink-0 text-[10px] font-bold text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
          >
            {t("profile.mirror_go_settings")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Tokens ─────────────────────────────────────────────────── */
const T = {
  violet: "#7c3aed", indigo: "#6366f1", blue: "#3b82f6",
  cyan: "#06b6d4", emerald: "#10b981", pink: "#ec4899",
  amber: "#f59e0b", rose: "#f43f5e",
};

/* ─── NeonBtn ─────────────────────────────────────────────────── */
function NeonBtn({ children, onClick, disabled, gradient, glow, className = "" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  gradient: string; glow: string; className?: string;
}) {
  return (
    <motion.button
      onClick={onClick} disabled={disabled}
      whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05, y: -1 }}
      className={`relative overflow-hidden flex items-center gap-1.5 font-bold text-white text-xs rounded-full disabled:opacity-40 ${className}`}
    >
      <div className="absolute inset-0 rounded-full" style={{ background: gradient, boxShadow: `0 0 14px ${glow}, 0 3px 18px ${glow}55, inset 0 1px 0 rgba(255,255,255,0.22)` }} />
      <motion.div className="absolute inset-0 rounded-full pointer-events-none"
        animate={{ x: ["-120%", "220%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)", skewX: -20 }} />
      <span className="relative z-10 flex items-center gap-1.5 px-3 py-1.5">{children}</span>
    </motion.button>
  );
}

/* ─── BottomSheet ─────────────────────────────────────────────── */
function BottomSheet({ open, onClose, children, maxH = "70vh" }: {
  open: boolean; onClose: () => void; children: ReactNode; maxH?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-[4px]" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 500, damping: 44 }}
            className="relative w-full max-w-sm z-10 rounded-t-[28px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(15,10,30,0.97) 0%, rgba(8,6,20,0.99) 100%)",
              borderTop: "1px solid rgba(124,58,237,0.25)",
              boxShadow: "0 -24px 80px rgba(124,58,237,0.18), 0 -1px 0 rgba(255,255,255,0.06)",
              maxHeight: maxH,
            }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <motion.div animate={{ width: [32, 48, 32] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="h-[3px] rounded-full bg-white/15" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── Helper: is the URL a video file? ─────────────────────────── */
function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg|avi|mkv)(\?|$)/i.test(url);
}

/* ─── 3D Avatar ────────────────────────────────────────────────── */
function Avatar3D({ avatarUrl, displayName, isVerified, isUploading, isOwner, onUploadClick, size = 96 }: {
  avatarUrl?: string | null; displayName: string; isVerified?: boolean;
  isUploading: boolean; isOwner: boolean; onUploadClick: () => void; size?: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-50, 50], [18, -18]), { stiffness: 260, damping: 18 });
  const rotateY = useSpring(useTransform(mouseX, [-50, 50], [-18, 18]), { stiffness: 260, damping: 18 });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const r = size / 2;
  const bw = 3;
  const total = size + bw * 2;

  return (
    <div style={{ width: total, height: total, position: "relative" }}
      onMouseMove={handleMouseMove} onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}>

      {/* ── 1. Aura glow (behind everything) ── */}
      <motion.div animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 3.5, repeat: Infinity }}
        className="absolute rounded-full pointer-events-none"
        style={{ inset: -24,
          background: "radial-gradient(circle, rgba(124,58,237,0.42) 0%, rgba(59,130,246,0.22) 55%, transparent 72%)",
          filter: "blur(12px)" }} />

      {/* ── 2. Spinning rainbow squircle border — outside preserve-3d ── */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 20 + bw, overflow: "hidden" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          style={{ position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
            background: "conic-gradient(from 0deg, #7c3aed, #818cf8, #3b82f6, #06b6d4, #34d399, #f59e0b, #ec4899, #7c3aed)" }} />
        <div style={{ position: "absolute", inset: bw, borderRadius: 20, background: "var(--background)" }} />
      </div>

      {/* ── 3. Spinning activity arc rings — CSS border approach, works on all browsers ── */}
      {([
        { ringR: r + 20, tk: 4,   dur: 7.2, dir:  1, cT: "#67e8f9", cL: "#3b82f6", glow: "#06b6d499" },
        { ringR: r + 13, tk: 3.5, dur: 5.5, dir:  1, cT: "#60a5fa", cL: "#6366f1", glow: "#3b82f666" },
        { ringR: r +  6, tk: 3,   dur: 9.5, dir: -1, cT: "#a78bfa", cL: "#7c3aed", glow: "#818cf855" },
      ] as const).map(({ ringR, tk, dur, dir, cT, cL, glow }, i) => {
        const dia    = (ringR + tk) * 2;
        const offset = total / 2 - ringR - tk;
        return (
          <motion.div key={i}
            animate={{ rotate: dir * 360 }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear", delay: i * 0.6 }}
            className="absolute pointer-events-none"
            style={{
              top: offset, left: offset, width: dia, height: dia,
              borderRadius: "50%",
              borderStyle: "solid", borderWidth: tk,
              borderTopColor: cT, borderLeftColor: cL,
              borderRightColor: "transparent", borderBottomColor: "transparent",
              boxShadow: `0 0 8px ${glow}`,
            }}
          />
        );
      })}

      {/* ── 4. Orbit particles — outside preserve-3d ── */}
      {[
        { radius: 64, color: "#a78bfa", glow: "#7c3aed", sz: 9, dur: 5.5, delay: 0 },
        { radius: 72, color: "#60a5fa", glow: "#3b82f6", sz: 7, dur: 7.5, delay: 1.8 },
        { radius: 80, color: "#34d399", glow: "#10b981", sz: 6, dur: 9.5, delay: 3.5 },
      ].map(({ radius, color, glow, sz, dur, delay }, i) => (
        <motion.div key={i} className="absolute pointer-events-none"
          style={{ top: "50%", left: "50%", width: 0, height: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}>
          <div style={{
            position: "absolute", width: sz, height: sz, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 ${sz * 2.5}px ${glow}, 0 0 ${sz * 5}px ${glow}55`,
            top: -radius - sz / 2, left: -sz / 2,
          }} />
        </motion.div>
      ))}

      {/* ── 5. Avatar image with 3D tilt ── */}
      <div style={{ perspective: "700px", position: "absolute", inset: bw }}>
        <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d", width: size, height: size }} className="relative">
          <div className="absolute inset-0 rounded-[20px] overflow-hidden z-10 group/av cursor-pointer"
            onClick={isOwner ? onUploadClick : undefined}>
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : avatarUrl ? (
              isVideoUrl(avatarUrl) ? (
                <video src={resolveApiUrl(avatarUrl)} autoPlay muted loop playsInline
                  className="w-full h-full object-cover" />
              ) : (
                <img src={resolveApiUrl(avatarUrl)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "radial-gradient(circle at 35% 35%, rgba(124,58,237,0.32), rgba(59,130,246,0.22), rgba(16,185,129,0.12))" }}>
                <span className="font-black text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.7)]"
                  style={{ fontSize: size * 0.35 }}>{displayName[0]}</span>
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover/av:opacity-100 active:opacity-100 transition-opacity rounded-[20px]">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          {/* Sheen */}
          <motion.div animate={{ opacity: [0.1, 0.28, 0.1] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 rounded-[20px] pointer-events-none z-20"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 50%)", transform: "translateZ(14px)" }} />
        </motion.div>
      </div>

      {/* ── 6. Verified badge ── */}
      {isVerified && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
          style={{ position: "absolute", bottom: 0, right: 0, zIndex: 30 }}>
          <motion.div animate={{ boxShadow: ["0 0 6px rgba(124,58,237,0.4)", "0 0 18px rgba(124,58,237,0.75)", "0 0 6px rgba(124,58,237,0.4)"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-6 rounded-full bg-background flex items-center justify-center shadow-lg">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
              <BadgeCheck className="w-3 h-3 text-white" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Live Sheet ─────────────────────────────────────────────── */
function LiveSheet({ open, onClose, liveTitle, setLiveTitle, onStart, starting }: {
  open: boolean; onClose: () => void; liveTitle: string;
  setLiveTitle: (v: string) => void; onStart: () => void; starting: boolean;
}) {
  const { t } = useTranslation();
  const LIVE_CATS = [
    t("live_explore.cat_music"), t("live_explore.cat_gaming"),
    t("live_explore.cat_talk"), t("live_explore.cat_sports"),
    t("live_explore.cat_art"), t("live_explore.cat_edu"),
  ];
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState<"public" | "subscribers">("public");

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <motion.span animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            <Radio className="w-5 h-5 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
          </div>
          <h2 className="text-base font-bold">{t("live_explore.start_title")}</h2>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="px-5 pb-5 space-y-3.5 overflow-y-auto max-h-[60vh]">
        {/* ── Live preview card ── */}
        <div className="h-28 rounded-2xl overflow-hidden relative" style={{ border: "1px solid rgba(239,68,68,0.22)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #180a0a, #0f0505)" }} />
          {/* animated pulse rings */}
          <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2.2, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-red-500/50" />
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-red-500/60" />
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-1.5">
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.2)", border: "1.5px solid rgba(239,68,68,0.5)", boxShadow: "0 0 18px rgba(239,68,68,0.35)" }}>
              <Camera className="w-4.5 h-4.5 text-red-400" />
            </motion.div>
            <span className="text-white/40 text-[11px] font-semibold">{t("live_explore.camera")}</span>
          </div>
          {/* LIVE badge */}
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(220,38,38,0.9)", boxShadow: "0 0 12px rgba(220,38,38,0.6)" }}>
            <motion.span animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-white text-[10px] font-black tracking-[0.15em]">LIVE</span>
          </div>
          {/* viewer count shown after going live (LivePage handles real-time via Go WS) */}
        </div>

        <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onStart(); }}
          placeholder={t("live_explore.name_placeholder")} maxLength={80}
          className="w-full bg-white/6 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 ring-red-500/60 placeholder:text-white/25 border border-white/8" autoFocus />

        <div className="flex flex-wrap gap-1.5">
          {LIVE_CATS.map(cat => (
            <motion.button key={cat} whileTap={{ scale: 0.92 }} onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${category === cat ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-white/8 text-muted-foreground"}`}>
              {cat}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {([
            ["public", Globe, t("live_explore.public"), t("live_explore.public_sub")],
            ["subscribers", Star, t("live_explore.subs_only"), t("live_explore.subs_sub")],
          ] as const).map(([val, Icon, label, sub]) => (
            <motion.button key={val} whileTap={{ scale: 0.97 }} onClick={() => setAudience(val as "public" | "subscribers")}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${audience === val ? "border-red-500/50 bg-red-500/10" : "border-white/8 bg-white/4"}`}>
              <Icon className={`w-4 h-4 shrink-0 ${audience === val ? "text-red-500" : "text-muted-foreground"}`} />
              <div><p className="text-xs font-semibold">{label}</p><p className="text-[10px] opacity-50">{sub}</p></div>
            </motion.button>
          ))}
        </div>

        <NeonBtn onClick={onStart} disabled={!liveTitle.trim() || starting}
          gradient="linear-gradient(135deg, #dc2626, #f87171)" glow="rgba(220,38,38,0.6)"
          className="w-full h-11 justify-center rounded-2xl text-sm">
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          {starting ? t("live_explore.connecting") : t("live_explore.go_live")}
        </NeonBtn>
      </div>
    </BottomSheet>
  );
}

/* ─── Subscription Sheet (compact redesign) ───────────────────── */
function SubscriptionSheet({ open, onClose, isOwner, plans, isSubscribed, subscribingPlanId, subError,
  onSubscribe, onUnsubscribe, onCreatePlan, newPlanName, setNewPlanName, newPlanDesc, setNewPlanDesc,
  newPlanPrice, setNewPlanPrice, newPlanPerks, setNewPlanPerks, creatingPlan }: {
  open: boolean; onClose: () => void; isOwner: boolean;
  plans: Array<{ id: number; name: string; description?: string | null; price?: number | null; perks?: string[] | null; subscriberCount?: number | null }>;
  isSubscribed: boolean; subscribingPlanId: number | null; subError: string | null;
  onSubscribe: (id: number) => void; onUnsubscribe: (id: number) => void; onCreatePlan: () => void;
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
    <BottomSheet open={open} onClose={onClose} maxH="75vh">
      {/* Header */}
      <div className="px-4 pt-1 pb-2.5 flex items-center justify-between border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/15 border border-amber-500/25 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">{isOwner ? t("profile.plans_title") : t("profile.subscription")}</h2>
            {isOwner && plans.length > 0 && (
              <p className="text-[10px] text-amber-400/80">{totalSubs} {t("profile.sub_count")} · {monthlyRev.toLocaleString()} {t("market.som")}/{t("profile.per_month")}</p>
            )}
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="px-4 pb-5 overflow-y-auto" style={{ maxHeight: "calc(75vh - 80px)" }}>
        {subError && <p className="text-red-400 text-xs text-center bg-red-500/10 rounded-xl py-2 mt-3">{subError}</p>}

        {plans.length === 0 && !creating ? (
          <div className="py-12 text-center">
            <motion.div animate={{ y: [-4, 4, -4], rotate: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(249,115,22,0.1))", border: "1px solid rgba(234,179,8,0.2)", boxShadow: "0 0 24px rgba(234,179,8,0.1)" }}>
              <Star className="w-6 h-6 text-amber-400" />
            </motion.div>
            <p className="text-sm font-bold text-foreground">{isOwner ? t("profile.no_plans_yet") : t("profile.no_subs_yet")}</p>
            <p className="text-xs mt-1 text-muted-foreground/70">{isOwner ? t("profile.create_first_plan") : t("profile.creator_no_plans")}</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {plans.map((plan, idx) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06, type: "spring", stiffness: 260, damping: 24 }}
                className="relative rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(145deg, rgba(234,179,8,0.07), rgba(0,0,0,0))", border: "1px solid rgba(234,179,8,0.18)" }}>
                {/* top accent line */}
                <div className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: "linear-gradient(90deg, transparent, #f59e0b, #f97316, transparent)" }} />
                <div className="p-4">
                  {/* Plan name + price row */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <p className="text-sm font-black text-foreground">{plan.name}</p>
                      </div>
                      {plan.description && <p className="text-[11px] text-muted-foreground leading-snug">{plan.description}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-4 bg-amber-500/10 rounded-xl px-3 py-1.5 border border-amber-500/20">
                      <p className="text-base font-black text-amber-400 leading-none">{((plan.price ?? 0) / 100).toLocaleString()}</p>
                      <p className="text-[9px] text-amber-400/55 font-semibold mt-0.5">{t("profile.per_month")}</p>
                    </div>
                  </div>

                  {/* Perks */}
                  {plan.perks && plan.perks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {plan.perks.map((perk, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] font-semibold rounded-lg px-2 py-1"
                          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", color: "#6ee7b7" }}>
                          <Check className="w-3 h-3 shrink-0" /> {perk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/6">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground font-semibold">{plan.subscriberCount ?? 0} {t("profile.sub_count")}</span>
                    </div>
                    {!isOwner && (
                      isSubscribed ? (
                        <motion.button whileTap={{ scale: 0.93 }} onClick={() => onUnsubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                          {t("profile.cancel_sub")}
                        </motion.button>
                      ) : (
                        <NeonBtn onClick={() => onSubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                          gradient="linear-gradient(135deg, #f59e0b, #f97316)" glow="rgba(245,158,11,0.55)" className="h-7 text-[11px] px-3">
                          {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 fill-white" />}
                          {t("profile.subscribe_label")}
                        </NeonBtn>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isOwner && (
          creating ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t("profile.new_plan")}</p>
                <motion.button whileTap={{ rotate: 90 }} onClick={() => setCreating(false)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></motion.button>
              </div>
              <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder={t("profile.plan_name_ph")}
                className="w-full bg-white/6 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-amber-500/50 border border-white/8" />
              <input value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} placeholder={t("profile.plan_desc_ph")}
                className="w-full bg-white/6 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-amber-500/50 border border-white/8" />
              <div className="relative">
                <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder={t("profile.plan_price_ph")}
                  className="w-full bg-white/6 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-amber-500/50 pr-14 border border-white/8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("market.som")}</span>
              </div>
              <textarea value={newPlanPerks} onChange={e => setNewPlanPerks(e.target.value)} rows={2}
                placeholder={t("profile.plan_perks_ph")}
                className="w-full bg-white/6 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-amber-500/50 resize-none border border-white/8" />
              <NeonBtn onClick={onCreatePlan} disabled={!newPlanName.trim() || !newPlanPrice || creatingPlan}
                gradient="linear-gradient(135deg, #f59e0b, #f97316)" glow="rgba(245,158,11,0.5)"
                className="w-full h-9 justify-center rounded-xl text-sm">
                {creatingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} {t("profile.create_plan")}
              </NeonBtn>
            </motion.div>
          ) : (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCreating(true)}
              className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-amber-500/25 text-amber-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-amber-500/6 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {t("profile.add_plan")}
            </motion.button>
          )
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Settings Sheet (fully working) ─────────────────────────── */
function SettingsSheet({ open, onClose, user, isOwner, onAvatarClick, onCoverClick, onOpenSubscription }: {
  open: boolean; onClose: () => void;
  user: { displayName: string; username: string; avatarUrl?: string | null };
  isOwner: boolean; onAvatarClick: () => void; onCoverClick: () => void;
  onOpenSubscription: () => void;
}) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const go = (tab: string) => { onClose(); navigate(`/settings?tab=${tab}`); };

  const rows = [
    {
      icon: Pencil, label: t("settings.edit_profile"), sub: t("settings.edit_profile_sub"),
      color: "#a78bfa", glow: "rgba(167,139,250,0.35)",
      onClick: () => { onClose(); onAvatarClick(); },
    },
    {
      icon: Bell, label: t("settings.notifications"), sub: t("settings.notifications_sub"),
      color: "#60a5fa", glow: "rgba(96,165,250,0.35)",
      onClick: () => go("notifications"),
    },
    {
      icon: Lock, label: t("settings.privacy"), sub: t("settings.privacy_sub"),
      color: "#34d399", glow: "rgba(52,211,153,0.35)",
      onClick: () => go("privacy"),
    },
    {
      icon: Palette, label: t("settings.appearance") ?? "Appearance", sub: t("settings.appearance") ?? "Theme & display",
      color: "#f472b6", glow: "rgba(244,114,182,0.35)",
      onClick: () => go("appearance"),
    },
    {
      icon: Languages, label: t("settings.language"), sub: t("settings.language"),
      color: "#06b6d4", glow: "rgba(6,182,212,0.35)",
      onClick: () => go("language"),
    },
    ...(isOwner ? [{
      icon: DollarSign, label: t("settings.subs_plans"), sub: t("settings.subs_plans_sub"),
      color: "#fbbf24", glow: "rgba(251,191,36,0.35)",
      onClick: () => { onClose(); onOpenSubscription(); },
    }] : []),
    {
      icon: Zap, label: t("nav.premium"), sub: t("settings.premium_sub"),
      color: "#fb923c", glow: "rgba(251,146,60,0.35)",
      onClick: () => go("account"),
    },
    {
      icon: HelpCircle, label: t("settings.title"), sub: t("settings.help_sub"),
      color: "#94a3b8", glow: "rgba(148,163,184,0.25)",
      onClick: () => go("account"),
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} maxH="80vh">
      {/* User header */}
      <div className="px-4 pt-1 pb-3 flex items-center gap-3 border-b border-white/6">
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-muted border border-white/10 shrink-0">
          {user.avatarUrl ? (
            <img src={resolveApiUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/25 to-blue-500/20">
              <span className="text-base font-black text-primary">{user.displayName[0]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => go("account")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
              <ArrowUpRight className="w-3 h-3" /> {t("settings.title")}
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.88, rotate: 90 }} onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="px-2 pb-5 overflow-y-auto" style={{ maxHeight: "calc(80vh - 90px)" }}>
        {/* Settings rows */}
        <div className="mt-2 space-y-0.5">
          {rows.map(({ icon: Icon, label, sub, color, glow, onClick }, i) => (
            <motion.button key={i} whileTap={{ scale: 0.97, x: 3 }} whileHover={{ x: 2 }} onClick={onClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-all text-left group">
              <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${glow.replace("0.35", "0.1")}`, border: `1px solid ${glow.replace("0.35", "0.2")}` }}>
                <Icon className="w-3.5 h-3.5" style={{ color, filter: `drop-shadow(0 0 3px ${glow})` }} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/55 group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          ))}
        </div>

        {isOwner && (
          <>
            <div className="h-px bg-white/6 my-2 mx-3" />
            <motion.button whileTap={{ scale: 0.97, x: 3 }} whileHover={{ x: 2 }} onClick={() => { onClose(); onCoverClick(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-all text-left group">
              <div className="w-8 h-8 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("settings.change_cover")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.cover_sub")}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Big Stat Node ───────────────────────────────────────────── */
function BigStatNode({ value, label, accent, onClick }: {
  value: number; label: string; accent: string; onClick?: () => void;
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1100;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayed(Math.round(value * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      className={`relative flex flex-col items-center justify-center py-4 rounded-2xl overflow-hidden ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${accent}30`,
        boxShadow: `0 0 24px ${accent}14 inset`,
      }}>
      {/* top glow bar */}
      <div className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.7 }} />
      {/* bloom */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.08, 0.18, 0.08] }} transition={{ duration: 3.5, repeat: Infinity }}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}55, transparent 70%)` }} />
      <motion.span className="relative z-10 text-[26px] font-black leading-none tracking-tight"
        style={{ color: accent, textShadow: `0 0 22px ${accent}88` }}>
        {fmt(displayed)}
      </motion.span>
      <span className="relative z-10 text-[9px] text-muted-foreground font-bold mt-1.5 tracking-[0.18em] uppercase">{label}</span>
    </motion.div>
  );
}

/* ─── Micro Stat Card (analytics) ────────────────────────────── */
function MicroStat({ icon: Icon, label, value, color, glow, delay }: {
  icon: ElementType; label: string; value: string; color: string; glow: string; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.04, y: -2 }}
      className="rounded-xl p-2.5 relative overflow-hidden cursor-default"
      style={{ background: `linear-gradient(145deg, ${glow.replace("0.5", "0.1")}, ${glow.replace("0.5", "0.04")})`, border: `1px solid ${glow.replace("0.5", "0.18")}` }}>
      <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay }}
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(circle at 20% 20%, ${glow.replace("0.5", "0.2")}, transparent 65%)` }} />
      <div className="flex items-center gap-2 relative z-10">
        <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0" style={{ boxShadow: `0 0 8px ${glow.replace("0.5", "0.25")}` }}>
          <Icon className="w-3.5 h-3.5" style={{ color, filter: `drop-shadow(0 0 3px ${glow})` }} />
        </div>
        <div>
          <p className="text-sm font-black leading-tight" style={{ color }}>{value}</p>
          <p className="text-[9px] text-muted-foreground font-semibold leading-tight">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Tab Button ──────────────────────────────────────────────── */
function TabBtn({ active, icon: Icon, label, onClick }: { active: boolean; icon: ElementType; label: string; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.94 }}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 relative">
      <Icon className={`w-3.5 h-3.5 transition-colors ${active ? "text-violet-400" : "text-muted-foreground/50"}`} />
      <span className={`text-xs font-bold tracking-wide transition-colors ${active ? "text-foreground" : "text-muted-foreground/50"}`}>{label}</span>
      {active && (
        <motion.div layoutId="pf-tab-underline"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          style={{ width: 28, background: "linear-gradient(90deg,#7c3aed,#6366f1)", boxShadow: "0 0 8px rgba(124,58,237,0.75)" }} />
      )}
    </motion.button>
  );
}

/* ─── Locked Profile View ─────────────────────────────────────── */
function LockedProfileView({ user, onFollow, followPending }: {
  user: any; onFollow: () => void; followPending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto pb-10 select-none">

      {/* ── Cover — aniq, hira yo'q ── */}
      <div className="h-48 overflow-hidden relative rounded-b-3xl">
        {user.coverUrl ? (
          isVideoUrl(user.coverUrl)
            ? <video src={resolveApiUrl(user.coverUrl)} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            : <img src={resolveApiUrl(user.coverUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#07050f]">
            <motion.div animate={{ x:[0,45,-10,0], y:[0,-25,10,0] }} transition={{ duration:14, repeat:Infinity, ease:"easeInOut" }}
              className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
              style={{ background:"radial-gradient(circle,rgba(124,58,237,0.7) 0%,transparent 68%)", filter:"blur(26px)" }} />
            <motion.div animate={{ x:[0,-30,14,0], y:[0,18,-14,0] }} transition={{ duration:11, repeat:Infinity, ease:"easeInOut", delay:2.5 }}
              className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full"
              style={{ background:"radial-gradient(circle,rgba(59,130,246,0.6) 0%,transparent 68%)", filter:"blur(22px)" }} />
            <motion.div animate={{ x:[0,18,-18,0], y:[0,12,-10,0] }} transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:1 }}
              className="absolute top-1/4 left-1/3 w-44 h-44 rounded-full"
              style={{ background:"radial-gradient(circle,rgba(52,211,153,0.35) 0%,transparent 68%)", filter:"blur(18px)" }} />
          </div>
        )}
        {/* faqat pastki gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>

      {/* ── Avatar — aniq ── */}
      <div className="px-4 -mt-12 relative z-10">
        <Avatar3D avatarUrl={user.avatarUrl} displayName={user.displayName}
          isVerified={user.isVerified} isUploading={false} isOwner={false}
          onUploadClick={() => {}} size={96} />
      </div>

      {/* ── Ism + username ── */}
      <div className="px-4 mt-3 mb-8">
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-black text-foreground">{user.displayName}</h1>
          {user.isVerified && <BadgeCheck className="w-4.5 h-4.5 text-violet-400" />}
        </div>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>

      {/* ── Markaziy Lock Kapsule ── */}
      <div className="flex justify-center mt-6">
        <motion.div
          layout
          onClick={() => { if (!open) setOpen(true); }}
          animate={open
            ? { width: 200, background: "linear-gradient(135deg,#7c3aed,#4f46e5,#2563eb)" }
            : { width: 52,  background: "linear-gradient(135deg,#3b0764,#1e1b4b)" }
          }
          transition={{ type:"spring", stiffness:380, damping:32 }}
          className="relative overflow-hidden cursor-pointer"
          style={{
            height: 52, borderRadius: 999,
            border: "1.5px solid rgba(139,92,246,0.55)",
            boxShadow: open
              ? "0 0 32px rgba(124,58,237,0.55), 0 0 8px rgba(99,102,241,0.4)"
              : "0 0 18px rgba(124,58,237,0.35), inset 0 0 12px rgba(139,92,246,0.15)",
            display:"flex", alignItems:"center", justifyContent: open ? "space-between" : "center",
            padding: open ? "0 8px 0 16px" : "0",
          }}
        >
          {/* Shimmer */}
          <motion.div animate={{ x:["-120%","220%"] }} transition={{ duration:2.2, repeat:Infinity, ease:"linear", repeatDelay:1 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", skewX:-15 }} />

          {/* Lock icon — har doim ko'rinadi */}
          <motion.div layout animate={open ? { rotate:[0,-12,12,0] } : { rotate:0 }}
            transition={open ? { duration:0.4, delay:0.1 } : {}}>
            <Lock className="w-5 h-5 text-violet-300 flex-shrink-0" />
          </motion.div>

          {/* Kuzatish matni va tugma — faqat ochilganda */}
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                transition={{ delay:0.1 }}
                className="flex items-center gap-2 ml-2">
                <span className="text-white text-sm font-bold whitespace-nowrap">Kuzatish</span>
                <motion.button
                  whileTap={{ scale:0.88 }}
                  disabled={followPending}
                  onClick={(e) => { e.stopPropagation(); onFollow(); }}
                  className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0"
                >
                  {followPending
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <UserPlus className="w-4 h-4 text-white" />}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Obunachi soni */}
      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
        className="text-center text-xs text-muted-foreground/50 mt-4">
        {(user.followersCount ?? 0).toLocaleString()} ta obunachi
      </motion.p>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function ProfilePage({ userId }: ProfilePageProps) {
  const { t } = useTranslation();
  const { data: user, isLoading, isError: userError, refetch: refetchUser } = useGetUser(userId, { query: { queryKey: getGetUserQueryKey(userId) } });
  const { data: posts = [] } = useListPosts({ userId });
  const { data: reels = [] } = useListReels({ userId });
  const [following, setFollowing] = useState<boolean | null>(null);
  const follow = useFollowUser();
  const updateUser = useUpdateUser();
  const startLive = useStartLive();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reels" | "analytics">("posts");
  const { user: me } = useAuth();
  const search = useSearch();
  const mirrorMode = new URLSearchParams(search).get("mirror") === "1";
  const actuallyOwner = me?.id === userId;
  const isOwner = actuallyOwner && !mirrorMode;
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

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

  // Sync following state from server data when it loads / changes
  useEffect(() => {
    if (user) setFollowing(user.isFollowing ?? false);
  }, [user?.isFollowing]);

  const handleFollow = () => {
    const next = !(following ?? false);
    setFollowing(next);
    follow.mutate(
      { id: userId },
      {
        onSuccess: (data: any) => {
          // Use server's authoritative value
          if (typeof data?.following === "boolean") setFollowing(data.following);
          qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
        },
        onError: () => {
          // Revert optimistic update on failure
          setFollowing(!next);
        },
      }
    );
  };
  const handleGoLive = async () => {
    if (!liveTitle.trim()) return;
    setLiveStarting(true);
    try { const stream = await startLive.mutateAsync({ data: { title: liveTitle.trim() } }); navigate(`/live/${stream.id}`); }
    catch (err: any) { setLiveStarting(false); import("sonner").then(({ toast }) => toast.error(err?.response?.data?.error ?? "Live boshlashda xato")).catch(()=>{}); }
  };
  const handleSubscribe = async (planId: number) => {
    setSubError(null); setSubscribingPlanId(planId);
    try { await subscribeMutation.mutateAsync({ planId }); await refetchSub(); setShowSub(false); }
    catch (err: any) { setSubError(err?.response?.data?.error ?? t("profile.sub_error") ?? "Error"); }
    finally { setSubscribingPlanId(null); }
  };
  const handleUnsubscribe = async (planId: number) => {
    setSubscribingPlanId(planId);
    try { await unsubscribeMutation.mutateAsync({ planId }); await refetchSub(); }
    catch (err: any) { import("sonner").then(({ toast }) => toast.error(err?.response?.data?.error ?? t("profile.sub_error") ?? "Xato yuz berdi")).catch(()=>{}); }
    finally { setSubscribingPlanId(null); }
  };
  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !newPlanPrice) return;
    setCreatingPlan(true);
    try {
      const perks = newPlanPerks.split("\n").map(p => p.trim()).filter(Boolean);
      await createPlanMutation.mutateAsync({ data: { name: newPlanName.trim(), description: newPlanDesc.trim() || undefined, price: Math.round(parseFloat(newPlanPrice) * 100), perks } });
      qc.invalidateQueries({ queryKey: getListCreatorPlansQueryKey(userId) });
      setNewPlanName(""); setNewPlanDesc(""); setNewPlanPrice(""); setNewPlanPerks("");
    } catch (err: any) { import("sonner").then(({ toast }) => toast.error(err?.response?.data?.error ?? "Reja yaratishda xato")).catch(()=>{}); }
    finally { setCreatingPlan(false); }
  };

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-40 bg-card animate-pulse relative overflow-hidden rounded-b-3xl">
          <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ skewX: -15 }} />
        </div>
        <div className="px-4 -mt-11 flex items-end gap-4">
          <div className="w-[102px] h-[102px] rounded-[23px] bg-muted animate-pulse shrink-0" />
          <div className="flex-1 pb-1 space-y-2">
            <div className="h-4 bg-muted rounded-lg animate-pulse w-1/2" />
            <div className="h-3 bg-muted rounded-lg animate-pulse w-1/3" />
          </div>
        </div>
      </div>
    );
  }
  if (userError) return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-muted-foreground text-sm">Server bilan bog'liq xato</p>
      <button onClick={() => refetchUser()} className="px-5 py-2 rounded-2xl bg-violet-600 text-white text-sm font-semibold">
        Qayta urinish
      </button>
    </div>
  );
  if (!user) return <div className="text-center py-20 text-muted-foreground">Foydalanuvchi topilmadi</div>;

  /* ── Qulfli profil (private account, viewer is not following) ── */
  const isLocked = (user as any).isPrivate === true && !(following ?? user.isFollowing) && !isOwner;
  if (isLocked) {
    return <LockedProfileView user={user} onFollow={handleFollow} followPending={follow.isPending} />;
  }

  // posts already filtered by userId on the server — no client-side re-filter needed
  const myPosts = posts;

  const openViewer = (idx: number) => { setViewerIdx(idx); setViewerOpen(true); };

  /* Analytics calculations */
  const totalLikes = myPosts.reduce((s, p) => s + (p.likesCount ?? 0), 0) + reels.reduce((s, r) => s + (r.likesCount ?? 0), 0);
  const totalComments = myPosts.reduce((s, p) => s + (p.commentsCount ?? 0), 0);
  const totalViews = reels.reduce((s, r) => s + (r.viewsCount ?? 0), 0);
  const totalShares = myPosts.reduce((s, p) => s + ((p as any).sharesCount ?? 0), 0);
  const totalContent = myPosts.length + reels.length;
  const avgEng = totalContent > 0 ? Math.round((totalLikes + totalComments) / totalContent * 10) / 10 : 0;
  const topPost = [...myPosts].sort((a, b) => ((b.likesCount ?? 0) + (b.commentsCount ?? 0)) - ((a.likesCount ?? 0) + (a.commentsCount ?? 0)))[0];
  const topReel = [...reels].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))[0];

  return (
    <div className="max-w-2xl mx-auto pb-10 relative">

      {actuallyOwner && mirrorMode && (
        <>
          {/* ── Mirror banner ── */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-3 mb-1 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 flex items-center gap-3 z-20 relative">
            <span className="text-lg">🪞</span>
            <div className="flex-1 min-w-0">
              <p className="text-cyan-300 text-xs font-bold">{t("profile.mirror_banner_title")}</p>
              <p className="text-cyan-300/60 text-[10px] mt-0.5">{t("profile.mirror_banner_desc")}</p>
            </div>
            <button onClick={() => navigate(`/profile/${userId}`)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-cyan-200 bg-cyan-500/15 border border-cyan-500/30">
              {t("profile.mirror_exit")}
            </button>
          </motion.div>

          {/* ── Mirror detail panel ── */}
          <MirrorPanel userId={userId} />
        </>
      )}

      {/* ══ Cover ══════════════════════════════════════════════════ */}
      <div className="h-40 overflow-hidden relative group/cover rounded-b-3xl z-10">
        <AnimatePresence mode="wait">
          {user.coverUrl ? (
            isVideoUrl(user.coverUrl) ? (
              <video key="cv" src={resolveApiUrl(user.coverUrl)} autoPlay muted loop playsInline
                className="absolute inset-0 w-full h-full object-cover" />
            ) : (
            <motion.img key="ci" src={resolveApiUrl(user.coverUrl)} alt=""
              initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.55 }}
              className="absolute inset-0 w-full h-full object-cover" />
            )
          ) : (
            <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#07050f] overflow-hidden">
              {/* Aurora blobs */}
              <motion.div animate={{ x: [0, 45, -10, 0], y: [0, -25, 10, 0], scale: [1, 1.18, 0.92, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 68%)", filter: "blur(26px)" }} />
              <motion.div animate={{ x: [0, -30, 14, 0], y: [0, 18, -14, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.55) 0%, transparent 68%)", filter: "blur(22px)" }} />
              <motion.div animate={{ x: [0, 18, -18, 0], y: [0, 12, -10, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/4 left-1/3 w-44 h-44 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(52,211,153,0.32) 0%, transparent 68%)", filter: "blur(18px)" }} />
              {/* Holographic grid */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              {/* Scan line */}
              <motion.div animate={{ y: ["-100%", "300%"] }} transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 2.5 }}
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent pointer-events-none" />
              {/* Stars */}
              {[
                { l: "9%", t: "22%", d: 3.1, del: 0, s: 3 }, { l: "26%", t: "58%", d: 4, del: 0.7, s: 2.5 },
                { l: "52%", t: "16%", d: 2.7, del: 1.4, s: 4 }, { l: "72%", t: "62%", d: 3.5, del: 0.3, s: 2.5 },
                { l: "86%", t: "28%", d: 2.4, del: 2, s: 3.5 }, { l: "93%", t: "68%", d: 3, del: 0.5, s: 2 },
              ].map((dot, i) => (
                <motion.div key={i} className="absolute rounded-full bg-white"
                  style={{ left: dot.l, top: dot.t, width: dot.s, height: dot.s, boxShadow: `0 0 ${dot.s * 3}px rgba(255,255,255,0.9)` }}
                  animate={{ y: [-4, 4, -4], opacity: [0.12, 0.8, 0.12], scale: [1, 1.5, 1] }}
                  transition={{ duration: dot.d, repeat: Infinity, delay: dot.del }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />

        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />
            <AnimatePresence>
              {coverUploading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/65 backdrop-blur-[4px] flex flex-col items-center justify-center gap-2 z-20">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <p className="text-white/70 text-xs font-semibold">{t("settings.cover_uploading")}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!coverUploading && (
              <div onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 opacity-0 group-hover/cover:opacity-100 active:opacity-100 transition-all cursor-pointer flex items-end justify-end p-3 z-10"
                style={{ background: "rgba(0,0,0,0.25)" }}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-black/50 border border-white/20 backdrop-blur-md shadow-xl">
                  <Camera className="w-4 h-4 text-white" />
                  <span className="text-white text-[11px] font-semibold">Rasm / Video</span>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ Profile Header ════════════════════════════════════════ */}
      <div className="px-4 relative z-10">
        {/* Avatar row */}
        <div className="flex items-end justify-between" style={{ marginTop: -44 }}>
          <div className="relative z-10">
            <input ref={avatarInputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
            <Avatar3D avatarUrl={user.avatarUrl} displayName={user.displayName} isVerified={user.isVerified}
              isUploading={avatarUploading} isOwner={isOwner} onUploadClick={() => avatarInputRef.current?.click()} size={96} />
          </div>

          {/* Action buttons — micro-strip */}
          <div className="flex items-center gap-1 pb-1">
            {isOwner ? (
              <>
                {/* LIVE dot-button */}
                <motion.button onClick={() => setShowLive(true)}
                  whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}
                  className="relative flex items-center gap-1 px-2 h-6 rounded-full text-white text-[10px] font-black tracking-wide"
                  style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 0 10px rgba(220,38,38,0.55)" }}>
                  <motion.span animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                  <Radio className="w-2.5 h-2.5" />
                </motion.button>

                {/* PLANS button */}
                <motion.button onClick={() => setShowSub(true)}
                  whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-black"
                  style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)", color: "#fbbf24" }}>
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  <span>{t("profile.sub_count")}</span>
                </motion.button>

                {/* SETTINGS icon */}
                <motion.button onClick={() => setShowSettings(true)}
                  whileTap={{ scale: 0.88, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Settings className="w-3 h-3 text-muted-foreground" />
                </motion.button>
              </>
            ) : (
              /* ── Visitor: combined segmented pill ── */
              <div className="flex items-center rounded-full overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
                {/* Follow segment */}
                <motion.button onClick={handleFollow} whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1 pl-2.5 pr-2 h-6 text-[10px] font-black transition-colors"
                  style={{
                    color: following ? "#a3a3a3" : "#fff",
                    background: following ? "transparent" : "linear-gradient(90deg,rgba(124,58,237,0.5),rgba(59,130,246,0.4))",
                  }}>
                  {following
                    ? <><UserCheck className="w-2.5 h-2.5" /><span>{t("profile.following_btn")}</span></>
                    : <><UserPlus className="w-2.5 h-2.5" /><span>{t("profile.follow_btn")}</span></>
                  }
                </motion.button>

                {/* Divider */}
                <div className="w-px h-3.5 bg-white/15 flex-shrink-0" />

                {/* Subscribe segment */}
                <motion.button onClick={() => setShowSub(true)} whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1 pl-2 pr-2.5 h-6 text-[10px] font-black transition-colors"
                  style={{ color: isSubscribed ? "#fbbf24" : "#a3a3a3" }}>
                  {isSubscribed
                    ? <><Check className="w-2.5 h-2.5" /><span>{t("profile.subscribed")}</span></>
                    : <><Bell className="w-2.5 h-2.5" /><span>{t("profile.subscription")}</span></>
                  }
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Name + bio */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 22 }}
          className="mt-2.5 mb-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h1 className="text-lg font-black text-foreground">{user.displayName}</h1>
            {user.isVerified && (
              <motion.div animate={{ filter: ["drop-shadow(0 0 3px rgba(124,58,237,0.4))", "drop-shadow(0 0 9px rgba(124,58,237,0.8))", "drop-shadow(0 0 3px rgba(124,58,237,0.4))"] }}
                transition={{ duration: 2.5, repeat: Infinity }}>
                <BadgeCheck className="w-4.5 h-4.5 text-primary" />
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <p className="text-xs text-muted-foreground">@{user.username}</p>
            {(user as any).isPrivate && isOwner && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-[10px] font-bold text-violet-400">
                <Lock className="w-2.5 h-2.5" /> Yopiq
              </span>
            )}
          </div>
          {user.bio && <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{user.bio}</p>}
        </motion.div>

        {/* ── Big Stats Grid ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="grid gap-2 mb-5"
          style={{ gridTemplateColumns: isOwner && plans.length > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr" }}>
          <BigStatNode value={(user as any).postsCount ?? myPosts.length} label={t("profile.posts")} accent="#a78bfa" />
          <BigStatNode value={user.followersCount ?? 0} label={t("profile.stat_followers")} accent="#818cf8" />
          <BigStatNode value={user.followingCount ?? 0} label={t("profile.stat_following")} accent="#60a5fa" />
          {isOwner && plans.length > 0 && (
            <BigStatNode
              value={plans.reduce((s, p) => s + (p.subscriberCount ?? 0), 0)}
              label={t("profile.sub_count")}
              accent="#fbbf24"
              onClick={() => setShowSub(true)}
            />
          )}
        </motion.div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-0 mb-4 border-b border-white/8">
          {([
            ["posts", Grid3X3, t("profile.posts")],
            ["reels", Play, "Reels"],
            ...(isOwner ? [["analytics", BarChart2, t("admin.analytics")]] : []),
          ] as [string, ElementType, string][]).map(([tabId, Icon, label]) => (
            <TabBtn key={tabId} active={tab === tabId} icon={Icon} label={label} onClick={() => setTab(tabId as "posts" | "reels" | "analytics")} />
          ))}
        </div>

        {/* ── Posts Grid ────────────────────────────────────────── */}
        {tab === "posts" && myPosts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground">
            <motion.div animate={{ y: [-3, 3, -3], opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-white/5 mx-auto mb-2.5 flex items-center justify-center">
              <BookmarkIcon className="w-6 h-6 opacity-35" />
            </motion.div>
            <p className="text-sm font-medium">{t("profile.no_posts") || "No posts yet"}</p>
          </motion.div>
        )}
        {tab === "posts" && myPosts.length > 0 && (
          <div className="space-y-1.5">
            {/* ─── Hero featured post ─── */}
            {topPost && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                  <motion.div whileTap={{ scale: 0.98 }} onClick={() => openViewer(0)}
                    className="w-full rounded-2xl overflow-hidden relative cursor-pointer group/hero"
                    style={{ height: 200, boxShadow: "0 4px 28px rgba(124,58,237,0.18)" }}>
                    {topPost.mediaUrl && topPost.type !== "video"
                      ? <img src={resolveApiUrl(topPost.mediaUrl)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      : topPost.mediaUrl && topPost.type === "video"
                      ? <div className="w-full h-full relative bg-black">
                          <video src={resolveApiUrl(topPost.mediaUrl)} className="w-full h-full object-cover" muted preload="none" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/50 border border-white/28 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      : <div className="w-full h-full flex items-center justify-center p-5"
                          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.12))" }}>
                          <p className="text-sm text-foreground/85 line-clamp-5 text-center leading-relaxed">{topPost.content}</p>
                        </div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(124,58,237,0.35)", border: "1px solid rgba(124,58,237,0.5)", backdropFilter: "blur(8px)" }}>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-black text-white tracking-wide">{t("profile.top_post")}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-3 opacity-0 group-hover/hero:opacity-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-4 h-4 fill-white" />
                          <span className="text-sm font-bold">{topPost.likesCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span className="text-sm font-bold">{topPost.commentsCount ?? 0}</span>
                        </div>
                      </div>
                    </div>
                    {!topPost.mediaUrl && (
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug">{topPost.content}</p>
                      </div>
                    )}
                  </motion.div>
              </motion.div>
            )}
            {/* ─── 3-col grid ─── */}
            <div className="grid grid-cols-3 gap-1.5">
              {myPosts.filter(p => p.id !== topPost?.id).map((post, i) => {
                const gridIdx = topPost ? i + 1 : i;
                return (
                  <motion.div key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 + 0.08, type: "spring", stiffness: 280, damping: 24 }}>
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                      onClick={() => openViewer(gridIdx)}
                      className="aspect-square rounded-xl overflow-hidden bg-card cursor-pointer relative group/post"
                      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
                      {post.mediaUrl && post.type !== "video"
                        ? <img src={resolveApiUrl(post.mediaUrl)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        : post.mediaUrl && post.type === "video"
                        ? <div className="w-full h-full relative bg-black">
                            <video src={resolveApiUrl(post.mediaUrl)} className="w-full h-full object-cover" muted preload="none" />
                          </div>
                        : <div className="w-full h-full flex items-center justify-center p-2"
                            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(59,130,246,0.1))" }}>
                            <p className="text-[10px] text-foreground/75 line-clamp-4 text-center leading-relaxed">{post.content}</p>
                          </div>
                      }
                      <motion.div className="absolute inset-0 bg-black/60 opacity-0 group-hover/post:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                        <div className="flex items-center gap-1 text-white">
                          <Heart className="w-3.5 h-3.5 fill-white" /><span className="text-xs font-bold">{post.likesCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                          <MessageCircle className="w-3.5 h-3.5 fill-white" /><span className="text-xs font-bold">{post.commentsCount ?? 0}</span>
                        </div>
                      </motion.div>
                      {post.type === "video" && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/55 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reels Grid ────────────────────────────────────────── */}
        {tab === "reels" && (
          reels.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground">
              <motion.div animate={{ y: [-3, 3, -3], opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 rounded-2xl bg-white/5 mx-auto mb-2.5 flex items-center justify-center">
                <Play className="w-6 h-6 opacity-35" />
              </motion.div>
              <p className="text-sm font-medium">{t("profile.no_reels")}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {reels.map((reel, i) => (
                <motion.div key={reel.id}
                  initial={{ opacity: 0, scale: 0.88, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 280, damping: 22 }}>
                  <Link href="/reels">
                    <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                      className="aspect-[3/4] rounded-xl overflow-hidden bg-card border border-white/8 cursor-pointer relative group/reel"
                      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                      {/* Video thumbnail — shows first frame, plays on hover */}
                      {reel.videoUrl ? (
                        <video
                          src={reel.videoUrl + "#t=0.001"}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={e => { e.currentTarget.play().catch(() => {}); }}
                          onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                      ) : reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.12))" }}>
                          <Play className="w-7 h-7 text-primary/35" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/reel:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/28 flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      {/* Stats bar */}
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-0.5 text-white">
                          <Play className="w-2 h-2 fill-white opacity-75" />
                          <span className="text-[9px] font-semibold opacity-85">
                            {(reel.viewsCount ?? 0) >= 1000 ? `${((reel.viewsCount ?? 0) / 1000).toFixed(1)}K` : reel.viewsCount ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-white">
                          <Heart className="w-2 h-2 fill-white opacity-75" />
                          <span className="text-[9px] font-semibold opacity-85">{reel.likesCount ?? 0}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* ── Analytics Tab (compact) ──────────────────────────── */}
        {tab === "analytics" && isOwner && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pb-4">

            {/* Micro stats 3×2 grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Heart, label: t("profile.total_likes"), value: totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}K` : String(totalLikes), color: "#f472b6", glow: "rgba(244,114,182,0.5)", delay: 0 },
                { icon: Eye, label: t("profile.total_views"), value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews), color: "#c084fc", glow: "rgba(192,132,252,0.5)", delay: 0.05 },
                { icon: MessageCircle, label: t("profile.total_comments"), value: String(totalComments), color: "#60a5fa", glow: "rgba(96,165,250,0.5)", delay: 0.1 },
                { icon: Share2, label: t("profile.total_shares"), value: String(totalShares), color: "#34d399", glow: "rgba(52,211,153,0.5)", delay: 0.15 },
                { icon: TrendingUp, label: t("profile.avg_engagement"), value: String(avgEng), color: "#fbbf24", glow: "rgba(251,191,36,0.5)", delay: 0.2 },
                { icon: BarChart2, label: t("profile.total_content"), value: String(totalContent), color: "#67e8f9", glow: "rgba(103,232,249,0.5)", delay: 0.25 },
              ].map(props => <MicroStat key={props.label} {...props} />)}
            </div>

            {/* Top content: post + reel side by side */}
            {(topPost || topReel) && (
              <div className="grid grid-cols-2 gap-2">
                {topPost && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                    className="rounded-xl border border-amber-500/18 p-2.5"
                    style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.07), rgba(249,115,22,0.03))" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Star className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-bold text-foreground truncate">{t("profile.top_post")}</span>
                    </div>
                    <p className="text-[10px] text-foreground/75 line-clamp-2 mb-1.5 leading-relaxed">{topPost.content}</p>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-pink-400" />{topPost.likesCount ?? 0}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5 text-blue-400" />{topPost.commentsCount ?? 0}</span>
                    </div>
                  </motion.div>
                )}
                {topReel && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                    className="rounded-xl border border-violet-500/18 p-2.5"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.07), rgba(59,130,246,0.03))" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Play className="w-3 h-3 text-violet-400 fill-violet-400 shrink-0" />
                      <span className="text-[10px] font-bold text-foreground truncate">{t("profile.top_reel")}</span>
                    </div>
                    <p className="text-[10px] text-foreground/75 line-clamp-2 mb-1.5 leading-relaxed">{topReel.caption ?? "Reel"}</p>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 text-violet-400" />{(topReel.viewsCount ?? 0).toLocaleString()}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-pink-400" />{topReel.likesCount ?? 0}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {totalContent === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }}>
                  <BarChart2 className="w-7 h-7 mx-auto mb-2 opacity-25" />
                </motion.div>
                <p className="text-sm">{t("profile.no_content")}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ══ Bottom Sheets ═════════════════════════════════════════ */}
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
        onAvatarClick={() => avatarInputRef.current?.click()}
        onCoverClick={() => { setShowSettings(false); coverInputRef.current?.click(); }}
        onOpenSubscription={() => setShowSub(true)} />

      <ProfileOrb
        targetUser={{ displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl }}
        targetUserId={userId}
        isOwner={isOwner}
        hidden={viewerOpen}
      />

      {/* ── Post Viewer ── */}
      <AnimatePresence>
        {viewerOpen && (
          <PostViewer
            posts={myPosts}
            startIndex={viewerIdx}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
