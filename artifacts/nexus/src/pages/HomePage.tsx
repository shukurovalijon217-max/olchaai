import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Plus, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListPosts, useGetAiFeed } from "@workspace/api-client-react";
import FeedCard from "@/components/FeedCard";
import CreateContentModal from "@/components/CreateContentModal";

export default function HomePage() {
  const { t } = useTranslation();
  const { data: feed } = useGetAiFeed();
  const { data: posts = [], isLoading } = useListPosts();
  const [createOpen, setCreateOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const displayPosts = feed?.posts?.length ? feed.posts : posts;

  const scrollDown = () => {
    if (!feedRef.current) return;
    const h = feedRef.current.clientHeight;
    feedRef.current.scrollBy({ top: h, behavior: "smooth" });
  };

  return (
    /* Negative margins to break out of Layout padding and fill the content column */
    <div className="-mx-8 -mt-0 relative">

      {/* ── SNAP SCROLL FEED ── */}
      <div
        ref={feedRef}
        style={{
          height: "100dvh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
        className="relative"
      >
        {isLoading ? (
          /* Skeleton */
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
          /* Empty state */
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

      {/* ── FLOATING CREATE BUTTON (bottom-center) ── */}
      <AnimatePresence>
        {!createOpen && displayPosts.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setCreateOpen(true)}
            className="fixed z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-2xl"
            style={{
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(79,70,229,0.95))",
              border: "1px solid rgba(167,139,250,0.4)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("home.create_post")}
          </motion.button>
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
        onClose={() => setCreateOpen(false)}
        defaultTab="post"
      />
    </div>
  );
}
