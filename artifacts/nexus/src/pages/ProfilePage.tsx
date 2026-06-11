import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon,
  Camera, Loader2, Radio, Bell, BellOff, Star, Check, X, Sparkles,
} from "lucide-react";
import {
  useGetUser, useListPosts, useFollowUser, useUpdateUser, getGetUserQueryKey,
  useListReels, useStartLive, useListCreatorPlans, useCheckCreatorSubscription,
  useSubscribeToCreator, useUnsubscribeFromCreator, useCreateCreatorPlan,
  getListCreatorPlansQueryKey, getCheckCreatorSubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProfilePageProps { userId: number; }

const ORBIT_PARTICLES = [
  { radius: 64, color: "#a78bfa", glow: "#7c3aed", size: 9, dur: 5.5, delay: 0 },
  { radius: 72, color: "#60a5fa", glow: "#3b82f6", size: 7, dur: 7.5, delay: 1.8 },
  { radius: 80, color: "#34d399", glow: "#10b981", size: 6, dur: 9.5, delay: 3.5 },
];

function Avatar3D({ avatarUrl, displayName, isVerified, isUploading, isOwner, onUploadClick }: {
  avatarUrl?: string | null;
  displayName: string;
  isVerified?: boolean;
  isUploading: boolean;
  isOwner: boolean;
  onUploadClick: () => void;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [18, -18]), { stiffness: 260, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-18, 18]), { stiffness: 260, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <div
      className="relative"
      style={{ perspective: "900px", width: 112, height: 112 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-28 h-28"
      >
        {/* Pulsing glow aura */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-6 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(59,130,246,0.25) 50%, transparent 75%)",
            filter: "blur(10px)",
          }}
        />

        {/* Activity rings — SVG */}
        <svg
          className="absolute pointer-events-none"
          style={{ top: -32, left: -32, width: 176, height: 176, overflow: "visible" }}
          viewBox="0 0 176 176"
        >
          <defs>
            <linearGradient id="gr1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="gr2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
            <linearGradient id="gr3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          {/* Ring tracks */}
          <circle cx="88" cy="88" r="82" fill="none" stroke="#7c3aed12" strokeWidth="5" />
          <circle cx="88" cy="88" r="72" fill="none" stroke="#3b82f612" strokeWidth="4.5" />
          <circle cx="88" cy="88" r="62" fill="none" stroke="#10b98112" strokeWidth="4" />
          {/* Animated ring fills */}
          <motion.circle cx="88" cy="88" r="82" fill="none" stroke="url(#gr1)" strokeWidth="5"
            strokeLinecap="round" strokeDasharray="515 515"
            animate={{ strokeDashoffset: [515, 90, 515] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }}
          />
          <motion.circle cx="88" cy="88" r="72" fill="none" stroke="url(#gr2)" strokeWidth="4.5"
            strokeLinecap="round" strokeDasharray="452 452"
            animate={{ strokeDashoffset: [452, 70, 452] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }}
          />
          <motion.circle cx="88" cy="88" r="62" fill="none" stroke="url(#gr3)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="389 389"
            animate={{ strokeDashoffset: [389, 55, 389] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            style={{ rotate: "-90deg", transformOrigin: "88px 88px" }}
          />
        </svg>

        {/* Orbiting particles */}
        {ORBIT_PARTICLES.map(({ radius, color, glow, size, dur, delay }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: "50%", left: "50%", width: 0, height: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}
          >
            <div
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 ${size * 2}px ${glow}, 0 0 ${size * 4}px ${glow}60`,
                top: -radius - size / 2,
                left: -size / 2,
              }}
            />
          </motion.div>
        ))}

        {/* Spinning conic gradient border */}
        <div
          className="absolute inset-0 rounded-[22px] overflow-hidden"
          style={{ padding: "2.5px" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{
              width: "180%", height: "180%",
              top: "-40%", left: "-40%",
              background: "conic-gradient(from 0deg, #7c3aed, #818cf8, #3b82f6, #06b6d4, #34d399, #f59e0b, #7c3aed)",
            }}
          />
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-background z-10 group/av cursor-pointer"
               onClick={isOwner ? onUploadClick : undefined}>
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 via-blue-500/15 to-cyan-500/20">
                <span className="text-3xl font-black text-primary">{displayName[0]}</span>
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity rounded-[20px]">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* 3D "lifted" light sheen */}
        <motion.div
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-[22px] pointer-events-none z-20"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 50%)",
            transform: "translateZ(18px)",
          }}
        />

        {/* Verified / Premium badge */}
        {isVerified && (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 }}
            className="absolute -bottom-2 -right-2 z-30"
            style={{ transform: "translateZ(24px)" }}
          >
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                <BadgeCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { t } = useTranslation();
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
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanPerks, setNewPlanPerks] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  const { data: plans = [] } = useListCreatorPlans(userId, { query: { queryKey: getListCreatorPlansQueryKey(userId) } });
  const { data: subCheck, refetch: refetchSub } = useCheckCreatorSubscription(userId, { query: { queryKey: getCheckCreatorSubscriptionQueryKey(userId), enabled: !isOwner && !!me } });
  const subscribeMutation = useSubscribeToCreator();
  const unsubscribeMutation = useUnsubscribeFromCreator();
  const createPlanMutation = useCreateCreatorPlan();

  const isSubscribed = subCheck?.isSubscribed ?? false;

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
    } catch { setLiveStarting(false); }
  };

  const handleSubscribe = async (planId: number) => {
    setSubError(null);
    setSubscribingPlanId(planId);
    try {
      await subscribeMutation.mutateAsync({ planId });
      await refetchSub();
      setShowPlansModal(false);
    } catch (err: any) {
      setSubError(err?.response?.data?.error ?? t("profile.subscribe_error"));
    } finally { setSubscribingPlanId(null); }
  };

  const handleUnsubscribe = async (planId: number) => {
    setSubscribingPlanId(planId);
    try {
      await unsubscribeMutation.mutateAsync({ planId });
      await refetchSub();
    } catch {} finally { setSubscribingPlanId(null); }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !newPlanPrice) return;
    setCreatingPlan(true);
    try {
      const perks = newPlanPerks.split("\n").map(p => p.trim()).filter(Boolean);
      await createPlanMutation.mutateAsync({
        data: { name: newPlanName.trim(), description: newPlanDesc.trim() || undefined, price: Math.round(parseFloat(newPlanPrice) * 100), perks }
      });
      qc.invalidateQueries({ queryKey: ["listCreatorPlans"] });
      setShowCreatePlan(false);
      setNewPlanName(""); setNewPlanDesc(""); setNewPlanPrice(""); setNewPlanPerks("");
    } catch {} finally { setCreatingPlan(false); }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-4">
        <div className="h-44 bg-card rounded-2xl" />
        <div className="flex gap-4"><div className="w-28 h-28 rounded-full bg-muted -mt-14 ml-4" /></div>
      </div>
    );
  }
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const myPosts = posts.filter(p => p.author.id === userId);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Cover */}
      <div className="h-44 overflow-hidden relative group rounded-b-3xl">
        {user.coverUrl
          ? <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-violet-900/80 via-blue-900/60 to-background">
              <motion.div
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
              />
              <motion.div
                animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
              />
            </div>
          )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />
            <button onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
              {coverUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Cover
            </button>
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="px-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between mb-4" style={{ marginTop: -44 }}>
          <div className="relative z-10">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
            <Avatar3D
              avatarUrl={user.avatarUrl}
              displayName={user.displayName}
              isVerified={user.isVerified}
              isUploading={avatarUploading}
              isOwner={isOwner}
              onUploadClick={() => avatarInputRef.current?.click()}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pb-1">
            {isOwner ? (
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowGoLive(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25">
                  <Radio className="w-4 h-4" /> {t("profile.go_live")}
                </motion.button>
                <button onClick={() => setShowCreatePlan(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm font-semibold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all">
                  <Sparkles className="w-4 h-4" /> {t("profile.subscription")}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-card transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleFollow}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${following ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive" : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"}`}>
                  {following ? <><UserCheck className="w-4 h-4" /> {t("profile.following_btn")}</> : <><UserPlus className="w-4 h-4" /> {t("profile.follow_btn")}</>}
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowPlansModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isSubscribed ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 text-yellow-600 dark:text-yellow-400" : "bg-muted text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"} border border-transparent`}>
                  {isSubscribed ? <><Check className="w-4 h-4" /> {t("profile.subscribed")}</> : <><Bell className="w-4 h-4" /> {t("profile.subscribe_btn")}</>}
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Name / bio */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 pl-1"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-foreground">{user.displayName}</h1>
            {user.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
          {user.bio && <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-border mb-5">
          {[
            { label: t("profile.posts"), value: myPosts.length, color: "text-primary" },
            { label: t("profile.followers"), value: user.followersCount, color: "text-violet-400" },
            { label: t("profile.following"), value: user.followingCount, color: "text-blue-400" },
          ].map(({ label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="text-center"
            >
              <p className={`text-xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Creator plans banner (owner view) */}
        {isOwner && plans.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">{t("profile.plans_count", { count: plans.length })}</span>
              <span className="text-xs text-muted-foreground">· {t("profile.subscribers_count", { count: plans.reduce((s, p) => s + (p.subscriberCount ?? 0), 0) })}</span>
            </div>
            <button onClick={() => setShowPlansModal(true)} className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">{t("profile.view")}</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
          {([["posts", Grid3X3, t("profile.posts")], ["reels", Play, "Reels"]] as const).map(([tabId, Icon, label]) => (
            <button key={tabId} onClick={() => setTab(tabId)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === tabId ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === "posts" && (
          myPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("profile.no_posts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {myPosts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="aspect-square rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 hover:scale-[1.02] transition-all">
                  {post.mediaUrl
                    ? <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center p-3"><p className="text-xs text-foreground line-clamp-4 text-center">{post.content}</p></div>
                  }
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
              <p className="text-sm">{t("profile.no_reels")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {reels.map((reel, i) => (
                <motion.div key={reel.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 hover:scale-[1.02] transition-all relative group">
                  {reel.thumbnailUrl ? <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : reel.videoUrl ? (
                      <video src={reel.videoUrl} className="w-full h-full object-cover" muted preload="none"
                        onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                        onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    ) : <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center"><Play className="w-8 h-8 text-primary/40" /></div>
                  }
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Radio className="w-5 h-5 text-red-500" /> {t("profile.live_title")}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t("profile.live_subtitle")}</p>
            <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleGoLive(); }}
              placeholder="Masalan: Yangi kecha muzikasi 🎵"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-red-500 mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowGoLive(false)} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">{t("common.cancel")}</button>
              <button onClick={handleGoLive} disabled={!liveTitle.trim() || liveStarting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {liveStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} {t("profile.start")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Creator Plans Modal */}
      <AnimatePresence>
        {showPlansModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-sm border border-border shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-card px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" /> {t("profile.plans_title")}
                </h2>
                <button onClick={() => { setShowPlansModal(false); setSubError(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3">
                {subError && <p className="text-red-500 text-xs text-center bg-red-500/10 rounded-lg py-2">{subError}</p>}
                {plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("profile.no_plans")}</p>
                  </div>
                ) : plans.map(plan => (
                  <div key={plan.id} className="border border-border rounded-2xl p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" /> {plan.name}
                        </h3>
                        {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{((plan.price ?? 0) / 100).toLocaleString()} so'm</p>
                        <p className="text-xs text-muted-foreground">/ oy</p>
                      </div>
                    </div>
                    {plan.perks && plan.perks.length > 0 && (
                      <ul className="space-y-1 mb-3">
                        {plan.perks.map((perk, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-500 shrink-0" /> {perk}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("profile.subscribers_count", { count: plan.subscriberCount ?? 0 })}</span>
                      {!isOwner && (
                        isSubscribed ? (
                          <button onClick={() => handleUnsubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors">
                            {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                            {t("common.cancel")}
                          </button>
                        ) : (
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleSubscribe(plan.id)} disabled={subscribingPlanId === plan.id}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50">
                            {subscribingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                            {t("profile.subscribe_btn")}
                          </motion.button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Plan Modal */}
      <AnimatePresence>
        {showCreatePlan && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm border border-border shadow-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> {t("profile.new_plan")}</h2>
                <button onClick={() => setShowCreatePlan(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Reja nomi (masalan: Oltin ⭐)"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500" />
                <input value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} placeholder="Tavsif (ixtiyoriy)"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500" />
                <div className="relative">
                  <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder="Narx (so'm)"
                    className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">so'm</span>
                </div>
                <textarea value={newPlanPerks} onChange={e => setNewPlanPerks(e.target.value)} rows={3}
                  placeholder="Imtiyozlar (har bir qatorda bir imtiyoz)"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500 resize-none" />
                <button onClick={handleCreatePlan} disabled={!newPlanName.trim() || !newPlanPrice || creatingPlan}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {creatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  {t("profile.create_plan")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
