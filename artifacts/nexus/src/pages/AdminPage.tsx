import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Users, FileText, BarChart3, Cpu, TrendingUp,
  TrendingDown, Activity, AlertTriangle, CheckCircle2, XCircle,
  UserX, Eye, RefreshCw, Zap
} from "lucide-react";
import {
  useGetAdminDashboard, useAdminListUsers, useAdminListContent,
  useGetAdminAnalytics, useGetAiSystemStatus, useSuspendUser,
  getAdminListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

type AdminTab = "dashboard" | "users" | "content" | "analytics" | "ai";

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "content", label: "Content", icon: FileText },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "ai", label: "AI System", icon: Cpu },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { data: dash } = useGetAdminDashboard();
  const { data: users = [] } = useAdminListUsers();
  const { data: content = [] } = useAdminListContent();
  const { data: analytics } = useGetAdminAnalytics({ period: "7d" });
  const { data: aiStatus } = useGetAiSystemStatus();
  const suspend = useSuspendUser();
  const qc = useQueryClient();

  const handleSuspend = (id: number, isSuspended: boolean) => {
    suspend.mutate({ id, data: { suspend: !isSuspended } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() }),
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-border bg-sidebar flex flex-col py-5 px-3">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-bold text-foreground">Admin Panel</span>
        </div>
        <nav className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                tab === id ? "bg-accent/15 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "dashboard" && dash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Platform Overview</h2>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: dash.totalUsers.toLocaleString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
                { label: "Total Posts", value: dash.totalPosts.toLocaleString(), icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10" },
                { label: "Active Now", value: dash.activeNow.toLocaleString(), icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "AI Accuracy", value: `${dash.aiAccuracy}%`, icon: Cpu, color: "text-violet-400", bg: "bg-violet-400/10" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +{dash.dailyGrowth}% today
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Reels", value: dash.totalReels },
                { label: "Stories", value: dash.totalStories },
                { label: "Communities", value: dash.totalGroups },
                { label: "Flagged Content", value: dash.flaggedContent, alert: true },
              ].map((s, i) => (
                <div key={s.label} className={`bg-card border rounded-2xl p-4 ${s.alert ? "border-destructive/30" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.alert ? "text-destructive" : "text-foreground"}`}>{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Top regions */}
            {dash.topRegions && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground text-sm mb-4">Users by Region</h3>
                <div className="space-y-3">
                  {dash.topRegions.map((r) => {
                    const pct = Math.round((r.users / dash.totalUsers) * 100);
                    return (
                      <div key={r.region}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium">{r.region}</span>
                          <span className="text-muted-foreground">{r.users.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">User Management</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["User", "Status", "Verified", "Posts", "Followers", "Joined", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === "active" ? "bg-emerald-400/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                        }`}>
                          {user.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.isVerified ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.postsCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.followersCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSuspend(user.id, user.status === "suspended")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            user.status === "suspended"
                              ? "bg-emerald-400/15 text-emerald-400 hover:bg-emerald-400/25"
                              : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          {user.status === "suspended" ? "Restore" : "Suspend"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === "content" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Content Moderation</h2>
            <div className="space-y-3">
              {content.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-card border rounded-2xl p-4 flex gap-4 ${item.isFlagged ? "border-destructive/30" : "border-border"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{item.authorName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">{item.type}</span>
                      {item.isFlagged && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.preview}</p>
                    {item.flagReason && <p className="text-xs text-destructive mt-1">{item.flagReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs hover:bg-card transition-colors">
                        <Eye className="w-3 h-3" /> Review
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs hover:bg-destructive/25 transition-colors">
                        <XCircle className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {content.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">All content is clean</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "analytics" && analytics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <h2 className="text-xl font-bold text-foreground">Platform Analytics (7 days)</h2>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> User Growth
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.userGrowth}>
                  <defs>
                    <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(252 100% 68%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(252 100% 68%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 30% 15%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222 40% 8%)", border: "1px solid hsl(220 30% 14%)", borderRadius: 12, color: "hsl(210 40% 95%)" }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(252 100% 68%)" fill="url(#ugGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Content Volume
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.contentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 30% 15%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222 40% 8%)", border: "1px solid hsl(220 30% 14%)", borderRadius: 12, color: "hsl(210 40% 95%)" }} />
                  <Bar dataKey="posts" fill="hsl(252 100% 68%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reels" fill="hsl(280 90% 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stories" fill="hsl(168 80% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Avg Engagement Rate</span>
                <span className="text-2xl font-bold aurora-text">{analytics.engagementRate}%</span>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "ai" && aiStatus && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">AI System Status</h2>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 text-emerald-400 text-sm font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {aiStatus.selfImprovementEnabled ? "Self-Improving" : "Stable"}
              </span>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Version", value: aiStatus.version, icon: Zap, color: "text-primary" },
                { label: "Accuracy", value: `${aiStatus.accuracy}%`, icon: Activity, color: "text-emerald-400" },
                { label: "Models Running", value: aiStatus.modelsRunning.toString(), icon: Cpu, color: "text-cyan-400" },
                { label: "Last Improved", value: new Date(aiStatus.lastImproved).toLocaleTimeString(), icon: RefreshCw, color: "text-violet-400" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-base font-bold text-foreground">{m.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Accuracy chart */}
            {aiStatus.metricsHistory && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Accuracy Over Time</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={aiStatus.metricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 30% 15%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} tickLine={false} />
                    <YAxis domain={[94, 100]} tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(222 40% 8%)", border: "1px solid hsl(220 30% 14%)", borderRadius: 12, color: "hsl(210 40% 95%)" }} />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(168 80% 50%)" strokeWidth={2.5} dot={{ fill: "hsl(168 80% 50%)", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                AI Self-Improvement Recommendations
              </h3>
              <div className="space-y-3">
                {aiStatus.recommendations?.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                      rec.impact === "high" ? "bg-destructive/20 text-destructive"
                      : rec.impact === "medium" ? "bg-amber-400/20 text-amber-400"
                      : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {rec.impact}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rec.module}</p>
                      <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                    </div>
                    <button className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                      Apply
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
