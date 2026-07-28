import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Check, X, Minus, ChevronDown, ChevronUp,
  Trophy, Zap, Shield, Globe, Star, TrendingUp, Users,
  MessageCircle, Video, ShoppingBag, Brain, Lock, Coins,
  BarChart3, Award, Crown, Sparkles,
} from "lucide-react";

/* ─── Data ──────────────────────────────────────────────────── */
type PlatformId = "gilos" | "instagram" | "tiktok" | "telegram" | "youtube" | "twitter" | "facebook" | "snapchat";

type Platform = {
  id: PlatformId;
  name: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
  score: number;
  badge?: string;
  highlight?: boolean;
};

const PLATFORMS: Platform[] = [
  { id: "gilos",     name: "GilosAI",    subtitle: "olchaai.com", color: "#f97316", bg: "from-orange-950/60 to-amber-950/40",  border: "border-orange-500/40",  score: 94, badge: "🏆 Yetakchi", highlight: true },
  { id: "instagram", name: "Instagram",  subtitle: "Meta",        color: "#e1306c", bg: "from-pink-950/40 to-rose-950/30",     border: "border-pink-800/30",    score: 72 },
  { id: "tiktok",    name: "TikTok",     subtitle: "ByteDance",   color: "#00f2ea", bg: "from-cyan-950/40 to-teal-950/30",     border: "border-cyan-800/30",    score: 68 },
  { id: "telegram",  name: "Telegram",   subtitle: "TON Group",   color: "#2aabee", bg: "from-blue-950/40 to-sky-950/30",      border: "border-blue-800/30",    score: 65 },
  { id: "youtube",   name: "YouTube",    subtitle: "Google",      color: "#ff0000", bg: "from-red-950/40 to-rose-950/30",      border: "border-red-800/30",     score: 70 },
  { id: "twitter",   name: "X (Twitter)",subtitle: "xAI",         color: "#e5e7eb", bg: "from-neutral-950/40 to-zinc-950/30",  border: "border-neutral-700/30", score: 60 },
  { id: "facebook",  name: "Facebook",   subtitle: "Meta",        color: "#1877f2", bg: "from-blue-950/40 to-indigo-950/30",   border: "border-blue-800/30",    score: 55 },
  { id: "snapchat",  name: "Snapchat",   subtitle: "Snap Inc",    color: "#facc15", bg: "from-yellow-950/40 to-amber-950/30",  border: "border-yellow-800/30",  score: 50 },
];

// true = bor, false = yo'q, "partial" = qisman
const FEATURES: {
  category: string;
  icon: React.ElementType;
  items: { label: string; desc: string; values: Record<PlatformId, boolean | "partial" | string> }[];
}[] = [
  {
    category: "AI & Aqlli Xususiyatlar",
    icon: Brain,
    items: [
      { label: "AI lenta (smart feed)", desc: "Shaxsiylashtirilgan AI tavsiyalar", values: { gilos: true, instagram: "partial", tiktok: true, telegram: false, youtube: true, twitter: false, facebook: "partial", snapchat: false } },
      { label: "AI suhbat (chatbot)", desc: "To'liq integratsiyalashgan AI yordamchi", values: { gilos: true, instagram: false, tiktok: false, telegram: "partial", youtube: false, twitter: "partial", facebook: false, snapchat: false } },
      { label: "AI kontent yaratish", desc: "Post, caption, tasvir generatsiya", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Hissiyot tahlili", desc: "Postdagi kayfiyatni aniqlovchi AI", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "AI moderatsiya", desc: "Zararliy kontentni avtomatik aniqlash", values: { gilos: true, instagram: true, tiktok: true, telegram: false, youtube: true, twitter: "partial", facebook: true, snapchat: "partial" } },
      { label: "AI Egizak (AI Twin)", desc: "Foydalanuvchi AI nusxasi", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Ovoz tarjimon", desc: "Real vaqt ovozli tarjima", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: "partial", twitter: false, facebook: false, snapchat: false } },
    ],
  },
  {
    category: "Ijtimoiy Funksiyalar",
    icon: Users,
    items: [
      { label: "Post/Feed", desc: "Matn, rasm, video post", values: { gilos: true, instagram: true, tiktok: true, telegram: true, youtube: true, twitter: true, facebook: true, snapchat: true } },
      { label: "Ovozli fikrlar", desc: "Postga audio izoh qoldirish", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Anonim zonalar", desc: "Ismsiz fikr almashish", values: { gilos: true, instagram: false, tiktok: false, telegram: "partial", youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Birga tomosha", desc: "Real vaqt sinxron video tomosha", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Guruhlar", desc: "Jamoaviy suhbat va forum", values: { gilos: true, instagram: false, tiktok: false, telegram: true, youtube: false, twitter: false, facebook: true, snapchat: false } },
      { label: "Ko'cha qichqiriqlari", desc: "Joylashuvga asoslangan anonim xabarlar", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Soat yarimi sirlar", desc: "Faqat tunda ko'rinadigan kontentlar", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Ko'rsatkichlar", desc: "Ko'rish vaqtiga asoslangan tavsiya", values: { gilos: true, instagram: "partial", tiktok: true, telegram: false, youtube: true, twitter: false, facebook: "partial", snapchat: false } },
    ],
  },
  {
    category: "Video & Media",
    icon: Video,
    items: [
      { label: "Qisqa videolar (Reels)", desc: "TikTok/Reels uslubidagi videolar", values: { gilos: true, instagram: true, tiktok: true, telegram: false, youtube: true, twitter: false, facebook: true, snapchat: true } },
      { label: "Uzun video (OTube)", desc: "YouTube uslubidagi to'liq videolar", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: true, twitter: false, facebook: true, snapchat: false } },
      { label: "Jonli efir", desc: "Real vaqt live streaming", values: { gilos: true, instagram: true, tiktok: true, telegram: true, youtube: true, twitter: true, facebook: true, snapchat: true } },
      { label: "Ko'p sahna video", desc: "Split-screen video yaratish", values: { gilos: true, instagram: false, tiktok: "partial", telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Efir kollaboratsiyasi", desc: "Boshqalarni efirga taklif qilish", values: { gilos: true, instagram: true, tiktok: true, telegram: false, youtube: true, twitter: true, facebook: false, snapchat: false } },
    ],
  },
  {
    category: "Moliya & Savdo",
    icon: Coins,
    items: [
      { label: "Ichki hamyon", desc: "UZS/koin hamyon tizimi", values: { gilos: true, instagram: false, tiktok: "partial", telegram: true, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Kreatorga to'lov", desc: "Tomosha vaqti bo'yicha daromad", values: { gilos: true, instagram: "partial", tiktok: true, telegram: false, youtube: true, twitter: "partial", facebook: "partial", snapchat: false } },
      { label: "Marketplace", desc: "Tovar sotish platformasi", values: { gilos: true, instagram: true, tiktok: true, telegram: false, youtube: false, twitter: false, facebook: true, snapchat: false } },
      { label: "Sovg'a (tip)", desc: "Kreatorga to'g'ridan to'g'ri sovg'a", values: { gilos: true, instagram: false, tiktok: true, telegram: false, youtube: true, twitter: "partial", facebook: false, snapchat: false } },
      { label: "Premium obuna", desc: "Ayliq premium rejim", values: { gilos: true, instagram: false, tiktok: false, telegram: true, youtube: true, twitter: true, facebook: false, snapchat: false } },
      { label: "Reklama tizimi", desc: "Targetlangan reklama", values: { gilos: "partial", instagram: true, tiktok: true, telegram: "partial", youtube: true, twitter: true, facebook: true, snapchat: true } },
    ],
  },
  {
    category: "Xavfsizlik & Maxfiylik",
    icon: Shield,
    items: [
      { label: "E2E shifrlash", desc: "Uchidan-uchigacha shifrlangan xabarlar", values: { gilos: true, instagram: "partial", tiktok: false, telegram: true, youtube: false, twitter: false, facebook: "partial", snapchat: true } },
      { label: "Honeypot himoya", desc: "Bot/hujumlarni yashirin ushlash", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Xavf indikatori", desc: "Foydalanuvchi xavf darajasi tahlili", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Focus Shield", desc: "Raqiblarni sokin qilish rejimi", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Ghost rejim", desc: "Ko'rinmasdan ko'rish", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: true } },
      { label: "O'z-o'zidan o'chuvchi xabar", desc: "Vaqtinchalik xabarlar", values: { gilos: true, instagram: "partial", tiktok: false, telegram: true, youtube: false, twitter: false, facebook: false, snapchat: true } },
    ],
  },
  {
    category: "Gamifikatsiya",
    icon: Trophy,
    items: [
      { label: "Kundalik vazifalar", desc: "Quest tizimi va mukofotlar", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Tanga tizimi", desc: "Ichki valyuta va koin balans", values: { gilos: true, instagram: false, tiktok: false, telegram: "partial", youtube: false, twitter: false, facebook: false, snapchat: false } },
      { label: "Unvonlar va nishonlar", desc: "Foydalanuvchi darajasi va unvon", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: true, facebook: false, snapchat: false } },
      { label: "Streak (Ketma-ket kun)", desc: "Kunlik faollik streaki", values: { gilos: true, instagram: false, tiktok: false, telegram: false, youtube: false, twitter: false, facebook: false, snapchat: false } },
    ],
  },
  {
    category: "Ko'p Tilli Qo'llab-quvvatlash",
    icon: Globe,
    items: [
      { label: "Interfeys tillari", desc: "UI necha tilda", values: { gilos: "40+ til", instagram: "30+ til", tiktok: "40+ til", telegram: "100+ til", youtube: "80+ til", twitter: "50+ til", facebook: "100+ til", snapchat: "20+ til" } },
      { label: "Avto-tarjima", desc: "AI yordamida avto-tarjima", values: { gilos: true, instagram: true, tiktok: true, telegram: false, youtube: true, twitter: true, facebook: true, snapchat: false } },
      { label: "O'zbek tili", desc: "To'liq O'zbek tili qo'llab-quvvatlash", values: { gilos: true, instagram: false, tiktok: false, telegram: true, youtube: false, twitter: false, facebook: false, snapchat: false } },
    ],
  },
];

const UNIQUE_FEATURES = [
  { icon: "🎙️", title: "Ovozli fikrlar", desc: "Postga 10 soniyalik audio izoh — waveform ko'rsatuvchi" },
  { icon: "🌙", title: "Soat yarimi sirlar", desc: "Faqat kechasi ko'rinadigan maxfiy kontentlar" },
  { icon: "👥", title: "Ko'cha qichqiriqlari", desc: "Joylashuvga asoslangan anonim xabarlar" },
  { icon: "📺", title: "Birga tomosha", desc: "Do'stlar bilan sinxron video tomosha + real-time chat" },
  { icon: "🤖", title: "AI Egizak", desc: "Sizning AI nusxangiz siz o'rnida javob beradi" },
  { icon: "🎯", title: "Kayfiyat lentasi", desc: "Hissiyotga asoslangan kontentlar filtri" },
  { icon: "🛡️", title: "Focus Shield", desc: "Raqiblardan xabar kelmaydi — chuqur e'tibor rejimi" },
  { icon: "🏆", title: "Quest tizimi", desc: "Kundalik vazifalar, tangalar, unvonlar — geymifikatsiya" },
  { icon: "🌍", title: "40+ til", desc: "O'zbek tilidagi birinchi to'liq AI ijtimoiy tarmoq" },
  { icon: "💰", title: "UZS hamyon", desc: "O'zbek so'mida to'liq ishlovchi moliya tizimi" },
];

/* ─── Helpers ───────────────────────────────────────────────── */
function FeatureCell({ val, highlight }: { val: boolean | "partial" | string; highlight?: boolean }) {
  if (typeof val === "string" && val.includes("til")) {
    return (
      <td className={`px-3 py-2.5 text-center text-xs font-semibold ${highlight ? "text-orange-400" : "text-muted-foreground"}`}>
        {val}
      </td>
    );
  }
  if (val === true) return (
    <td className="px-3 py-2.5 text-center">
      <div className="flex justify-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? "bg-orange-500/20" : "bg-emerald-500/15"}`}>
          <Check className={`w-3.5 h-3.5 ${highlight ? "text-orange-400" : "text-emerald-400"}`} />
        </div>
      </div>
    </td>
  );
  if (val === "partial") return (
    <td className="px-3 py-2.5 text-center">
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-yellow-500/15 flex items-center justify-center">
          <Minus className="w-3.5 h-3.5 text-yellow-400" />
        </div>
      </div>
    </td>
  );
  return (
    <td className="px-3 py-2.5 text-center">
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
          <X className="w-3 h-3 text-muted-foreground/50" />
        </div>
      </div>
    </td>
  );
}

function ScoreRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s ease" }} />
    </svg>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function ComparisonPage() {
  const [, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map(f => [f.category, true]))
  );
  const [activePlatforms, setActivePlatforms] = useState<Set<PlatformId>>(
    new Set(["gilos", "instagram", "tiktok", "telegram", "youtube"])
  );

  useEffect(() => { document.title = "Qiyosiy Tahlil — GILOS"; }, []);

  const visiblePlatforms = PLATFORMS.filter(p => activePlatforms.has(p.id));

  const toggleCategory = (cat: string) =>
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const togglePlatform = (id: PlatformId) => {
    if (id === "gilos") return; // GilosAI always visible
    setActivePlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const gilosCount = FEATURES.flatMap(c => c.items).filter(i => i.values.gilos === true).length;
  const totalFeatures = FEATURES.flatMap(c => c.items).length;

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange-950/30 via-background to-background border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(249,115,22,0.12),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-10">
          <button onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Orqaga
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground leading-tight">Qiyosiy Tahlil</h1>
              <p className="text-sm text-muted-foreground">GilosAI vs Dunyo Gigantlari</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            GilosAI — O'zbekistondagi birinchi to'liq AI ijtimoiy platforma. Quyida Instagram, TikTok, YouTube, Telegram va boshqalar bilan batafsil qiyos.
          </p>

          {/* Score cards */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {PLATFORMS.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePlatform(p.id as PlatformId)}
                className={`relative rounded-2xl p-3 border transition-all text-center ${
                  activePlatforms.has(p.id as PlatformId)
                    ? p.highlight
                      ? "bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/30"
                      : "bg-card border-border/60"
                    : "bg-muted/20 border-border/20 opacity-50"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">#1</span>
                  </div>
                )}
                <div className="relative flex justify-center mb-1">
                  <ScoreRing score={p.score} color={p.color} size={44} />
                  <div className="absolute inset-0 flex items-center justify-center rotate-90">
                    <span className="text-[11px] font-black" style={{ color: p.color }}>{p.score}</span>
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.subtitle}</p>
              </motion.button>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { icon: Zap, label: "Unikal xususiyat", value: UNIQUE_FEATURES.length + "+", color: "text-orange-400" },
              { icon: Check, label: "Funksiyalarda yetakchi", value: `${gilosCount}/${totalFeatures}`, color: "text-emerald-400" },
              { icon: Globe, label: "Til qo'llab-quvvatlash", value: "40+", color: "text-blue-400" },
              { icon: Shield, label: "Xavfsizlik bali", value: "94/100", color: "text-violet-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-card rounded-xl px-4 py-2 border border-border/40">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <div>
                  <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">

        {/* Platform filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">Ko'rsatish:</span>
          {PLATFORMS.map(p => (
            <button key={p.id}
              onClick={() => togglePlatform(p.id as PlatformId)}
              className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                activePlatforms.has(p.id as PlatformId)
                  ? "border-border bg-card text-foreground"
                  : "border-border/30 bg-muted/10 text-muted-foreground"
              } ${p.id === "gilos" ? "cursor-default opacity-100" : "cursor-pointer"}`}
              style={activePlatforms.has(p.id as PlatformId) ? { borderColor: p.color + "60", color: p.color } : {}}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Unique features section */}
        <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-950/20 to-amber-950/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-foreground">GilosAI — Faqat Bizda Mavjud</h2>
            <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
              {UNIQUE_FEATURES.length} ta unikal
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {UNIQUE_FEATURES.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-orange-500/8 border border-orange-500/15 p-3 hover:border-orange-500/35 transition-colors"
              >
                <div className="text-xl mb-1.5">{f.icon}</div>
                <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{f.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature comparison tables */}
        {FEATURES.map((category) => (
          <div key={category.category} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <button
              onClick={() => toggleCategory(category.category)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                <category.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <h2 className="text-sm font-bold text-foreground flex-1 text-left">{category.category}</h2>
              <span className="text-xs text-muted-foreground">{category.items.length} funksiya</span>
              {openCategories[category.category]
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>

            <AnimatePresence initial={false}>
              {openCategories[category.category] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-t border-border/30">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-48 bg-muted/10">Xususiyat</th>
                          {visiblePlatforms.map(p => (
                            <th key={p.id} className="px-3 py-2.5 text-center text-xs font-semibold bg-muted/10"
                              style={{ color: p.color, minWidth: 72 }}>
                              {p.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {category.items.map((item, idx) => (
                          <tr key={item.label}
                            className={`border-t border-border/20 hover:bg-muted/10 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                          >
                            <td className="px-4 py-2.5">
                              <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                            </td>
                            {visiblePlatforms.map(p => (
                              <FeatureCell
                                key={p.id}
                                val={item.values[p.id as PlatformId]}
                                highlight={p.id === "gilos"}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {/* Category score row */}
                      <tfoot>
                        <tr className="border-t border-border/40 bg-muted/10">
                          <td className="px-4 py-2 text-xs font-bold text-muted-foreground">
                            Bo'lim natijasi
                          </td>
                          {visiblePlatforms.map(p => {
                            const trues = category.items.filter(i => i.values[p.id as PlatformId] === true).length;
                            const pct = Math.round((trues / category.items.length) * 100);
                            return (
                              <td key={p.id} className="px-3 py-2 text-center">
                                <span className="text-xs font-bold" style={{ color: p.id === "gilos" ? "#f97316" : pct >= 70 ? "#4ade80" : pct >= 40 ? "#facc15" : "#6b7280" }}>
                                  {trues}/{category.items.length}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground px-1 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <span>To'liq mavjud</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-500/15 flex items-center justify-center">
              <Minus className="w-3 h-3 text-yellow-400" />
            </div>
            <span>Qisman mavjud</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground/50" />
            </div>
            <span>Mavjud emas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
