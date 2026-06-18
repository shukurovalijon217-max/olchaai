import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Plus, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListPosts, useGetTrendingTopics, useGetAiFeed } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import PostCard from "@/components/PostCard";
import StoriesBar from "@/components/StoriesBar";
import CreateContentModal from "@/components/CreateContentModal";
import TunnelFeed from "@/components/TunnelFeed";

export default function HomePage() {
  const { t } = useTranslation();
  const { data: feed } = useGetAiFeed();
  const { data: posts = [], isLoading } = useListPosts();
  const { data: topics = [] } = useGetTrendingTopics();
  const [createOpen, setCreateOpen] = useState(false);
  const [tunnelMode, setTunnelMode] = useState(false);

  const displayPosts = feed?.posts?.length ? feed.posts : posts;

  return (
    <>
      {tunnelMode && displayPosts.length > 0 && (
        <TunnelFeed
          initialPosts={displayPosts as Post[]}
          onExit={() => setTunnelMode(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Main Feed */}
        <div className="flex-1 max-w-2xl space-y-5">
          {/* Stories */}
          <StoriesBar onCreateStory={() => setCreateOpen(true)} />

          {/* Feed Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              {t("home.for_you")}
            </h2>
            <div className="flex items-center gap-2">
              {/* Tunnel Mode Toggle */}
              {displayPosts.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setTunnelMode(true)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.18) 100%)",
                    border: "1px solid rgba(139,92,246,0.5)",
                    color: "#a78bfa",
                    boxShadow: "0 0 14px rgba(139,92,246,0.2)",
                  }}
                >
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))",
                      borderRadius: "inherit",
                    }}
                  />
                  <Layers className="w-3.5 h-3.5 relative" />
                  <span className="relative">{t("tunnel.enter")}</span>
                </motion.button>
              )}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("home.create_post")}
              </button>
            </div>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-muted rounded w-1/3" />
                      <div className="h-2.5 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-48 bg-muted rounded-xl mb-3" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t("home.no_posts")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayPosts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden xl:block w-72 space-y-5 flex-shrink-0">
          {/* Trending Topics */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t("home.trending")}
            </h3>
            <div className="space-y-3">
              {topics.slice(0, 6).map((topic, i) => (
                <motion.div
                  key={topic.tag}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{topic.category}</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">#{topic.tag}</p>
                    <p className="text-xs text-muted-foreground">{topic.postCount.toLocaleString()} {t("home.posts")}</p>
                  </div>
                  <span className={`text-xs font-bold ${topic.growth > 15 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    +{topic.growth.toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Suggested Users */}
          {feed?.suggestedUsers && feed.suggestedUsers.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-4 text-foreground">{t("home.suggested")}</h3>
              <div className="space-y-3">
                {feed.suggestedUsers.slice(0, 4).map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{user.displayName?.[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">{t("home.follow")}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} defaultTab="post" />
      </div>
    </>
  );
}
