import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
  Eye, Heart, Users, TrendingUp, BarChart2, Star, Play,
  MessageCircle, Flame, Calendar, Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ─── Types ─────────────────────────────────────────────── */
interface DayData {
  date: string;
  postViews: number;
  reelViews: number;
  likes: number;
  newFollowers: number;
  followers: number;
}

interface TopPost {
  id: number;
  content: string | null;
  likesCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  createdAt: string;
}

interface TopReel {
  id: number;
  caption: string | null;
  viewsCount: number | null;
  likesCount: number | null;
  createdAt: string;
}

interface AnalyticsSummary {
  totalViews: number;
  totalLikes: number;
  totalNewFollowers: number;
  currentFollowers: number;
  totalContent: number;
  engagementRate: number;
}

interface AnalyticsData {
  timeline: DayData[];
  topPosts: TopPost[];
  topReels: TopReel[];
  summary: AnalyticsSummary;
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/* ─── CSV Export ────────────────────────────────────────── */
function exportAnalyticsCSV(timeline: DayData[], summary: AnalyticsSummary, period: number | "all") {
  const headers = ["Date", "Post Views", "Reel Views", "Total Views", "Likes", "New Followers", "Cumulative Followers"];
  const rows = timeline.map(d => [
    d.date,
    d.postViews,
    d.reelViews,
    d.postViews + d.reelViews,
    d.likes,
    d.newFollowers,
    d.followers,
  ]);

  // Summary row
  const totalViews = timeline.reduce((s, d) => s + d.postViews + d.reelViews, 0);
  const totalPostViews = timeline.reduce((s, d) => s + d.postViews, 0);
  const totalReelViews = timeline.reduce((s, d) => s + d.reelViews, 0);
  const totalLikes = timeline.reduce((s, d) => s + d.likes, 0);
  const totalNewFollowers = timeline.reduce((s, d) => s + d.newFollowers, 0);
  const periodLabel = period === "all" ? "all-time" : `${period}d`;
  rows.push([
    `TOTAL (${periodLabel})`,
    totalPostViews,
    totalReelViews,
    totalViews,
    totalLikes,
    totalNewFollowers,
    summary.currentFollowers,
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Custom Tooltip ────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm px-3 py-2 text-xs space-y-1 shadow-xl">
      <p className="font-bold text-white/70 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/80">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, glow, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; color: string; glow: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className="rounded-2xl p-3 relative overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${glow.replace("0.5", "0.12")}, ${glow.replace("0.5", "0.04")})`,
        border: `1px solid ${glow.replace("0.5", "0.22")}`,
      }}
    >
      <motion.div
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, delay }}
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(circle at 20% 20%, ${glow.replace("0.5", "0.18")}, transparent 65%)` }}
      />
      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center shrink-0"
          style={{ boxShadow: `0 0 10px ${glow.replace("0.5", "0.3")}` }}
        >
          <Icon className="w-4 h-4" style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} />
        </div>
        <div>
          <p className="text-base font-black leading-tight" style={{ color }}>{value}</p>
          <p className="text-[10px] text-muted-foreground font-semibold leading-tight">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CreatorAnalyticsDashboard({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<7 | 30 | "all">(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = (import.meta.env.VITE_API_BASE_URL || "");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const periodParam = period === "all" ? "all" : period;
    fetch(`${base}/api/users/${userId}/creator-analytics?period=${periodParam}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [userId, period]);

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl bg-muted/30 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
        <p>{error ?? t("profile.no_content")}</p>
      </div>
    );
  }

  const { timeline, topPosts, topReels, summary } = data;
  const totalContent = summary.totalContent;

  // Prepare chart data — thin out for 30-day (show every 3rd label)
  const chartData = timeline.map(d => ({
    ...d,
    label: shortDay(d.date),
    views: d.postViews + d.reelViews,
  }));

  const tickInterval = period === "all" ? Math.max(1, Math.floor(timeline.length / 6)) : period === 30 ? 4 : 1;

  /* ── No content state (never posted anything) ── */
  if (totalContent === 0 && summary.totalViews === 0 && summary.currentFollowers === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }}>
          <BarChart2 className="w-7 h-7 mx-auto mb-2 opacity-25" />
        </motion.div>
        <p className="text-sm">{t("profile.no_content")}</p>
      </div>
    );
  }

  /* ── Zero-activity state for this period ── */
  const periodActivityTotal = timeline.reduce(
    (sum, d) => sum + d.postViews + d.reelViews + d.likes + d.newFollowers,
    0,
  );
  const isZeroActivity = periodActivityTotal === 0;
  const isTimedPeriod = period !== "all";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-6">

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          {([7, 30, "all"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                period === p
                  ? "bg-violet-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all"
                ? t("analytics.all_time", { defaultValue: "All" })
                : `${p}${t("analytics.days", { defaultValue: "d" })}`}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {period === "all"
            ? t("analytics.period_all_time", { defaultValue: "All time" })
            : t("analytics.period_label", { defaultValue: "Last {{n}} days", n: period })}
        </span>
        <button
          onClick={() => exportAnalyticsCSV(timeline, summary, period)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-violet-500/50 hover:bg-violet-500/10 transition-all"
          title={t("analytics.export_csv", { defaultValue: "Export CSV" })}
        >
          <Download className="w-3 h-3" />
          {t("analytics.export_csv", { defaultValue: "Export CSV" })}
        </button>
      </div>

      {/* Zero-activity empty state */}
      {isZeroActivity && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 p-5 text-center"
          style={{ background: "linear-gradient(145deg, rgba(124,58,237,0.06), rgba(99,102,241,0.02))" }}
        >
          <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }}>
            <BarChart2 className="w-7 h-7 mx-auto mb-2 opacity-30 text-violet-400" />
          </motion.div>
          <p className="text-sm font-semibold text-foreground/70">
            {isTimedPeriod
              ? t("analytics.no_activity_period", {
                  defaultValue: "No activity in the last {{n}} days",
                  n: period,
                })
              : t("analytics.no_activity_all", { defaultValue: "No activity yet" })}
          </p>
          {isTimedPeriod && (
            <button
              onClick={() => setPeriod("all")}
              className="mt-2 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
            >
              {t("analytics.try_all_time", { defaultValue: "Try switching to all-time" })}
            </button>
          )}
        </motion.div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Eye} label={t("profile.total_views")} value={fmt(summary.totalViews)} color="#c084fc" glow="rgba(192,132,252,0.5)" delay={0} />
        <StatCard icon={Heart} label={t("profile.total_likes")} value={fmt(summary.totalLikes)} color="#f472b6" glow="rgba(244,114,182,0.5)" delay={0.06} />
        <StatCard icon={Users} label={t("analytics.new_followers", { defaultValue: "New followers" })} value={fmt(summary.totalNewFollowers)} color="#34d399" glow="rgba(52,211,153,0.5)" delay={0.12} />
        <StatCard icon={TrendingUp} label={t("analytics.engagement_rate", { defaultValue: "Engagement" })} value={`${summary.engagementRate}%`} color="#fbbf24" glow="rgba(251,191,36,0.5)" delay={0.18} />
      </div>

      {/* Views area chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/8 p-3"
        style={{ background: "linear-gradient(145deg, rgba(124,58,237,0.06), rgba(99,102,241,0.02))" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold text-foreground">{t("analytics.views_chart", { defaultValue: "Views over time" })}</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="gradReel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} interval={tickInterval} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="postViews" name={t("analytics.post_views", { defaultValue: "Post views" })} stroke="#7c3aed" fill="url(#gradPost)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="reelViews" name={t("analytics.reel_views", { defaultValue: "Reel views" })} stroke="#06b6d4" fill="url(#gradReel)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Follower growth line chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="rounded-2xl border border-white/8 p-3"
        style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.06), rgba(52,211,153,0.02))" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-foreground">{t("analytics.follower_growth", { defaultValue: "Follower growth" })}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">{fmt(summary.currentFollowers)} {t("analytics.total", { defaultValue: "total" })}</span>
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} interval={tickInterval} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="followers" name={t("analytics.followers", { defaultValue: "Followers" })} stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Daily engagement bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl border border-white/8 p-3"
        style={{ background: "linear-gradient(145deg, rgba(251,191,36,0.06), rgba(249,115,22,0.02))" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-foreground">{t("analytics.daily_likes", { defaultValue: "Daily likes" })}</span>
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} interval={tickInterval} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="likes" name={t("profile.total_likes")} fill="#fbbf24" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top performing content */}
      {(topPosts.length > 0 || topReels.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="rounded-2xl border border-white/8 p-3 space-y-2"
          style={{ background: "linear-gradient(145deg, rgba(236,72,153,0.06), rgba(244,114,182,0.02))" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs font-bold text-foreground">{t("analytics.top_content", { defaultValue: "Top content" })}</span>
          </div>

          {topPosts.slice(0, 3).map((post, i) => (
            <div key={post.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground/85 truncate font-medium">{post.content || "—"}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-pink-400" />{post.likesCount ?? 0}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5 text-blue-400" />{post.commentsCount ?? 0}</span>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">Post</span>
            </div>
          ))}

          {topReels.slice(0, 3).map((reel, i) => (
            <div key={reel.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground/85 truncate font-medium">{reel.caption || "Reel"}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 text-violet-400" />{fmt(reel.viewsCount ?? 0)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-pink-400" />{reel.likesCount ?? 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
                <Play className="w-2.5 h-2.5" />Reel
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
