import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, DollarSign, Eye, Users, Star, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, Zap,
} from "lucide-react";

interface DashboardData {
  summary: {
    monetizationStatus: string;
    earningsBalance: number;
    adRevenueBalance: number;
    totalEarnings: number;
    thisMonthEarnings: number;
    totalViews: number;
    contentCount: number;
    followers: number;
    pendingPayoutCount: number;
    pendingPayoutAmount: number;
    adsEnabled: boolean;
    membershipEnabled: boolean;
  };
  chart: Array<{ date: string; amount: number; views: number }>;
  topContent: Array<{
    id: number; contentType: string; contentId: number;
    totalViews: number; creatorEarnings: number; lastUpdated: string;
  }>;
  payoutHistory: Array<{
    id: number; amount: number; status: string; paymentMethod: string; createdAt: string;
  }>;
}

function formatUZS(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M UZS`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(0)}K UZS`;
  return `${amount.toLocaleString()} UZS`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    active:   { label: "Faol",         cls: "bg-green-500/20 text-green-400 border-green-500/30",  Icon: CheckCircle },
    applied:  { label: "Ko'rib chiqilmoqda", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", Icon: Clock },
    rejected: { label: "Rad etildi",    cls: "bg-red-500/20 text-red-400 border-red-500/30",    Icon: XCircle },
    none:     { label: "Ariza topshirilmagan", cls: "bg-gray-500/20 text-gray-400 border-gray-500/30", Icon: AlertCircle },
    pending:  { label: "Kutilmoqda",   cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", Icon: Clock },
    approved: { label: "Tasdiqlandi",  cls: "bg-green-500/20 text-green-400 border-green-500/30",  Icon: CheckCircle },
    paid:     { label: "To'landi",     cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",    Icon: CheckCircle },
    cancelled:{ label: "Bekor qilindi",cls: "bg-red-500/20 text-red-400 border-red-500/30",       Icon: XCircle },
  };
  const s = map[status] ?? map["none"]!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      <s.Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  video: "Video", reel: "Reel", music: "Musiqa", movie: "Film",
};

export default function CreatorDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["creator-dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/creator/dashboard", { credentials: "include" });
      if (!r.ok) throw new Error("Dashboard yuklanmadi");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
          <p>Dashboard yuklanmadi. Sahifani yangilang.</p>
        </div>
      </div>
    );
  }

  const { summary, chart, topContent, payoutHistory } = data;
  const isActive = summary.monetizationStatus === "active";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Kreator Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">Real-time daromadlar va statistikalar</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={summary.monetizationStatus} />
          {!isActive && summary.monetizationStatus === "none" && (
            <Link href="/features">
              <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition flex items-center gap-1">
                Monetizatsiya <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          label="Jami daromad"
          value={formatUZS(summary.totalEarnings)}
          sub={`Bu oy: ${formatUZS(summary.thisMonthEarnings)}`}
          color="green"
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          label="Hisob balansi"
          value={formatUZS(summary.earningsBalance)}
          sub={`Reklama: ${formatUZS(summary.adRevenueBalance)}`}
          color="purple"
        />
        <SummaryCard
          icon={<Eye className="w-5 h-5 text-blue-400" />}
          label="Jami ko'rishlar"
          value={summary.totalViews.toLocaleString()}
          sub={`${summary.contentCount} ta kontent`}
          color="blue"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 text-pink-400" />}
          label="Obunachilar"
          value={summary.followers.toLocaleString()}
          sub={summary.pendingPayoutCount > 0 ? `${summary.pendingPayoutCount} ta payout kutilmoqda` : "Faol kreator"}
          color="pink"
        />
      </div>

      {/* ── Earnings Chart ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            So'nggi 30 kun — Daromadlar
          </h2>
          <span className="text-xs text-gray-500">UZS</span>
        </div>
        {chart.every(d => d.amount === 0) ? (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            Hali daromad ma'lumotlari yo'q
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
                interval={4}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                formatter={(value: number) => [formatUZS(value), "Daromad"]}
              />
              <Area type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={2} fill="url(#earningsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Top Content ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Top kontent
          </h2>
          {topContent.length === 0 ? (
            <p className="text-gray-500 text-sm">Hali hech qanday kontent yo'q</p>
          ) : (
            <div className="space-y-3">
              {topContent.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-mono">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        {CONTENT_TYPE_LABEL[c.contentType] ?? c.contentType} #{c.contentId}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">{c.totalViews.toLocaleString()} ko'rish</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-400">{formatUZS(c.creatorEarnings)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Payout History ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            To'lovlar tarixi
          </h2>
          {payoutHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">Hali to'lov so'rovlari yo'q</p>
          ) : (
            <div className="space-y-2">
              {payoutHistory.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-gray-500">
                      {p.paymentMethod ?? "Karta"} · {new Date(p.createdAt).toLocaleDateString("uz")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatUZS(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
          {isActive && (
            <Link href="/wallet">
              <button className="mt-3 w-full py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 text-sm rounded-lg transition">
                Pul yechish →
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Monetization not active notice ── */}
      {!isActive && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium text-sm">Monetizatsiya hali faol emas</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              Daromad olish uchun monetizatsiya dasturiga qo'shiling.
              Kamida 1,000 ta obunachi va 10,000 ta ko'rish talab etiladi.
            </p>
            <Link href="/features">
              <button className="mt-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg transition">
                Ariza topshirish
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "green" | "purple" | "blue" | "pink";
}) {
  const borders: Record<string, string> = {
    green:  "border-green-500/20",
    purple: "border-purple-500/20",
    blue:   "border-blue-500/20",
    pink:   "border-pink-500/20",
  };
  return (
    <div className={`bg-gray-900 border ${borders[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-400">{label}</span></div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
