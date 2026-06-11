import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Heart, BadgeCheck, Loader2 } from "lucide-react";
import { Link } from "wouter";
import {
  useGetPost, useListPostComments, useCreatePostComment,
  getListPostCommentsQueryKey, getGetPostQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";

interface PostDetailPageProps { postId: number; }

export default function PostDetailPage({ postId }: PostDetailPageProps) {
  const { data: post } = useGetPost(postId, { query: { queryKey: getGetPostQueryKey(postId) } });
  const { data: comments = [] } = useListPostComments(postId, { query: { queryKey: getListPostCommentsQueryKey(postId) } });
  const [text, setText] = useState("");
  const addComment = useCreatePostComment();
  const qc = useQueryClient();
  const { user } = useAuth();

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <h1 className="font-bold text-foreground">Post</h1>
      </div>

      {post && <PostCard post={post} />}

      {/* Comments section */}
      <div className="mt-6 space-y-4">
        <h2 className="font-bold text-foreground text-sm">{comments.length} ta izoh</h2>

        {/* Add comment */}
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
              placeholder="Izoh qo'shish..."
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

        {/* Error feedback */}
        {addComment.isError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            {(addComment.error as any)?.response?.data?.error ?? "Izoh yuborishda xato"}
          </p>
        )}

        {/* Comment list */}
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
                    {new Date(comment.createdAt).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" })}
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

        {comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Hali izoh yo'q. Birinchi bo'ling!</p>
          </div>
        )}
      </div>
    </div>
  );
}
