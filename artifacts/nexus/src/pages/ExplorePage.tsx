import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, BadgeCheck, Users, Check, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListPosts, useGetTrendingTopics, useGetAiSuggestions,
  useListGroups, useListUsers, useFollowUser, useJoinGroup,
  getListGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

export default function ExplorePage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const { data: posts = [] } = useListPosts();
  const { data: topics = [] } = useGetTrendingTopics();
  const { data: suggestions } = useGetAiSuggestions();
  const { data: groups = [] } = useListGroups();
  const { data: users = [] } = useListUsers({ search: query || undefined });

  const followMut = useFollowUser({
    mutation: {
      onSuccess: (data, vars) => {
        setFollowedIds(prev => {
          const next = new Set(prev);
          if (data.following) next.add(vars.id); else next.delete(vars.id);
          return next;
        });
      },
    },
  });

  const joinMut = useJoinGroup({
    mutation: {
      onSuccess: (_data, vars) => {
        setJoinedIds(prev => { const n = new Set(prev); n.add(vars.id); return n; });
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  const photoPosts = posts.filter(p => p.type === "photo" || p.mediaUrl);
  const suggestedUsers = suggestions?.users ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-7">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("explore.search_ph")}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* Trending Topics */}
      <section>
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t("explore.trending")}
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
              <p className="text-xs text-muted-foreground mt-1">{topic.postCount.toLocaleString()} {t("home.posts")}</p>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">+{topic.growth.toFixed(1)}%</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Photo Grid */}
      {photoPosts.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4">{t("explore.explore_posts")}</h2>
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
      {suggestedUsers.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t("explore.people_to_follow")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggestedUsers.map((user, i) => {
              const isFollowed = followedIds.has(user.id) || user.isFollowing;
              const isMe = me?.id === user.id;
              return (
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
                  {!isMe && (
                    <button
                      disabled={followMut.isPending}
                      onClick={() => followMut.mutate({ id: user.id })}
                      className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        isFollowed
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      }`}
                    >
                      {isFollowed ? (
                        <><Check className="w-3 h-3" /> {t("profile.following_btn")}</>
                      ) : (
                        <><UserPlus className="w-3 h-3" /> {t("explore.follow")}</>
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search results - users */}
      {query && users.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t("explore.people_to_follow")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {users.map((user, i) => {
              const isFollowed = followedIds.has(user.id) || user.isFollowing;
              const isMe = me?.id === user.id;
              return (
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
                  {!isMe && (
                    <button
                      disabled={followMut.isPending}
                      onClick={() => followMut.mutate({ id: user.id })}
                      className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        isFollowed
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      }`}
                    >
                      {isFollowed ? (
                        <><Check className="w-3 h-3" /> {t("profile.following_btn")}</>
                      ) : (
                        <><UserPlus className="w-3 h-3" /> {t("explore.follow")}</>
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground mb-4">{t("explore.popular_communities")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.slice(0, 4).map((group, i) => {
              const isJoined = joinedIds.has(group.id) || group.isMember;
              return (
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
                    <p className="text-xs text-muted-foreground">{group.membersCount.toLocaleString()} {t("groups.members")} · {group.category}</p>
                  </div>
                  <button
                    disabled={isJoined || joinMut.isPending}
                    onClick={() => !isJoined && joinMut.mutate({ id: group.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 flex items-center gap-1 ${
                      isJoined
                        ? "bg-primary/10 text-primary border border-primary/30 cursor-default"
                        : "bg-primary/15 text-primary hover:bg-primary/25"
                    }`}
                  >
                    {isJoined ? <><Check className="w-3 h-3" /> {t("groups.leave")}</> : t("explore.join")}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
