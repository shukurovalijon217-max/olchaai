import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, BadgeCheck, Flag, X, AlertTriangle, Trash2, Music } from "lucide-react";
import { useLikePost, useDeletePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey, getGetTrendingPostsQueryKey } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

interface PostCardProps {
  post: Post;
  index?: number;
}

const GRADIENT_COLORS = [
  "from-violet-600/20 to-purple-900/10",
  "from-pink-600/20 to-rose-900/10",
  "from-cyan-600/20 to-blue-900/10",
  "from-emerald-600/20 to-teal-900/10",
];

const REPORT_REASONS = [
  { value: "spam", label: "Spam yoki reklama" },
  { value: "hate", label: "Nafrat nutqi" },
  { value: "adult", label: "Kattalar uchun kontent" },
  { value: "violence", label: "Zo'ravonlik" },
  { value: "fake", label: "Yolg'on ma'lumot" },
  { value: "other", label: "Boshqa sabab" },
];

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PostCard({ post, index = 0 }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.id === post.author.id;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLike = () => {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    likePost.mutate({ id: post.id }, {
      onSuccess: (data) => {
        setLiked(data.liked);
        setCount(data.likesCount);
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      },
    });
  };

  const handleDelete = () => {
    if (!confirm("Postni o'chirishni tasdiqlaysizmi?")) return;
    setMenuOpen(false);
    deletePost.mutate({ id: post.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      },
    });
  };

  const handleReport = async () => {
    if (!reportReason || !user) return;
    setReporting(true);
    try {
      await fetch(`${API}/api/moderation/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contentType: "post", contentId: post.id,
          reason: reportReason, description: reportDesc,
        }),
      });
      setReportDone(true);
      setTimeout(() => { setReportOpen(false); setReportDone(false); setReportReason(""); setReportDesc(""); }, 2000);
    } catch {
      // silent
    } finally {
      setReporting(false);
    }
  };

  const grad = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`bg-card border rounded-2xl overflow-hidden hover:border-primary/20 transition-colors ${
          (post as any).isFlagged ? "border-destructive/40" : "border-border"
        }`}
      >
        {/* Flagged banner */}
        {(post as any).isFlagged && (
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
            <span className="text-xs text-destructive font-medium">Bu kontent AI tomonidan belgilangan</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <Link href={`/profile/${post.author.id}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden">
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{post.author.displayName?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-foreground">{post.author.displayName}</span>
              {post.author.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground">@{post.author.username}</span>
          </div>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  {isOwner && (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      O'chirish
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Shikoyat qilish
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Media */}
        {post.mediaUrl && (() => {
          const url = post.mediaUrl;
          const isAudio = url.match(/\.(mp3|wav|ogg|aac|m4a)(\?|$)/i) !== null;
          const isVideo = post.type === "video" && !isAudio;
          if (isAudio) return (
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-amber-400" />
              </div>
              <audio controls src={url} className="flex-1 h-8 min-w-0" style={{ accentColor: "var(--primary)" }} />
            </div>
          );
          if (isVideo) return (
            <div className={`relative w-full aspect-video bg-gradient-to-br ${grad} overflow-hidden`}>
              <video src={url} className="w-full h-full object-cover" controls muted playsInline />
            </div>
          );
          return (
            <div className={`relative w-full aspect-video bg-gradient-to-br ${grad} overflow-hidden`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          );
        })()}

        {/* Content */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-primary/80 font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-3 py-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              liked ? "text-pink-400 bg-pink-400/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            <span>{count}</span>
          </motion.button>
          <Link href={`/post/${post.id}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Share2 className="w-4 h-4" />
            <span>{post.sharesCount}</span>
          </button>
        </div>
      </motion.div>

      {/* Report modal */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setReportOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-destructive" />
                  <h3 className="font-semibold text-foreground">Shikoyat qilish</h3>
                </div>
                <button onClick={() => setReportOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportDone ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-400/15 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Shikoyat qabul qilindi</p>
                  <p className="text-xs text-muted-foreground mt-1">Moderatorlar ko'rib chiqadi</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">Nega shikoyat qilyapsiz?</p>
                  <div className="space-y-1.5 mb-4">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setReportReason(r.value)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                          reportReason === r.value
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : "text-foreground hover:bg-muted border border-transparent"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reportDesc}
                    onChange={e => setReportDesc(e.target.value)}
                    rows={2}
                    placeholder="Qo'shimcha izoh (ixtiyoriy)..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 mb-3"
                  />
                  <button
                    onClick={handleReport}
                    disabled={!reportReason || reporting}
                    className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {reporting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Shikoyat yuborish
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
