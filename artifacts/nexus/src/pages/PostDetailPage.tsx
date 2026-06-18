import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Heart, BadgeCheck, Loader2, Mic } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  useGetPost, useListPostComments, useCreatePostComment,
  getListPostCommentsQueryKey, getGetPostQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useAuth } from "@/context/AuthContext";

interface PostDetailPageProps { postId: number; }

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VoiceCommentData {
  id: number;
  postId: number;
  authorId: number;
  audioUrl: string;
  durationMs: number;
  waveformData?: string | null;
  createdAt: string;
  author?: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  } | null;
}

export default function PostDetailPage({ postId }: PostDetailPageProps) {
  const { t, i18n } = useTranslation();
  const { data: post } = useGetPost(postId, { query: { queryKey: getGetPostQueryKey(postId) } });
  const { data: comments = [] } = useListPostComments(postId, { query: { queryKey: getListPostCommentsQueryKey(postId) } });
  const [text, setText] = useState("");
  const addComment = useCreatePostComment();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [voiceComments, setVoiceComments] = useState<VoiceCommentData[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioCache = useState(() => new Map<number, HTMLAudioElement>())[0];

  useEffect(() => {
    fetch(`${API}/api/posts/${postId}/voice-comments`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setVoiceComments)
      .catch(() => {});
  }, [postId]);

  const handleComment = () => {
    if (!text.trim() || !user) return;
    addComment.mutate({ id: postId, data: { authorId: user.id, content: text } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostCommentsQueryKey(postId) });
        qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
        setText("");
      },
    });
  };

  const handleVoiceComment = async (audioUrl: string, durationMs: number, waveformData?: string) => {
    if (!user) return;
    try {
      const r = await fetch(`${API}/api/posts/${postId}/voice-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audioUrl, durationMs, waveformData }),
      });
      if (r.ok) {
        const vc = await r.json() as VoiceCommentData;
        setVoiceComments(prev => [vc, ...prev]);
      }
    } catch { /* silent */ }
  };

  const toggleAudio = (vc: VoiceCommentData) => {
    if (playingId === vc.id) {
      audioCache.get(vc.id)?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioCache.has(vc.id)) {
      const audio = new Audio(vc.audioUrl);
      audio.onended = () => setPlayingId(null);
      audioCache.set(vc.id, audio);
    }
    if (playingId !== null) {
      audioCache.get(playingId)?.pause();
    }
    audioCache.get(vc.id)?.play().catch(() => {});
    setPlayingId(vc.id);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <h1 className="font-bold text-foreground">{t("post_detail.title")}</h1>
      </div>

      {post && <PostCard post={post} />}

      {/* Comments section */}
      <div className="mt-6 space-y-4">
        <h2 className="font-bold text-foreground text-sm">{comments.length} {t("post_detail.comments_count")}</h2>

        {/* Text comment input */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/60">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-primary">{user?.displayName?.[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleComment(); }}
              placeholder={t("post_detail.comment_ph")}
              className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleComment}
              disabled={!text.trim() || addComment.isPending}
              className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors disabled:opacity-40"
            >
              {addComment.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </motion.button>
          </div>
        </div>

        {/* Voice recorder */}
        {user && (
          <div className="flex items-center gap-3 pl-11">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-amber-500/25 flex-shrink-0 flex items-center justify-center border border-primary/20 shrink-0">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <VoiceRecorder onVoiceComment={handleVoiceComment} />
          </div>
        )}

        {addComment.isError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            {(addComment.error as any)?.response?.data?.error ?? t("post_detail.comment_error")}
          </p>
        )}

        {/* Voice comments list */}
        {voiceComments.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 px-1">
              <Mic className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">
                {voiceComments.length} {t("post_detail.voice_count")}
              </span>
            </div>
            {voiceComments.map((vc, i) => {
              let bars: number[];
              try { bars = JSON.parse(vc.waveformData ?? "[]"); } catch { bars = []; }
              if (bars.length < 10) bars = Array(20).fill(8);
              const isPlaying = playingId === vc.id;
              return (
                <motion.div key={vc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 items-center px-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-amber-500/25 flex-shrink-0 flex items-center justify-center border border-primary/20">
                    {vc.author?.avatarUrl
                      ? <img src={vc.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-amber-400">{vc.author?.displayName?.[0]?.toUpperCase() ?? "?"}</span>
                    }
                  </div>
                  <div className="flex-1 bg-primary/6 border border-primary/15 rounded-2xl px-3 py-2 flex items-center gap-2.5 min-w-0">
                    <button onClick={() => toggleAudio(vc)}
                      className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors shrink-0">
                      {isPlaying ? (
                        <motion.div animate={{ scale: [1, 1.35, 1], opacity: [1, 0.65, 1] }}
                          transition={{ duration: 0.55, repeat: Infinity }}
                          className="w-2 h-2 bg-amber-400 rounded-sm" />
                      ) : (
                        <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <div className="flex items-end gap-[2px] flex-1 h-7 overflow-hidden">
                      {bars.slice(0, 20).map((h, idx) => (
                        <motion.div key={idx}
                          animate={isPlaying
                            ? { height: [h, Math.max(3, Math.round(h * (0.4 + Math.random() * 0.8))), h] }
                            : { height: Math.max(3, h) }
                          }
                          transition={isPlaying ? { duration: 0.3, repeat: Infinity, delay: idx * 0.025 } : { duration: 0 }}
                          className={`w-[2px] rounded-full shrink-0 transition-colors ${isPlaying ? "bg-amber-400" : "bg-amber-400/40"}`}
                          style={{ minHeight: 3, maxHeight: 28 }} />
                      ))}
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {(vc.durationMs / 1000).toFixed(1)}s
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {vc.author?.displayName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Text comment list */}
        <div className="space-y-3">
          {comments.map((comment, i) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/50">
                {comment.author.avatarUrl
                  ? <img src={comment.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-primary">{comment.author.displayName?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 bg-muted/40 rounded-2xl px-3 py-2.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{comment.author.displayName}</span>
                  {comment.author.isVerified && <BadgeCheck className="w-3 h-3 text-primary" />}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(comment.createdAt).toLocaleDateString(i18n.language)}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-400 transition-colors">
                    <Heart className="w-3 h-3" /> {comment.likesCount ?? 0}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {comments.length === 0 && voiceComments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t("post_detail.no_comments")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
