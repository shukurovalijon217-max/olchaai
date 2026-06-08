import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, BadgeCheck, Users } from "lucide-react";
import { useListPosts, useGetTrendingTopics, useGetAiSuggestions, useListGroups, useListUsers } from "@workspace/api-client-react";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const { data: posts = [] } = useListPosts();
  const { data: topics = [] } = useGetTrendingTopics();
  const { data: suggestions } = useGetAiSuggestions();
  const { data: groups = [] } = useListGroups();
  const { data: users = [] } = useListUsers({ search: query || undefined });

  const photoPosts = posts.filter(p => p.type === "photo" || p.mediaUrl);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-7">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, posts, groups..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* Trending Topics */}
      <section>
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Trending Topics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topics.map((topic, i) => (
            <motion.div
              key={topic.tag}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
            >
              <p className="text-xs text-muted-foreground mb-1">{topic.category}</p>
              <p className="font-bold text-foreground">#{topic.tag}</p>
              <p className="text-xs text-muted-foreground mt-1">{topic.postCount.toLocaleString()} posts</p>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">+{topic.growth.toFixed(1)}%</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Photo Grid */}
      {photoPosts.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4">Explore Posts</h2>
          <div className="grid grid-cols-3 gap-2">
            {photoPosts.slice(0, 9).map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.02 }}
                className="aspect-square rounded-xl overflow-hidden bg-card border border-border cursor-pointer"
              >
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-3">
                    <p className="text-xs text-foreground line-clamp-4 text-center">{post.content}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested Users */}
      {suggestions?.users && suggestions.users.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            People to Follow
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggestions.users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 mx-auto mb-3 flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">{user.displayName?.[0]}</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                  {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mb-3">@{user.username}</p>
                <button className="w-full py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                  Follow
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4">Popular Communities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.slice(0, 4).map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/20 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {group.avatarUrl ? (
                    <img src={group.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">{group.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group.membersCount.toLocaleString()} members · {group.category}</p>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors flex-shrink-0">
                  Join
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
