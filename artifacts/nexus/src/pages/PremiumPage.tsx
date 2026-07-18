import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  Crown, Check, X, Zap, Shield, Loader2,
  Sparkles, Rocket, BadgeCheck, TrendingUp, Eye,
  MessageSquare, BarChart3, Headphones, ChevronDown,
  ArrowRight, Play, Image, Megaphone, Bot, Lock
} from "lucide-react";
import { motion } from "framer-motion";
import PremiumHeroLogo from "@/components/PremiumHeroLogo";

interface Price {
  id: string;
  unitAmount: number;
  currency: string;
  recurring: { interval: string } | null;
}
interface Product {
  id: string;
  name: string;
  description: string;
  prices: Price[];
}

const API = (import.meta.env.VITE_API_BASE_URL || "https://olchaai-api.onrender.com");

// ── Currency detection from browser locale ─────────────────────────────────
const LANG_TO_CURRENCY: Record<string, string> = {
  "uz": "UZS", "ru": "RUB", "ko": "KRW", "ja": "JPY",
  "zh": "CNY", "tr": "TRY", "de": "EUR", "fr": "EUR",
  "it": "EUR", "es": "EUR", "pt": "EUR", "nl": "EUR",
  "pl": "PLN", "kk": "KZT", "az": "AZN", "ka": "GEL",
  "ar": "AED", "en": "USD",
  "en-gb": "GBP", "en-au": "AUD", "en-ca": "CAD",
};
function getLocalCurrency(): string {
  const lang = (navigator.language || "en").toLowerCase();
  return LANG_TO_CURRENCY[lang] ?? LANG_TO_CURRENCY[lang.split("-")[0]] ?? "USD";
}

// Rates: 1 USD = X major units of currency
const USD_TO: Record<string, number> = {
  USD: 1,   EUR: 0.92, GBP: 0.79, RUB: 91.5, CNY: 7.24,
  KRW: 1340, JPY: 154, TRY: 32.5, KZT: 450,  AED: 3.67,
  AZN: 1.70, GEL: 2.67, PLN: 3.96, CAD: 1.37, AUD: 1.54,
  UZS: 12800,
};
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", RUB: "₽", CNY: "¥",
  KRW: "₩", JPY: "¥", TRY: "₺", KZT: "₸", AED: "د.إ",
  AZN: "₼", GEL: "₾", PLN: "zł", CAD: "CA$", AUD: "A$",
  UZS: " so'm",
};
const NO_DECIMAL = new Set(["KRW", "JPY", "UZS", "KZT"]);

function convertUsdCents(usdCents: number, currency: string): string {
  const rate = USD_TO[currency.toUpperCase()] ?? 1;
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency;
  const noDecimal = NO_DECIMAL.has(currency.toUpperCase());
  const major = (usdCents / 100) * rate;
  const formatted = major.toLocaleString("en-US", {
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  });
  // Put symbol before or after depending on currency
  const isPost = ["UZS", "PLN", "KZT"].includes(currency.toUpperCase());
  return isPost ? `${formatted}${sym}` : `${sym}${formatted}`;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0 }).format(amount / 100);
}

function FeatureCheck({ value }: { value: string | boolean }) {
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  return <span className="text-xs text-muted-foreground text-center block">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition">
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>}
    </div>
  );
}

export default function PremiumPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"month" | "year">("month");

  const PLAN_FEATURES = [
    { icon: Megaphone,     label: t("premium.feat_ads"),       free: t("premium.free_ads"),         premium: t("premium.no_ads") },
    { icon: Image,         label: t("premium.feat_story"),     free: t("premium.stories_daily"),    premium: t("premium.unlimited") },
    { icon: BarChart3,     label: t("premium.feat_analytics"), free: t("premium.analytics_basic"),  premium: t("premium.analytics_deep") },
    { icon: Bot,           label: t("premium.feat_ai"),        free: t("premium.ai_limited"),       premium: t("premium.ai_full") },
    { icon: Eye,           label: t("premium.feat_viewers"),   free: false,                         premium: true },
    { icon: BadgeCheck,    label: t("premium.feat_badge"),     free: false,                         premium: true },
    { icon: TrendingUp,    label: t("premium.feat_algo"),      free: t("premium.algo_standard"),    premium: t("premium.algo_priority") },
    { icon: MessageSquare, label: t("premium.feat_msg"),       free: t("premium.msg_limited"),      premium: t("premium.msg_unlimited") },
    { icon: Play,          label: t("premium.feat_reels"),     free: false,                         premium: true },
    { icon: Headphones,    label: t("premium.feat_support"),   free: t("premium.support_general"),  premium: t("premium.support_priority") },
    { icon: Shield,        label: t("premium.feat_security"),  free: t("premium.security_standard"),premium: t("premium.security_enhanced") },
    { icon: Lock,          label: t("premium.feat_exclusive"), free: false,                         premium: true },
  ];

  const FAQS = [
    { q: t("premium.faq1_q"), a: t("premium.faq1_a") },
    { q: t("premium.faq2_q"), a: t("premium.faq2_a") },
    { q: t("premium.faq3_q"), a: t("premium.faq3_a") },
    { q: t("premium.faq4_q"), a: t("premium.faq4_a") },
  ];

  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, subRes] = await Promise.all([
          fetch(`${API}/api/stripe/products`),
          user ? fetch(`${API}/api/stripe/subscription`, { credentials: "include" }) : Promise.resolve(null),
        ]);
        if (prodRes.ok) { const { data } = await prodRes.json(); setProducts(data ?? []); }
        if (subRes?.ok) { const { subscription: sub } = await subRes.json(); setSubscription(sub); }
      } catch { /* silent */ } finally { setLoading(false); }
    }
    load();
  }, [user]);

  const localCurrency = getLocalCurrency();

  const handleCheckout = async (priceId: string) => {
    if (!user) { navigate("/"); return; }
    setCheckingOut(priceId); setError(null);
    try {
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId, currency: localCurrency }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? t("premium.checkout_err"));
    } catch { setError(t("common.network_error")); } finally { setCheckingOut(null); }
  };

  const handlePortal = async () => {
    try {
      const res = await fetch(`${API}/api/stripe/portal`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setError(t("premium.portal_err")); }
  };

  const premiumProduct = products[0];
  const activePrice = premiumProduct?.prices.find(p => p.recurring?.interval === billing);
  const monthlyPrice = premiumProduct?.prices.find(p => p.recurring?.interval === "month");
  const yearlyPrice = premiumProduct?.prices.find(p => p.recurring?.interval === "year");
  const isActive = subscription?.status === "active";

  const savings = monthlyPrice && yearlyPrice
    ? Math.round((1 - (yearlyPrice.unitAmount / 12) / monthlyPrice.unitAmount) * 100)
    : 33;

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-primary/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-medium">
              🎉 {t("premium.activated")}
            </motion.div>
          )}
          {canceled && (
            <div className="mb-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              {t("premium.canceled_msg")}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto mb-4 flex items-center justify-center"
          >
            <PremiumHeroLogo size={180} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> OlchaAI Premium
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-4 leading-tight">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{t("premium.hero_title")}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              {t("premium.hero_sub")}
            </p>
          </motion.div>

          {/* Active subscription banner */}
          {isActive && (
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/30 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-foreground">{t("premium.you_are_premium")}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("premium.status")} <span className="text-green-400 font-medium">{t("premium.active")}</span>
              </p>
              <button onClick={handlePortal}
                className="px-5 py-2 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition text-sm font-medium">
                {t("premium.manage")}
              </button>
            </div>
          )}

          {/* Billing toggle */}
          {!isActive && (
            <div className="inline-flex items-center bg-muted/40 border border-border rounded-2xl p-1 mb-10">
              <button onClick={() => setBilling("month")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${billing === "month" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {t("premium.monthly")}
              </button>
              <button onClick={() => setBilling("year")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${billing === "year" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {t("premium.yearly")}
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">{savings}% {t("premium.savings")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Pricing cards */}
        {!isActive && (
          <div className="grid md:grid-cols-2 gap-5 mb-16">

            {/* Free plan */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl border border-border bg-card">
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("premium.free_label")}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-foreground">0</span>
                  <span className="text-muted-foreground mb-1">{t("premium.som", { defaultValue: "UZS" })}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t("premium.basic_features")}</p>
              </div>
              <button disabled className="w-full py-3 rounded-xl border border-border text-muted-foreground text-sm font-medium cursor-default">
                {t("premium.current_plan")}
              </button>
            </motion.div>

            {/* Premium plan */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-b-xl text-black text-xs font-black">
                ✨ {t("premium.recommended")}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 mt-5 mb-5"><Loader2 className="w-5 h-5 animate-spin text-yellow-400" /><span className="text-sm text-muted-foreground">{t("premium.loading_prices")}</span></div>
              ) : (
                <div className="mb-5 mt-2">
                  <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-2">Premium</p>
                  {(billing === "month" ? monthlyPrice : yearlyPrice) ? (() => {
                    const baseUsdCents = billing === "year" && yearlyPrice
                      ? Math.round(yearlyPrice.unitAmount / 12)
                      : (monthlyPrice?.unitAmount ?? 0);
                    const isLocal = localCurrency !== (monthlyPrice?.currency ?? "usd").toUpperCase();
                    return (
                      <>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-black text-foreground">
                            {convertUsdCents(baseUsdCents, localCurrency)}
                          </span>
                          <span className="text-muted-foreground mb-1">/ {t("premium.per_month")}</span>
                        </div>
                        {isLocal && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ≈ {formatPrice(baseUsdCents, monthlyPrice?.currency ?? "usd")} USD
                          </p>
                        )}
                        {billing === "year" && yearlyPrice && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {convertUsdCents(yearlyPrice.unitAmount, localCurrency)} {t("premium.billed_yearly")}
                          </p>
                        )}
                      </>
                    );
                  })() : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-foreground">49 900</span>
                      <span className="text-muted-foreground mb-1">{t("premium.som", { defaultValue: "UZS" })} / {t("premium.per_month")}</span>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

              {user ? (
                <button
                  onClick={() => {
                    const price = billing === "month" ? monthlyPrice : yearlyPrice;
                    if (price) handleCheckout(price.id);
                    else setError(t("premium.not_configured"));
                  }}
                  disabled={!!checkingOut}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
                  {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  {t("premium.get")}
                  {!checkingOut && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition flex items-center justify-center gap-2 text-sm">
                  <Rocket className="w-4 h-4" />
                  {t("premium.login_to_start")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <p className="text-center text-xs text-muted-foreground mt-3">
                {t("premium.cancel_anytime")}
              </p>
            </motion.div>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-foreground text-center mb-2">{t("premium.comparison_title")}</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">{t("premium.comparison_sub")}</p>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/30 border-b border-border px-5 py-3">
              <span className="text-xs font-semibold text-muted-foreground">{t("premium.feature_col")}</span>
              <span className="text-xs font-semibold text-muted-foreground text-center">{t("premium.free_label")}</span>
              <span className="text-xs font-semibold text-yellow-500 text-center flex items-center justify-center gap-1"><Crown className="w-3 h-3" />Premium</span>
            </div>
            {PLAN_FEATURES.map(({ icon: Icon, label, free, premium }, i) => (
              <div key={i} className={`grid grid-cols-3 items-center px-5 py-3.5 border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <div className="text-center"><FeatureCheck value={free} /></div>
                <div className="text-center"><FeatureCheck value={premium} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-foreground text-center mb-2">{t("premium.faq_title")}</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">{t("premium.faq_sub")}</p>
          <div className="space-y-3 max-w-2xl mx-auto">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* Bottom CTA */}
        {!isActive && (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border border-yellow-500/30 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-yellow-500/20 blur-3xl rounded-full" />
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4 relative" />
            <h3 className="text-2xl font-black text-foreground mb-2 relative">{t("premium.start_today")}</h3>
            <p className="text-muted-foreground text-sm mb-6 relative">{t("premium.refund_msg")}</p>
            {user ? (
              <button
                onClick={() => {
                  const price = billing === "month" ? monthlyPrice : yearlyPrice;
                  if (price) handleCheckout(price.id);
                }}
                disabled={!!checkingOut}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition text-sm relative disabled:opacity-60">
                {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {t("premium.get_premium")}
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition text-sm relative">
                <Rocket className="w-4 h-4" />
                {t("premium.login_start")}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-4 relative">{t("premium.stripe_secure")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
