import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { OlchaAIPost } from "../hooks/useOlchaAIData";
import { timeAgo } from "../hooks/useOlchaAIData";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#ff6b6b,#ee5a24)",
  "linear-gradient(135deg,#4ecdc4,#44a08d)",
  "linear-gradient(135deg,#45b7d1,#2980b9)",
  "linear-gradient(135deg,#96ceb4,#6ab04c)",
  "linear-gradient(135deg,#dda0dd,#9b59b6)",
  "linear-gradient(135deg,#ffd93d,#f9ca24)",
  "linear-gradient(135deg,#ff9ff3,#f368e0)",
  "linear-gradient(135deg,#54a0ff,#2e86de)",
];

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const t = pos[0] === "t", l = pos[1] === "l";
  return (
    <div style={{
      position: "absolute",
      [t ? "top" : "bottom"]: 0,
      [l ? "left" : "right"]: 0,
      width: 18, height: 18,
      borderTop:    t ? "2px solid rgba(0,229,255,0.7)" : undefined,
      borderBottom: t ? undefined : "2px solid rgba(0,229,255,0.7)",
      borderLeft:   l ? "2px solid rgba(0,229,255,0.7)" : undefined,
      borderRight:  l ? undefined : "2px solid rgba(0,229,255,0.7)",
      pointerEvents: "none",
    }} />
  );
}

interface CyberCardProps {
  post: OlchaAIPost;
  isActive: boolean;
  stackIndex: number;
}

export function CyberCard({ post, isActive, stackIndex }: CyberCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [shimmer, setShimmer] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const avatarColor = AVATAR_COLORS[Number(post.author.id) % AVATAR_COLORS.length];
  const initial = (post.author.displayName || post.author.username || "?")[0].toUpperCase();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 12, y: x * -12 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const postUrl = `${window.location.origin}/post/${post.id}`;

  const handleLike = async () => {
    const wasLiked = liked;
    if (wasLiked) { setLiked(false); setLikes((n) => n - 1); }
    else { setLiked(true); setLikes((n) => n + 1); setShimmer(true); setTimeout(() => setShimmer(false), 800); }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setLiked(!!data.liked);
      setLikes(typeof data.likesCount === "number" ? data.likesCount : likes);
    } catch {
      setLiked(wasLiked);
      setLikes((n) => (wasLiked ? n : n - 1));
    }
  };

  const handleComment = () => {
    window.open(postUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "OlchaAI", text: post.content, url: postUrl });
        return;
      } catch {
        /* user cancelled or share failed, fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(postUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      /* clipboard unavailable, nothing more we can do */
    }
  };

  return (
    <motion.div
      ref={cardRef}
      style={{
        width: "100%", height: "100%",
        borderRadius: 20,
        background: "linear-gradient(145deg, rgba(0,18,44,0.72) 0%, rgba(0,8,24,0.85) 100%)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(0,229,255,0.22)",
        boxShadow: isActive
          ? "0 8px 60px rgba(0,229,255,0.10), 0 2px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,255,0.08) inset"
          : "0 4px 30px rgba(0,0,0,0.4)",
        position: "relative", overflow: "hidden",
        cursor: isActive ? "grab" : "default",
        rotateX: tilt.x, rotateY: tilt.y,
        transformStyle: "preserve-3d",
        perspective: 1000,
        userSelect: "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={isActive ? { cursor: "grabbing" } : undefined}
    >
      {/* Corner brackets */}
      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.7) 30%, rgba(160,100,255,0.5) 70%, transparent)",
        borderRadius: "20px 20px 0 0",
      }} />

      {/* Shimmer sweep */}
      {shimmer && (
        <motion.div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "linear-gradient(105deg, transparent 30%, rgba(0,229,255,0.15) 50%, transparent 70%)",
        }}
          initial={{ x: "-100%" }} animate={{ x: "200%" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}

      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
        borderRadius: 20,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column" }}>

        {/* ── Media Section ── */}
        {post.mediaUrl ? (
          <div style={{ position: "relative", overflow: "hidden", borderRadius: "18px 18px 0 0", flex: "0 0 180px" }}>
            <img
              src={post.mediaUrl}
              alt="post media"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* Holographic overlay on image */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(0deg, rgba(0,8,24,0.7) 0%, rgba(0,229,255,0.05) 50%, transparent 100%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,229,255,0.03) 5px, rgba(0,229,255,0.03) 6px)",
            }} />
            {/* Image border */}
            <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(0,229,255,0.2)", borderRadius: "18px 18px 0 0", pointerEvents: "none" }} />
            {/* AR tag */}
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: 6, padding: "2px 8px",
              fontSize: 9, color: "rgba(0,229,255,0.8)", fontFamily: "monospace", letterSpacing: "0.1em",
            }}>
              ◈ AR MEDIA
            </div>
          </div>
        ) : (
          /* Holographic gradient panel when no image */
          <div style={{
            position: "relative", overflow: "hidden", borderRadius: "18px 18px 0 0",
            flex: "0 0 110px",
            background: `linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(160,100,255,0.08) 50%, rgba(0,229,255,0.04) 100%)`,
          }}>
            {/* Grid pattern */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "linear-gradient(rgba(0,229,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.07) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }} />
            {/* Center hologram icon */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
              <motion.div
                style={{ fontSize: 36, opacity: 0.6 }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3 + stackIndex, repeat: Infinity }}
              >
                ◈
              </motion.div>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(0,229,255,0.5)", letterSpacing: "0.15em" }}>
                OLCHA · AR FEED
              </span>
            </div>
            {/* Animated scan */}
            <motion.div
              style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)" }}
              animate={{ top: ["-10%", "110%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: stackIndex * 0.4 }}
            />
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, padding: "14px 16px 0 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {/* Pulse ring */}
              <motion.div
                style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  border: "1px solid rgba(0,229,255,0.5)",
                }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5 + stackIndex * 0.3, repeat: Infinity }}
              />
              {post.author.profileImage ? (
                <img
                  src={post.author.profileImage}
                  alt={post.author.displayName}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,229,255,0.55)", display: "block" }}
                />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: avatarColor,
                  border: "2px solid rgba(0,229,255,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{initial}</span>
                </div>
              )}
              {/* Online dot */}
              <div style={{
                position: "absolute", bottom: -1, right: -1,
                width: 11, height: 11, borderRadius: "50%",
                background: "#00ff88", border: "2px solid #000510",
              }} />
            </div>

            {/* Name + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.author.displayName || post.author.username}
                </span>
                <motion.span
                  style={{ fontSize: 10, color: "rgba(0,229,255,0.7)", fontFamily: "monospace", background: "rgba(0,229,255,0.08)", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(0,229,255,0.2)", flexShrink: 0 }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ● LIVE
                </motion.span>
              </div>
              <div style={{ color: "rgba(0,229,255,0.55)", fontSize: 11, fontFamily: "monospace" }}>
                @{post.author.username} · {timeAgo(post.createdAt)} oldin
              </div>
            </div>
          </div>

          {/* Content text */}
          <p style={{
            color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical",
            overflow: "hidden", margin: 0,
          }}>
            {post.content}
          </p>
        </div>

        {/* ── Divider ── */}
        <div style={{ margin: "12px 16px 0", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 30%, rgba(0,229,255,0.2) 70%, transparent)" }} />

        {/* ── Actions ── */}
        <div style={{ padding: "10px 16px 14px", display: "flex", alignItems: "center", gap: 0 }}>
          {/* Like */}
          <motion.button
            onClick={handleLike}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 12px 4px 0", color: liked ? "#ff6b9d" : "rgba(255,255,255,0.45)", fontSize: 13 }}
            whileTap={{ scale: 0.85 }}
            animate={liked ? { scale: [1, 1.25, 1] } : {}}
          >
            <span style={{ fontSize: 16 }}>{liked ? "♥" : "♡"}</span>
            <span style={{ fontWeight: liked ? 600 : 400 }}>{likes}</span>
          </motion.button>

          {/* Comment */}
          <button onClick={handleComment} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 12px", color: "rgba(0,229,255,0.55)", fontSize: 13 }}>
            <span style={{ fontSize: 15 }}>◎</span>
            <span>{post.commentsCount}</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 12px", color: shareCopied ? "#00e5ff" : "rgba(255,255,255,0.3)", fontSize: 13 }}>
            <span style={{ fontSize: 14 }}>↗</span>
            <span>{shareCopied ? "Nusxalandi" : "Ulash"}</span>
          </button>

          {/* OlchaAI tag */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 6px #00e5ff" }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(0,229,255,0.5)", letterSpacing: "0.1em" }}>OLCHA</span>
          </div>
        </div>

        {/* Swipe hint (active card only) */}
        {isActive && (
          <motion.div
            style={{ textAlign: "center", paddingBottom: 10, pointerEvents: "none" }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(0,229,255,0.45)", letterSpacing: "0.12em" }}>
              ▲ YUQORIGA SURING ▲
            </span>
          </motion.div>
        )}
      </div>

      {/* Bottom accent */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5,
        background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.45) 40%, rgba(160,100,255,0.35) 70%, transparent)",
        borderRadius: "0 0 20px 20px",
      }} />
    </motion.div>
  );
}
