import { motion } from "framer-motion";
import { BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon } from "lucide-react";
import { useGetUser, useListPosts, useFollowUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface ProfilePageProps { userId: number; }

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { data: user, isLoading } = useGetUser(userId, { query: { queryKey: getGetUserQueryKey(userId) } });
  const { data: posts = [] } = useListPosts({ userId });
  const [following, setFollowing] = useState(false);
  const follow = useFollowUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reels">("posts");

  const handleFollow = () => {
    setFollowing(!following);
    follow.mutate({ id: userId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }) });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-4">
        <div className="h-40 bg-card rounded-2xl" />
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-full bg-muted -mt-10 ml-4" />
        </div>
      </div>
    );
  }

  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const myPosts = posts.filter(p => p.author.id === userId);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Cover */}
      <div className="h-40 bg-gradient-to-br from-primary/30 via-accent/20 to-background overflow-hidden relative">
        {user.coverUrl && <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      {/* Profile info */}
      <div className="px-5">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-gradient-to-br from-primary/40 to-accent/40 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-black text-primary">{user.displayName[0]}</span>
                </div>
              )}
            </div>
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pb-1">
            {userId !== 1 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  following
                    ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {following ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </motion.button>
            ) : (
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-card transition-colors">
                <Settings className="w-4 h-4" /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-foreground">{user.displayName}</h1>
            {user.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
          {user.bio && <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-border mb-5">
          {[
            { label: "Posts", value: myPosts.length },
            { label: "Followers", value: user.followersCount },
            { label: "Following", value: user.followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
          {([["posts", Grid3X3], ["reels", Play]] as const).map(([t, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-card text-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="w-4 h-4" />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        {myPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {myPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="aspect-square rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors"
              >
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center p-3">
                    <p className="text-xs text-foreground line-clamp-4 text-center">{post.content}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
