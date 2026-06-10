import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck, Settings, UserPlus, UserCheck, Grid3X3, Play, BookmarkIcon,
  Camera, Loader2, Radio, Bell, BellOff, Star, Check, X, Sparkles
} from "lucide-react";
import {
  useGetUser, useListPosts, useFollowUser, useUpdateUser, getGetUserQueryKey,
  useListReels, useStartLive, useListCreatorPlans, useCheckCreatorSubscription,
  useSubscribeToCreator, useUnsubscribeFromCreator, useCreateCreatorPlan,
  getListCreatorPlansQueryKey, getCheckCreatorSubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProfilePageProps { userId: number; }

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
    } finally {
      setSubscribingPlanId(null);
    }
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
        <div className="h-40 bg-card rounded-2xl" />
        <div className="flex gap-4"><div className="w-20 h-20 rounded-full bg-muted -mt-10 ml-4" /></div>
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
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="relative group/avatar">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-gradient-to-br from-primary/40 to-accent/40 overflow-hidden">
              {avatarUploading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><span className="text-2xl font-black text-primary">{user.displayName[0]}</span></div>
              )}
            </div>
            {isOwner && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
                <button onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
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

          {/* Action buttons */}
          <div className="flex gap-2 pb-1">
            {isOwner ? (
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowGoLive(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${following ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
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
            { label: t("profile.posts"), value: myPosts.length },
            { label: t("profile.followers"), value: user.followersCount },
            { label: t("profile.following"), value: user.followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-foreground">{(value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
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
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === tabId ? "bg-card text-foreground" : "text-muted-foreground"}`}>
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
                  className="aspect-square rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors">
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
                  className="aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors relative group">
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

      {/* Create Plan Modal (owner only) */}
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
                <input value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder="Narx (so'mda, masalan: 15000)"
                  type="number" min="100"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500" />
                <textarea value={newPlanPerks} onChange={e => setNewPlanPerks(e.target.value)}
                  placeholder={"Imtiyozlar (har biri yangi qatorda):\nExklyuziv kontent\nDirect xabar\nOdatdan erta kirish"}
                  rows={3} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-yellow-500 resize-none" />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowCreatePlan(false)} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold">{t("common.cancel")}</button>
                <button onClick={handleCreatePlan} disabled={!newPlanName.trim() || !newPlanPrice || creatingPlan}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {creatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t("profile.create_plan")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
