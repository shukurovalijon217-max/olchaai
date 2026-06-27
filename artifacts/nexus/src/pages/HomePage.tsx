import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Plus, ChevronDown, ImagePlus, Film, Camera, X,
  Tv, Trophy, Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useListPosts, useGetAiFeed } from "@workspace/api-client-react";
import FeedCard from "@/components/FeedCard";
import CreateContentModal from "@/components/CreateContentModal";

type TabType = "post" | "reel" | "story" | "otube" | "challenge";

/* ─── Content type cards for the bottom sheet ─── */
const CONTENT_TYPES: {
  id: TabType;
  emoji: string;
  label: string;
  desc: string;
  grad: string;
  glow: string;
  accent: string;
}[] = [
  {
    id: "post",
    emoji: "📝",
    label: "Post",
    desc: "Rasm, matn yoki so'rovnoma",
    grad: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    glow: "rgba(124,58,237,0.4)",
    accent: "#a78bfa",
  },
  {
    id: "story",
    emoji: "📖",
    label: "Story",
    desc: "24 soatlik qisqa hikoya",
    grad: "linear-gradient(135deg,#d97706,#fbbf24)",
    glow: "rgba(251,191,36,0.4)",
    accent: "#fbbf24",
  },
  {
    id: "reel",
    emoji: "🎬",
    label: "Reel",
    desc: "Qisqa video, effektlar bilan",
    grad: "linear-gradient(135deg,#dc2626,#f87171)",
    glow: "rgba(239,68,68,0.4)",
    accent: "#f87171",
  },
  {
    id: "otube",
    emoji: "🎥",
    label: "OTube Klip",
    desc: "Uzun video, OTube Studio",
    grad: "linear-gradient(135deg,#059669,#34d399)",
    glow: "rgba(52,211,153,0.4)",
    accent: "#34d399",
  },
  {
    id: "challenge",
    emoji: "🏆",
    label: "Challenge",
    desc: "Musobaqa, sovrinlar, hakamlar",
    grad: "linear-gradient(135deg,#b45309,#fb923c)",
    glow: "rgba(251,146,60,0.4)",
    accent: "#fb923c",
  },
];

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
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: "rgba(6,6,18,0.98)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.7)",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-9 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.18)" }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-black text-base text-white tracking-tight">
                  Nima yaratmoqchisiz?
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Kontent turini tanlang
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <X className="w-4 h-4 text-white/60" />
              </motion.button>
            </div>

            {/* Content type cards */}
            <div className="px-4 pb-4 flex flex-col gap-2.5">
              {CONTENT_TYPES.map((ct, i) => (
                <motion.button
                  key={ct.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", damping: 22, stiffness: 300 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onClose(); onSelect(ct.id); }}
                  className="flex items-center gap-3.5 w-full text-left"
                  style={{
                    padding: "13px 14px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid rgba(255,255,255,0.07)`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Subtle left accent */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      borderRadius: "16px 0 0 16px",
                      background: ct.grad,
                      boxShadow: `0 0 8px ${ct.glow}`,
                    }}
                  />

                  {/* Emoji icon */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: ct.grad,
                      boxShadow: `0 4px 14px ${ct.glow}`,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{ct.emoji}</span>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-sm"
                      style={{ color: "rgba(255,255,255,0.92)" }}
                    >
                      {ct.label}
                    </div>
                    <div
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {ct.desc}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: ct.accent,
                    }}
                  >
                    ›
                  </div>
                </motion.button>
              ))}
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

  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab,  setCreateTab]  = useState<TabType>("post");

  const feedRef = useRef<HTMLDivElement>(null);
  const displayPosts = feed?.posts?.length ? feed.posts : posts;

  const scrollDown = () => {
    if (!feedRef.current) return;
    const h = feedRef.current.clientHeight;
    feedRef.current.scrollBy({ top: h, behavior: "smooth" });
  };

  const handleSelect = (tab: TabType) => {
    setTimeout(() => {
      setCreateTab(tab);
      setCreateOpen(true);
    }, 120);
  };

  /* ── Horizontal swipe → Reels ── */
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
      if (Math.abs(dx) > Math.abs(dy) && dx < -70) {
        navigate("/reels");
      }
    },
    [navigate]
  );

  return (
    <div className="-mx-8 -mt-0 relative">

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
          <div
            className="flex items-center justify-center"
            style={{ height: "100dvh", background: "#06060f" }}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-violet-400/60 text-sm">Yuklanmoqda…</span>
            </div>
          </div>
        ) : displayPosts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-6"
            style={{ height: "100dvh", background: "#06060f" }}
          >
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
              <Plus className="w-4 h-4" />
              {t("home.create_post")}
            </motion.button>
          </div>
        ) : (
          displayPosts.map((post, i) => (
            <FeedCard key={post.id} post={post} index={i} />
          ))
        )}
      </div>

      {/* ── FAB "+" button ── */}
      <AnimatePresence>
        {!createOpen && displayPosts.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.85 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => setSheetOpen(true)}
            className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              bottom: 14,
              left: "50%",
              marginLeft: -28,
              background: sheetOpen
                ? "linear-gradient(135deg,#6d28d9,#7c3aed)"
                : "linear-gradient(135deg,#7c3aed,#9333ea)",
              boxShadow: sheetOpen
                ? "0 0 0 6px rgba(124,58,237,0.18), 0 0 0 14px rgba(124,58,237,0.07), 0 6px 28px rgba(124,58,237,0.6)"
                : "0 4px 22px rgba(124,58,237,0.45), 0 0 0 2px rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.18)",
            }}
          >
            <motion.div
              animate={{ rotate: sheetOpen ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              <Plus className="w-6 h-6 text-white drop-shadow" />
            </motion.div>

            {/* Pulse rings when closed */}
            {!sheetOpen && (
              <>
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1.5px solid rgba(124,58,237,0.45)" }}
                  animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1.5px solid rgba(124,58,237,0.3)" }}
                  animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
              </>
            )}
          </motion.button>
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
            style={{ bottom: 80, right: 20 }}
          >
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <ChevronDown className="w-4 h-4 text-white/60" />
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

      {/* ── Create Content Modal (singleTab — no tab bar confusion) ── */}
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTab={createTab}
        singleTab
      />
    </div>
  );
}
