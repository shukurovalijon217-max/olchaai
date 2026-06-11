import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, MoreHorizontal, BadgeCheck, Flag, X,
  AlertTriangle, Trash2, Music, Sparkles, Brain, Tag, Loader2, Check, Download,
} from "lucide-react";
import { useLikePost, useDeletePost, getListPostsQueryKey, getGetTrendingPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Post } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useDwellTracker } from "@/hooks/useDwellTracker";
import { generateShareCard, downloadShareCard } from "@/utils/shareCard";
import { useTranslation } from "react-i18next";

interface PostCardProps { post: Post; index?: number; }

const GRADIENT_COLORS = [
  "from-violet-600/20 to-purple-900/10",
  "from-pink-600/20 to-rose-900/10",
  "from-cyan-600/20 to-blue-900/10",
  "from-emerald-600/20 to-teal-900/10",
];

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-red-400",
};

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Analysis {
  tags?: string[];
  category?: string;
  summary?: string;
  sentiment?: string;
}

export default function PostCard({ post, index = 0 }: PostCardProps) {
  const { t } = useTranslation();
  const REPORT_REASONS = [
    { value: "spam", label: t("post.reason_spam") },
    { value: "hate", label: t("post.reason_hate") },
    { value: "adult", label: t("post.reason_adult") },
    { value: "violence", label: t("post.reason_violence") },
    { value: "fake", label: t("post.reason_fake") },
    { value: "other", label: t("post.reason_other") },
  ];
  const SENTIMENT_LABEL: Record<string, string> = {
    positive: t("post.sentiment_positive"),
    neutral: t("post.sentiment_neutral"),
    negative: t("post.sentiment_negative"),
  };
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likesCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const likePost = useLikePost();
  const deletePost = useDeletePost();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.id === post.author.id;
  const dwellRef = useDwellTracker("post", post.id, !!user);

  const grad = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* Sync liked/count when post prop changes */
  useEffect(() => {
    setLiked(post.isLiked);
    setCount(post.likesCount);
  }, [post.isLiked, post.likesCount]);

  /* ── Like ── */
  const handleLike = () => {
    if (!user) return;
    setLiked(v => !v);
    setCount(v => liked ? v - 1 : v + 1);
    likePost.mutate({ id: post.id }, {
      onSuccess: (data) => {
        setLiked(data.liked);
        setCount(data.likesCount);
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      },
      onError: () => {
        setLiked(v => !v);
        setCount(v => liked ? v + 1 : v - 1);
      },
    });
  };

  /* ── Share ── */
  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.author.displayName, text: post.content ?? "", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      try { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); }
      catch { /* silent */ }
    }
    /* Log interaction */
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "post", contentId: post.id, interactionType: "share" }),
    }).catch(() => {});
  };

  /* ── AI Analyze ── */
  const handleAnalyze = async () => {
    if (analysis) { setShowAnalysis(v => !v); return; }
    setAnalyzing(true);
    try {
      /* Only pass imageUrl for actual images (not video/audio) */
      const isImage = post.mediaUrl && post.type !== "video" && !post.mediaUrl.match(/\.(mp3|wav|ogg|aac|m4a|mp4|webm|mov)(\?|$)/i);
      const res = await fetch(`${API}/api/ai/analyze-content`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          contentId: post.id, contentType: "post",
          caption: post.content ?? "",
          imageUrl: isImage ? post.mediaUrl : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        setShowAnalysis(true);
      }
    } catch { /* silent */ }
    finally { setAnalyzing(false); }
  };

  /* ── Share Card ── */
  const handleShareCard = async () => {
    setSharing(true);
    try {
      const blob = await generateShareCard({
        authorName: post.author.displayName ?? post.author.username ?? "User",
        content: post.content ?? "",
        mediaUrl: post.mediaUrl ?? undefined,
        type: post.type,
        likesCount: count,
        commentsCount: post.commentsCount,
        tags: post.tags ?? [],
      });
      downloadShareCard(blob, `olcha-${post.id}.png`);
    } catch { /* silent */ }
    finally { setSharing(false); }
  };

  /* ── Delete ── */
  const handleDelete = () => {
    if (!confirm(t("common.delete_confirm"))) return;
    setMenuOpen(false);
    deletePost.mutate({ id: post.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      },
    });
  };

  /* ── Report ── */
  const handleReport = async () => {
    if (!reportReason || !user) return;
    setReporting(true);
    try {
      await fetch(`${API}/api/moderation/report`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ contentType: "post", contentId: post.id, reason: reportReason, description: reportDesc }),
      });
      setReportDone(true);
      setTimeout(() => { setReportOpen(false); setReportDone(false); setReportReason(""); setReportDesc(""); }, 2000);
    } catch { /* silent */ }
    finally { setReporting(false); }
  };

  return (
    <>
      <motion.div
        ref={dwellRef as any}
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
            <span className="text-xs text-destructive font-medium">{t("post.flagged")}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <Link href={`/profile/${post.author.id}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden">
              {post.author.avatarUrl
                ? <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-primary">{post.author.displayName?.[0]?.toUpperCase()}</span>
              }
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
            <button onClick={() => setMenuOpen(v => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {isOwner && (
                    <button onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" /> {t("post.delete")}
                    </button>
                  )}
                  <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Flag className="w-4 h-4" /> {t("post.report")}
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

        {/* AI Analysis panel */}
        <AnimatePresence>
          {showAnalysis && analysis && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="mx-4 mb-2 rounded-xl bg-muted/60 border border-border/60 overflow-hidden">
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-foreground">{t("post.ai_analysis")}</span>
                    {analysis.category && (
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-400 text-[10px] font-semibold">
                        {analysis.category}
                      </span>
                    )}
                    {analysis.sentiment && (
                      <span className={`text-[10px] font-semibold ${SENTIMENT_COLOR[analysis.sentiment] ?? "text-muted-foreground"}`}>
                        {SENTIMENT_LABEL[analysis.sentiment] ?? analysis.sentiment}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowAnalysis(false)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                {analysis.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary}</p>
                )}
                {analysis.tags && analysis.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysis.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                        <Tag className="w-2.5 h-2.5" />#{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-1 px-3 pb-3 pt-1">
          {/* Like */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              liked ? "text-pink-400 bg-pink-400/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}>
            <Heart className={`w-4 h-4 transition-transform ${liked ? "fill-current scale-110" : ""}`} />
            <span>{count}</span>
          </motion.button>

          {/* Comment */}
          <Link href={`/post/${post.id}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>
          </Link>

          {/* Share */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              shared ? "text-emerald-400 bg-emerald-400/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}>
            {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{shared ? t("common.copied") : (post.sharesCount ?? 0)}</span>
          </motion.button>

          {/* AI Analyze */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleAnalyze} disabled={analyzing}
            title={t("post.ai_analysis")}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showAnalysis ? "text-violet-400 bg-violet-400/10" : "text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10"
            }`}>
            {analyzing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />
            }
            <span className="hidden sm:inline">AI</span>
          </motion.button>

          {/* Share Card */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleShareCard} disabled={sharing}
            title={t("post.download_card")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-50">
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Report modal */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setReportOpen(false); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.18 }}
              className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-destructive" />
                  <h3 className="font-semibold text-foreground">{t("post.report")}</h3>
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
                  <p className="text-sm font-medium text-foreground">{t("post.report_accepted")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("post.report_note")}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">{t("post.report_why")}</p>
                  <div className="space-y-1.5 mb-4">
                    {REPORT_REASONS.map(r => (
                      <button key={r.value} onClick={() => setReportReason(r.value)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                          reportReason === r.value
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : "text-foreground hover:bg-muted border border-transparent"
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={2}
                    placeholder={t("post.report_desc_ph")}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 mb-3" />
                  <button onClick={handleReport} disabled={!reportReason || reporting}
                    className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {reporting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {t("post.report_submit")}
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
