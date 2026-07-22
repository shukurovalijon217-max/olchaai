import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, MoreHorizontal, X, Radio,
  PenLine, BookOpen, Film, MonitorPlay, Trophy, Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useGetAiFeed, useListStories, getListStoriesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import FeedCard from "@/components/FeedCard";
import StoriesBar from "@/components/StoriesBar";
import StoryViewer from "@/components/StoryViewer";
import CreateContentModal from "@/components/CreateContentModal";
import TunnelFeed from "@/components/TunnelFeed";
import { getFeaturePref } from "@/lib/sounds";
import { usePip } from "@/context/PipContext";

const API = "";

type TabType = "post" | "reel" | "story" | "otube" | "challenge";

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

interface HoloUser {
  userId: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: feed } = useGetAiFeed();
  const { data: posts = [], isLoading, isError: postsError, refetch: refetchPosts } = useListPosts();
  const { data: storiesRaw = [] } = useListStories();
  const { dockExpanded, commentPanelOpen } = usePip();

  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [createTab,    setCreateTab]    = useState<TabType>("post");
  const [sparkling,    setSparkling]    = useState(false);
  const [tunnelOpen,   setTunnelOpen]   = useState(false);
  const [echoDismissed, setEchoDismissed] = useState(false);

  /* ── Stories state ── */
  const [viewerGroupIdx, setViewerGroupIdx] = useState<number | null>(null);
  const [viewerStoryIdx, setViewerStoryIdx] = useState(0);
  const [portalOrigin,   setPortalOrigin]   = useState<{ x: number; y: number } | null>(null);
  const [storyImgLoaded, setStoryImgLoaded] = useState(false);
  const [holoUser,       setHoloUser]       = useState<HoloUser | null>(null);
  const lastTapRef = useRef<Record<number, number>>({});

  /* ── Story timer (pause-on-hold) ── */
  const STORY_DURATION = 5;
  const [storyPaused,  setStoryPaused]  = useState(false);
  const [storyElapsed, setStoryElapsed] = useState(0);
  const storyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goNextRef     = useRef<() => void>(() => {});

  /* Group stories by author (one circle per author) */
  const storyGroups = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const s of storiesRaw as any[]) {
      const uid = (s.author as any)?.id ?? -1;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(s);
    }
    return Array.from(map.values());
  }, [storiesRaw]);

  const activeGroup = viewerGroupIdx !== null ? storyGroups[viewerGroupIdx] : null;
  const activeStory = activeGroup ? (activeGroup[viewerStoryIdx] ?? null) : null;

  /* Map authorId -> storyGroups index, so feed post avatars can open that author's story */
  const authorStoryIndex = useMemo(() => {
    const map = new Map<number, number>();
    storyGroups.forEach((g, idx) => {
      const uid = (g[0]?.author as any)?.id;
      if (uid != null) map.set(uid, idx);
    });
    return map;
  }, [storyGroups]);

  /* Called from a FeedCard post avatar (double-tap → live bubble → tap) */
  const openStoryForAuthor = useCallback((authorId: number, rect: DOMRect) => {
    const idx = authorStoryIndex.get(authorId);
    if (idx === undefined) return;
    setPortalOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setViewerGroupIdx(idx);
    setViewerStoryIdx(0);
  }, [authorStoryIndex]);

  const closeViewer = useCallback(() => {
    setViewerGroupIdx(null);
    setViewerStoryIdx(0);
    setPortalOrigin(null);
  }, []);

  const deleteActiveStory = useCallback(async () => {
    if (!activeStory) return;
    try {
      await fetch(`${API}/api/stories/${(activeStory as any).id}`, {
        method: "DELETE", credentials: "include",
      });
      await qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      closeViewer();
    } catch {
      // Story o'chirishda xato — foydalanuvchiga bildirish
      import("sonner").then(({ toast }) => toast.error("Story o'chirishda xato. Qayta urinib ko'ring.")).catch(()=>{});
    }
  }, [activeStory, qc, closeViewer]);

  const goNextInGroup = useCallback(() => {
    if (!activeGroup) return;
    if (viewerStoryIdx < activeGroup.length - 1) {
      setViewerStoryIdx(i => i + 1);
    } else {
      // advance to next group or close
      if (viewerGroupIdx !== null && viewerGroupIdx < storyGroups.length - 1) {
        setViewerGroupIdx(i => (i ?? 0) + 1);
        setViewerStoryIdx(0);
      } else {
        closeViewer();
      }
    }
  }, [activeGroup, viewerStoryIdx, viewerGroupIdx, storyGroups.length, closeViewer]);

  /* Keep goNextRef current so interval callbacks never go stale */
  useEffect(() => { goNextRef.current = goNextInGroup; }, [goNextInGroup]);

  /* Reset timer + img-loaded flag whenever the active story changes */
  useEffect(() => {
    setStoryElapsed(0);
    setStoryPaused(false);
    setStoryImgLoaded(false);
  }, [viewerStoryIdx, viewerGroupIdx]);

  /* Preload current + next story images so viewer opens instantly */
  useEffect(() => {
    if (!activeStory) return;
    if (activeStory.mediaUrl) {
      const img = new window.Image();
      img.src = activeStory.mediaUrl;
    }
    if (activeGroup && viewerStoryIdx + 1 < activeGroup.length) {
      const next = activeGroup[viewerStoryIdx + 1] as any;
      if (next?.mediaUrl) {
        const pre = new window.Image();
        pre.src = next.mediaUrl;
      }
    }
  }, [activeStory, activeGroup, viewerStoryIdx]);

  /* Tick 20× per second while viewer is open and not paused */
  useEffect(() => {
    if (!activeStory || storyPaused) {
      if (storyTimerRef.current) { clearInterval(storyTimerRef.current); storyTimerRef.current = null; }
      return;
    }
    storyTimerRef.current = setInterval(() => {
      setStoryElapsed(prev => {
        const next = prev + 0.05;
        if (next >= STORY_DURATION) {
          clearInterval(storyTimerRef.current!);
          storyTimerRef.current = null;
          goNextRef.current();
          return STORY_DURATION;
        }
        return next;
      });
    }, 50);
    return () => { if (storyTimerRef.current) { clearInterval(storyTimerRef.current); storyTimerRef.current = null; } };
  }, [activeStory, storyPaused]);

  const goPrevInGroup = useCallback(() => {
    if (viewerStoryIdx > 0) {
      setViewerStoryIdx(i => i - 1);
    } else if (viewerGroupIdx !== null && viewerGroupIdx > 0) {
      setViewerGroupIdx(i => (i ?? 1) - 1);
      setViewerStoryIdx(0);
    }
  }, [viewerStoryIdx, viewerGroupIdx]);

  /* Double-tap avatar inside the strip → hologram */
  const handleAvatarDoubleTap = useCallback((e: React.MouseEvent, user: HoloUser) => {
    e.stopPropagation();
    const now = Date.now();
    const last = lastTapRef.current[user.userId] ?? 0;
    if (now - last < 340) {
      setHoloUser(user);
    }
    lastTapRef.current[user.userId] = now;
  }, []);

  const feedRef = useRef<HTMLDivElement>(null);
  const displayPosts = (() => {
    const base = feed?.posts?.length ? feed.posts : (posts ?? []);
    const seen = new Set<string | number>();
    return base.filter(p => { const id = (p as any).id; if (seen.has(id)) return false; seen.add(id); return true; });
  })();

  const ECHO_THRESHOLD = 55;
  const showEchoBanner =
    !echoDismissed &&
    getFeaturePref("echo_detector", true) &&
    (feed?.echoScore ?? 0) >= ECHO_THRESHOLD &&
    !!feed?.echoTopTag;


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

  return (
    <div className="relative">

      {/* ── TOP OVERLAY STACK: echo detector banner ── */}
      <div className="absolute top-3 left-3 right-3 z-40 flex flex-col gap-2">

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
        ) : (
          <>
            {/* ── POSTS ── */}
            {displayPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-6" style={{ height: "100dvh", background: "#06060f", scrollSnapAlign: "start" }}>
                <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Flame className="w-16 h-16 text-violet-500/40" />
                </motion.div>
                <p className="text-white/40 text-sm">{postsError ? "Server xatosi. Qayta urinib ko'ring." : t("home.no_posts")}</p>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => postsError ? refetchPosts() : setSheetOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 text-white text-sm font-semibold"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  {postsError ? "Qayta urinish" : t("home.create_post")}
                </motion.button>
              </div>
            ) : (
              displayPosts.map((post, i) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  index={i}
                  hasStory={post.author?.id != null && authorStoryIndex.has(post.author.id)}
                  onOpenStory={(rect) => {
                    if (post.author?.id != null) openStoryForAuthor(post.author.id, rect);
                  }}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* ── STORY VIEWER ── */}
      <AnimatePresence>
        {viewerGroupIdx !== null && storyGroups.length > 0 && (
          <StoryViewer
            storyGroups={storyGroups}
            groupIdx={viewerGroupIdx}
            storyIdx={viewerStoryIdx}
            userId={user?.id}
            onClose={closeViewer}
            onNextGroup={() => {
              if (viewerGroupIdx < storyGroups.length - 1) {
                setViewerGroupIdx(i => (i ?? 0) + 1);
                setViewerStoryIdx(0);
              } else {
                closeViewer();
              }
            }}
            onPrevGroup={() => {
              if (viewerGroupIdx > 0) {
                setViewerGroupIdx(i => (i ?? 1) - 1);
                setViewerStoryIdx(0);
              }
            }}
            onNextStory={() => setViewerStoryIdx(i => i + 1)}
            onPrevStory={() => setViewerStoryIdx(i => i - 1)}
            onDelete={deleteActiveStory}
            STORY_DURATION={STORY_DURATION}
          />
        )}
      </AnimatePresence>

      {/* ── HOLOGRAPHIC PROFILE VIEWER (double-tap avatar) ── */}
      <AnimatePresence>
        {holoUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ background: "rgba(0,4,20,0.97)" }}
            onClick={() => setHoloUser(null)}
          >
            {/* Scan line */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(to right,transparent,rgba(139,92,246,0.45),transparent)" }}
              />
              <div
                className="absolute inset-0"
                style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(120,80,255,0.025) 3px,rgba(120,80,255,0.025) 4px)" }}
              />
            </div>
            {/* Grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(120,80,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,80,255,0.05) 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* Card */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center gap-5 px-8 py-10 rounded-3xl"
              style={{
                background: "rgba(6,4,24,0.92)",
                border: "1px solid rgba(139,92,246,0.3)",
                boxShadow: "0 0 60px rgba(100,60,255,0.2),0 0 120px rgba(80,40,200,0.12),inset 0 0 40px rgba(100,60,255,0.04)",
                backdropFilter: "blur(24px)",
                minWidth: 260,
              }}
            >
              {/* Corner decorators */}
              {(["top-2 left-2 border-t border-l","top-2 right-2 border-t border-r","bottom-2 left-2 border-b border-l","bottom-2 right-2 border-b border-r"] as const).map((cls) => (
                <div key={cls} className={`absolute ${cls} w-4 h-4`} style={{ borderColor: "rgba(139,92,246,0.5)" }} />
              ))}
              {/* Orbiting rings + avatar */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1px solid rgba(139,92,246,0.4)" }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 rounded-full"
                  style={{ border: "1px solid rgba(236,72,153,0.3)" }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-8 rounded-full"
                  style={{ border: "1px solid rgba(99,102,241,0.25)" }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full">
                  <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full -translate-x-1/2"
                    style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa" }} />
                </motion.div>
                <div
                  className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center z-10"
                  style={{
                    border: "2px solid rgba(139,92,246,0.6)",
                    boxShadow: "0 0 24px rgba(139,92,246,0.5),0 0 60px rgba(99,102,241,0.2)",
                    background: "#0e0818",
                  }}
                >
                  {holoUser.avatarUrl ? (
                    <img loading="lazy" decoding="async" src={holoUser.avatarUrl} alt="" className="w-full h-full object-cover"
                      style={{ filter: "saturate(1.3) brightness(1.1)" }} />
                  ) : (
                    <span className="text-3xl font-black text-violet-300">
                      {(holoUser.displayName || holoUser.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              {/* Name */}
              <div className="text-center">
                <motion.p
                  animate={{ opacity: [1, 0.65, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xl font-black tracking-widest uppercase"
                  style={{ color: "#c4b5fd", textShadow: "0 0 18px rgba(139,92,246,0.7)" }}
                >
                  {holoUser.displayName || holoUser.username}
                </motion.p>
                <p className="text-[11px] tracking-widest mt-1" style={{ color: "rgba(167,139,250,0.5)" }}>
                  @{holoUser.username}
                </p>
              </div>
              {/* Holo label */}
              <div
                className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.07)" }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#a78bfa" }}
                />
                <span className="text-[10px] tracking-[0.2em] font-bold" style={{ color: "rgba(167,139,250,0.8)" }}>
                  HOLOGRAM ACTIVE
                </span>
              </div>
              <p className="text-[10px] tracking-wider" style={{ color: "rgba(139,92,246,0.3)" }}>
                [ Yopish uchun tashqariga bosing ]
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB — Glass "···" button ── */}
      <AnimatePresence>
        {!createOpen && !sheetOpen && !dockExpanded && !commentPanelOpen && displayPosts.length > 0 && (
          <div
            className="fixed z-[60]"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)", left: "50%", transform: "translateX(-50%)" }}
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
