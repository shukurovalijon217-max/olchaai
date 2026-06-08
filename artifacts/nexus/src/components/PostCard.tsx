import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, BadgeCheck } from "lucide-react";
import { useLikePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey, getGetTrendingPostsQueryKey } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";

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

export default function PostCard({ post, index = 0 }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likesCount);
  const likePost = useLikePost();
  const qc = useQueryClient();

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

  const grad = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
    >
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
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Media */}
      {post.mediaUrl && (
        <div className={`relative w-full aspect-video bg-gradient-to-br ${grad} overflow-hidden`}>
          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

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
  );
}
