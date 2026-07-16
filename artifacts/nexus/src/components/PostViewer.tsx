/**
 * PostViewer — fullscreen post viewer (redesigned)
 * - Image fills screen (object-cover)
 * - Top-left: back circle + avatar + name
 * - Right side: small equal glass action circles (like/comment/share/download/report)
 * - Comment: slide-in from right (book-page turn), glass transparent panel
 * - No expanding orb, no analytics bubbles
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Download, Flag,
  BadgeCheck, ChevronLeft, Send, X, VolumeX, Volume2,
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

/* ── Song ticker ── */
function SongTicker({ name, accent }: { name: string; accent: string }) {
  const label = `♪  ${name}  ·  `;
  return (
    <div className="inline-flex items-center gap-1 overflow-hidden max-w-[180px]">
      <div className="overflow-hidden flex-1">
        <div style={{ animation: "pv-marquee 10s linear infinite", whiteSpace: "nowrap", display: "inline-block" }}>
          <span className="text-[11px] font-semibold" style={{ color: accent, textShadow: `0 0 8px ${accent}` }}>
            {label}{label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Right-side action button ── */
function ActionBtn({
  icon: Icon, label, active, color, count, onClick,
}: {
  icon: React.ElementType; label: string; active?: boolean; color?: string;
  count?: number; onClick: (e: React.MouseEvent) => void;
}) {
  const c = active ? (color ?? "#f43f5e") : "rgba(255,255,255,0.9)";
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5"
      style={{ userSelect: "none" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 38, height: 38, borderRadius: "50%",
          background: active ? "rgba(244,63,94,0.18)" : "rgba(0,0,0,0.30)",
          border: `1.5px solid ${active ? "rgba(244,63,94,0.55)" : "rgba(255,255,255,0.22)"}`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: active ? "0 0 14px rgba(244,63,94,0.35)" : "none",
          transition: "all 0.2s",
        }}
      >
        <Icon
          size={16}
          style={{ color: c, fill: active && Icon === Heart ? c : "none" }}
        />
      </div>
      {count !== undefined ? (
        <span className="text-[10px] font-bold leading-none" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      ) : (
        <span className="text-[9px] font-semibold leading-none" style={{ color: "rgba(255,255,255,0.55)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {label}
        </span>
      )}
    </motion.button>
  );
}

/* ── Comment panel (slides from right) ── */
function CommentPanel({
  post, onClose,
}: {
  post: Post; onClose: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [comments, setComments] = useState<{ id: number; name: string; avatar?: string; body: string; time: string }[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load real comments
    fetch(resolveApiUrl(`/api/posts/${post.id}/comments`), { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setComments(data.map(c => ({
            id: c.id,
            name: c.author?.displayName ?? c.authorName ?? "User",
            avatar: c.author?.avatarUrl,
            body: c.content ?? c.body ?? "",
            time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }) : "",
          })));
        }
      }).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [post.id]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(resolveApiUrl(`/api/posts/${post.id}/comments`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim(), authorId: (user as any)?.id }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [...prev, {
          id: c.id ?? Date.now(),
          name: (user as any)?.displayName ?? "Men",
          avatar: (user as any)?.avatarUrl,
          body: text.trim(),
          time: new Date().toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" }),
        }]);
        setText("");
      }
    } catch {}
    setSending(false);
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="absolute inset-y-0 right-0 flex flex-col"
      style={{
        width: "82%",
        zIndex: 30,
        background: "rgba(8,8,18,0.55)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderLeft: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.45)",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-white font-bold text-sm">Izohlar</span>
        <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <X size={13} className="text-white/70" />
        </motion.button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
        style={{ WebkitOverflowScrolling: "touch" }}>
        {comments.length === 0 && (
          <div className="flex items-center justify-center h-24">
            <span className="text-white/30 text-xs">Hali izoh yo'q</span>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
              {c.avatar
                ? <img src={resolveApiUrl(c.avatar)} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{c.name[0]?.toUpperCase()}</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-white text-[11px] font-bold leading-none">{c.name}</span>
                <span className="text-white/30 text-[9px]">{c.time}</span>
              </div>
              <p className="text-white/85 text-[12px] leading-relaxed break-words">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Izoh yozing…"
            className="flex-1 bg-transparent text-white text-[12px] placeholder:text-white/30 outline-none"
            style={{ fontSize: 13 }}
          />
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: text.trim() ? "rgba(124,58,237,0.8)" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              transition: "background 0.2s",
            }}
          >
            <Send size={12} className="text-white" style={{ marginLeft: 1 }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
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
  const [commentOpen, setCommentOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const post = posts[postIdx];
  const allMedia = post ? getAllMedia(post) : [];
  const isAlbum = allMedia.length > 1;
  const accent = "#a78bfa";
  const audioName = post ? (post as any).audioName as string | undefined : undefined;
  const audioUrl  = post ? (post as any).audioUrl  as string | undefined : undefined;

  const liked = likedMap[post?.id ?? 0] ?? post?.isLiked ?? false;
  const likes = likesMap[post?.id ?? 0] ?? post?.likesCount ?? 0;

  useEffect(() => {
    if (!post) return;
    setLikedMap(m => ({ ...m, [post.id]: post.isLiked ?? false }));
    setLikesMap(m => ({ ...m, [post.id]: post.likesCount ?? 0 }));
  }, [post?.id]);

  useEffect(() => { setSlideIdx(0); setCaptionOpen(false); setCommentOpen(false); }, [postIdx]);

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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (commentOpen) return;
    if (info.offset.y < -70 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      if (postIdx < posts.length - 1) setPostIdx(i => i + 1);
    }
    if (info.offset.y > 70 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      if (postIdx > 0) setPostIdx(i => i - 1);
    }
    if (info.offset.x < -60 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (isAlbum && slideIdx < allMedia.length - 1) setSlideIdx(i => i + 1);
    }
    if (info.offset.x > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (isAlbum && slideIdx > 0) setSlideIdx(i => i - 1);
    }
  };

  if (!post) return null;

  const currentMedia = allMedia[slideIdx];
  const safeTop = "max(env(safe-area-inset-top, 0px), 16px)";
  const safeBottom = "max(env(safe-area-inset-bottom, 0px), 28px)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200]"
      style={{ background: "#000" }}
    >
      <style>{`
        @keyframes pv-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* ── Full-screen media (cover) ── */}
      <motion.div
        className="absolute inset-0"
        drag={!commentOpen}
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handlePanEnd}
        style={{ touchAction: "none", zIndex: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${postIdx}-${slideIdx}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {currentMedia ? (
              isVideoUrl(currentMedia)
                ? <video
                    src={currentMedia}
                    muted={muted}
                    loop playsInline autoPlay
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: "cover" }}
                  />
                : <img
                    src={currentMedia}
                    alt={post.content}
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: "cover" }}
                    loading="lazy"
                  />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-8"
                style={{ background: "linear-gradient(135deg,#1a0533,#0a1533)" }}>
                <p className="text-white text-center text-lg font-semibold leading-relaxed">
                  {post.content}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle gradient overlay — keeps text readable, image visible */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.55) 100%)",
            zIndex: 2,
          }} />

        {/* Album dots */}
        {isAlbum && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-1.5 pointer-events-none" style={{ zIndex: 3 }}>
            {allMedia.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-300"
                style={{ width: i === slideIdx ? 16 : 5, height: 5,
                  background: i === slideIdx ? accent : "rgba(255,255,255,0.35)" }} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── TOP BAR ── */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-4"
        style={{ zIndex: 20, top: safeTop }}
      >
        {/* Left: back + avatar + name */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <ChevronLeft size={16} className="text-white" />
          </motion.button>

          {post.author && (
            <>
              {/* Avatar */}
              <div className="flex-shrink-0 rounded-full overflow-hidden"
                style={{
                  width: 32, height: 32,
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}>
                {post.author.avatarUrl
                  ? <img src={resolveApiUrl(post.author.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-[11px] font-bold">{post.author.displayName?.[0]?.toUpperCase()}</span>
                    </div>
                }
              </div>

              {/* Name */}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-white text-[13px] font-bold truncate leading-none"
                    style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)", maxWidth: 130 }}
                  >
                    {post.author.displayName}
                  </span>
                  {(post.author as any).isVerified && <BadgeCheck size={12} className="text-violet-400 flex-shrink-0" />}
                </div>
                {isAlbum && (
                  <span className="text-white/45 text-[9px]">{slideIdx + 1}/{allMedia.length}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: mute button for video */}
        {currentMedia && isVideoUrl(currentMedia) && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            {muted ? <VolumeX size={15} className="text-white/80" /> : <Volume2 size={15} className="text-white" />}
          </motion.button>
        )}
      </div>

      {/* ── RIGHT SIDE ACTIONS (vertical strip) ── */}
      <div
        className="absolute flex flex-col items-center gap-4"
        style={{
          zIndex: 20,
          right: 14,
          bottom: `calc(${safeBottom} + 80px)`,
        }}
      >
        <ActionBtn
          icon={Heart}
          label=""
          active={liked}
          color="#f43f5e"
          count={likes}
          onClick={e => { e.stopPropagation(); handleLike(); }}
        />
        <ActionBtn
          icon={MessageCircle}
          label="Izoh"
          count={(post as any).commentsCount ?? 0}
          onClick={e => { e.stopPropagation(); setCommentOpen(o => !o); }}
        />
        <ActionBtn
          icon={Share2}
          label="Ulash"
          onClick={e => {
            e.stopPropagation();
            if (navigator.share) navigator.share({ url: `${window.location.origin}/post/${post.id}` }).catch(() => {});
            else navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`);
          }}
        />
        <ActionBtn
          icon={Download}
          label="Yuklab"
          onClick={e => {
            e.stopPropagation();
            if (post.mediaUrl) {
              const a = document.createElement("a");
              a.href = resolveApiUrl(post.mediaUrl); a.download = `post-${post.id}`; a.click();
            }
          }}
        />
        <ActionBtn
          icon={Flag}
          label="Shikoyat"
          color="#fb923c"
          onClick={e => { e.stopPropagation(); }}
        />
      </div>

      {/* ── BOTTOM: Music + Caption ── */}
      <div
        className="absolute left-4 flex flex-col gap-1.5"
        style={{
          zIndex: 20,
          bottom: safeBottom,
          right: 66,
        }}
      >
        {audioName && audioUrl && (
          <div className="flex items-center gap-2">
            <SongTicker name={audioName} accent={accent} />
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
              }}
            >
              {muted ? <VolumeX size={12} className="text-white/70" /> : <Volume2 size={12} className="text-white" />}
            </motion.button>
          </div>
        )}

        {post.content && (post as any).type !== "text" && (
          <motion.div
            onClick={e => { e.stopPropagation(); setCaptionOpen(o => !o); }}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <AnimatePresence mode="wait">
              {captionOpen ? (
                <motion.div
                  key="open"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl px-3 py-2"
                  style={{
                    background: "rgba(0,0,0,0.40)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    maxHeight: "40vh",
                    overflowY: "auto",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-white text-[13px] leading-relaxed">{post.content}</p>
                  <button
                    onClick={e => { e.stopPropagation(); setCaptionOpen(false); }}
                    className="mt-1.5 text-[10px] text-white/40 font-semibold"
                  >Yopish ↑</button>
                </motion.div>
              ) : (
                <motion.p
                  key="closed"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-white text-[13px] font-semibold leading-snug"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 2px 14px rgba(0,0,0,0.8)" }}
                >
                  {post.content.length > 70 ? post.content.slice(0, 70) + "…" : post.content}
                  {post.content.length > 70 && (
                    <span className="text-white/45 ml-1 text-[11px]">ko'proq</span>
                  )}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── COMMENT PANEL (slides from right) ── */}
      <AnimatePresence>
        {commentOpen && (
          <>
            {/* Dim the left part (tap to close) */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ zIndex: 25, background: "rgba(0,0,0,0.25)" }}
              onClick={() => setCommentOpen(false)}
            />
            <CommentPanel post={post} onClose={() => setCommentOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
