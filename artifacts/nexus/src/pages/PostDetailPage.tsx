import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Heart, BadgeCheck } from "lucide-react";
import { Link } from "wouter";
import { useGetPost, useListPostComments, useCreatePostComment, getListPostCommentsQueryKey, getGetPostQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";

interface PostDetailPageProps { postId: number; }

export default function PostDetailPage({ postId }: PostDetailPageProps) {
  const { data: post } = useGetPost(postId, { query: { queryKey: getGetPostQueryKey(postId) } });
  const { data: comments = [] } = useListPostComments(postId, { query: { queryKey: getListPostCommentsQueryKey(postId) } });
  const [text, setText] = useState("");
  const addComment = useCreatePostComment();
  const qc = useQueryClient();

  const handleComment = () => {
    if (!text.trim()) return;
    addComment.mutate({ id: postId, data: { authorId: 1, content: text } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostCommentsQueryKey(postId) });
        qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
        setText("");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <h1 className="font-bold text-foreground">Post</h1>
      </div>

      {post && <PostCard post={post} />}

      {/* Comments */}
      <div className="mt-5 space-y-3">
        <h2 className="font-bold text-foreground text-sm">{comments.length} Comments</h2>

        {/* Add comment */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">Y</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleComment}
              disabled={!text.trim()}
              className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Comment list */}
        {comments.map((comment, i) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {comment.author.avatarUrl ? (
                <img src={comment.author.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">{comment.author.displayName?.[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-sm font-semibold text-foreground">{comment.author.displayName}</span>
                {comment.author.isVerified && <BadgeCheck className="w-3 h-3 text-primary" />}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-400 transition-colors">
                  <Heart className="w-3 h-3" /> {comment.likesCount}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
