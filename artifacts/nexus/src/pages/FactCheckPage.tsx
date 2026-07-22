import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ShieldX, AlertTriangle, HelpCircle, Trophy, Search, CheckCircle2, XCircle, Star, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = "";

interface CredibilityEntry {
  id: number; score: number; totalChecked: number; trueCount: number;
  userId: number; username: string; displayName: string; avatar: string | null;
}

const VERDICT_CONFIG = {
  true: { icon: ShieldCheck, color: "#10b981", bg: "from-emerald-500/20 to-teal-500/10", label: "To'g'ri", badge: "✅" },
  false: { icon: ShieldX, color: "#ef4444", bg: "from-red-500/20 to-rose-500/10", label: "Noto'g'ri", badge: "❌" },
  misleading: { icon: AlertTriangle, color: "#f59e0b", bg: "from-amber-500/20 to-yellow-500/10", label: "Chalg'ituvchi", badge: "⚠️" },
  unverifiable: { icon: HelpCircle, color: "#94a3b8", bg: "from-slate-500/20 to-gray-500/10", label: "Tekshirib bo'lmaydi", badge: "❓" },
};

function CredibilityBadge({ score }: { score: number }) {
  const { t } = useTranslation();
  const level = score >= 80 ? { label: t("factcheck.trusted"), color: "#10b981", icon: "🏆" }
    : score >= 60 ? { label: t("factcheck.active"), color: "#3b82f6", icon: "⭐" }
    : score >= 40 ? { label: t("factcheck.average"), color: "#f59e0b", icon: "📊" }
    : { label: t("factcheck.low"), color: "#ef4444", icon: "⚡" };

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs" style={{ borderColor: `${level.color}40`, background: `${level.color}15`, color: level.color }}>
      {level.icon} {level.label}
    </div>
  );
}

function FactCheckResult({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const id = parseInt(postId);
    if (isNaN(id)) return;
    setLoading(true);
    fetch(`${API}/api/factcheck/${id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setResult(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  async function check() {
    const id = parseInt(postId);
    if (isNaN(id)) return;
    setChecking(true);
    try {
      const res = await fetch(`${API}/api/factcheck/${id}`, { method: "POST", credentials: "include" });
      if (res.ok) setResult(await res.json());
    } finally { setChecking(false); }
  }

  const cfg = result ? VERDICT_CONFIG[result.verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.unverifiable : null;
  const CfgIcon = cfg?.icon ?? null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-4">Post #{postId} tekshiruvi</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
        ) : result && cfg && CfgIcon ? (
          <div className={`p-4 rounded-xl bg-gradient-to-r ${cfg.bg} border border-white/10`}>
            <div className="flex items-center gap-3 mb-3">
              <CfgIcon className="w-8 h-8" style={{ color: cfg.color }} />
              <div>
                <div className="text-white font-bold text-lg">{cfg.badge} {cfg.label}</div>
                <div className="text-white/50 text-xs">Ishonch: {Math.round((result.confidence ?? 0) * 100)}%</div>
              </div>
            </div>
            {result.explanation && <p className="text-white/80 text-sm">{result.explanation}</p>}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/50 text-sm mb-4">{t("factcheck.not_checked")}</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={check} disabled={checking}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("factcheck.ai_checking")}</> : <><ShieldCheck className="w-4 h-4" /> {t("factcheck.ai_check")}</>}
            </motion.button>
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">
          {t("factcheck.close")}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function FactCheckPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<CredibilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [postId, setPostId] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [myScore, setMyScore] = useState<CredibilityEntry | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/credibility/leaderboard`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
      user ? fetch(`${API}/api/credibility/${user.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    ]).then(([lb, me]) => {
      setLeaderboard(Array.isArray(lb) ? lb : []);
      setMyScore(me);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="h-full flex flex-col bg-[#0a0604]">
      <AnimatePresence>
        {showResult && <FactCheckResult postId={postId} onClose={() => setShowResult(false)} />}
      </AnimatePresence>

      <div className="p-4 pb-2">
        <h1 className="text-white font-bold text-xl flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> {t("factcheck.title")}
        </h1>
        <p className="text-white/40 text-xs mb-4">{t("factcheck.subtitle")}</p>

        {myScore && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-xs mb-1">{t("factcheck.my_score")}</div>
                <div className="text-4xl font-bold text-white">{Math.round(myScore.score)}<span className="text-white/30 text-lg">/100</span></div>
                <div className="mt-1"><CredibilityBadge score={myScore.score} /></div>
              </div>
              <div className="text-right space-y-2">
                <div className="flex items-center gap-2 justify-end">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/70 text-sm">{myScore.trueCount} {t("factcheck.correct")}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-white/70 text-sm">{(myScore.totalChecked - myScore.trueCount)} {t("factcheck.incorrect")}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }} animate={{ width: `${myScore.score}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input value={postId} onChange={e => setPostId(e.target.value)} onKeyDown={e => e.key === "Enter" && postId && setShowResult(true)}
            placeholder={t("factcheck.post_ph")}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-emerald-500/60" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => postId && setShowResult(true)} disabled={!postId}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors disabled:opacity-40 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> {t("factcheck.check_btn")}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-semibold text-sm">{t("factcheck.leaderboard")}</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-400/20 mb-3" />
            <p className="text-white/30 text-sm">{t("factcheck.no_checked")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
              const barColor = entry.score >= 80 ? "#10b981" : entry.score >= 60 ? "#3b82f6" : entry.score >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors">
                  <span className="text-xl w-8 text-center flex-shrink-0">{medal}</span>
                  <div className="relative flex-shrink-0">
                    {entry.avatar ? <img loading="lazy" decoding="async" src={entry.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                        {entry.displayName?.[0]}
                      </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">{entry.displayName}</span>
                      <CredibilityBadge score={entry.score} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${entry.score}%`, background: barColor }} />
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: barColor }}>{Math.round(entry.score)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
