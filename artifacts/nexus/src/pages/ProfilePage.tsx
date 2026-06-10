import { motion } from "framer-motion";
import { BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon, Camera, Loader2, Radio, Users } from "lucide-react";
import { useGetUser, useListPosts, useFollowUser, useUpdateUser, getGetUserQueryKey, useListReels, useStartLive } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useLocation } from "wouter";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProfilePageProps { userId: number; }

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { data: user, isLoading } = useGetUser(userId, { query: { queryKey: getGetUserQueryKey(userId) } });
  const { data: posts = [] } = useListPosts({ userId });
  const { data: reels = [] } = useListReels({ userId });
  const [following, setFollowing] = useState(false);
  const follow = useFollowUser();
  const updateUser = useUpdateUser();
  const startLive = useStartLive();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const { user: me } = useAuth();
  const isOwner = me?.id === userId;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const [showGoLive, setShowGoLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveStarting, setLiveStarting] = useState(false);

  const { uploadFile: upAvatar, isUploading: avatarUploading } = useMediaUpload({
    onSuccess: r => updateUser.mutate({ id: userId, data: { avatarUrl: r.serveUrl } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }); },
    }),
  });
  const { uploadFile: upCover, isUploading: coverUploading } = useMediaUpload({
    onSuccess: r => updateUser.mutate({ id: userId, data: { coverUrl: r.serveUrl } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }); },
    }),
  });

  const handleFollow = () => {
    setFollowing(!following);
    follow.mutate({ id: userId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) }) });
  };

  const handleGoLive = async () => {
    if (!liveTitle.trim()) return;
    setLiveStarting(true);
    try {
      const stream = await startLive.mutateAsync({ data: { title: liveTitle.trim() } });
      navigate(`/live/${stream.id}`);
    } catch {
      setLiveStarting(false);
    }
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
      <div className="h-40 bg-gradient-to-br from-primary/30 via-accent/20 to-background overflow-hidden relative group">
        {user.coverUrl && <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              {coverUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Cover
            </button>
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="px-5">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="relative group/avatar">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-gradient-to-br from-primary/40 to-accent/40 overflow-hidden">
              {avatarUploading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-black text-primary">{user.displayName[0]}</span>
                </div>
              )}
            </div>
            {isOwner && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pb-1">
            {isOwner ? (
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGoLive(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  Jonli Efir
                </motion.button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-card transition-colors">
                  <Settings className="w-4 h-4" /> Tahrirlash
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  following
                    ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {following ? <><UserCheck className="w-4 h-4" /> Kuzatmoqda</> : <><UserPlus className="w-4 h-4" /> Kuzatish</>}
              </motion.button>
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
            { label: "Postlar", value: myPosts.length },
            { label: "Kuzatuvchilar", value: user.followersCount },
            { label: "Kuzatilmoqda", value: user.followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-foreground">{(value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
          {([["posts", Grid3X3, "Postlar"], ["reels", Play, "Reels"]] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-card text-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === "posts" && (
          myPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hali post yo'q</p>
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
          )
        )}

        {/* Reels tab */}
        {tab === "reels" && (
          reels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hali reel yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {reels.map((reel, i) => (
                <motion.div
                  key={reel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors relative group"
                >
                  {reel.thumbnailUrl ? (
                    <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : reel.videoUrl ? (
                    <video src={reel.videoUrl} className="w-full h-full object-cover" muted preload="none"
                      onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                    <Play className="w-3 h-3 fill-white" />
                    {(reel.viewsCount ?? 0) > 1000 ? `${((reel.viewsCount ?? 0) / 1000).toFixed(1)}K` : reel.viewsCount ?? 0}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Go Live modal */}
      {showGoLive && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl"
          >
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              Jonli efirni boshlash
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Efir nomini kiriting</p>
            <input
              value={liveTitle}
              onChange={e => setLiveTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleGoLive(); }}
              placeholder="Masalan: Yangi kecha muzikasi 🎵"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-red-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowGoLive(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/70">
                Bekor
              </button>
              <button onClick={handleGoLive} disabled={!liveTitle.trim() || liveStarting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {liveStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                Boshlash
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
