import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, MoreHorizontal, ChevronDown, X,
  PenLine, BookOpen, Film, MonitorPlay, Trophy, Zap, Radio, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useListPosts, useGetAiFeed, useListStories } from "@workspace/api-client-react";
import FeedCard from "@/components/FeedCard";
import CreateContentModal from "@/components/CreateContentModal";
import TunnelFeed from "@/components/TunnelFeed";
import { getFeaturePref } from "@/lib/sounds";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type TabType = "post" | "reel" | "story" | "otube" | "challenge";

interface FolloweeEnergy {
  userId: number;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  energyLevel: number;
}

/* ── energy_broadcast: shows followees' current energy level ── */
function FolloweesEnergyBar() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FolloweeEnergy[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/mood/following/energy`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : []))
      .then((data: FolloweeEnergy[]) => { if (!cancelled) setEntries(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wide shrink-0 flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400" /> {t("home.energy_bar_title")}
      </span>
      {entries.slice(0, 12).map(e => {
        const pct = Math.min(100, Math.max(0, e.energyLevel * 10));
        const ringColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
        return (
          <div key={e.userId} className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
              style={{ border: `2px solid ${ringColor}`, background: "#1a1a2e" }}
              title={`${e.displayName || e.username}: ${pct}%`}
            >
              {e.avatar
                ? <img src={e.avatar} alt={e.username} className="w-full h-full object-cover" />
                : <span className="text-[10px] text-white/70">{(e.displayName || e.username)?.[0]?.toUpperCase()}</span>}
            </div>
            <span className="text-[9px] text-white/50 mt-0.5 truncate w-full text-center">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── FAB sparkle constants (rainbow burst) ─── */
const SPARKLE_ANGLES = [0,30,60,90,120,150,180,210,240,270,300,330,15,75,135,195,255,315];
const SPARKLE_COLORS = [
  "#f472b6","#fb923c","#facc15","#4ade80","#38bdf8",
  "#a78bfa","#f87171","#34d399","#c084fc","#fbbf24",
];
const SPARKLE_SIZES = [7, 5, 9, 4, 8, 5, 7, 4, 6, 5];

/* ─── Content type config ─── */
const CONTENT_TYPE_CONFIG: {
  id: TabType;
  Icon: React.ElementType;
  grad: string;
  glow: string;
  accent: string;
  shimmer: string;
}[] = [
  {
    id: "post",
    Icon: PenLine,
    grad: "linear-gradient(140deg,#6d28d9 0%,#4f46e5 60%,#7c3aed 100%)",
    glow: "rgba(109,40,217,0.55)",
    accent: "#a78bfa",
    shimmer: "rgba(167,139,250,0.35)",
  },
  {
    id: "story",
    Icon: BookOpen,
    grad: "linear-gradient(140deg,#d97706 0%,#ec4899 70%,#f472b6 100%)",
    glow: "rgba(236,72,153,0.5)",
    accent: "#fbbf24",
    shimmer: "rgba(249,168,212,0.35)",
  },
  {
    id: "reel",
    Icon: Film,
    grad: "linear-gradient(140deg,#dc2626 0%,#f97316 65%,#fbbf24 100%)",
    glow: "rgba(220,38,38,0.55)",
    accent: "#f87171",
    shimmer: "rgba(251,146,60,0.35)",
  },
  {
    id: "otube",
    Icon: MonitorPlay,
    grad: "linear-gradient(140deg,#0891b2 0%,#06b6d4 50%,#34d399 100%)",
    glow: "rgba(6,182,212,0.5)",
    accent: "#67e8f9",
    shimmer: "rgba(52,211,153,0.35)",
  },
  {
    id: "challenge",
    Icon: Trophy,
    grad: "linear-gradient(140deg,#ea580c 0%,#f59e0b 50%,#eab308 100%)",
    glow: "rgba(234,88,12,0.55)",
    accent: "#fb923c",
    shimmer: "rgba(251,191,36,0.35)",
  },
];

/* ─── Shimmer animation for cards ─── */
function CardShimmer({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: ["−100%", "200%"], opacity: [0, 0.6, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
      style={{
        background: `linear-gradient(105deg, transparent 30%, ${color} 50%, transparent 70%)`,
        borderRadius: "inherit",
      }}
    />
  );
}

/* ─── Create Sheet (bottom drawer) ─── */
function CreateSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (tab: TabType) => void;
}) {
  const { t } = useTranslation();
  const KEY_PREFIX: Record<string, string> = { challenge: "chal" }; // i18n fix
  const CONTENT_TYPES = CONTENT_TYPE_CONFIG.map(ct => {
    const k = KEY_PREFIX[ct.id] ?? ct.id;
    return { ...ct, label: t(`create.${k}_label`), desc: t(`create.${k}_desc`) };
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9994]"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-[9995]"
            style={{
              background: "rgba(6,4,20,0.97)",
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
              boxShadow: "0 -12px 60px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.05)",
              paddingBottom: "env(safe-area-inset-bottom, 20px)",
            }}
          >
            {/* Holographic top accent */}
            <motion.div
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 2,
                borderRadius: "28px 28px 0 0",
                background: "linear-gradient(90deg,#6d28d9,#ec4899,#f97316,#06b6d4,#4ade80,#a78bfa,#6d28d9)",
                backgroundSize: "300% 100%",
              }}
            />

            {/* Drag handle */}
            <div className="flex justify-center pt-3.5 pb-0.5">
              <motion.div
                animate={{ width: [28, 40, 28], opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-black text-base text-white tracking-tight">
                  {t("create.sheet_title")}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {t("create.sheet_sub")}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <X className="w-4 h-4 text-white/50" />
              </motion.button>
            </div>

            {/* Content type grid */}
            <div className="px-4 pb-5 grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((ct, i) => {
                const isLast = i === CONTENT_TYPES.length - 1;
                return (
                  <motion.button
                    key={ct.id}
                    initial={{ opacity: 0, y: 18, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.055, type: "spring", damping: 20, stiffness: 340 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { onClose(); onSelect(ct.id); }}
                    className={`relative overflow-hidden text-left ${isLast ? "col-span-2" : ""}`}
                    style={{
                      minHeight: isLast ? 76 : 110,
                      borderRadius: 20,
                      background: ct.grad,
                      boxShadow: `0 8px 28px ${ct.glow}, 0 0 0 1px rgba(255,255,255,0.08)`,
                      padding: isLast ? "14px 18px" : "16px 14px",
                      flexDirection: isLast ? "row" : "column",
                      display: "flex",
                      alignItems: isLast ? "center" : "flex-start",
                      gap: isLast ? 16 : 0,
                    }}
                  >
                    {/* Shimmer sweep */}
                    <CardShimmer color={ct.shimmer} />

                    {/* Subtle radial glow at top-right */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: -20, right: -20,
                        width: 80, height: 80,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.12)",
                        filter: "blur(20px)",
                      }}
                    />

                    {/* Icon container */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: isLast ? 44 : 40,
                        height: isLast ? 44 : 40,
                        borderRadius: 13,
                        background: "rgba(0,0,0,0.22)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                        marginBottom: isLast ? 0 : 10,
                      }}
                    >
                      <ct.Icon
                        style={{
                          width: isLast ? 20 : 18,
                          height: isLast ? 20 : 18,
                          color: "white",
                          filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))",
                        }}
                      />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-black text-white leading-tight"
                        style={{ fontSize: isLast ? 15 : 13 }}
                      >
                        {ct.label}
                      </div>
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "rgba(255,255,255,0.62)" }}
                      >
                        {ct.desc}
                      </div>
                    </div>

                    {/* Arrow badge (last card only) */}
                    {isLast && (
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          background: "rgba(0,0,0,0.2)",
                          fontSize: 16,
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        ›
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: feed } = useGetAiFeed();
  const { data: posts = [], isLoading } = useListPosts();
  const { data: stories = [] } = useListStories();

  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [createTab,    setCreateTab]    = useState<TabType>("post");
  const [sparkling,    setSparkling]    = useState(false);
  const [tunnelOpen,   setTunnelOpen]   = useState(false);
  const [echoDismissed, setEchoDismissed] = useState(false);

  /* Stories: group by author so one circle = one person */
  const storyGroups = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const s of stories) {
      const aid = (s.author as any)?.id;
      if (!aid) continue;
      if (!map.has(aid)) map.set(aid, []);
      map.get(aid)!.push(s);
    }
    return Array.from(map.values());
  }, [stories]);

  const [viewerGroupIdx, setViewerGroupIdx] = useState<number | null>(null);
  const [viewerStoryIdx, setViewerStoryIdx] = useState(0);
  const [portalOrigin,   setPortalOrigin]   = useState<{ x: number; y: number } | null>(null);
  const [holoUser,       setHoloUser]       = useState<any>(null);

  const tapTimers  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const lastTapAt  = useRef<Map<number, number>>(new Map());

  const openGroup = useCallback((gi: number, origin: { x: number; y: number }) => {
    setPortalOrigin(origin);
    setViewerGroupIdx(gi);
    setViewerStoryIdx(0);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerGroupIdx(null);
    setViewerStoryIdx(0);
    setPortalOrigin(null);
  }, []);

  const goNextInGroup = useCallback(() => {
    if (viewerGroupIdx === null) return;
    const group = storyGroups[viewerGroupIdx];
    if (viewerStoryIdx < group.length - 1) {
      setViewerStoryIdx(i => i + 1);
    } else {
      closeViewer();
    }
  }, [viewerGroupIdx, viewerStoryIdx, storyGroups, closeViewer]);

  const goPrevInGroup = useCallback(() => {
    if (viewerGroupIdx === null) return;
    if (viewerStoryIdx > 0) {
      setViewerStoryIdx(i => i - 1);
    }
  }, [viewerGroupIdx, viewerStoryIdx]);

  /* Double-tap → hologram, single-tap → portal story viewer */
  const handleStoryCircleTap = useCallback((e: React.MouseEvent | React.TouchEvent, group: any[], gi: number) => {
    const authorId: number = (group[0].author as any)?.id ?? gi;
    const now = Date.now();
    const last = lastTapAt.current.get(authorId) ?? 0;
    lastTapAt.current.set(authorId, now);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    if (now - last < 320) {
      /* ── double-tap ── holographic profile */
      const timer = tapTimers.current.get(authorId);
      if (timer) { clearTimeout(timer); tapTimers.current.delete(authorId); }
      lastTapAt.current.set(authorId, 0);
      setHoloUser(group[0].author);
    } else {
      /* ── single-tap ── wait 320ms to confirm not double */
      const timer = setTimeout(() => {
        tapTimers.current.delete(authorId);
        openGroup(gi, origin);
      }, 320);
      tapTimers.current.set(authorId, timer);
    }
  }, [openGroup]);

  const feedRef = useRef<HTMLDivElement>(null);
  const displayPosts = feed?.posts?.length ? feed.posts : posts;

  const ECHO_THRESHOLD = 55;
  const showEchoBanner =
    !echoDismissed &&
    getFeaturePref("echo_detector", true) &&
    (feed?.echoScore ?? 0) >= ECHO_THRESHOLD &&
    !!feed?.echoTopTag;

  const scrollDown = () => {
    if (!feedRef.current) return;
    const h = feedRef.current.clientHeight;
    feedRef.current.scrollBy({ top: h, behavior: "smooth" });
  };

  /* FAB tap: burst sparkle then open sheet */
  const handleFabClick = useCallback(() => {
    setSparkling(true);
    setTimeout(() => { setSparkling(false); setSheetOpen(true); }, 460);
  }, []);

  useEffect(() => {
    if (!sparkling) return;
    const id = setTimeout(() => setSparkling(false), 900);
    return () => clearTimeout(id);
  }, [sparkling]);

  const handleSelect = (tab: TabType) => {
    setTimeout(() => {
      setCreateTab(tab);
      setCreateOpen(true);
    }, 120);
  };

  /* Horizontal swipe → Reels */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && dx < -70) navigate("/reels");
    },
    [navigate]
  );

  const activeGroup = viewerGroupIdx !== null ? storyGroups[viewerGroupIdx] : null;
  const activeStory = activeGroup ? activeGroup[viewerStoryIdx] ?? null : null;

  return (
    <div className="relative">

      {/* ── STORIES STRIP ── */}
      {storyGroups.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-3 py-2 overflow-x-auto"
          style={{ background: "linear-gradient(to bottom,rgba(4,4,16,0.98) 0%,rgba(4,4,16,0) 100%)", scrollbarWidth: "none" }}
        >
          {/* "Story qo'shish" */}
          <motion.div
            whileTap={{ scale: 0.92 }}
            onClick={() => { setCreateTab("story"); setCreateOpen(true); }}
            className="flex flex-col items-center gap-[5px] flex-shrink-0 cursor-pointer"
          >
            <div className="relative w-[62px] h-[62px]">
              <div className="w-full h-full rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "2px dashed rgba(139,92,246,0.55)" }}>
                <span className="text-[26px] text-violet-400 leading-none select-none">+</span>
              </div>
            </div>
            <span className="text-[10px] text-white/35 w-[62px] text-center truncate leading-none">Qo'shish</span>
          </motion.div>

          {storyGroups.map((group, gi) => {
            const rep = group[0];
            const allViewed = group.every((s: any) => s.isViewed);
            const name = rep.author?.displayName || rep.author?.username || "?";
            const initial = name[0].toUpperCase();
            return (
              <motion.div
                key={(rep.author as any)?.id ?? gi}
                whileTap={{ scale: 0.88 }}
                onClick={(e) => handleStoryCircleTap(e, group, gi)}
                className="flex flex-col items-center gap-[5px] flex-shrink-0 cursor-pointer select-none"
              >
                <div className="relative w-[64px] h-[64px]">
                  {/* spinning gradient ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={allViewed ? {} : { rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    style={{
                      background: allViewed
                        ? "rgba(255,255,255,0.15)"
                        : "conic-gradient(#a855f7 0%, #ec4899 33%, #f59e0b 66%, #6366f1 100%)",
                      padding: "2.5px",
                    }}
                  >
                    <div className="w-full h-full rounded-full" style={{ background: "#080815" }} />
                  </motion.div>
                  {/* avatar */}
                  <div className="absolute inset-[3.5px] rounded-full overflow-hidden bg-[#0e0e1f] flex items-center justify-center"
                    style={{ boxShadow: allViewed ? "none" : "0 0 14px rgba(168,85,247,0.45)" }}>
                    {rep.author?.avatarUrl ? (
                      <img src={rep.author.avatarUrl} alt={name} className="w-full h-full object-cover"
                        loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-xl font-bold text-white/80">{initial}</span>
                    )}
                  </div>
                  {/* count badge */}
                  {group.length > 1 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white z-10"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 6px rgba(124,58,237,0.8)" }}>
                      {group.length}
                    </div>
                  )}
                  {/* double-tap hint ripple */}
                  <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,255,200,0.08) 0%, transparent 70%)" }} />
                </div>
                <span className="text-[10px] text-white/50 w-[64px] text-center truncate leading-none">
                  {rep.author?.username || ""}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── STORY VIEWER (portal expand) ── */}
      <AnimatePresence>
        {activeStory && activeGroup && viewerGroupIdx !== null && (
          <motion.div
            key={`viewer-${viewerGroupIdx}`}
            initial={{
              clipPath: portalOrigin
                ? `circle(32px at ${portalOrigin.x}px ${portalOrigin.y}px)`
                : "circle(0px at 50% 20%)",
              opacity: 0,
            }}
            animate={{ clipPath: "circle(150% at 50% 50%)", opacity: 1 }}
            exit={{ clipPath: "circle(0px at 50% 20%)", opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: "#000", willChange: "clip-path" }}
          >
            {/* Story media — crossfade on story change */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewerGroupIdx}-${viewerStoryIdx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0"
              >
                {activeStory.mediaUrl ? (
                  <>
                    <img
                      src={activeStory.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        const fb = el.nextElementSibling as HTMLElement | null;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                    <div className="w-full h-full items-center justify-center px-10 hidden"
                      style={{ background: "linear-gradient(160deg,#1a0533,#0d1a33)" }}>
                      <p className="text-white text-xl font-bold text-center">{activeStory.caption || "✨"}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center px-10"
                    style={{ background: "linear-gradient(160deg,#180430 0%,#0a1830 50%,#120320 100%)" }}>
                    <p className="text-white text-2xl font-bold text-center leading-snug drop-shadow-lg">
                      {activeStory.caption || "✨"}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 20%,transparent 68%,rgba(0,0,0,0.7) 100%)" }} />
              </motion.div>
            </AnimatePresence>

            {/* Progress bars */}
            <div className="relative z-10 flex gap-[4px] px-3 pt-12 pb-1">
              {activeGroup.map((_: any, i: number) => (
                <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.28)" }}>
                  {i < viewerStoryIdx
                    ? <div className="h-full w-full bg-white" />
                    : i === viewerStoryIdx
                      ? <motion.div
                          key={`prog-${viewerGroupIdx}-${i}`}
                          className="h-full bg-white"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 5, ease: "linear" }}
                          onAnimationComplete={goNextInGroup}
                        />
                      : null}
                </div>
              ))}
            </div>

            {/* Author header */}
            <div className="relative z-10 flex items-center gap-3 px-4 pt-1 pb-2">
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                {activeStory.author?.avatarUrl ? (
                  <img src={activeStory.author.avatarUrl} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {(activeStory.author?.displayName || activeStory.author?.username || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-semibold leading-tight truncate">
                  {activeStory.author?.displayName || activeStory.author?.username}
                </p>
                <p className="text-white/45 text-[11px] leading-tight">
                  @{activeStory.author?.username}
                  {activeGroup.length > 1 && (
                    <span className="ml-2 text-white/30">{viewerStoryIdx + 1}/{activeGroup.length}</span>
                  )}
                </p>
              </div>
              <button onClick={closeViewer}
                className="p-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Caption (bottom) */}
            {activeStory.caption && activeStory.mediaUrl && (
              <div className="relative z-10 mt-auto px-5 pb-12">
                <p className="text-white text-base font-semibold leading-snug drop-shadow-lg">
                  {activeStory.caption}
                </p>
              </div>
            )}

            {/* Tap zones */}
            <button className="absolute left-0 top-0 w-1/3 h-full z-20" onClick={goPrevInGroup} />
            <button className="absolute right-0 top-0 w-1/3 h-full z-20" onClick={goNextInGroup} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HOLOGRAPHIC PROFILE VIEWER ── */}
      <AnimatePresence>
        {holoUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ background: "rgba(0,4,20,0.97)" }}
            onClick={() => setHoloUser(null)}
          >
            {/* scan lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(to right,transparent,rgba(0,255,200,0.35),transparent)" }}
              />
              <div className="absolute inset-0"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,220,180,0.025) 3px,rgba(0,220,180,0.025) 4px)",
                }} />
            </div>

            {/* grid lines */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(0,200,180,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,180,0.05) 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }} />

            {/* card */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center gap-5 px-8 py-10 rounded-3xl"
              style={{
                background: "rgba(0,12,30,0.9)",
                border: "1px solid rgba(0,255,200,0.25)",
                boxShadow: "0 0 60px rgba(0,200,200,0.2),0 0 120px rgba(0,100,200,0.12),inset 0 0 40px rgba(0,200,200,0.04)",
                backdropFilter: "blur(20px)",
                minWidth: 260,
              }}
            >
              {/* corner decorators */}
              {[["top-2 left-2","border-t border-l"],["top-2 right-2","border-t border-r"],["bottom-2 left-2","border-b border-l"],["bottom-2 right-2","border-b border-r"]].map(([pos, cls]) => (
                <div key={pos} className={`absolute ${pos} w-4 h-4 ${cls}`}
                  style={{ borderColor: "rgba(0,255,200,0.5)" }} />
              ))}

              {/* orbiting rings + avatar */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* ring 1 */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1px solid rgba(0,255,200,0.3)" }} />
                {/* ring 2 */}
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 rounded-full"
                  style={{ border: "1px solid rgba(100,180,255,0.25)" }} />
                {/* ring 3 */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-8 rounded-full"
                  style={{ border: "1px solid rgba(180,100,255,0.2)" }} />
                {/* dot on ring 1 */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full">
                  <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full -translate-x-1/2"
                    style={{ background: "#00ffc8", boxShadow: "0 0 8px #00ffc8" }} />
                </motion.div>

                {/* avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center z-10"
                  style={{
                    border: "2px solid rgba(0,255,200,0.5)",
                    boxShadow: "0 0 24px rgba(0,255,200,0.4),0 0 60px rgba(0,200,255,0.2)",
                    background: "#001020",
                  }}>
                  {holoUser.avatarUrl ? (
                    <img src={holoUser.avatarUrl} alt="" className="w-full h-full object-cover"
                      style={{ filter: "saturate(1.2) brightness(1.1)" }} />
                  ) : (
                    <span className="text-3xl font-black text-cyan-300">
                      {(holoUser.displayName || holoUser.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* name */}
              <div className="text-center">
                <motion.p
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xl font-black tracking-widest uppercase"
                  style={{ color: "#00ffc8", textShadow: "0 0 16px rgba(0,255,200,0.6)" }}>
                  {holoUser.displayName || holoUser.username}
                </motion.p>
                <p className="text-[11px] tracking-widest mt-1" style={{ color: "rgba(0,200,180,0.55)" }}>
                  @{holoUser.username}
                </p>
              </div>

              {/* holo label */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ border: "1px solid rgba(0,255,200,0.2)", background: "rgba(0,255,200,0.05)" }}>
                <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ffc8" }} />
                <span className="text-[10px] tracking-[0.2em] font-bold" style={{ color: "rgba(0,255,200,0.7)" }}>
                  HOLOGRAM ACTIVE
                </span>
              </div>

              <p className="text-[10px] tracking-wider" style={{ color: "rgba(0,200,180,0.3)" }}>
                [ Yopish uchun tashqariga bosing ]
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP OVERLAY STACK: energy broadcast bar + echo detector banner ── */}
      <div className="absolute top-3 left-3 right-3 z-40 flex flex-col gap-2">
        <FolloweesEnergyBar />

      {/* ── ECHO DETECTOR BANNER ── */}
      <AnimatePresence>
        {showEchoBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="rounded-2xl p-3.5 flex items-start gap-3"
            style={{
              background: "rgba(15,10,30,0.92)",
              border: "1px solid rgba(167,139,250,0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Radio className="w-4.5 h-4.5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{t("home.echo_title")}</p>
              <p className="text-white/60 text-xs mt-0.5 leading-snug">
                {t("home.echo_desc", { score: feed?.echoScore ?? 0, tag: feed?.echoTopTag ?? "" })}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => { setEchoDismissed(true); navigate("/explore"); }}
                  className="text-xs font-semibold text-violet-300"
                >
                  {t("home.echo_explore")}
                </button>
                <button
                  onClick={() => setEchoDismissed(true)}
                  className="text-xs text-white/40"
                >
                  {t("home.echo_dismiss")}
                </button>
              </div>
            </div>
            <button onClick={() => setEchoDismissed(true)} className="text-white/40 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── SNAP SCROLL FEED ── */}
      <div
        ref={feedRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          height: "100dvh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
        className="relative"
      >
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: "100dvh", background: "#06060f" }}>
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-violet-400/60 text-sm">{t("common.loading")}</span>
            </div>
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6" style={{ height: "100dvh", background: "#06060f" }}>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Flame className="w-16 h-16 text-violet-500/40" />
            </motion.div>
            <p className="text-white/40 text-sm">{t("home.no_posts")}</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 text-white text-sm font-semibold"
            >
              <MoreHorizontal className="w-4 h-4" />
              {t("home.create_post")}
            </motion.button>
          </div>
        ) : (
          displayPosts.map((post, i) => (
            <FeedCard key={post.id} post={post} index={i} />
          ))
        )}
      </div>

      {/* ── FAB — Glass "···" button ── */}
      <AnimatePresence>
        {!createOpen && !sheetOpen && displayPosts.length > 0 && (
          <div
            className="fixed z-[60]"
            style={{ bottom: 20, left: "50%", transform: "translateX(-50%)" }}
          >
            {/* Rainbow sparkle burst */}
            <AnimatePresence>
              {sparkling && SPARKLE_ANGLES.map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const dist = 38 + (i % 3) * 10;
                const sz = SPARKLE_SIZES[i % SPARKLE_SIZES.length];
                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos(rad) * dist,
                      y: Math.sin(rad) * dist,
                      scale: [0, 1.4, 0],
                      opacity: [1, 0.9, 0],
                    }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.014 }}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: sz,
                      height: sz,
                      background: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
                      boxShadow: `0 0 8px 2px ${SPARKLE_COLORS[i % SPARKLE_COLORS.length]}`,
                      top: "50%", left: "50%",
                      marginTop: -sz / 2,
                      marginLeft: -sz / 2,
                    }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Glass FAB pill */}
            <motion.button
              initial={{ opacity: 0, y: 14, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: sparkling ? [1, 1.12, 0.96, 1] : 1,
              }}
              exit={{ opacity: 0, y: 14, scale: 0.8 }}
              transition={sparkling ? { duration: 0.38, ease: "easeOut" } : { type: "spring", stiffness: 380, damping: 24 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleFabClick}
              className="relative flex items-center justify-center overflow-visible"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: sheetOpen
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(255,255,255,0.08)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: sparkling
                  ? "0 0 0 8px rgba(255,255,255,0.05), 0 8px 28px rgba(0,0,0,0.4)"
                  : "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.16)",
              }}
            >
              {/* Inner glass highlight */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.18) 0%, transparent 65%)",
                }}
              />

              {/* Three dots icon */}
              <motion.div
                animate={{ rotate: sheetOpen ? 90 : 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
              >
                <MoreHorizontal
                  style={{
                    width: 15,
                    height: 15,
                    color: "rgba(255,255,255,0.80)",
                    filter: "drop-shadow(0 0 3px rgba(255,255,255,0.25))",
                  }}
                />
              </motion.div>

              {/* Single subtle pulse ring */}
              {!sheetOpen && !sparkling && (
                <motion.span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                  animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                />
              )}

              {/* Sparkle inner flash */}
              <AnimatePresence>
                {sparkling && (
                  <motion.span
                    key="flash"
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    exit={{}}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 65%)" }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        )}
      </AnimatePresence>


      {/* ── Tunnel Feed overlay ── */}
      <AnimatePresence>
        {tunnelOpen && (
          <motion.div
            key="tunnel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200]"
          >
            <TunnelFeed
              initialPosts={displayPosts as any}
              onExit={() => setTunnelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scroll hint ── */}
      <AnimatePresence>
        {!isLoading && displayPosts.length > 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.5 }}
            onClick={scrollDown}
            className="fixed z-40 flex flex-col items-center gap-1 pointer-events-auto"
            style={{ bottom: 88, right: 20 }}
          >
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              <ChevronDown className="w-4 h-4 text-white/55" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Create Sheet (bottom drawer) ── */}
      <CreateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelect}
      />

      {/* ── Create Content Modal ── */}
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTab={createTab}
        singleTab
      />
    </div>
  );
}
