import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Plus, ChevronDown, ImagePlus, Film, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useListPosts, useGetAiFeed } from "@workspace/api-client-react";
import FeedCard from "@/components/FeedCard";
import CreateContentModal from "@/components/CreateContentModal";

type TabType = "post" | "reel" | "story";

const LAUNCH_OPTIONS: {
  id: string; icon: React.ElementType; label: string;
  tab: TabType; gradient: string; glow: string;
}[] = [
  { id: "post",  icon: ImagePlus, label: "Post",  tab: "post",  gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)", glow: "rgba(124,58,237,0.55)" },
  { id: "reel",  icon: Film,      label: "Reel",  tab: "reel",  gradient: "linear-gradient(135deg,#dc2626,#f87171)", glow: "rgba(239,68,68,0.55)"  },
  { id: "story", icon: Camera,    label: "Story", tab: "story", gradient: "linear-gradient(135deg,#d97706,#fbbf24)", glow: "rgba(251,191,36,0.55)"  },
];

/* Arc positions (relative to button center, px) */
const ARC: { x: number; y: number }[] = [
  { x: -82, y: -96  },
  { x:   0, y: -118 },
  { x:  82, y: -96  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: feed } = useGetAiFeed();
  const { data: posts = [], isLoading } = useListPosts();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [createTab,  setCreateTab]  = useState<TabType>("post");
  const feedRef = useRef<HTMLDivElement>(null);

  const displayPosts = feed?.posts?.length ? feed.posts : posts;

  const scrollDown = () => {
    if (!feedRef.current) return;
    const h = feedRef.current.clientHeight;
    feedRef.current.scrollBy({ top: h, behavior: "smooth" });
  };

  /* ── Horizontal swipe → Reels ── */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && dx < -70) {
      navigate("/reels");
    }
  }, [navigate]);

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
              onClick={() => setCreateOpen(true)}
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

      {/* ── RADIAL LAUNCH PAD ── */}
      <AnimatePresence>
        {!createOpen && displayPosts.length > 0 && (
          <>
            {/* Backdrop dim when menu open */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="menu-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
                />
              )}
            </AnimatePresence>

            {/* Arc option buttons — each fixed at same base, animated with x/y */}
            {LAUNCH_OPTIONS.map((opt, i) => (
              <AnimatePresence key={opt.id}>
                {menuOpen && (
                  <motion.button
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                    animate={{ opacity: 1, x: ARC[i].x, y: ARC[i].y, scale: 1 }}
                    exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                    transition={{ type: "spring", stiffness: 420, damping: 26, delay: i * 0.055 }}
                    onClick={() => { setCreateTab(opt.tab); setMenuOpen(false); setCreateOpen(true); }}
                    className="fixed z-50 flex flex-col items-center gap-1.5"
                    style={{ bottom: 41, left: "50%", marginLeft: -24 }}
                  >
                    {/* Icon circle */}
                    <motion.div
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: opt.gradient,
                        boxShadow: `0 0 20px ${opt.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
                        border: "1.5px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <opt.icon className="w-5 h-5 text-white drop-shadow" />
                    </motion.div>
                    {/* Label pill */}
                    <span
                      className="text-[10px] font-black tracking-wide text-white px-2.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      {opt.label}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            ))}

            {/* Center "+" button */}
            <motion.button
              initial={{ opacity: 0, y: 14, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.85 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => setMenuOpen(m => !m)}
              className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                bottom: 14,
                left: "50%",
                marginLeft: -28,
                background: menuOpen
                  ? "linear-gradient(135deg,#6d28d9,#7c3aed)"
                  : "linear-gradient(135deg,#7c3aed,#9333ea)",
                boxShadow: menuOpen
                  ? "0 0 0 6px rgba(124,58,237,0.18), 0 0 0 14px rgba(124,58,237,0.07), 0 6px 28px rgba(124,58,237,0.6)"
                  : "0 4px 22px rgba(124,58,237,0.45), 0 0 0 2px rgba(255,255,255,0.12)",
                border: "1.5px solid rgba(255,255,255,0.18)",
              }}
            >
              <motion.div animate={{ rotate: menuOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
                <Plus className="w-6 h-6 text-white drop-shadow" />
              </motion.div>

              {/* Pulse ring when closed */}
              {!menuOpen && (
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
          </>
        )}
      </AnimatePresence>

      {/* ── SCROLL HINT (first load) ── */}
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
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <ChevronDown className="w-4 h-4 text-white/60" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <CreateContentModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setMenuOpen(false); }}
        defaultTab={createTab}
      />
    </div>
  );
}
