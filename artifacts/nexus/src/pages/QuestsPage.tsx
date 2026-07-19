import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Zap, Star, Heart, MessageCircle, Play, Share2,
  CheckCircle2, Clock, Gift, Trophy, Sparkles, Coins,
  ChevronRight, Crown, Flame, Diamond, Leaf, Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL);

interface Quest {
  id: number; key: string; reward: number; target: number;
  type: string; isActive: boolean; sortOrder: number;
  progress: number; completedAt: string | null; claimedAt: string | null;
}
interface CoinsData {
  id: number; userId: number; balance: number; totalEarned: number;
  titles: Array<{ title: string; earnedAt: string }>;
}

const QUEST_ICONS: Record<string, React.ReactNode> = {
  post: <Zap className="w-5 h-5" />,
  like: <Heart className="w-5 h-5" />,
  comment: <MessageCircle className="w-5 h-5" />,
  watch: <Play className="w-5 h-5" />,
  share: <Share2 className="w-5 h-5" />,
  login: <Star className="w-5 h-5" />,
};

const QUEST_GRADIENTS: Record<string, string> = {
  post: "from-violet-500/20 to-purple-500/10",
  like: "from-pink-500/20 to-rose-500/10",
  comment: "from-blue-500/20 to-cyan-500/10",
  watch: "from-emerald-500/20 to-teal-500/10",
  share: "from-amber-500/20 to-yellow-500/10",
  login: "from-orange-500/20 to-red-500/10",
};

const QUEST_GLOW: Record<string, string> = {
  post: "rgba(139,92,246,0.4)",
  like: "rgba(236,72,153,0.4)",
  comment: "rgba(59,130,246,0.4)",
  watch: "rgba(16,185,129,0.4)",
  share: "rgba(245,158,11,0.4)",
  login: "rgba(249,115,22,0.4)",
};

const TITLE_ICONS: Record<string, React.ReactNode> = {
  "🌱 Yangi": <Leaf className="w-4 h-4 text-emerald-400" />,
  "⭐ Faol": <Star className="w-4 h-4 text-yellow-400" />,
  "🔥 Qizg'in": <Flame className="w-4 h-4 text-orange-400" />,
  "💎 Olmosli": <Diamond className="w-4 h-4 text-cyan-400" />,
  "👑 Afsonaviy": <Crown className="w-4 h-4 text-amber-400" />,
};

function CoinCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = 30;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(prev.current + (diff * step) / steps));
      if (step >= steps) { clearInterval(interval); prev.current = value; }
    }, 16);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

export default function QuestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [coins, setCoins] = useState<CoinsData | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);
  const [coinBurst, setCoinBurst] = useState<{ key: string; reward: number } | null>(null);

  const fetchData = async () => {
    try {
      const [cRes, qRes] = await Promise.all([
        fetch(`${API}/api/gamification/balance`, { credentials: "include" }),
        fetch(`${API}/api/gamification/quests`, { credentials: "include" }),
      ]);
      if (cRes.ok) setCoins(await cRes.json());
      if (qRes.ok) setQuests(await qRes.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClaim = async (key: string) => {
    if (claiming) return;
    setClaiming(key);
    try {
      const res = await fetch(`${API}/api/gamification/quests/${key}/claim`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCoinBurst({ key, reward: data.reward });
        setJustClaimed(key);
        setTimeout(() => setCoinBurst(null), 2000);
        setTimeout(() => setJustClaimed(null), 3000);
        await fetchData();
      }
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  };

  const totalCompleted = quests.filter(q => q.completedAt).length;
  const totalClaimed = quests.filter(q => q.claimedAt).length;
  const totalReward = quests.reduce((s, q) => s + (q.claimedAt ? q.reward : 0), 0);
  const currentTitle = coins?.titles?.slice(-1)[0]?.title ?? "🌱 Yangi";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24 px-4 max-w-lg mx-auto pt-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">{t("quest.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("quest.subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* Coin card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl p-5 mb-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.12), rgba(249,115,22,0.1))", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 40px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <motion.div className="absolute inset-0 opacity-20"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)", backgroundSize: "200%" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{t("quest.balance")}</p>
            <div className="flex items-center gap-2">
              <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Coins className="w-7 h-7 text-yellow-400" />
              </motion.div>
              <span className="text-4xl font-black text-yellow-400" style={{ textShadow: "0 0 20px rgba(245,158,11,0.7)" }}>
                <CoinCounter value={coins?.balance ?? 0} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("quest.total_earned")}: {coins?.totalEarned ?? 0}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              {TITLE_ICONS[currentTitle] || <Star className="w-4 h-4 text-yellow-400" />}
              <span className="text-sm font-bold text-foreground">{currentTitle}</span>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {coins?.titles?.slice(-3).map((t2, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{t2.title}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{totalCompleted}/{quests.length} {t("quest.completed")}</span>
            <span>+{totalReward} {t("quest.coins")}</span>
          </div>
          <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #f59e0b, #f97316)" }}
              initial={{ width: 0 }}
              animate={{ width: `${quests.length > 0 ? (totalCompleted / quests.length) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
      </motion.div>

      {/* Quests */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-foreground">{t("quest.daily_quests")}</h2>
          <span className="ml-auto text-xs text-muted-foreground">{new Date().toLocaleDateString()}</span>
        </div>

        {quests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }}>
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            </motion.div>
            <p className="text-sm">{t("quest.no_quests")}</p>
          </div>
        )}

        {quests.map((quest, i) => {
          const isDone = !!quest.completedAt;
          const isClaimed = !!quest.claimedAt;
          const pct = Math.min((quest.progress / quest.target) * 100, 100);
          const gradient = QUEST_GRADIENTS[quest.type] ?? "from-violet-500/20 to-purple-500/10";
          const glow = QUEST_GLOW[quest.type] ?? "rgba(139,92,246,0.4)";

          return (
            <motion.div key={quest.key}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-2xl p-4 relative overflow-hidden border transition-all duration-300 ${
                isClaimed ? "border-yellow-500/30 bg-yellow-500/5" :
                isDone ? "border-emerald-500/40" : "border-border/40"
              } bg-gradient-to-br ${gradient}`}
              style={isDone && !isClaimed ? { boxShadow: `0 0 20px ${glow}` } : {}}>

              {/* Claimed shine */}
              {isClaimed && (
                <motion.div className="absolute inset-0 opacity-30"
                  animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)", transform: "skewX(-15deg)" }} />
              )}

              {/* Coin burst animation */}
              <AnimatePresence>
                {coinBurst?.key === quest.key && (
                  <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -40, scale: 1.5 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
                    className="absolute top-2 right-2 text-yellow-400 font-black text-lg pointer-events-none">
                    +{coinBurst.reward} 🪙
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isClaimed ? "bg-yellow-500/20 text-yellow-400" :
                  isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/60 text-muted-foreground"
                }`}>
                  {QUEST_ICONS[quest.type] ?? <Star className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{t(`quest.${quest.key}_title`)}</p>
                    {isClaimed && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                    {isDone && !isClaimed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t(`quest.${quest.key}_desc`)}</p>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-1">
                    <motion.div className={`h-full rounded-full ${isClaimed ? "bg-yellow-400" : isDone ? "bg-emerald-400" : "bg-violet-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{quest.progress}/{quest.target}</p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <Coins className="w-3.5 h-3.5" /> {quest.reward}
                  </div>
                  {isDone && !isClaimed ? (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleClaim(quest.key)}
                      disabled={claiming === quest.key}
                      className="px-3 py-1 rounded-full text-xs font-bold text-white transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }}>
                      {claiming === quest.key ? "..." : t("quest.claim")}
                    </motion.button>
                  ) : isClaimed ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20">
                      {t("quest.claimed")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t("quest.in_progress")}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Leaderboard hint */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="mt-6 rounded-2xl p-4 border border-border/30 bg-muted/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("quest.streak_tip_title")}</p>
          <p className="text-xs text-muted-foreground">{t("quest.streak_tip_desc")}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </motion.div>
    </div>
  );
}
