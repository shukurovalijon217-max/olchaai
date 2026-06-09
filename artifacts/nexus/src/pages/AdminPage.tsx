import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Users, FileText, BarChart3, Cpu, TrendingUp,
  TrendingDown, Activity, AlertTriangle, CheckCircle2, XCircle,
  UserX, Eye, RefreshCw, Zap, ShieldAlert, Trash2, ThumbsUp,
  RotateCcw, BadgeCheck, Crown, DollarSign, Bell, Settings,
  Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Send,
  ToggleLeft, ToggleRight, Lock, Unlock, Globe, Megaphone
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

type AdminTab = "dashboard" | "users" | "content" | "analytics" | "ai" | "safeguard" | "finance" | "notify" | "settings";

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "users", label: "Foydalanuvchilar", icon: Users },
  { id: "content", label: "Kontent", icon: FileText },
  { id: "analytics", label: "Tahlil", icon: TrendingUp },
  { id: "finance", label: "Moliya", icon: DollarSign },
  { id: "notify", label: "Bildirishnoma", icon: Bell },
  { id: "ai", label: "AI Tizim", icon: Cpu },
  { id: "safeguard", label: "SafeGuard AI", icon: ShieldAlert },
  { id: "settings", label: "Sozlamalar", icon: Settings },
];

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const VERDICT_COLOR: Record<string, string> = {
  clean: "bg-emerald-400/15 text-emerald-400",
  suspicious: "bg-amber-400/15 text-amber-400",
  violation: "bg-destructive/15 text-destructive",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-400",
  approved: "bg-emerald-400/15 text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  escalated: "bg-violet-400/15 text-violet-400",
};

function SafeGuardTab() {
  const [queueStatus, setQueueStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [scanText, setScanText] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [q, s] = await Promise.all([
        fetch(`${API}/api/admin/moderation/queue?status=${queueStatus}&limit=50`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/api/admin/moderation/stats`, { credentials: "include" }).then(r => r.json()),
      ]);
      setItems(q.items ?? []);
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const resolve = async (id: number, action: string, note?: string) => {
    setActing(id);
    await fetch(`${API}/api/admin/moderation/${id}/resolve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action, note }),
    });
    setActing(null); load();
  };

  const deleteContent = async (id: number) => {
    setActing(id);
    await fetch(`${API}/api/admin/moderation/${id}/delete-content`, { method: "DELETE", credentials: "include" });
    setActing(null); load();
  };

  const rescan = async (id: number) => {
    setActing(id);
    await fetch(`${API}/api/admin/moderation/${id}/rescan`, { method: "POST", credentials: "include" });
    setActing(null); load();
  };

  const doScan = async () => {
    if (!scanText.trim()) return;
    setScanning(true);
    const r = await fetch(`${API}/api/moderation/scan`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ text: scanText }),
    });
    setScanResult(await r.json());
    setScanning(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">SafeGuard AI</h2>
            <p className="text-xs text-muted-foreground">Kontent moderatsiya tizimi</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Jami", value: stats.total, color: "text-foreground" },
            { label: "Kutmoqda", value: stats.pending, color: "text-amber-400" },
            { label: "Tasdiqlangan", value: stats.approved, color: "text-emerald-400" },
            { label: "Rad etilgan", value: stats.rejected, color: "text-destructive" },
            { label: "Auto bloklangan", value: stats.autoBlocked, color: "text-red-400" },
            { label: "Shikoyatlar", value: stats.totalReports, color: "text-violet-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> AI Skaner — Kontent sinash
        </h3>
        <div className="flex gap-2">
          <textarea
            value={scanText} onChange={e => setScanText(e.target.value)} rows={2}
            placeholder="Tekshirmoqchi bo'lgan matnni kiriting..."
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={doScan} disabled={scanning || !scanText.trim()}
            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5">
            {scanning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
            Skanla
          </button>
        </div>
        {scanResult && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-muted/50 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${VERDICT_COLOR[scanResult.verdict] ?? "bg-muted text-muted-foreground"}`}>
                {scanResult.verdict === "clean" ? "✓ Toza" : scanResult.verdict === "suspicious" ? "⚠ Shubhali" : "✗ Qoidabuzarlik"}
              </span>
              <span className="text-xs text-muted-foreground">Xavf darajasi: <strong className="text-foreground">{Math.round(scanResult.score * 100)}%</strong></span>
              {scanResult.autoBlock && <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-xs font-bold">AUTO BLOKLANGAN</span>}
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-1">
        {(["pending", "approved", "rejected", "all"] as const).map(s => (
          <button key={s} onClick={() => { setQueueStatus(s); setTimeout(load, 50); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${queueStatus === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {s === "pending" ? "Kutmoqda" : s === "approved" ? "Tasdiqlangan" : s === "rejected" ? "Rad etilgan" : "Barchasi"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm">Navbat bo'sh</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-card border rounded-2xl p-4 space-y-3 ${item.aiVerdict === "violation" ? "border-destructive/30" : item.aiVerdict === "suspicious" ? "border-amber-400/30" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground font-medium">{item.contentType} #{item.contentId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${VERDICT_COLOR[item.aiVerdict] ?? ""}`}>AI: {item.aiVerdict}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[item.status] ?? ""}`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 break-all">{item.contentText || "(matn yo'q)"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-foreground">{Math.round(item.aiScore * 100)}<span className="text-sm font-normal text-muted-foreground">%</span></p>
                  <p className="text-xs text-muted-foreground">xavf</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(item.aiScore * 100)}%` }} transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${item.aiScore >= 0.7 ? "bg-destructive" : item.aiScore >= 0.35 ? "bg-amber-400" : "bg-emerald-400"}`} />
              </div>
              {item.status === "pending" && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => resolve(item.id, "approved")} disabled={acting === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/25 transition disabled:opacity-50">
                    <ThumbsUp className="w-3.5 h-3.5" /> Tasdiqlash
                  </button>
                  <button onClick={() => resolve(item.id, "rejected", "Admin tomonidan rad etildi")} disabled={acting === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 transition disabled:opacity-50">
                    <XCircle className="w-3.5 h-3.5" /> Rad etish
                  </button>
                  <button onClick={() => deleteContent(item.id)} disabled={acting === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 text-xs font-semibold hover:bg-red-900/50 transition disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> O'chirish
                  </button>
                  <button onClick={() => rescan(item.id)} disabled={acting === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition disabled:opacity-50 ml-auto">
                    <RotateCcw className="w-3.5 h-3.5" /> Qayta skanla
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function FinanceTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/finance`, { credentials: "include" })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const fmt = (v: number) => `$${(v / 100).toFixed(2)}`;
  const TX_TYPE_ICON: Record<string, React.ElementType> = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };
  const TX_TYPE_COLOR: Record<string, string> = { deposit: "text-emerald-400", withdrawal: "text-destructive", transfer: "text-primary" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-400/15 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Moliyaviy boshqaruv</h2>
          <p className="text-xs text-muted-foreground">Barcha hamyonlar va tranzaksiyalar</p>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Jami balans", value: fmt(data.totals?.totalAll ?? 0), icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
            { label: "Jami depozit", value: fmt(data.stats.totalDeposited), icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Jami yechilgan", value: fmt(data.stats.totalWithdrawn), icon: ArrowUpRight, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Tranzaksiyalar", value: data.stats.totalTransactions, icon: ArrowLeftRight, color: "text-cyan-400", bg: "bg-cyan-400/10" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Top wallets */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Hamyonlar</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Foydalanuvchi", "Balans", "Daromad", "Reklama", "Jami"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.wallets ?? []).slice(0, 15).map((w: any, i: number) => (
              <motion.tr key={w.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{w.displayName || "—"}</p>
                  <p className="text-xs text-muted-foreground">@{w.username}</p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-primary">{fmt(w.balance)}</td>
                <td className="px-4 py-3 text-sm text-emerald-400">{fmt(w.earningsBalance)}</td>
                <td className="px-4 py-3 text-sm text-cyan-400">{fmt(w.adRevenueBalance)}</td>
                <td className="px-4 py-3 text-sm font-bold text-foreground">{fmt(w.balance + w.earningsBalance + w.adRevenueBalance)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {(data?.wallets ?? []).length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">Hamyon ma'lumotlari yo'q</div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-foreground">So'nggi Tranzaksiyalar</h3>
        </div>
        <div className="divide-y divide-border">
          {(data?.recentTransactions ?? []).map((tx: any, i: number) => {
            const Icon = TX_TYPE_ICON[tx.type] ?? ArrowLeftRight;
            return (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.amount > 0 ? "bg-emerald-400/10" : "bg-destructive/10"}`}>
                  <Icon className={`w-4 h-4 ${TX_TYPE_COLOR[tx.type] ?? "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                  <p className="text-xs text-muted-foreground truncate">{tx.description || tx.referenceId || "—"}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{fmt(Math.abs(tx.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("uz-UZ")}</p>
                </div>
              </motion.div>
            );
          })}
          {(data?.recentTransactions ?? []).length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">Tranzaksiya yo'q</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NotifyTab() {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("system");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/api/admin/notify/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, type }),
      });
      const data = await r.json();
      setResult(data);
      if (data.ok) setMessage("");
    } catch {
      setResult({ ok: false, error: "Tarmoq xatosi" });
    } finally {
      setSending(false);
    }
  };

  const TYPES = [
    { id: "system", label: "Tizim xabari", icon: Globe },
    { id: "announcement", label: "E'lon", icon: Megaphone },
    { id: "promotion", label: "Taklif/Promo", icon: Crown },
    { id: "alert", label: "Ogohlantirish", icon: AlertTriangle },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Bildirishnoma yuborish</h2>
          <p className="text-xs text-muted-foreground">Barcha foydalanuvchilarga yuboring</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {/* Type selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Xabar turi</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setType(id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  type === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Xabar matni</p>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)} rows={4}
            placeholder="Foydalanuvchilarga yuboriladigan xabarni yozing..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">{message.length}/500</p>
          </div>
        </div>

        {/* Send button */}
        <button onClick={send} disabled={sending || !message.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50">
          {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Yuborilmoqda..." : "Barcha foydalanuvchilarga yuborish"}
        </button>

        {/* Result */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4 rounded-xl ${result.ok ? "bg-emerald-400/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            {result.ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm font-medium">
              {result.ok ? `✓ ${result.sent} foydalanuvchiga muvaffaqiyatli yuborildi!` : result.error}
            </p>
          </motion.div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Broadcast xabari barcha aktiv foydalanuvchilarning bildirishnomalar bo'limiga yuboriladi. 
          Xabarni yuborishdan oldin ikki marta tekshiring.
        </p>
      </div>
    </motion.div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/settings`, { credentials: "include" })
      .then(r => r.json()).then(setSettings);
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch(`${API}/api/admin/settings`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(settings),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!settings) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const Toggle = ({ field, label, desc }: { field: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => setSettings((s: any) => ({ ...s, [field]: !s[field] }))}
        className={`relative w-11 h-6 rounded-full transition-colors ${settings[field] ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[field] ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Platform Sozlamalari</h2>
            <p className="text-xs text-muted-foreground">Asosiy tizim sozlamalari</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            saved ? "bg-emerald-400/15 text-emerald-400" : "bg-primary text-primary-foreground hover:opacity-90"
          } disabled:opacity-50`}>
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            saved ? <CheckCircle2 className="w-4 h-4" /> : null}
          {saving ? "Saqlanmoqda..." : saved ? "Saqlandi!" : "Saqlash"}
        </button>
      </div>

      {/* Platform info */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Platforma Ma'lumotlari
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Nomi", key: "platform" },
            { label: "Versiya", key: "version" },
          ].map(({ label, key }) => (
            <div key={key}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <input value={settings[key] ?? ""} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" /> Tizim Nazorati
        </h3>
        <Toggle field="maintenanceMode" label="Texnik tanaffus rejimi" desc="Yoqilsa foydalanuvchilar kirа olmaydi" />
        <Toggle field="registrationOpen" label="Ro'yxatdan o'tish ochiq" desc="Yangi foydalanuvchilar qo'shila oladi" />
        <Toggle field="contentModerationEnabled" label="AI Moderatsiya" desc="SafeGuard AI avtomatik tekshiradi" />
        <Toggle field="premiumEnabled" label="Premium obuna" desc="Foydalanuvchilar premium sotib ola oladi" />
        <Toggle field="adsEnabled" label="Reklama tizimi" desc="Ad revenue funksionalligi" />
      </div>

      {/* Limits */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" /> Limitlar
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Max post uzunligi (belgi)", key: "maxPostLength" },
            { label: "Max fayl hajmi (MB)", key: "maxFileSize" },
            { label: "AI moderatsiya chegarasi (%)", key: "aiModerationThreshold", scale: 100 },
          ].map(({ label, key, scale }) => (
            <div key={key}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <input
                type="number"
                value={scale ? Math.round((settings[key] ?? 0) * scale) : (settings[key] ?? 0)}
                onChange={e => setSettings((s: any) => ({ ...s, [key]: scale ? Number(e.target.value) / scale : Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      {settings.maintenanceMode && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">Texnik tanaffus rejimi yoqilgan!</p>
            <p className="text-xs text-muted-foreground mt-1">Hozir foydalanuvchilar platformaga kira olmayapti. Tugagach o'chirishni unutmang.</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { data: dash } = useGetAdminDashboard();
  const { data: users = [], refetch: refetchUsers } = useAdminListUsers();
  const { data: content = [], refetch: refetchContent } = useAdminListContent();
  const { data: analytics } = useGetAdminAnalytics({ period: "7d" });
  const { data: aiStatus } = useGetAiSystemStatus();
  const suspend = useSuspendUser();
  const qc = useQueryClient();

  const handleSuspend = (id: number, isSuspended: boolean) => {
    suspend.mutate({ id, data: { suspend: !isSuspended } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() }),
    });
  };

  const handleVerify = async (id: number) => {
    await fetch(`${API}/api/admin/users/${id}/verify`, { method: "PATCH", credentials: "include" });
    qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
  };

  const handleToggleAdmin = async (id: number) => {
    await fetch(`${API}/api/admin/users/${id}/toggle-admin`, { method: "PATCH", credentials: "include" });
    qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
  };

  const handleDeletePost = async (id: number) => {
    await fetch(`${API}/api/admin/posts/${id}`, { method: "DELETE", credentials: "include" });
    refetchContent();
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
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                tab === id ? "bg-accent/15 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">

        {/* DASHBOARD */}
        {tab === "dashboard" && dash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Platform Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: dash.totalUsers.toLocaleString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
                { label: "Total Posts", value: dash.totalPosts.toLocaleString(), icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10" },
                { label: "Active Now", value: dash.activeNow.toLocaleString(), icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "AI Accuracy", value: `${dash.aiAccuracy}%`, icon: Cpu, color: "text-violet-400", bg: "bg-violet-400/10" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +{dash.dailyGrowth}% bugun
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Reels", value: dash.totalReels },
                { label: "Stories", value: dash.totalStories },
                { label: "Jamoalar", value: dash.totalGroups },
                { label: "Flaglangan kontent", value: dash.flaggedContent, alert: true },
              ].map((s) => (
                <div key={s.label} className={`bg-card border rounded-2xl p-4 ${s.alert ? "border-destructive/30" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.alert ? "text-destructive" : "text-foreground"}`}>{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            {dash.topRegions && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground text-sm mb-4">Mintaqalar bo'yicha foydalanuvchilar</h3>
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
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.2 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Foydalanuvchilarni Boshqarish</h2>
            <div className="bg-card border border-border rounded-2xl overflow-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Foydalanuvchi", "Status", "Verified", "Admin", "Qo'shilgan", "Amallar"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                            {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                            {user.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
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
                      <td className="px-4 py-3 text-sm">
                        <span className={user.isVerified ? "text-primary font-semibold" : "text-muted-foreground"}>
                          {user.isVerified ? "✓ Ha" : "Yo'q"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={user.isAdmin ? "text-amber-400 font-semibold" : "text-muted-foreground"}>
                          {user.isAdmin ? "✓ Ha" : "Yo'q"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("uz-UZ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => handleSuspend(user.id, user.status === "suspended")}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              user.status === "suspended"
                                ? "bg-emerald-400/15 text-emerald-400 hover:bg-emerald-400/25"
                                : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                            }`}>
                            <UserX className="w-3 h-3" />
                            {user.status === "suspended" ? "Tiklash" : "Bloklash"}
                          </button>
                          <button onClick={() => handleVerify(user.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              user.isVerified ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}>
                            <BadgeCheck className="w-3 h-3" />
                            {user.isVerified ? "Unverify" : "Verify"}
                          </button>
                          <button onClick={() => handleToggleAdmin(user.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              user.isAdmin ? "bg-amber-400/20 text-amber-400 hover:bg-amber-400/30" : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}>
                            <Crown className="w-3 h-3" />
                            {user.isAdmin ? "Unadmin" : "Admin"}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* CONTENT */}
        {tab === "content" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Kontent Moderatsiyasi</h2>
            <div className="space-y-3">
              {content.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`bg-card border rounded-2xl p-4 flex gap-4 ${item.isFlagged ? "border-destructive/30" : "border-border"}`}>
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
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</span>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs hover:bg-card transition-colors">
                        <Eye className="w-3 h-3" /> Ko'rish
                      </button>
                      <button onClick={() => handleDeletePost(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs hover:bg-destructive/25 transition-colors">
                        <Trash2 className="w-3 h-3" /> O'chirish
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {content.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Hamma kontent toza</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && analytics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <h2 className="text-xl font-bold text-foreground">Platform Tahlili (7 kun)</h2>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Foydalanuvchi o'sishi
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
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Kontent hajmi
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
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">O'rtacha Engagement</span>
              <span className="text-2xl font-bold aurora-text">{analytics.engagementRate}%</span>
            </div>
          </motion.div>
        )}

        {/* FINANCE */}
        {tab === "finance" && <FinanceTab />}

        {/* NOTIFY */}
        {tab === "notify" && <NotifyTab />}

        {/* AI SYSTEM */}
        {tab === "ai" && aiStatus && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">AI Tizim Holati</h2>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 text-emerald-400 text-sm font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {aiStatus.selfImprovementEnabled ? "O'z-o'zini yaxshilamoqda" : "Barqaror"}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Versiya", value: aiStatus.version, icon: Zap, color: "text-primary" },
                { label: "Aniqlik", value: `${aiStatus.accuracy}%`, icon: Activity, color: "text-emerald-400" },
                { label: "Modellar", value: aiStatus.modelsRunning.toString(), icon: Cpu, color: "text-cyan-400" },
                { label: "Oxirgi yangilanish", value: new Date(aiStatus.lastImproved).toLocaleTimeString("uz-UZ"), icon: RefreshCw, color: "text-violet-400" },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-base font-bold text-foreground">{m.value}</p>
                </motion.div>
              ))}
            </div>
            {aiStatus.metricsHistory && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Aniqlik tarixi</h3>
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
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> AI Tavsiyalar
              </h3>
              <div className="space-y-3">
                {aiStatus.recommendations?.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                      rec.impact === "high" ? "bg-destructive/20 text-destructive"
                        : rec.impact === "medium" ? "bg-amber-400/20 text-amber-400"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>{rec.impact}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rec.module}</p>
                      <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                    </div>
                    <button className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                      Qo'llash
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* SAFEGUARD */}
        {tab === "safeguard" && <SafeGuardTab />}

        {/* SETTINGS */}
        {tab === "settings" && <SettingsTab />}

      </div>
    </div>
  );
}
