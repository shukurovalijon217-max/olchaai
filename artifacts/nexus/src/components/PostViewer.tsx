/**
 * PostViewer — fullscreen post image viewer
 * - No image cropping (object-contain)
 * - Top-left: avatar + name
 * - Top-right: glass orb → tap → expands action icons downward → tap again collapses
 * - Bottom: music strip (if audioName) + caption (tap to expand/collapse inline)
 * - Multi-image: swipe LEFT/RIGHT to navigate
 * - Multi-post: swipe UP to go to next post from profile
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  X, Heart, MessageCircle, Share2, Download, Flag,
  BadgeCheck, ChevronLeft, Play, VolumeX, Volume2,
} from "lucide-react";
import { useLocation } from "wouter";
import { resolveApiUrl } from "@/lib/utils";
import { useLikePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import type { Post } from "@workspace/api-client-react";

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(url);

function getAllMedia(post: Post): string[] {
  const urls: string[] = (post as any).mediaUrls ?? [];
  const raw = urls.length > 1 ? urls : post.mediaUrl ? [post.mediaUrl] : [];
  return raw.map(u => resolveApiUrl(u));
}

/* ── Song Ticker (copy-light version, no download) ── */
function SongTicker({ name, accent }: { name: string; accent: string }) {
  const label = `♪  ${name}  ·  `;
  return (
    <div className="inline-flex items-center gap-1.5 overflow-hidden max-w-[200px]" style={{ userSelect: "none" }}>
      <span style={{ fontSize: 13, color: accent, textShadow: `0 0 8px ${accent}` }}>♪</span>
      <div className="overflow-hidden flex-1">
        <div style={{ animation: "postviewer-marquee 10s linear infinite", whiteSpace: "nowrap", display: "inline-block" }}>
          <span className="text-[12px] font-bold text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
            {label}{label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Actions Orb ── */
function ActionsOrb({
  post, liked, likes, onLike, onComment,
}: {
  post: Post; liked: boolean; likes: number;
  onLike: () => void; onComment: () => void;
}) {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: Heart, label: `${likes}`, active: liked, color: liked ? "#f43f5e" : "white", action: () => { onLike(); } },
    { icon: MessageCircle, label: "Izoh", active: false, color: "white", action: onComment },
    {
      icon: Share2, label: "Ulash", active: false, color: "white",
      action: () => {
        if (navigator.share) navigator.share({ url: window.location.origin + `/post/${post.id}` }).catch(() => {});
        else navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`);
      },
    },
    {
      icon: Download, label: "Yuklab", active: false, color: "white",
      action: () => {
        if (post.mediaUrl) {
          const a = document.createElement("a"); a.href = resolveApiUrl(post.mediaUrl); a.download = `post-${post.id}`; a.click();
        }
      },
    },
    { icon: Flag, label: "Shikoyat", active: false, color: "#fb923c", action: () => {} },
  ];

  return (
    <div className="flex flex-col items-center gap-2" style={{ userSelect: "none" }}>
      {/* Action icons — expand downward */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center gap-2 overflow-hidden mb-2"
          >
            {actions.map(({ icon: Icon, label, active, color, action }, i) => (
              <motion.button
                key={label}
                initial={{ opacity: 0, scale: 0.6, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: -8 }}
                transition={{ delay: i * 0.055, type: "spring", stiffness: 400, damping: 28 }}
                onClick={(e) => { e.stopPropagation(); action(); }}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: `1.5px solid ${active ? color : "rgba(255,255,255,0.2)"}`,
                    backdropFilter: "blur(12px)",
                    boxShadow: active ? `0 0 12px ${color}66` : "none",
                  }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color, fill: (Icon === Heart && active) ? color : "none" }} />
                </div>
                <span className="text-[9px] font-semibold text-white/70">{label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main glass orb */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: open ? "rgba(124,58,237,0.35)" : "rgba(0,0,0,0.3)",
          border: `1.5px solid ${open ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.22)"}`,
          backdropFilter: "blur(16px)",
          boxShadow: open ? "0 0 20px rgba(124,58,237,0.45)" : "none",
          transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
        }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="1.8" fill="white" opacity="0.9" />
            <circle cx="12" cy="5.5" r="1.8" fill="white" opacity="0.9" />
            <circle cx="12" cy="18.5" r="1.8" fill="white" opacity="0.9" />
          </svg>
        </motion.div>
      </motion.button>
    </div>
  );
}

/* ── Main PostViewer ── */
export default function PostViewer({
  posts,
  startIndex,
  onClose,
}: {
  posts: Post[];
  startIndex: number;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const likePost = useLikePost({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPostsQueryKey() }),
    },
  });

  const [postIdx, setPostIdx] = useState(startIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragStartY = useRef(0);

  const post = posts[postIdx];
  const allMedia = post ? getAllMedia(post) : [];
  const isAlbum = allMedia.length > 1;
  const accent = "#a78bfa";
  const audioName = post ? (post as any).audioName as string | undefined : undefined;
  const audioUrl  = post ? (post as any).audioUrl  as string | undefined : undefined;

  const liked = likedMap[post?.id ?? 0] ?? post?.isLiked ?? false;
  const likes = likesMap[post?.id ?? 0] ?? post?.likesCount ?? 0;

  /* Sync liked/likes from post data */
  useEffect(() => {
    if (!post) return;
    setLikedMap(m => ({ ...m, [post.id]: post.isLiked ?? false }));
    setLikesMap(m => ({ ...m, [post.id]: post.likesCount ?? 0 }));
  }, [post?.id]);

  /* Reset slide index when changing posts */
  useEffect(() => { setSlideIdx(0); setCaptionOpen(false); }, [postIdx]);

  /* Background audio */
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (!audioUrl) return;
    const a = new Audio(resolveApiUrl(audioUrl));
    a.loop = true; a.volume = 0.65; a.muted = muted;
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, [post?.id, audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Keyboard ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleLike = useCallback(() => {
    if (!post || !user) return;
    const next = !liked;
    setLikedMap(m => ({ ...m, [post.id]: next }));
    setLikesMap(m => ({ ...m, [post.id]: next ? likes + 1 : likes - 1 }));
    likePost.mutate({ id: post.id }, {
      onSuccess: (data: any) => {
        setLikedMap(m => ({ ...m, [post.id]: data?.liked ?? next }));
        setLikesMap(m => ({ ...m, [post.id]: data?.likesCount ?? (next ? likes + 1 : likes - 1) }));
      },
      onError: () => {
        setLikedMap(m => ({ ...m, [post.id]: !next }));
        setLikesMap(m => ({ ...m, [post.id]: likes }));
      },
    });
  }, [post, user, liked, likes]);

  const goNextPost = () => { if (postIdx < posts.length - 1) setPostIdx(i => i + 1); };
  const goPrevPost = () => { if (postIdx > 0) setPostIdx(i => i - 1); };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -70 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) goNextPost();
    if (info.offset.y > 70  && Math.abs(info.offset.y) > Math.abs(info.offset.x)) goPrevPost();
    if (info.offset.x < -60 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (isAlbum && slideIdx < allMedia.length - 1) setSlideIdx(i => i + 1);
    }
    if (info.offset.x > 60  && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (isAlbum && slideIdx > 0) setSlideIdx(i => i - 1);
    }
  };

  if (!post) return null;

  const currentMedia = allMedia[slideIdx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "#000" }}
    >
      {/* ── CSS for marquee ── */}
      <style>{`
        @keyframes postviewer-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* ── Drag layer ── */}
      <motion.div
        className="flex-1 relative overflow-hidden"
        drag
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handlePanEnd}
        style={{ touchAction: "none" }}
      >
        {/* ── Blurred bg ── */}
        {currentMedia && !isVideoUrl(currentMedia) && (
          <img src={currentMedia} alt="" aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ filter: "blur(28px) saturate(1.2) brightness(0.25)", transform: "scale(1.15)", zIndex: 0 }} />
        )}

        {/* ── Main media (object-contain — no crop) ── */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${postIdx}-${slideIdx}`}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full flex items-center justify-center"
            >
              {currentMedia ? (
                isVideoUrl(currentMedia)
                  ? <video src={currentMedia} muted={muted} loop playsInline autoPlay className="max-w-full max-h-full" style={{ objectFit: "contain" }} />
                  : <img src={currentMedia} alt={post.content} className="max-w-full max-h-full" style={{ objectFit: "contain", maxHeight: "100dvh" }} loading="lazy" decoding="async" />
              ) : (
                <div className="flex items-center justify-center w-full h-full px-8">
                  <p className="text-white text-center text-lg font-semibold leading-relaxed" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
                    {post.content}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Vignette ── */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, transparent 22%, transparent 55%, rgba(0,0,0,0.72) 100%)" }} />

        {/* ── Multi-image dot indicators ── */}
        {isAlbum && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-1.5 pointer-events-none" style={{ zIndex: 4 }}>
            {allMedia.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-300"
                style={{ width: i === slideIdx ? 18 : 5, height: 5,
                  background: i === slideIdx ? accent : "rgba(255,255,255,0.38)" }} />
            ))}
          </div>
        )}

        {/* ── TOP BAR ── */}
        <div
          className="absolute left-0 right-0 flex items-start justify-between px-4"
          style={{
            zIndex: 10,
            top: `max(env(safe-area-inset-top, 0px), 16px)`,
          }}
        >
          {/* Left: close + avatar + name */}
          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.42)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}
            >
              <ChevronLeft className="w-4.5 h-4.5 text-white" />
            </motion.button>

            {post.author && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/25"
                  style={{ boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
                  {post.author.avatarUrl
                    ? <img src={resolveApiUrl(post.author.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{post.author.displayName?.[0]?.toUpperCase()}</span>
                      </div>
                  }
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-sm font-bold leading-none" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
                      {post.author.displayName}
                    </span>
                    {(post.author as any).isVerified && <BadgeCheck className="w-3.5 h-3.5 text-violet-400" />}
                  </div>
                  {isAlbum && (
                    <span className="text-white/55 text-[10px]">{slideIdx + 1}/{allMedia.length}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: glass orb */}
          <div className="flex flex-col items-end" style={{ paddingTop: 2 }}>
            <ActionsOrb
              post={post}
              liked={liked}
              likes={likes}
              onLike={handleLike}
              onComment={() => { onClose(); navigate(`/post/${post.id}`); }}
            />
          </div>
        </div>

        {/* ── BOTTOM: Music + Caption ── */}
        <div
          className="absolute left-4 right-16 flex flex-col gap-1"
          style={{
            zIndex: 10,
            bottom: `max(env(safe-area-inset-bottom, 0px), 28px)`,
          }}
        >
          {/* Music */}
          {audioName && audioUrl && (
            <div className="flex items-center gap-2">
              <SongTicker name={audioName} accent={accent} />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,0,0,0.38)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
              >
                {muted
                  ? <VolumeX className="w-3.5 h-3.5 text-white/70" />
                  : <Volume2 className="w-3.5 h-3.5 text-white" />
                }
              </motion.button>
            </div>
          )}

          {/* Caption */}
          {post.content && (post as any).type !== "text" && (
            <div>
              <motion.div
                onClick={(e) => { e.stopPropagation(); setCaptionOpen(o => !o); }}
                className="cursor-pointer"
                style={{ userSelect: "none" }}
              >
                <AnimatePresence mode="wait">
                  {captionOpen ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(14px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        maxHeight: "45vh",
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-white text-[13px] leading-relaxed font-medium">{post.content}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCaptionOpen(false); }}
                        className="mt-2 text-[11px] text-white/50 font-semibold"
                      >Yopish ↑</button>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="closed"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-white text-[13px] font-semibold leading-snug"
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95), 0 2px 12px rgba(0,0,0,0.85)" }}
                    >
                      {post.content.length > 80 ? post.content.slice(0, 80) + "…" : post.content}
                      {post.content.length > 80 && (
                        <span className="text-white/50 ml-1 text-[11px]">ko'proq</span>
                      )}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>

        {/* ── Post navigation arrows (subtle) ── */}
        {postIdx > 0 && (
          <motion.div
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ top: "50%", zIndex: 3, transform: "translateY(-50%)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 0.35 }}
          >
            <div className="text-white text-[10px] font-semibold tracking-widest" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
            </div>
          </motion.div>
        )}

        {/* ── Mute button for video ── */}
        {currentMedia && isVideoUrl(currentMedia) && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            className="absolute flex items-center justify-center"
            style={{
              zIndex: 10,
              right: 16,
              bottom: `calc(max(env(safe-area-inset-bottom, 0px), 28px) + 8px)`,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            {muted
              ? <VolumeX className="w-4 h-4 text-white/80" />
              : <Volume2 className="w-4 h-4 text-white" />
            }
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
