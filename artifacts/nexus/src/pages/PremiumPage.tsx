import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, Zap, Shield, Star, Loader2 } from "lucide-react";

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

const FEATURES = [
  "Reklama yo'q — to'liq toza tajriba",
  "Eksklyuziv oltin 👑 badge profilingizda",
  "Cheksiz story yuklash",
  "Kengaytirilgan postlar tahlili",
  "Premium AI tavsiyalar",
  "Priority qo'llab-quvvatlash",
];

function formatPrice(unitAmount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(unitAmount / 100);
}

export default function PremiumPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (prodRes.ok) {
          const { data } = await prodRes.json();
          setProducts(data ?? []);
        }
        if (subRes?.ok) {
          const { subscription: sub } = await subRes.json();
          setSubscription(sub);
        }
      } catch {
        setError("Ma'lumotlarni yuklashda xato");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleCheckout = async (priceId: string) => {
    if (!user) return;
    setCheckingOut(priceId);
    setError(null);
    try {
      const res = await fetch(`${API}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout xatosi");
      }
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setCheckingOut(null);
    }
  };

  const handlePortal = async () => {
    try {
      const res = await fetch(`${API}/api/stripe/portal`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Portal xatosi");
    }
  };

  const premiumProduct = products[0];
  const monthlyPrice = premiumProduct?.prices.find(p => p.recurring?.interval === "month");
  const yearlyPrice = premiumProduct?.prices.find(p => p.recurring?.interval === "year");
  const isActive = subscription?.status === "active";

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">OlCha Premium</h1>
          <p className="text-muted-foreground text-lg">Platforma tajribangizni yangi bosqichga olib chiqing</p>
        </div>

        {/* Success / Cancel banners */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-center font-medium">
            🎉 Premium obunangiz faollashtirildi! Xush kelibsiz.
          </div>
        )}
        {canceled && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-center">
            To'lov bekor qilindi. Istalgan vaqt qaytib kelishingiz mumkin.
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Active subscription */}
        {isActive && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-center">
            <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-foreground font-semibold text-lg">Siz Premium foydalanuvchisiz!</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Obuna holati: <span className="text-green-400 font-medium">Faol</span>
            </p>
            <button
              onClick={handlePortal}
              className="px-6 py-2 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-sm font-medium"
            >
              Obunani boshqarish
            </button>
          </div>
        )}

        {/* Features */}
        <div className="mb-10 p-6 rounded-2xl bg-card border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" /> Premium xususiyatlar
          </h2>
          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !premiumProduct ? (
          <div className="text-center text-muted-foreground py-8">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Hozircha to'lov rejalari sozlanmagan.</p>
          </div>
        ) : (
          !isActive && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Monthly */}
              {monthlyPrice && (
                <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Oylik</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mt-3 mb-1">
                    {formatPrice(monthlyPrice.unitAmount, monthlyPrice.currency)}
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">har oyda</p>
                  <button
                    onClick={() => handleCheckout(monthlyPrice.id)}
                    disabled={!user || checkingOut === monthlyPrice.id}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingOut === monthlyPrice.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {user ? "Obuna bo'lish" : "Kirish talab qilinadi"}
                  </button>
                </div>
              )}

              {/* Yearly */}
              {yearlyPrice && (
                <div className="p-6 rounded-2xl border-2 border-yellow-500/50 bg-card relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold">
                    33% TEJASH
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-foreground">Yillik</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mt-3 mb-1">
                    {formatPrice(yearlyPrice.unitAmount, yearlyPrice.currency)}
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">har yilda</p>
                  <button
                    onClick={() => handleCheckout(yearlyPrice.id)}
                    disabled={!user || checkingOut === yearlyPrice.id}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingOut === yearlyPrice.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {user ? "Premium olish" : "Kirish talab qilinadi"}
                  </button>
                </div>
              )}
            </div>
          )
        )}

        <p className="text-center text-muted-foreground text-xs mt-8">
          To'lovlar Stripe orqali xavfsiz amalga oshiriladi. Istalgan vaqt bekor qilish mumkin.
        </p>
      </div>
    </div>
  );
}
