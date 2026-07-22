import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Plus, Trash2, CreditCard, Smartphone, Globe,
  TrendingUp, Megaphone, CheckCircle2, XCircle,
  RefreshCw, ChevronRight, Loader2, X, Eye, EyeOff
} from "lucide-react";

const API = "";

const fmt = (tiyin: number) =>
  (tiyin / 100).toLocaleString("uz-UZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " so'm";

const fmtSigned = (tiyin: number) =>
  (tiyin >= 0 ? "+" : "") + fmt(Math.abs(tiyin));

const fmtUSD = (tiyin: number, uzsPerUsd: number) => {
  const usd = (tiyin / 100) / uzsPerUsd;
  return "≈ $" + usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PAYMENT_PROVIDERS = [
  { id: "visa",       label: "Visa",                   logo: "💳", color: "#1a1f71", textColor: "#fff", descKey: "wallet.visa_desc", disabled: false },
  { id: "mastercard", label: "Mastercard",             logo: "🔴", color: "#eb001b", textColor: "#fff", descKey: "wallet.mastercard_desc", disabled: false },
  { id: "click",      label: "Click",                  logo: "🟢", color: "#00b050", textColor: "#fff", descKey: "wallet.coming_soon", disabled: true },
  { id: "payme",      label: "Payme",                  logo: "🔵", color: "#00afef", textColor: "#fff", descKey: "wallet.coming_soon", disabled: true },
  { id: "global",     label: "Global Payment Gateway", logo: "🌐", color: "#7c3aed", textColor: "#fff", descKey: "wallet.global_desc", disabled: false },
];

const TX_TYPE_META: Record<string, { label: string; icon: typeof ArrowDownCircle; color: string }> = {
  deposit:         { label: "wallet.deposit",        icon: ArrowDownCircle, color: "text-green-400" },
  withdrawal:      { label: "wallet.withdraw",       icon: ArrowUpCircle,   color: "text-red-400" },
  transfer_in:     { label: "wallet.receive",        icon: ArrowDownCircle, color: "text-blue-400" },
  transfer_out:    { label: "wallet.transfer",       icon: ArrowLeftRight,  color: "text-orange-400" },
  ad_revenue:      { label: "wallet.ad_revenue",     icon: Megaphone,       color: "text-yellow-400" },
  content_revenue: { label: "wallet.content_revenue",icon: TrendingUp,      color: "text-emerald-400" },
  referral:        { label: "wallet.referral",       icon: CheckCircle2,    color: "text-purple-400" },
};

const PM_ICONS: Record<string, string> = {
  visa: "💳", mastercard: "🔴", click: "🟢", payme: "🔵", global: "🌐",
};

type WalletData = { balance: number; earningsBalance: number; adRevenueBalance: number; currency: string };
type TxData = { id: number; type: string; amount: number; paymentMethod: string | null; description: string | null; status: string; createdAt: string; reference: string | null };
type PMData = { id: number; type: string; title: string; maskedNumber: string | null; holderName: string | null; expiryDate: string | null; isDefault: boolean };
type Rates = { uzsPerUsd: number; uzsPerEur: number };

function useWallet() {
  return useQuery<{ wallet: WalletData; rates?: Rates }>({
    queryKey: ["wallet"],
    queryFn: () => fetch(`${API}/api/wallet`, { credentials: "include" }).then(r => r.json()),
  });
}

function useTransactions() {
  return useQuery<{ transactions: TxData[] }>({
    queryKey: ["wallet-txs"],
    queryFn: () => fetch(`${API}/api/wallet/transactions`, { credentials: "include" }).then(r => r.json()),
  });
}

function usePaymentMethods() {
  return useQuery<{ paymentMethods: PMData[] }>({
    queryKey: ["wallet-pms"],
    queryFn: () => fetch(`${API}/api/wallet/payment-methods`, { credentials: "include" }).then(r => r.json()),
  });
}

// ─── Deposit Modal ────────────────────────────────────────────────────────────
function DepositModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"amount" | "method" | "processing" | "error">("amount");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [10000, 50000, 100000, 500000]; // tiyin: 100, 500, 1000, 5000 UZS

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/wallet/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: parseInt(amount) * 100, paymentMethod: method }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? t("wallet.generic_error"));
      setStep("error");
    },
    onError: () => { setError(t("wallet.generic_error")); setStep("error"); },
  });

  const handlePay = () => {
    setStep("processing");
    mut.mutate();
  };

  return (
    <ModalShell onClose={onClose} title={t("wallet.deposit_title")}>
      {step === "amount" && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("wallet.amount_label")}</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 text-2xl font-bold rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">UZS</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {presets.map(p => (
              <button key={p} onClick={() => setAmount(String(p / 100))}
                className="py-2 rounded-xl border border-border bg-muted/30 text-sm font-medium hover:bg-primary/10 hover:border-primary/40 transition text-foreground">
                {(p / 100).toLocaleString()}
              </button>
            ))}
          </div>
          <button
            disabled={!amount || parseInt(amount) < 1}
            onClick={() => setStep("method")}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40">
            {t("common.save")} →
          </button>
        </div>
      )}

      {step === "method" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("wallet.payment_methods")}</p>
          <div className="space-y-2">
            {PAYMENT_PROVIDERS.map(p => (
              <button key={p.id} disabled={p.disabled} onClick={() => setMethod(p.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition text-left ${p.disabled ? "opacity-40 cursor-not-allowed" : ""} ${method === p.id ? "border-primary bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"}`}>
                <span className="text-2xl">{p.logo}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{t(p.descKey)}</p>
                </div>
                {method === p.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("wallet.total_label")}</span>
            <span className="text-lg font-bold text-foreground">{parseInt(amount || "0").toLocaleString()} so'm</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("amount")} className="flex-1 py-3 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition">← {t("common.back")}</button>
            <button disabled={!method} onClick={handlePay}
              className="flex-2 flex-grow-[2] py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40">
              {t("wallet.deposit")}
            </button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-base font-semibold text-foreground">{t("common.loading")}</p>
          <p className="text-sm text-muted-foreground">{PAYMENT_PROVIDERS.find(p => p.id === method)?.label} {t("wallet.redirecting")}</p>
        </div>
      )}

      {step === "error" && (
        <div className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-base font-semibold text-foreground">{error}</p>
          <button onClick={() => setStep("method")} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">← {t("common.back")}</button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ wallet, onClose }: { wallet: WalletData; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [account, setAccount] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAvail = wallet.balance + wallet.earningsBalance + wallet.adRevenueBalance;

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: parseInt(amount) * 100, paymentMethod: method, accountDetails: account }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.error) { setError(data.error); setStep("form"); return; }
      setResult(data);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-txs"] });
    },
  });

  const handleSubmit = () => {
    setError(null);
    setStep("processing");
    mut.mutate();
  };

  return (
    <ModalShell onClose={onClose} title={t("wallet.withdraw_title")}>
      {step === "form" && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1">{t("wallet.available_balance")}</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalAvail)}</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("wallet.amount_uzs_label")}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" max={totalAvail / 100}
              className="w-full px-4 py-3 text-2xl font-bold rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("wallet.payment_method_label")}</label>
            <div className="grid grid-cols-1 gap-2">
              {PAYMENT_PROVIDERS.map(p => (
                <button key={p.id} disabled={p.disabled} onClick={() => setMethod(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${p.disabled ? "opacity-40 cursor-not-allowed" : ""} ${method === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
                  <span className="text-xl">{p.logo}</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground block">{p.label}</span>
                    {p.disabled && <span className="text-xs text-muted-foreground">{t("wallet.coming_soon")}</span>}
                  </div>
                  {method === p.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("wallet.account_phone_label")}</label>
            <input value={account} onChange={e => setAccount(e.target.value)}
              placeholder={t("wallet.account_phone_ph")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button
            disabled={!amount || !method || !account || parseInt(amount) * 100 > totalAvail}
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40">
            {t("wallet.withdraw_btn")}
          </button>
        </div>
      )}
      {step === "processing" && (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-base font-semibold text-foreground">{t("wallet.requesting")}</p>
        </div>
      )}
      {step === "done" && (
        <div className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-xl font-bold text-foreground">{t("wallet.request_accepted")}</p>
          <p className="text-sm text-muted-foreground">{fmt(Math.abs(result?.transaction?.amount ?? 0))}{t("wallet.request_pending_desc")}</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">{t("wallet.close")}</button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Add Payment Method Modal ─────────────────────────────────────────────────
function AddMethodModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [type, setType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [masked, setMasked] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNum, setShowNum] = useState(false);

  const cardProviders = PAYMENT_PROVIDERS.filter(p => p.id === "visa" || p.id === "mastercard");
  const mobileProviders = PAYMENT_PROVIDERS.filter(p => p.id === "click" || p.id === "payme");
  const globalProviders = PAYMENT_PROVIDERS.filter(p => p.id === "global");

  const needsCard = type === "visa" || type === "mastercard";
  const needsPhone = type === "click" || type === "payme";

  const handleSave = async () => {
    if (!type || !title) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/wallet/payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, title, maskedNumber: masked || undefined, holderName: holder || undefined, expiryDate: expiry || undefined, isDefault }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error(d?.error ?? "To'lov usuli qo'shilmadi. Qayta urinib ko'ring.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["wallet-pms"] });
      onClose();
    } catch {
      toast.error("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={t("wallet.add_method_title")}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.card_category")}</p>
          <div className="grid grid-cols-2 gap-2">
            {cardProviders.map(p => (
              <button key={p.id} onClick={() => { setType(p.id); setTitle(p.label); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition ${type === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
                <span className="text-xl">{p.logo}</span>
                <span className="text-sm font-medium text-foreground">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.mobile_category")}</p>
          <div className="grid grid-cols-2 gap-2">
            {mobileProviders.map(p => (
              <button key={p.id} onClick={() => { setType(p.id); setTitle(p.label); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition ${type === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
                <span className="text-xl">{p.logo}</span>
                <span className="text-sm font-medium text-foreground">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.international_category")}</p>
          {globalProviders.map(p => (
            <button key={p.id} onClick={() => { setType(p.id); setTitle(p.label); }}
              className={`w-full flex items-center gap-2 p-3 rounded-xl border transition ${type === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
              <span className="text-xl">{p.logo}</span>
              <span className="text-sm font-medium text-foreground">{p.label}</span>
            </button>
          ))}
        </div>

        {type && (
          <div className="space-y-3 pt-1">
            <div className="h-px bg-border" />
            {needsCard && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t("wallet.card_number_label")}</label>
                  <div className="relative">
                    <input
                      type={showNum ? "text" : "password"}
                      value={masked} onChange={e => setMasked(e.target.value)}
                      placeholder={t("wallet.card_number_ph")}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button type="button" onClick={() => setShowNum(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNum ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{t("wallet.holder_label")}</label>
                    <input value={holder} onChange={e => setHolder(e.target.value)} placeholder={t("wallet.holder_ph")}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{t("wallet.expiry_label")}</label>
                    <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder={t("wallet.expiry_ph")}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                </div>
              </>
            )}
            {needsPhone && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("wallet.phone_label")}</label>
                <input value={masked} onChange={e => setMasked(e.target.value)} placeholder={t("wallet.phone_ph")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDefault(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isDefault ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDefault ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-foreground">{t("wallet.set_default_label")}</span>
            </div>
            <button disabled={saving} onClick={handleSave}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Shared Modal Shell ───────────────────────────────────────────────────────
function ModalShell({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: walletData, isLoading: wLoading } = useWallet();
  const { data: txData } = useTransactions();
  const { data: pmData } = usePaymentMethods();

  const [modal, setModal] = useState<"deposit" | "withdraw" | "add-method" | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [depositBanner, setDepositBanner] = useState<{ kind: "success" | "error" | "canceled"; message: string } | null>(null);

  const wallet = walletData?.wallet;
  const uzsPerUsd = walletData?.rates?.uzsPerUsd ?? 12800;
  const transactions = txData?.transactions ?? [];
  const paymentMethods = pmData?.paymentMethods ?? [];

  const deletePM = useMutation({
    mutationFn: (id: number) => fetch(`${API}/api/wallet/payment-methods/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet-pms"] }),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("deposit_session");
    const canceled = params.get("deposit_canceled");
    if (sessionId) {
      fetch(`${API}/api/wallet/deposit/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      })
        .then(r => r.json())
        .then((data) => {
          if (data.wallet) {
            setDepositBanner({ kind: "success", message: `${t("wallet.topped_up")}: +${fmt(data.transaction?.amount ?? 0)}` });
            qc.invalidateQueries({ queryKey: ["wallet"] });
            qc.invalidateQueries({ queryKey: ["wallet-txs"] });
          } else {
            setDepositBanner({ kind: "error", message: data.error ?? t("wallet.confirm_error") });
          }
        })
        .catch(() => setDepositBanner({ kind: "error", message: t("wallet.confirm_error") }));
      window.history.replaceState({}, "", window.location.pathname);
    } else if (canceled) {
      setDepositBanner({ kind: "canceled", message: t("wallet.payment_canceled") });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (wLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalTiyin = (wallet?.balance ?? 0) + (wallet?.earningsBalance ?? 0) + (wallet?.adRevenueBalance ?? 0);
  const balanceDisplay = hideBalance ? "••••••" : fmt(wallet?.balance ?? 0);
  const earningsDisplay = hideBalance ? "••••••" : fmt(wallet?.earningsBalance ?? 0);
  const adDisplay = hideBalance ? "••••••" : fmt(wallet?.adRevenueBalance ?? 0);
  const totalDisplay = hideBalance ? "••••••" : fmt(totalTiyin);
  const totalUsdDisplay = hideBalance ? "••••" : fmtUSD(totalTiyin, uzsPerUsd);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("wallet.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("wallet.subtitle")}</p>
            </div>
          </div>
          <button onClick={() => setHideBalance(v => !v)} className="text-muted-foreground hover:text-foreground transition">
            {hideBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {depositBanner && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 ${
            depositBanner.kind === "success" ? "bg-green-500/10 border-green-500/30 text-green-400"
            : depositBanner.kind === "canceled" ? "bg-muted/30 border-border text-muted-foreground"
            : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            <p className="text-sm font-medium">{depositBanner.message}</p>
            <button onClick={() => setDepositBanner(null)} className="opacity-70 hover:opacity-100 transition"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Total balance hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-violet-700 p-6 mb-6 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white" />
          </div>
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">{t("wallet.total_balance")}</p>
          <p className="text-4xl font-black text-primary-foreground">{totalDisplay}</p>
          <p className="text-primary-foreground/55 text-sm mb-4 mt-0.5">{totalUsdDisplay}</p>
          <div className="flex gap-3">
            <button onClick={() => setModal("deposit")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-primary-foreground text-sm font-semibold transition backdrop-blur">
              <ArrowDownCircle className="w-4 h-4" /> {t("wallet.deposit")}
            </button>
            <button onClick={() => setModal("withdraw")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-primary-foreground text-sm font-semibold transition backdrop-blur">
              <ArrowUpCircle className="w-4 h-4" /> {t("wallet.withdraw")}
            </button>
          </div>
        </div>

        {/* Three balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <BalanceCard
            title={t("wallet.personal_balance")}
            amount={balanceDisplay}
            icon={<Wallet className="w-5 h-5" />}
            gradient="from-blue-600/20 to-cyan-600/20"
            border="border-blue-500/20"
            iconBg="bg-blue-500/20"
            iconColor="text-blue-400"
          />
          <BalanceCard
            title={t("wallet.earnings")}
            amount={earningsDisplay}
            icon={<TrendingUp className="w-5 h-5" />}
            gradient="from-emerald-600/20 to-green-600/20"
            border="border-emerald-500/20"
            iconBg="bg-emerald-500/20"
            iconColor="text-emerald-400"
          />
          <BalanceCard
            title={t("wallet.ad_revenue")}
            amount={adDisplay}
            icon={<Megaphone className="w-5 h-5" />}
            gradient="from-orange-600/20 to-yellow-600/20"
            border="border-orange-500/20"
            iconBg="bg-orange-500/20"
            iconColor="text-orange-400"
          />
        </div>

        {/* Payment methods */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">{t("wallet.payment_methods")}</h2>
            <button onClick={() => setModal("add-method")}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:opacity-80 transition">
              <Plus className="w-4 h-4" /> {t("wallet.add")}
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">{t("wallet.no_methods")}</p>
              <button onClick={() => setModal("add-method")} className="mt-3 text-sm text-primary font-medium hover:opacity-80 transition">+ {t("wallet.add")}</button>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition group">
                  <span className="text-2xl">{PM_ICONS[pm.type] ?? "💳"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{pm.title}</p>
                      {pm.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{t("wallet.default_badge")}</span>}
                    </div>
                    {pm.maskedNumber && <p className="text-xs text-muted-foreground font-mono">{pm.maskedNumber}</p>}
                    {pm.holderName && <p className="text-xs text-muted-foreground">{pm.holderName}{pm.expiryDate ? ` · ${pm.expiryDate}` : ""}</p>}
                  </div>
                  <button onClick={() => deletePM.mutate(pm.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Supported gateways banner */}
          <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">{t("wallet.supported_label")}</span>
            {PAYMENT_PROVIDERS.map(p => (
              <div key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border ${p.disabled ? "opacity-50" : ""}`}>
                <span className="text-sm">{p.logo}</span>
                <span className="text-xs font-medium text-foreground">{p.label}{p.disabled ? ` · ${t("wallet.coming_soon")}` : ""}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">{t("wallet.transactions")}</h2>
            <button onClick={() => { qc.invalidateQueries({ queryKey: ["wallet-txs"] }); }}
              className="text-muted-foreground hover:text-foreground transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-border bg-muted/20 text-center">
              <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">{t("wallet.no_tx")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const meta = TX_TYPE_META[tx.type] ?? { label: tx.type, icon: ArrowLeftRight, color: "text-muted-foreground" };
                const TxIcon = meta.icon;
                const isCredit = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/40 ${meta.color}`}>
                      <TxIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{t(meta.label)}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground truncate">{tx.description ?? tx.reference ?? ""}</p>
                        {tx.paymentMethod && tx.paymentMethod !== "internal" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex-shrink-0">
                            {PM_ICONS[tx.paymentMethod] ?? ""} {tx.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {fmtSigned(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {modal === "deposit" && <DepositModal onClose={() => setModal(null)} />}
      {modal === "withdraw" && wallet && <WithdrawModal wallet={wallet} onClose={() => setModal(null)} />}
      {modal === "add-method" && <AddMethodModal onClose={() => setModal(null)} />}
    </div>
  );
}

function BalanceCard({ title, amount, icon, gradient, border, iconBg, iconColor, action }: {
  title: string; amount: string; icon: React.ReactNode;
  gradient: string; border: string; iconBg: string; iconColor: string;
  action?: { label: string; onClick: () => void; loading: boolean };
}) {
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} border ${border} relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {action && (
          <button onClick={action.onClick} disabled={action.loading}
            className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1 disabled:opacity-40">
            {action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {action.label}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-lg font-black text-foreground leading-tight">{amount}</p>
    </div>
  );
}
