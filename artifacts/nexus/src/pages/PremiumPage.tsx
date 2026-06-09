import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  Crown, Check, X, Zap, Shield, Star, Loader2,
  Sparkles, Rocket, BadgeCheck, TrendingUp, Eye,
  MessageSquare, BarChart3, Headphones, ChevronDown,
  ArrowRight, Play, Image, Megaphone, Bot, Lock
} from "lucide-react";
import logoImg from "@assets/image_1781005493710.png";
import { motion } from "framer-motion";

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

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLAN_FEATURES = [
  { icon: Megaphone,    label: "Reklama",              free: "Reklamalar bor",   premium: "Reklama yo'q" },
  { icon: Image,        label: "Story yuklash",        free: "Kuniga 5 ta",      premium: "Cheksiz" },
  { icon: BarChart3,    label: "Tahlil va statistika", free: "Asosiy",           premium: "Chuqur tahlil" },
  { icon: Bot,          label: "AI yordamchi",         free: "Cheklangan",       premium: "To'liq kirish" },
  { icon: Eye,          label: "Ko'rganlar ro'yxati",  free: false,              premium: true },
  { icon: BadgeCheck,   label: "Oltin badge 👑",       free: false,              premium: true },
  { icon: TrendingUp,   label: "Tavsiya algoritmi",    free: "Standart",         premium: "Priority" },
  { icon: MessageSquare,label: "Xabar yuborish",       free: "Cheklangan",       premium: "Cheksiz" },
  { icon: Play,         label: "Reels monetizatsiya",  free: false,              premium: true },
  { icon: Headphones,   label: "Qo'llab-quvvatlash",  free: "Umumiy",           premium: "Priority 24/7" },
  { icon: Shield,       label: "Hisob himoyasi",       free: "Standart",         premium: "Kuchaytirilgan" },
  { icon: Lock,         label: "Eksklyuziv kontent",   free: false,              premium: true },
];

const TESTIMONIALS = [
  { name: "Dildora T.", handle: "@dildora_art", avatar: "D", text: "Premium ga o'tganimdan keyin followerlarim 3x o'sdi. AI tavsiyalar juda kuchli!", stars: 5 },
  { name: "Jasur M.", handle: "@jasur_tech", avatar: "J", text: "Reklama yo'q bo'lgani juda yaxshi. Toza va qulay platforma.", stars: 5 },
  { name: "Nilufar K.", handle: "@nilufar_blog", avatar: "N", text: "Chuqur statistika mening kontent strategiyamni to'liq o'zgartirdi.", stars: 5 },
];

const FAQS = [
  { q: "Premium qanday ishlaydi?", a: "Obunaga yozilgach darhol barcha Premium imkoniyatlar faollashadi. Oylik yoki yillik reja tanlashingiz mumkin." },
  { q: "Bekor qilsam nima bo'ladi?", a: "Istalgan vaqt bekor qilishingiz mumkin. To'lov davri tugaguncha Premium imkoniyatlardan foydalanishda davom etasiz." },
  { q: "Qaytarib olish mumkinmi?", a: "Ha, 7 kun ichida bekor qilsangiz to'liq qaytarib olasiz." },
  { q: "Bir nechta qurilmada ishlatsa bo'ladimi?", a: "Ha, hisobingizga kirgan barcha qurilmalarda ishlaydi." },
];

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0 }).format(amount / 100);
}

function StarRating({ n }: { n: number }) {
  return <div className="flex gap-0.5">{Array.from({ length: n }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}</div>;
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
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const handleCheckout = async (priceId: string) => {
    if (!user) { navigate("/"); return; }
    setCheckingOut(priceId); setError(null);
    try {
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Checkout xatosi");
    } catch { setError("Tarmoq xatosi"); } finally { setCheckingOut(null); }
  };

  const handlePortal = async () => {
    try {
      const res = await fetch(`${API}/api/stripe/portal`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setError("Portal xatosi"); }
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
              🎉 Premium obunangiz faollashtirildi! Xush kelibsiz.
            </motion.div>
          )}
          {canceled && (
            <div className="mb-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              To'lov bekor qilindi. Istalgan vaqt qaytib kelishingiz mumkin.
            </div>
          )}

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="mx-auto mb-6 relative w-24 h-24">
            <img src={logoImg} alt="OlCha" className="w-24 h-24 rounded-full object-cover shadow-2xl shadow-yellow-900/40" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-black" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> OlCha Premium
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-4 leading-tight">
              Ijtimoiy tarmoqda<br />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">ustunlikka ega bo'ling</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Reklama yo'q, cheksiz imkoniyatlar, AI yordamchi va eksklyuziv xususiyatlar bilan platformadan to'liq foydalaning.
            </p>
          </motion.div>

          {/* Active subscription banner */}
          {isActive && (
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/30 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-foreground">Siz Premium foydalanuvchisiz!</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Holat: <span className="text-green-400 font-medium">Faol</span></p>
              <button onClick={handlePortal}
                className="px-5 py-2 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition text-sm font-medium">
                Obunani boshqarish
              </button>
            </div>
          )}

          {/* Billing toggle */}
          {!isActive && (
            <div className="inline-flex items-center bg-muted/40 border border-border rounded-2xl p-1 mb-10">
              <button onClick={() => setBilling("month")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${billing === "month" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                Oylik
              </button>
              <button onClick={() => setBilling("year")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${billing === "year" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                Yillik
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">{savings}% tejash</span>
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bepul</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-foreground">0</span>
                  <span className="text-muted-foreground mb-1">so'm</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Asosiy imkoniyatlar</p>
              </div>
              <button disabled className="w-full py-3 rounded-xl border border-border text-muted-foreground text-sm font-medium cursor-default">
                Hozirgi reja
              </button>
            </motion.div>

            {/* Premium plan */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-b-xl text-black text-xs font-black">
                ✨ TAVSIYA ETILADI
              </div>

              {loading ? (
                <div className="flex items-center gap-2 mt-5 mb-5"><Loader2 className="w-5 h-5 animate-spin text-yellow-400" /><span className="text-sm text-muted-foreground">Narxlar yuklanmoqda...</span></div>
              ) : (
                <div className="mb-5 mt-2">
                  <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-2">Premium</p>
                  {(billing === "month" ? monthlyPrice : yearlyPrice) ? (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-foreground">
                          {formatPrice(
                            billing === "year" && yearlyPrice
                              ? Math.round(yearlyPrice.unitAmount / 12)
                              : (monthlyPrice?.unitAmount ?? 0),
                            monthlyPrice?.currency ?? "usd"
                          )}
                        </span>
                        <span className="text-muted-foreground mb-1">/ oy</span>
                      </div>
                      {billing === "year" && yearlyPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatPrice(yearlyPrice.unitAmount, yearlyPrice.currency)} yiliga to'lanadi
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-foreground">49 900</span>
                      <span className="text-muted-foreground mb-1">so'm / oy</span>
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
                    else setError("To'lov rejalari hali sozlanmagan");
                  }}
                  disabled={!!checkingOut}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
                  {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  Premium olish
                  {!checkingOut && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition flex items-center justify-center gap-2 text-sm">
                  <Rocket className="w-4 h-4" />
                  Boshlash uchun kiring
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <p className="text-center text-xs text-muted-foreground mt-3">
                Istalgan vaqt bekor qilish mumkin
              </p>
            </motion.div>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-foreground text-center mb-2">Nima qo'shimcha olasiz?</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">Bepul va Premium rejalari taqqoslash</p>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/30 border-b border-border px-5 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Xususiyat</span>
              <span className="text-xs font-semibold text-muted-foreground text-center">Bepul</span>
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

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-foreground text-center mb-2">Foydalanuvchilar nima deydi</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">Premium foydalanuvchilarning fikrlari</p>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                className="p-5 rounded-2xl border border-border bg-card">
                <StarRating n={t.stars} />
                <p className="text-sm text-muted-foreground my-3 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.handle}</p>
                  </div>
                  <BadgeCheck className="w-4 h-4 text-yellow-400 ml-auto" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-16 grid grid-cols-3 gap-4">
          {[
            { value: "500K+", label: "Faol foydalanuvchi" },
            { value: "98%",   label: "Qoniqish darajasi" },
            { value: "3x",    label: "Ko'proq ko'rinish" },
          ].map((s, i) => (
            <div key={i} className="p-5 rounded-2xl border border-border bg-card text-center">
              <p className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-foreground text-center mb-2">Ko'p so'raladigan savollar</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">Bilmoqchi bo'lgan narsangiz</p>
          <div className="space-y-3 max-w-2xl mx-auto">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* Bottom CTA */}
        {!isActive && (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border border-yellow-500/30 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-yellow-500/20 blur-3xl rounded-full" />
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4 relative" />
            <h3 className="text-2xl font-black text-foreground mb-2 relative">Bugun boshlang</h3>
            <p className="text-muted-foreground text-sm mb-6 relative">7 kun ichida bekor qilsangiz to'liq qaytarib olasiz</p>
            {user ? (
              <button
                onClick={() => {
                  const price = billing === "month" ? monthlyPrice : yearlyPrice;
                  if (price) handleCheckout(price.id);
                }}
                disabled={!!checkingOut}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition text-sm relative disabled:opacity-60">
                {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Premium Olish
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black hover:opacity-90 transition text-sm relative">
                <Rocket className="w-4 h-4" />
                Kirish va Boshlash
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-4 relative">To'lovlar Stripe orqali xavfsiz amalga oshiriladi</p>
          </div>
        )}
      </div>
    </div>
  );
}
