import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, X, Zap, BadgeCheck, Loader2, ArrowDown } from "lucide-react";
import { useLikePost, getListPostsQueryKey } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const STEP_Z = 520;
const NEAR_CLIP = 420;
const FAR_SLOTS = 6;
const SCROLL_SPEED = 1.15;
const SPRING_STIFFNESS = 0.11;
const SNAP_THRESHOLD = 0.4;

const NEON_COLORS = [
  { border: "rgba(139,92,246,0.85)", glow: "rgba(139,92,246,0.45)", label: "#a78bfa" },
  { border: "rgba(59,130,246,0.85)", glow: "rgba(59,130,246,0.45)", label: "#60a5fa" },
  { border: "rgba(236,72,153,0.85)", glow: "rgba(236,72,153,0.45)", label: "#f472b6" },
  { border: "rgba(16,185,129,0.85)", glow: "rgba(16,185,129,0.45)", label: "#34d399" },
  { border: "rgba(245,158,11,0.85)", glow: "rgba(245,158,11,0.45)", label: "#fbbf24" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return "<1m";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

interface TunnelPostCardProps {
  post: Post;
  isActive: boolean;
  colorIdx: number;
}

function TunnelPostCard({ post, isActive, colorIdx }: TunnelPostCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likesCount);
  const likePost = useLikePost();
  const neon = NEON_COLORS[colorIdx % NEON_COLORS.length];

  const isImage =
    post.mediaUrl &&
    post.type !== "video" &&
    !post.mediaUrl.match(/\.(mp3|wav|ogg|aac|m4a|mp4|webm|mov)(\?|$)/i);
  const isVideo =
    post.mediaUrl &&
    (post.type === "video" || post.mediaUrl.match(/\.(mp4|webm|mov)(\?|$)/i));

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setLiked((p) => !p);
    setCount((p) => (liked ? p - 1 : p + 1));
    likePost.mutate(
      { id: post.id },
      {
        onError: () => {
          setLiked((p) => !p);
          setCount((p) => (liked ? p + 1 : p - 1));
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: "relative",
        borderRadius: 24,
        background: "rgba(8, 3, 20, 0.82)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: `1.5px solid ${neon.border}`,
        boxShadow: `0 0 32px ${neon.glow}, 0 0 80px ${neon.glow.replace("0.45", "0.18")}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Top scan-line shimmer */}
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 2.5 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "40%",
          height: "100%",
          background: `linear-gradient(105deg, transparent 30%, ${neon.glow.replace("0.45", "0.12")} 50%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Active post pulse ring */}
      {isActive && (
        <motion.div
          animate={{ opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: 26,
            border: `2px solid ${neon.border}`,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link href={`/profile/${post.author.username ?? post.author.id}`}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: `2px solid ${neon.border}`,
              boxShadow: `0 0 10px ${neon.glow}`,
              overflow: "hidden",
              flexShrink: 0,
              background: "rgba(139,92,246,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 16, fontWeight: 900, color: neon.label }}>
                {post.author.displayName?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </Link>
        <Link href={`/profile/${post.author.id}`} className="flex-1 min-w-0 cursor-pointer min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.01em",
              }}
            >
              {post.author.displayName}
            </span>
            {(post.author as any).isVerified && (
              <BadgeCheck style={{ width: 14, height: 14, color: neon.label }} />
            )}
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            @{post.author.username ?? "user"} · {formatTime(post.createdAt)}
          </span>
        </Link>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: neon.label,
            border: `1px solid ${neon.border}`,
            borderRadius: 6,
            padding: "2px 7px",
            textShadow: `0 0 8px ${neon.glow}`,
          }}
        >
          {(post as any).type?.toUpperCase() ?? "POST"}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p
          style={{
            padding: "6px 16px 10px",
            fontSize: 14,
            lineHeight: 1.65,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {post.content.length > 220 ? post.content.slice(0, 220) + "…" : post.content}
        </p>
      )}

      {/* Media */}
      {isImage && post.mediaUrl && (
        <div style={{ padding: "0 12px 10px" }}>
          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${neon.border.replace("0.85", "0.4")}`,
              maxHeight: 280,
            }}
          >
            <img
              src={post.mediaUrl}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: 280,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      )}

      {isVideo && post.mediaUrl && (
        <div style={{ padding: "0 12px 10px" }}>
          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${neon.border.replace("0.85", "0.4")}`,
              maxHeight: 240,
            }}
          >
            <video
              src={post.mediaUrl}
              style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
              loop
              muted
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 10px" }}>
          {post.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: neon.label,
                background: `${neon.glow.replace("0.45", "0.15")}`,
                borderRadius: 8,
                padding: "2px 8px",
                border: `1px solid ${neon.border.replace("0.85", "0.3")}`,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "10px 16px 14px",
          borderTop: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={handleLike}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 12,
            background: liked
              ? "rgba(239,68,68,0.18)"
              : "rgba(255,255,255,0.06)",
            border: liked
              ? "1px solid rgba(239,68,68,0.5)"
              : "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <Heart
            style={{
              width: 16,
              height: 16,
              fill: liked ? "#ef4444" : "transparent",
              color: liked ? "#ef4444" : "rgba(255,255,255,0.6)",
              transition: "all 0.2s",
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: liked ? "#ef4444" : "rgba(255,255,255,0.6)",
            }}
          >
            {count}
          </span>
        </motion.button>

        <Link href={`/post/${post.id}`}>
          <motion.button
            whileTap={{ scale: 0.82 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
          >
            <MessageCircle
              style={{ width: 16, height: 16, color: "rgba(255,255,255,0.6)" }}
            />
            <span
              style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}
            >
              {post.commentsCount ?? 0}
            </span>
          </motion.button>
        </Link>

        <div style={{ flex: 1 }} />

        <Link href={`/post/${post.id}`}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: neon.label,
              background: `${neon.glow.replace("0.45", "0.1")}`,
              border: `1px solid ${neon.border.replace("0.85", "0.35")}`,
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
              textShadow: `0 0 6px ${neon.glow}`,
            }}
          >
            {t("tunnel.open_post")}
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

function StarField() {
  const stars = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.8 + 0.3,
      dur: Math.random() * 4 + 2,
      delay: Math.random() * 4,
    }))
  );

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {stars.current.map((s) => (
        <circle
          key={s.id}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="white"
          opacity={0.4}
        >
          <animate
            attributeName="opacity"
            values={`0.15;0.9;0.15`}
            dur={`${s.dur}s`}
            begin={`${s.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

function TunnelRings({ cameraZ }: { cameraZ: number }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const ringZ = (i * STEP_Z * 0.9) - (cameraZ % (STEP_Z * 0.9));
        if (ringZ < -100 || ringZ > NEAR_CLIP) return null;
        const prog = 1 - ringZ / (STEP_Z * 0.9 * 10);
        const alpha = Math.max(0, 0.18 - Math.abs(ringZ) / (STEP_Z * 4));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translateZ(${ringZ}px)`,
              width: "95vw",
              maxWidth: 920,
              height: "85vh",
              borderRadius: 32,
              border: `1px solid rgba(139,92,246,${alpha})`,
              pointerEvents: "none",
              boxShadow: `0 0 40px rgba(139,92,246,${alpha * 0.5})`,
            }}
          />
        );
      })}
    </>
  );
}

interface TunnelFeedProps {
  initialPosts: Post[];
  onExit: () => void;
}

export default function TunnelFeed({ initialPosts, onExit }: TunnelFeedProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraZ, setCameraZ] = useState(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const touchRef = useRef({ startY: 0, lastY: 0, vel: 0 });
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showHint, setShowHint] = useState(true);

  const activeIndex = Math.round(targetRef.current / STEP_Z);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const animate = () => {
      setCameraZ((prev) => {
        const target = targetRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.3) return target;
        return prev + diff * SPRING_STIFFNESS;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (activeIndex >= posts.length - 3 && hasMore && !loadingMore) {
      setLoadingMore(true);
      fetch(`${API_BASE}/api/posts?page=${page}&limit=8`)
        .then((r) => r.json())
        .then((newPosts: Post[]) => {
          if (!newPosts || newPosts.length === 0) {
            setHasMore(false);
          } else {
            setPosts((p) => {
              const ids = new Set(p.map((x) => x.id));
              const unique = newPosts.filter((x) => !ids.has(x.id));
              return [...p, ...unique];
            });
            setPage((p) => p + 1);
          }
        })
        .catch(() => setHasMore(false))
        .finally(() => setLoadingMore(false));
    }
  }, [activeIndex, posts.length, hasMore, loadingMore, page]);

  const advancePost = useCallback((delta: number) => {
    const newTarget = Math.max(
      0,
      Math.min(targetRef.current + delta, (posts.length - 1) * STEP_Z)
    );
    targetRef.current = newTarget;
  }, [posts.length]);

  const snapToNearest = useCallback(() => {
    const nearest = Math.round(targetRef.current / STEP_Z) * STEP_Z;
    targetRef.current = Math.max(
      0,
      Math.min(nearest, (posts.length - 1) * STEP_Z)
    );
  }, [posts.length]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      advancePost(e.deltaY * SCROLL_SPEED);
    },
    [advancePost]
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchRef.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      vel: 0,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const dy = touchRef.current.lastY - e.touches[0].clientY;
      touchRef.current.vel = dy;
      touchRef.current.lastY = e.touches[0].clientY;
      advancePost(dy * 2.8);
    },
    [advancePost]
  );

  const handleTouchEnd = useCallback(() => {
    const vel = touchRef.current.vel;
    if (Math.abs(vel) > 8) {
      advancePost(vel * 18);
      setTimeout(snapToNearest, 320);
    } else {
      snapToNearest();
    }
  }, [advancePost, snapToNearest]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    setPosts(initialPosts);
  }, []);

  const prevPost = () => {
    targetRef.current = Math.max(0, Math.round(targetRef.current / STEP_Z - 1) * STEP_Z);
  };
  const nextPost = () => {
    targetRef.current = Math.min(
      (posts.length - 1) * STEP_Z,
      Math.round(targetRef.current / STEP_Z + 1) * STEP_Z
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(ellipse 80% 70% at 50% 50%, #0d0520 0%, #030210 55%, #000205 100%)",
        perspective: "1100px",
        perspectiveOrigin: "50% 50%",
        touchAction: "none",
      }}
    >
      <StarField />

      {/* Ambient glow layers */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139,92,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* 3D Scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Tunnel rings decoration */}
        <TunnelRings cameraZ={cameraZ} />

        {/* Post cards */}
        {posts.map((post, i) => {
          const z = cameraZ - i * STEP_Z;
          if (z > NEAR_CLIP + 60) return null;
          if (z < -STEP_Z * FAR_SLOTS) return null;

          let opacity = 1;
          if (z > 0) {
            opacity = Math.max(0, 1 - z / NEAR_CLIP);
          } else if (z < -STEP_Z * 0.8) {
            opacity = Math.max(
              0.08,
              1 - Math.abs(z + STEP_Z * 0.8) / (STEP_Z * (FAR_SLOTS - 1))
            );
          }

          const isActive = Math.abs(z) < STEP_Z * 0.45;

          return (
            <div
              key={post.id}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translateZ(${z}px)`,
                opacity,
                width: "min(92vw, 600px)",
                pointerEvents: isActive ? "auto" : "none",
                willChange: "transform, opacity",
              }}
            >
              <TunnelPostCard
                post={post}
                isActive={isActive}
                colorIdx={i}
              />
            </div>
          );
        })}
      </div>

      {/* ── TOP HUD ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        {/* Left: title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.9), rgba(59,130,246,0.6))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(139,92,246,0.7)",
            }}
          >
            <Zap style={{ width: 16, height: 16, color: "#fff" }} />
          </motion.div>
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.08em",
                background:
                  "linear-gradient(90deg, #a78bfa, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {t("tunnel.title")}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              {t("tunnel.depth")} {activeIndex + 1} / {posts.length}
              {loadingMore && " ···"}
            </p>
          </div>
        </div>

        {/* Right: exit */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onExit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.45)",
            color: "#fca5a5",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: "pointer",
            boxShadow: "0 0 12px rgba(239,68,68,0.2)",
          }}
        >
          <X style={{ width: 14, height: 14 }} />
          {t("tunnel.exit")}
        </motion.button>
      </div>

      {/* ── BOTTOM HUD ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 20px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          zIndex: 20,
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {posts.slice(Math.max(0, activeIndex - 2), activeIndex + 5).map((_, relI) => {
            const absI = relI + Math.max(0, activeIndex - 2);
            const isAct = absI === activeIndex;
            return (
              <motion.div
                key={absI}
                animate={{ scale: isAct ? 1 : 0.65, opacity: isAct ? 1 : 0.35 }}
                style={{
                  width: isAct ? 22 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: isAct
                    ? "linear-gradient(90deg, #a78bfa, #60a5fa)"
                    : "rgba(255,255,255,0.35)",
                  transition: "width 0.3s",
                }}
              />
            );
          })}
          {loadingMore && (
            <Loader2
              style={{ width: 14, height: 14, color: "#a78bfa", animation: "spin 1s linear infinite" }}
            />
          )}
        </div>

      </div>

      {/* ── ENTRY HINT ── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, calc(-50% + 280px))",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <ArrowDown style={{ width: 22, height: 22, color: "rgba(167,139,250,0.8)" }} />
            </motion.div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(167,139,250,0.8)",
                letterSpacing: "0.04em",
                background: "rgba(0,0,0,0.6)",
                padding: "4px 12px",
                borderRadius: 20,
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              {t("tunnel.hint_scroll")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
