import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck, Users, FileText, BarChart3, Cpu, TrendingUp,
  TrendingDown, Activity, AlertTriangle, CheckCircle2, XCircle,
  UserX, Eye, RefreshCw, Zap, ShieldAlert, Trash2, ThumbsUp,
  RotateCcw, BadgeCheck, Crown, DollarSign, Bell, Settings,
  Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Send,
  ToggleLeft, ToggleRight, Lock, Unlock, Globe, Megaphone, Sparkles, Percent,
  Bot, BrainCircuit, Gauge, MemoryStick, Radio, UserCheck, ShieldX
} from "lucide-react";
import {
  useGetAdminDashboard, useAdminListUsers, useAdminListContent,
  useGetAdminAnalytics, useGetAiSystemStatus, useSuspendUser,
  useTogglePremium,
  getAdminListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

type AdminTab = "dashboard" | "users" | "content" | "analytics" | "ai" | "ai-integrations" | "safeguard" | "finance" | "notify" | "settings" | "nexus-core" | "ai-autopilot";

const TABS: { id: AdminTab; key: string; icon: React.ElementType }[] = [
  { id: "dashboard", key: "admin.dashboard", icon: BarChart3 },
  { id: "users", key: "admin.users", icon: Users },
  { id: "content", key: "admin.content", icon: FileText },
  { id: "analytics", key: "admin.analytics", icon: TrendingUp },
  { id: "finance", key: "admin.finance", icon: DollarSign },
  { id: "notify", key: "nav.notifications", icon: Bell },
  { id: "ai", key: "admin.ai", icon: Cpu },
  { id: "ai-integrations", key: "admin.ai_integrations", icon: Zap },
  { id: "safeguard", key: "admin.safeguard", icon: ShieldAlert },
  { id: "settings", key: "nav.settings", icon: Settings },
  { id: "nexus-core", key: "admin.nexus_core", icon: Activity },
  { id: "ai-autopilot", key: "admin.ai_autopilot", icon: Bot },
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

/* ─── Platform Operating Costs Section ───────────────────────── */
const EXPENSE_CATS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hosting:           { label: "Hosting",            icon: Activity,     color: "text-blue-400 bg-blue-500/10" },
  ai_api:            { label: "AI API",              icon: Cpu,          color: "text-violet-400 bg-violet-500/10" },
  payment_processor: { label: "To'lov tizimi",       icon: DollarSign,   color: "text-emerald-400 bg-emerald-500/10" },
  storage:           { label: "Saqlash",             icon: BadgeCheck,   color: "text-cyan-400 bg-cyan-500/10" },
  other:             { label: "Boshqa",              icon: Wallet,       color: "text-amber-400 bg-amber-500/10" },
};

const PERIOD_LABEL: Record<string, string> = {
  monthly: "/oy", annual: "/yil", one_time: "bir martalik",
};

function PlatformCostsSection() {
  const [summary, setSummary] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", category: "hosting", amountCents: "", period: "monthly", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAll = async () => {
    setLoadingSummary(true);
    try {
      const [s, r] = await Promise.all([
        fetch(`${API}/api/admin/platform-expenses/summary`, { credentials: "include" }).then(x => x.json()),
        fetch(`${API}/api/admin/platform-expenses/deduction-requests`, { credentials: "include" }).then(x => x.json()),
      ]);
      setSummary(s);
      setRequests(r.requests ?? []);
    } catch {}
    setLoadingSummary(false);
  };

  useEffect(() => { void loadAll(); }, []);

  const addExpense = async () => {
    const cents = Math.round(parseFloat(form.amountCents) * 100);
    if (!form.name || !form.category || isNaN(cents) || cents <= 0) {
      setError("Iltimos barcha maydonlarni to'ldiring"); return;
    }
    setSaving(true); setError(null);
    try {
      const r = await fetch(`${API}/api/admin/platform-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, amountCents: cents }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Xato"); return; }
      setShowAddForm(false);
      setForm({ name: "", category: "hosting", amountCents: "", period: "monthly", description: "" });
      setSuccess("Xarajat qo'shildi ✓"); setTimeout(() => setSuccess(null), 2500);
      void loadAll();
    } catch { setError("Tarmoq xatosi"); }
    finally { setSaving(false); }
  };

  const deleteExpense = async (id: number) => {
    await fetch(`${API}/api/admin/platform-expenses/${id}`, { method: "DELETE", credentials: "include" });
    void loadAll();
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    await fetch(`${API}/api/admin/platform-expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive }),
    });
    void loadAll();
  };

  const createDeductionRequest = async () => {
    setRequesting(true); setError(null);
    try {
      const r = await fetch(`${API}/api/admin/platform-expenses/deduction-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Xato"); return; }
      setSuccess("Chegirma so'rovi yaratildi — tasdiqlash kutilmoqda ✓"); setTimeout(() => setSuccess(null), 3000);
      void loadAll();
    } catch { setError("Tarmoq xatosi"); }
    finally { setRequesting(false); }
  };

  const processRequest = async (id: number, action: "approve" | "reject") => {
    setApproving(id);
    try {
      const r = await fetch(`${API}/api/admin/platform-expenses/deduction-requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Xato"); return; }
      setSuccess(action === "approve" ? "✅ Tasdiqlandi — hamyondan ushlab qolindi!" : "❌ Rad etildi");
      setTimeout(() => setSuccess(null), 3000);
      void loadAll();
    } catch { setError("Tarmoq xatosi"); }
    finally { setApproving(null); }
  };

  const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pendingRequests = requests.filter(r => r.status === "pending");
  const historyRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Ish Xarajatlari Boshqaruvi</h3>
            <p className="text-xs text-muted-foreground">Daromaddan avtomatik ushlab qolish — admin ruxsatidan keyin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadAll()} className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Yangilash
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors">
            {showAddForm ? "✕ Yopish" : "+ Xarajat qo'shish"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Summary cards */}
      {!loadingSummary && summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Brutto Daromad</p>
            <p className="text-base font-bold text-emerald-400">{fmtUsd(summary.grossRevenueCents ?? 0)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Oylik Xarajat</p>
            <p className="text-base font-bold text-destructive">{fmtUsd(summary.totalMonthlyExpenseCents ?? 0)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${(summary.netProfitCents ?? 0) >= 0 ? "bg-emerald-500/8 border-emerald-500/25" : "bg-destructive/8 border-destructive/25"}`}>
            <p className="text-xs text-muted-foreground mb-1">Sof Foyda</p>
            <p className={`text-base font-bold ${(summary.netProfitCents ?? 0) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
              {fmtUsd(summary.netProfitCents ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* Add expense form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Yangi Xarajat</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nomi</p>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Masalan: Replit hosting"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Kategoriya</p>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {Object.entries(EXPENSE_CATS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Miqdor (USD)</p>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-input">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input type="number" min={0} step={0.01} value={form.amountCents}
                      onChange={e => setForm(f => ({ ...f, amountCents: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-foreground text-sm focus:outline-none" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Davr</p>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="monthly">Oylik</option>
                    <option value="annual">Yillik</option>
                    <option value="one_time">Bir martalik</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tavsif (ixtiyoriy)</p>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Qisqacha izoh..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <button onClick={addExpense} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" /> : null}
                {saving ? "Saqlanmoqda..." : "💾 Qo'shish"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense list */}
      {!loadingSummary && (summary?.expenses ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faol Xarajatlar ({summary.expenses.length})</p>
          {(summary.expenses as any[]).map((exp) => {
            const cat = EXPENSE_CATS[exp.category] ?? EXPENSE_CATS.other!;
            const Icon = cat.icon;
            return (
              <div key={exp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${exp.isActive ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{exp.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.label}{exp.description ? ` · ${exp.description}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{fmtUsd(exp.amountCents)}<span className="text-xs font-normal text-muted-foreground ml-1">{PERIOD_LABEL[exp.period]}</span></p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleActive(exp.id, !exp.isActive)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${exp.isActive ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {exp.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteExpense(exp.id)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request deduction button */}
      {!loadingSummary && (summary?.totalMonthlyExpenseCents ?? 0) > 0 && (
        <div className="border border-dashed border-blue-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Chegirma So'rovi Yaratish</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Oylik xarajatlar ({fmtUsd(summary.totalMonthlyExpenseCents)}) daromaddan ({fmtUsd(summary.grossRevenueCents)}) ushlab qolinadi — admin tasdiqidan so'ng
            </p>
          </div>
          <button onClick={createDeductionRequest} disabled={requesting || (summary.grossRevenueCents ?? 0) < (summary.totalMonthlyExpenseCents ?? 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40 flex-shrink-0">
            {requesting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            So'rov yuborish
          </button>
        </div>
      )}

      {/* Pending requests — need approval */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tasdiqlash Kutilmoqda ({pendingRequests.length})</p>
          </div>
          {pendingRequests.map(req => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/8 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Xarajat chegirmasi — <span className="text-destructive">{fmtUsd(req.totalExpenseCents)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Daromad: <span className="text-emerald-400">{fmtUsd(req.totalRevenueCents)}</span>
                    {" "}→ Chegirmadan keyin: <span className={(req.netProfitCents ?? 0) >= 0 ? "text-emerald-400" : "text-destructive"}>{fmtUsd(req.netProfitCents)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(req.createdAt).toLocaleString("uz-UZ")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => processRequest(req.id, "reject")} disabled={approving === req.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors disabled:opacity-50">
                    <XCircle className="w-3.5 h-3.5" /> Rad etish
                  </button>
                  <button onClick={() => processRequest(req.id, "approve")} disabled={approving === req.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                    {approving === req.id
                      ? <div className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />
                    }
                    Tasdiqlash
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* History */}
      {historyRequests.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarix</p>
          {historyRequests.slice(0, 5).map(req => (
            <div key={req.id} className="flex items-center gap-3 text-xs py-2 px-3 rounded-xl bg-card border border-border">
              <span className={`px-2 py-0.5 rounded-full border font-medium ${
                req.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"
              }`}>{req.status === "approved" ? "✓ Tasdiqlangan" : "✕ Rad etilgan"}</span>
              <span className="text-muted-foreground">{fmtUsd(req.totalExpenseCents)}</span>
              <span className="text-muted-foreground ml-auto">{new Date(req.createdAt).toLocaleDateString("uz-UZ")}</span>
            </div>
          ))}
        </div>
      )}

      {loadingSummary && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-blue-400/40 border-t-blue-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

function FinanceTab() {
  const [data, setData] = useState<any>(null);
  const [commStats, setCommStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Commission controls
  const [commRate, setCommRate] = useState<number>(10);
  const [commInput, setCommInput] = useState<string>("10");
  const [savingComm, setSavingComm] = useState(false);
  const [commSaved, setCommSaved] = useState(false);

  // Premium pricing controls
  const [premMonthly, setPremMonthly] = useState<number>(999);
  const [premMonthlyInput, setPremMonthlyInput] = useState<string>("9.99");
  const [premDiscount, setPremDiscount] = useState<number>(20);
  const [premDiscountInput, setPremDiscountInput] = useState<string>("20");
  const [premStripePriceIds, setPremStripePriceIds] = useState<{ monthly?: string; yearly?: string }>({});
  const [savingPrem, setSavingPrem] = useState(false);
  const [premSaved, setPremSaved] = useState(false);
  const [premError, setPremError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const safeJson = async (url: string) => {
        const r = await fetch(url, { credentials: "include" });
        if (!r.ok) return null;
        return r.json().catch(() => null);
      };
      const [fin, comm, stats, prem] = await Promise.all([
        safeJson(`${API}/api/admin/finance`),
        safeJson(`${API}/api/admin/commission`),
        safeJson(`${API}/api/admin/commission/stats`),
        safeJson(`${API}/api/admin/premium-config`),
      ]);
      setData(fin);
      setCommStats(stats);
      setCommRate(comm?.rate ?? 10);
      setCommInput(String(comm?.rate ?? 10));
      if (prem?.config) {
        setPremMonthly(prem.config.monthlyPriceCents);
        setPremMonthlyInput((prem.config.monthlyPriceCents / 100).toFixed(2));
        setPremDiscount(prem.config.yearlyDiscountPercent);
        setPremDiscountInput(String(prem.config.yearlyDiscountPercent));
        setPremStripePriceIds({ monthly: prem.config.monthlyStripePriceId ?? undefined, yearly: prem.config.yearlyStripePriceId ?? undefined });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saveCommission = async () => {
    const v = parseFloat(commInput);
    if (isNaN(v) || v < 0 || v > 100) return;
    setSavingComm(true);
    const r = await fetch(`${API}/api/admin/commission`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ rate: v }),
    });
    const d = await r.json();
    if (d.ok) { setCommRate(d.rate); setCommSaved(true); setTimeout(() => setCommSaved(false), 2500); }
    setSavingComm(false);
  };

  const stepComm = (delta: number) => {
    const cur = parseFloat(commInput) || 0;
    const next = Math.max(0, Math.min(100, +(cur + delta).toFixed(1)));
    setCommInput(String(next));
  };

  const savePremium = async () => {
    const monthly = Math.round(parseFloat(premMonthlyInput) * 100);
    const discount = parseInt(premDiscountInput, 10);
    if (isNaN(monthly) || monthly < 100 || monthly > 99900) { setPremError("Oylik narx $1–$999 orasida bo'lishi kerak"); return; }
    if (isNaN(discount) || discount < 0 || discount > 90) { setPremError("Chegirma 0–90% orasida bo'lishi kerak"); return; }
    setSavingPrem(true); setPremError(null);
    try {
      const r = await fetch(`${API}/api/admin/premium-config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ monthlyPriceCents: monthly, yearlyDiscountPercent: discount }),
      });
      const d = await r.json();
      if (!r.ok) { setPremError(d.error ?? "Xato"); return; }
      setPremMonthly(d.config.monthlyPriceCents);
      setPremDiscount(d.config.yearlyDiscountPercent);
      setPremStripePriceIds({ monthly: d.stripeMonthlyPriceId, yearly: d.stripeYearlyPriceId });
      setPremSaved(true); setTimeout(() => setPremSaved(false), 3000);
    } catch { setPremError("Tarmoq xatosi"); } finally { setSavingPrem(false); }
  };

  const stepPremMonthly = (delta: number) => {
    const cur = parseFloat(premMonthlyInput) || 0;
    const next = Math.max(1, +(cur + delta).toFixed(2));
    setPremMonthlyInput(next.toFixed(2));
  };

  const stepPremDiscount = (delta: number) => {
    const cur = parseInt(premDiscountInput) || 0;
    const next = Math.max(0, Math.min(90, cur + delta));
    setPremDiscountInput(String(next));
  };

  const computedYearly = () => {
    const monthly = parseFloat(premMonthlyInput) || 0;
    const disc = parseInt(premDiscountInput) || 0;
    return (monthly * 12 * (1 - disc / 100)).toFixed(2);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const fmt = (v: number) => `${(v / 100).toLocaleString("uz-UZ")} UZS`;
  const TX_TYPE_ICON: Record<string, React.ElementType> = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer_out: ArrowUpRight, transfer_in: ArrowDownLeft, content_revenue: Crown, ad_revenue: DollarSign };
  const TX_TYPE_COLOR: Record<string, string> = { deposit: "text-emerald-400", withdrawal: "text-destructive", transfer_out: "text-destructive", transfer_in: "text-primary", content_revenue: "text-amber-400", ad_revenue: "text-cyan-400" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-400/15 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Moliyaviy boshqaruv</h2>
            <p className="text-xs text-muted-foreground">Komissiya, hamyonlar va tranzaksiyalar</p>
          </div>
        </div>
        <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>

      {/* ===== COMMISSION CONTROL ===== */}
      <div className="bg-gradient-to-br from-amber-400/5 to-primary/5 border border-amber-400/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Platforma Komissiyasi</h3>
            <p className="text-xs text-muted-foreground">Har bir tranzaksiyadan avtomatik % olinadi</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Rate adjuster */}
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl overflow-hidden">
            <button onClick={() => stepComm(-0.5)}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              −
            </button>
            <div className="relative">
              <input
                type="number" min={0} max={100} step={0.5}
                value={commInput}
                onChange={e => setCommInput(e.target.value)}
                className="w-20 h-10 text-center font-bold text-xl text-foreground bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-lg font-bold text-muted-foreground pr-2">%</span>
            <button onClick={() => stepComm(0.5)}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              +
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5">
            {[0, 5, 10, 15, 20].map(v => (
              <button key={v} onClick={() => setCommInput(String(v))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  parseFloat(commInput) === v ? "bg-amber-400/20 text-amber-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {v}%
              </button>
            ))}
          </div>

          <button onClick={saveCommission} disabled={savingComm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              commSaved ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400 text-black hover:opacity-90"
            } disabled:opacity-50`}>
            {savingComm ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : commSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
            {savingComm ? "Saqlanmoqda..." : commSaved ? "Saqlandi!" : "Saqlash"}
          </button>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Joriy komissiya: <strong className="text-amber-400">{commRate}%</strong>.
            Misol: foydalanuvchi 10,000 UZS depozit qilsa, {(10000 * commRate / 100).toFixed(0)} UZS admin hamyoniga, {(10000 * (1 - commRate/100)).toFixed(0)} UZS foydalanuvchiga.
          </span>
        </div>
      </div>

      {/* ===== PREMIUM PRICING CONTROL ===== */}
      <div className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-400/15 flex items-center justify-center">
            <Crown className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Premium Obuna Narxlari</h3>
            <p className="text-xs text-muted-foreground">Stripe'da yangi narxlar yaratiladi, eski narxlar arxivlanadi</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Monthly price */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-yellow-400" /> Oylik narx (USD)
            </label>
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl overflow-hidden">
              <button onClick={() => stepPremMonthly(-1)}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                −
              </button>
              <div className="flex items-center flex-1 justify-center gap-1">
                <span className="text-sm font-bold text-muted-foreground">$</span>
                <input
                  type="number" min={1} max={999} step={1}
                  value={premMonthlyInput}
                  onChange={e => setPremMonthlyInput(e.target.value)}
                  className="w-20 h-10 text-center font-bold text-xl text-foreground bg-transparent focus:outline-none"
                />
              </div>
              <button onClick={() => stepPremMonthly(1)}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                +
              </button>
            </div>
            <div className="flex gap-1.5">
              {[4.99, 9.99, 14.99, 19.99].map(v => (
                <button key={v} onClick={() => setPremMonthlyInput(v.toFixed(2))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    parseFloat(premMonthlyInput) === v ? "bg-yellow-400/20 text-yellow-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* Yearly discount */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3 h-3 text-green-400" /> Yillik chegirma (%)
            </label>
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl overflow-hidden">
              <button onClick={() => stepPremDiscount(-5)}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                −
              </button>
              <div className="relative flex-1 flex items-center justify-center">
                <input
                  type="number" min={0} max={90} step={5}
                  value={premDiscountInput}
                  onChange={e => setPremDiscountInput(e.target.value)}
                  className="w-16 h-10 text-center font-bold text-xl text-foreground bg-transparent focus:outline-none"
                />
                <span className="text-lg font-bold text-muted-foreground">%</span>
              </div>
              <button onClick={() => stepPremDiscount(5)}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                +
              </button>
            </div>
            <div className="flex gap-1.5">
              {[10, 20, 25, 33].map(v => (
                <button key={v} onClick={() => setPremDiscountInput(String(v))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    parseInt(premDiscountInput) === v ? "bg-green-400/20 text-green-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-background/60 border border-border/60 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Oylik:</span>
            <span className="font-bold text-foreground">${premMonthlyInput}/oy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Yillik jami:</span>
            <span className="font-bold text-foreground">${computedYearly()}/yil</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Yillik (oyiga):</span>
            <span className="font-bold text-green-400">
              ${((parseFloat(premMonthlyInput) || 0) * (1 - (parseInt(premDiscountInput) || 0) / 100)).toFixed(2)}/oy
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-semibold">
            {premDiscountInput}% tejash
          </div>
        </div>

        {premStripePriceIds.monthly && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>Oylik Stripe ID: <code className="text-primary font-mono">{premStripePriceIds.monthly}</code></span>
            {premStripePriceIds.yearly && <span>Yillik Stripe ID: <code className="text-primary font-mono">{premStripePriceIds.yearly}</code></span>}
          </div>
        )}

        {premError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {premError}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={savePremium} disabled={savingPrem}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              premSaved ? "bg-emerald-400/15 text-emerald-400" : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:opacity-90"
            } disabled:opacity-50`}>
            {savingPrem ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : premSaved ? <CheckCircle2 className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
            {savingPrem ? "Stripe'ga saqlanmoqda..." : premSaved ? "Saqlandi! Stripe yangilandi ✓" : "Narxlarni Saqlash"}
          </button>
          <p className="text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3 inline text-yellow-400 mr-1" />
            Saqlashda Stripe'da yangi narxlar yaratiladi
          </p>
        </div>
      </div>

      {/* ===== ADMIN WALLET (my earnings) ===== */}
      {commStats && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Admin Hamyoni (Mening daromadim)</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Jami daromad", value: fmt(commStats.adminTotal ?? 0), color: "text-primary", bg: "bg-primary/10", icon: Crown },
              { label: "Balans", value: fmt(commStats.adminBalance ?? 0), color: "text-emerald-400", bg: "bg-emerald-400/10", icon: Wallet },
              { label: "Komissiya daromadi", value: fmt(commStats.adminEarnings ?? 0), color: "text-amber-400", bg: "bg-amber-400/10", icon: DollarSign },
              { label: "Bu oydagi komissiya", value: fmt(commStats.monthlyCommission ?? 0), color: "text-cyan-400", bg: "bg-cyan-400/10", icon: TrendingUp },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className={`w-6 h-6 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                  </div>
                </div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t border-border">
            <span>Jami tranzaksiya: <strong className="text-foreground">{commStats.txCount}</strong></span>
          </div>
        </div>
      )}

      {/* Platform stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Platform balans jami", value: fmt(data.totals?.totalAll ?? 0), icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
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

      {/* ===== PLATFORM OPERATING COSTS ===== */}
      <PlatformCostsSection />

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
                  <p className="text-sm font-medium text-foreground">{tx.type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground truncate">{tx.description || "—"}</p>
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

/* ─── AI Autopilot Tab ───────────────────────────────────────── */
const ACTION_COLOR: Record<string, string> = {
  none:    "bg-muted/50 text-muted-foreground",
  flagged: "bg-amber-500/15 text-amber-400",
  deleted: "bg-destructive/15 text-destructive",
  warned:  "bg-orange-500/15 text-orange-400",
  banned:  "bg-destructive/20 text-destructive font-bold",
};
const ACTION_LABEL: Record<string, string> = {
  none:    "O'tdi",
  flagged: "Belgilandi",
  deleted: "O'chirildi",
  warned:  "Ogohlantirish",
  banned:  "Bloklandi",
};
const ENGINE_COLOR: Record<string, string> = {
  "openai+rules": "text-violet-400",
  hybrid:         "text-cyan-400",
  rules:          "text-amber-400",
  tensorflow:     "text-blue-400",
};

function AiAutopilotTab() {
  const [stats, setStats] = useState<any>(null);
  const [scale, setScale] = useState<any>(null);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [warnedUsers, setWarnedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [actingUser, setActingUser] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"feed" | "banned" | "warned">("feed");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, sc, b, w] = await Promise.all([
        fetch(`${API}/api/admin/ai/stats`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/api/admin/ai/scale`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/api/admin/ai/banned-users`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/api/admin/ai/warned-users`, { credentials: "include" }).then(r => r.json()),
      ]);
      setStats(s);
      setScale(sc);
      setBannedUsers(b.users ?? []);
      setWarnedUsers(w.users ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  // SSE Live feed
  useEffect(() => {
    const evSource = new EventSource(`${API}/api/admin/ai/events/stream`, { withCredentials: true });
    evSource.onopen = () => setSseConnected(true);
    evSource.onerror = () => setSseConnected(false);
    evSource.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        setLiveEvents(prev => [ev, ...prev].slice(0, 100));
      } catch {}
    };
    return () => evSource.close();
  }, []);

  const unbanUser = async (userId: number) => {
    setActingUser(userId);
    await fetch(`${API}/api/admin/ai/unban/${userId}`, { method: "POST", credentials: "include" });
    await loadAll();
    setActingUser(null);
  };

  const resetWarnings = async (userId: number) => {
    setActingUser(userId);
    await fetch(`${API}/api/admin/ai/reset-warnings/${userId}`, { method: "POST", credentials: "include" });
    await loadAll();
    setActingUser(null);
  };

  const healthColor = (h: string) =>
    h === "healthy" ? "text-emerald-400" : h === "degraded" ? "text-amber-400" : "text-destructive";

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
    </div>
  );

  const eventFeed = liveEvents.length > 0 ? liveEvents : (stats?.recentEvents ?? []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center">
            <Bot className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Avtopilot Boshqaruvi</h2>
            <p className="text-xs text-muted-foreground">Platformani 100% AI boshqaradi — inson ta'misiz</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${sseConnected ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            <Radio className={`w-3 h-3 ${sseConnected ? "animate-pulse" : ""}`} />
            {sseConnected ? "Real-vaqt ulanish" : "Oflayn"}
          </div>
          <button onClick={() => void loadAll()} className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bugungi hodisalar", value: stats?.todayEvents ?? 0, icon: Activity, color: "text-blue-400 bg-blue-500/10" },
          { label: "Avtomatik bloklangan", value: stats?.autoBlocked ?? 0, icon: ShieldX, color: "text-destructive bg-destructive/10" },
          { label: "Ogohlantirishlar", value: stats?.warned ?? 0, icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10" },
          { label: "Bloklangan foydalanuvchilar", value: stats?.bannedUsers ?? 0, icon: UserX, color: "text-rose-400 bg-rose-500/10" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* AI Engine status */}
      <div className="bg-gradient-to-br from-violet-500/8 to-blue-500/8 border border-violet-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-bold text-foreground">AI Dvigatel Holati</span>
          <span className="ml-auto px-3 py-1 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-semibold">OpenAI + Rules Hybrid</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-violet-400">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Jami tekshiruv</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-destructive">{stats?.violations ?? 0}</p>
            <p className="text-xs text-muted-foreground">Buzilish</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{stats?.suspicious ?? 0}</p>
            <p className="text-xs text-muted-foreground">Shubhali</p>
          </div>
        </div>
      </div>

      {/* Auto-scale metrics */}
      {scale && (
        <div className="bg-gradient-to-br from-cyan-500/8 to-emerald-500/8 border border-cyan-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Auto-Scale AI Tizimi</span>
            <span className={`ml-auto text-sm font-bold ${healthColor(scale.health)}`}>
              {scale.health === "healthy" ? "✅ Sog'lom" : scale.health === "degraded" ? "⚠️ Yuklanmoqda" : "🔴 Ortiqcha yuklama"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Joriy RPS</p>
              <p className={`text-base font-bold ${scale.rps.pressure === "ok" ? "text-emerald-400" : "text-amber-400"}`}>
                {scale.rps.current.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">/ {scale.rps.warnAt.toLocaleString()} chegara</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Eng yuqori RPS</p>
              <p className="text-base font-bold text-foreground">{scale.rps.peak.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">RAM foydalanish</p>
              <p className={`text-base font-bold ${scale.memory.pressure === "ok" ? "text-emerald-400" : "text-amber-400"}`}>
                {scale.memory.heapUsedMB} MB
              </p>
              <p className="text-xs text-muted-foreground">/ {scale.memory.warnAt} MB chegara</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Throttle darajasi</p>
              <p className="text-base font-bold text-foreground">{scale.requests.throttleRate}%</p>
              <p className="text-xs text-muted-foreground">{scale.requests.throttled} ta cheklangan</p>
            </div>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2">
        {([["feed", "📡 Jonli Lenta"], ["banned", `🚫 Bloklanganlar (${bannedUsers.length})`], ["warned", `⚠️ Ogohlantirilganlar (${warnedUsers.length})`]] as const).map(([s, label]) => (
          <button key={s} onClick={() => setActiveSection(s as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeSection === s ? "bg-violet-500/15 border border-violet-500/30 text-violet-400" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Live event feed */}
      {activeSection === "feed" && (
        <div className="space-y-1.5">
          {eventFeed.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Hali hodisalar yo'q</div>
          ) : eventFeed.map((ev: any, i: number) => (
            <motion.div key={ev.id ?? i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl text-xs">
              <span className={`px-2 py-0.5 rounded-full border text-xs ${ACTION_COLOR[ev.action_taken ?? ev.action] ?? ACTION_COLOR.none}`}>
                {ACTION_LABEL[ev.action_taken ?? ev.action] ?? ev.action_taken ?? ev.action}
              </span>
              <span className="text-muted-foreground w-16 flex-shrink-0">{ev.content_type ?? ev.contentType}</span>
              <span className={`text-xs ${VERDICT_COLOR[ev.ai_verdict ?? ev.aiVerdict] ?? "text-muted-foreground"}`}>
                {ev.ai_verdict ?? ev.aiVerdict}
              </span>
              <span className="text-muted-foreground flex-1 truncate">{ev.content_preview ?? ev.contentPreview ?? "—"}</span>
              <span className={`text-xs flex-shrink-0 ${ENGINE_COLOR[ev.engine ?? "rules"]}`}>{ev.engine}</span>
              <span className="text-muted-foreground flex-shrink-0">
                {new Date(ev.created_at ?? ev.createdAt ?? Date.now()).toLocaleTimeString("uz-UZ")}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Banned users */}
      {activeSection === "banned" && (
        <div className="space-y-2">
          {bannedUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Bloklangan foydalanuvchilar yo'q</div>
          ) : bannedUsers.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-destructive/20 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <UserX className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">@{u.username}</p>
                <p className="text-xs text-muted-foreground truncate">{u.banned_reason ?? "Sabab ko'rsatilmagan"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{u.banned_at ? new Date(u.banned_at).toLocaleDateString("uz-UZ") : "—"}</p>
                <p className="text-xs text-destructive">{u.warning_count} ta ogohlantirish</p>
              </div>
              <button onClick={() => unbanUser(u.id)} disabled={actingUser === u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50 flex-shrink-0">
                {actingUser === u.id ? <div className="w-3 h-3 rounded-full border border-emerald-400/40 border-t-emerald-400 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Tiklash
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Warned users */}
      {activeSection === "warned" && (
        <div className="space-y-2">
          {warnedUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Ogohlantirilgan foydalanuvchilar yo'q</div>
          ) : warnedUsers.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-amber-500/20 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">@{u.username}</p>
                <p className="text-xs text-muted-foreground">{u.display_name}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {[1, 2, 3].map(n => (
                  <div key={n} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${n <= (u.warning_count ?? 0) ? "bg-amber-500/30 border-amber-400 text-amber-400" : "border-border"}`}>
                    {n <= (u.warning_count ?? 0) ? "!" : ""}
                  </div>
                ))}
              </div>
              <span className="text-xs text-amber-400 font-bold flex-shrink-0">{u.warning_count}/3</span>
              <button onClick={() => resetWarnings(u.id)} disabled={actingUser === u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors disabled:opacity-50 flex-shrink-0">
                {actingUser === u.id ? <div className="w-3 h-3 rounded-full border border-muted-foreground/40 border-t-muted-foreground animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Tozalash
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── NEXUS Core Self-Healing Admin Tab ──────────────────────── */
function NexusCoreTab() {
  const [health, setHealth] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [h, tr] = await Promise.all([
          fetch(`${API}/api/admin/nexus/health`, { credentials: "include" }).then(r => r.json()),
          fetch(`${API}/api/admin/nexus/traffic`, { credentials: "include" }).then(r => r.json()),
        ]);
        setHealth(h);
        setTraffic(tr);
      } catch {}
      setLoading(false);
    };
    void load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, []);

  const resetCircuit = async (endpoint: string) => {
    await fetch(`${API}/api/admin/nexus/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint }),
    });
    const h = await fetch(`${API}/api/admin/nexus/health`, { credentials: "include" }).then(r => r.json());
    setHealth(h);
  };

  const reloadAll = async () => {
    const [h, tr] = await Promise.all([
      fetch(`${API}/api/admin/nexus/health`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/api/admin/nexus/traffic`, { credentials: "include" }).then(r => r.json()),
    ]);
    setHealth(h);
    setTraffic(tr);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
    </div>
  );

  const statusColor = health?.status === "healthy"
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : health?.status === "degraded"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-red-400 bg-red-500/10 border-red-500/30";

  const trafficData: { hour: string; requests: number }[] = (traffic?.hourlyBuckets ?? []).map(
    (v: number, i: number) => ({ hour: `${i}h`, requests: v })
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`border rounded-2xl p-4 ${statusColor}`}>
          <p className="text-xs opacity-70 mb-1">Tizim holati</p>
          <p className="text-lg font-bold">{(health?.status ?? "unknown").toUpperCase()}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Uptime</p>
          <p className="text-lg font-bold text-foreground">
            {Math.floor((health?.uptimeSec ?? 0) / 3600)}h {Math.floor(((health?.uptimeSec ?? 0) % 3600) / 60)}m
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Xato darajasi</p>
          <p className="text-lg font-bold text-foreground">{health?.globalErrorRate ?? 0}%</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Joriy RPM</p>
          <p className="text-lg font-bold text-foreground">{traffic?.currentRpm ?? 0}</p>
        </div>
      </div>

      {/* Traffic chart */}
      {trafficData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> 24 soatlik trafik (UTC)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            {traffic?.peakHour !== undefined && <span>⬆ Eng yuqori: {traffic.peakHour}:00 UTC</span>}
            {traffic?.valleyHour !== undefined && <span>⬇ Eng past: {traffic.valleyHour}:00 UTC</span>}
            {traffic?.recommendedCacheTtlSec !== undefined && (
              <span>💡 Tavsiya etilgan cache TTL: {traffic.recommendedCacheTtlSec}s</span>
            )}
          </div>
        </div>
      )}

      {/* Endpoint health table */}
      {(health?.endpoints ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Endpoint sog'ligi ({health.endpoints.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(health.endpoints as any[]).map((ep) => (
              <div key={ep.endpoint} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-background/50 border border-border/50 text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  ep.circuitState === "closed" ? "bg-emerald-400" :
                  ep.circuitState === "half-open" ? "bg-amber-400" : "bg-red-400"
                }`} />
                <span className="flex-1 font-mono text-muted-foreground truncate">{ep.endpoint}</span>
                <span className="text-muted-foreground">{ep.avgLatencyMs}ms</span>
                <span className="text-muted-foreground">{ep.errorCount} xato</span>
                {ep.circuitState !== "closed" && (
                  <button
                    onClick={() => resetCircuit(ep.endpoint as string)}
                    className="px-2 py-1 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors flex-shrink-0 text-xs"
                  >
                    Tiklash
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Healing events */}
      {(health?.healingEvents ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> O'z-o'zini davolash hodisalari
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {[...(health.healingEvents as any[])].reverse().slice(0, 30).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full border font-medium ${
                  ev.action === "circuit_opened"   ? "bg-red-500/15 text-red-400 border-red-500/30" :
                  ev.action === "auto_healed"       ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                  ev.action === "half_open_probe"   ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                                                      "bg-blue-500/15 text-blue-400 border-blue-500/30"
                }`}>{ev.action}</span>
                <span className="text-muted-foreground font-mono truncate flex-1">{ev.endpoint}</span>
                <span className="text-muted-foreground flex-shrink-0">{new Date(ev.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={reloadAll}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { data: dash } = useGetAdminDashboard();
  const { data: users = [], refetch: refetchUsers } = useAdminListUsers();
  const { data: content = [], refetch: refetchContent } = useAdminListContent();
  const { data: analytics } = useGetAdminAnalytics({ period: "7d" });
  const { data: aiStatus } = useGetAiSystemStatus();
  const suspend = useSuspendUser();
  const togglePremium = useTogglePremium();
  const qc = useQueryClient();

  const handleSuspend = (id: number, isSuspended: boolean) => {
    suspend.mutate({ id, data: { suspend: !isSuspended } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() }),
    });
  };

  const handleTogglePremium = (id: number) => {
    togglePremium.mutate({ id }, {
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
          {TABS.map(({ id, key, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                tab === id ? "bg-accent/15 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {t(key)}
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
                    {["Foydalanuvchi", "Status", "Verified", "Admin", "Premium", "Qo'shilgan", "Amallar"].map(h => (
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
                            {user.isPremium && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
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
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1 ${user.isPremium ? "text-yellow-400 font-semibold" : "text-muted-foreground"}`}>
                          {user.isPremium ? <><Zap className="w-3.5 h-3.5" /> Ha</> : "Yo'q"}
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
                          <button onClick={() => handleTogglePremium(user.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              user.isPremium
                                ? "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}>
                            <Zap className="w-3 h-3" />
                            {user.isPremium ? "Premium olish" : "Premium berish"}
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

        {/* AI INTEGRATIONS */}
        {tab === "ai-integrations" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">AI Integratsiyalar</h2>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 text-emerald-400 text-sm font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Faol
              </span>
            </div>

            {/* Active integrations grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "OpenAI GPT-4o", status: "active", icon: "🤖",
                  desc: "AI Chat, Caption Generator, Kontent Moderatsiya",
                  model: "gpt-4o-mini", calls: "∞", color: "border-emerald-500/30 bg-emerald-500/5",
                  badge: "bg-emerald-400/15 text-emerald-400",
                },
                {
                  name: "DALL-E 3", status: "active", icon: "🎨",
                  desc: "AI Rasm Yaratish — Matndan rasm generatsiya",
                  model: "dall-e-3", calls: "∞", color: "border-violet-500/30 bg-violet-500/5",
                  badge: "bg-violet-400/15 text-violet-400",
                },
                {
                  name: "Google Books API", status: "active", icon: "📚",
                  desc: "Shaxsiy kutubxona — Kitob qidirish va saqlash",
                  model: "Google Books v1", calls: "Bepul", color: "border-blue-500/30 bg-blue-500/5",
                  badge: "bg-blue-400/15 text-blue-400",
                },
                {
                  name: "TensorFlow.js", status: "active", icon: "🧠",
                  desc: "ML modellar — Kontentni tahlil qilish",
                  model: "tfjs v4", calls: "Local", color: "border-orange-500/30 bg-orange-500/5",
                  badge: "bg-orange-400/15 text-orange-400",
                },
                {
                  name: "Stripe Payments", status: "active", icon: "💳",
                  desc: "To'lovlar va obunalar tizimi",
                  model: "Stripe API v3", calls: "∞", color: "border-indigo-500/30 bg-indigo-500/5",
                  badge: "bg-indigo-400/15 text-indigo-400",
                },
                {
                  name: "Anthropic Claude", status: "planned", icon: "🔮",
                  desc: "Kelajakda: Ilg'or tahlil va kontent yaratish",
                  model: "claude-3-opus", calls: "—", color: "border-border bg-muted/30",
                  badge: "bg-amber-400/15 text-amber-400",
                },
              ].map((item, i) => (
                <motion.div key={item.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className={`rounded-2xl border p-5 ${item.color}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.model}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badge}`}>
                      {item.status === "active" ? "Faol" : "Rejada"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">So'rovlar: <strong className="text-foreground">{item.calls}</strong></span>
                    {item.status === "active" ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-semibold">Ulangan</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold">Tez kunda</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Features table */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Platforma AI Funksiyalari
              </h3>
              <div className="space-y-2">
                {[
                  { feature: "AI Chat (GPT-4o)", route: "/ai-chat", status: "active", desc: "Foydalanuvchilar bilan suhbat, streaming" },
                  { feature: "Caption Generator", route: "/ai-chat (Caption tab)", status: "active", desc: "Post va Reel uchun caption + hashtag" },
                  { feature: "AI Rasm Yaratish", route: "/ai-chat (Rasm tab)", status: "active", desc: "DALL-E 3 bilan rasm generatsiya" },
                  { feature: "Smart Kontent Moderatsiya", route: "/api/openai/moderate", status: "active", desc: "AI-based spam va violation detection" },
                  { feature: "Shaxsiy Kutubxona", route: "/kutubxona", status: "active", desc: "Google Books + shaxsiy kolleksiya" },
                  { feature: "AI Feed Algoritm", route: "/api/ai/feed", status: "active", desc: "Mashhurlik bo'yicha kontent tavsiyalari" },
                  { feature: "AI Trending Topics", route: "/api/ai/trending-topics", status: "active", desc: "Trend mavzular va hashtaglar" },
                  { feature: "Voice AI Chat", route: "—", status: "planned", desc: "Ovozli suhbat (GPT-audio)" },
                  { feature: "AI Video Analysis", route: "—", status: "planned", desc: "Reel va Video kontentni tahlil qilish" },
                  { feature: "Personalized Feed AI", route: "—", status: "planned", desc: "Foydalanuvchi xulqiga asoslangan feed" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.status === "active" ? "hsl(168 80% 50%)" : "hsl(45 90% 55%)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.feature}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:block truncate max-w-[160px]">{item.route}</span>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === "active" ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"}`}>
                      {item.status === "active" ? "Faol" : "Rejada"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Test Panel */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> AI Test Paneli (Admin)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <a href="/ai-chat" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm font-semibold">
                  🤖 AI Chat ochish
                </a>
                <a href="/kutubxona" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors text-sm font-semibold">
                  📚 Kutubxona ochish
                </a>
                <button onClick={async () => {
                  const r = await fetch(`${API}/api/openai/moderate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ content: "This is a test message for AI moderation" }),
                  });
                  const d = await r.json();
                  alert(`AI Moderatsiya natijasi:\n${JSON.stringify(d, null, 2)}`);
                }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors text-sm font-semibold">
                  🛡️ Moderatsiya test
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* SAFEGUARD */}
        {tab === "safeguard" && <SafeGuardTab />}

        {/* SETTINGS */}
        {tab === "settings" && <SettingsTab />}

        {/* NEXUS CORE */}
        {tab === "nexus-core" && <NexusCoreTab />}

        {/* AI AUTOPILOT */}
        {tab === "ai-autopilot" && <AiAutopilotTab />}

      </div>
    </div>
  );
}
