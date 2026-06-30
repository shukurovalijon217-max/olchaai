import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Clock, MessageSquareDashed, Eye, Ghost, Zap, Brain,
  Volume2, VolumeX, Users, Moon, Sparkles, ChevronRight,
  Lock, CheckCircle2, ToggleLeft, ToggleRight, Flame,
  Star, ArrowLeft, Radio, Shield,
} from "lucide-react";
import {
  isSoundEnabled, setSoundMuted, playSuccessSound,
  loadFeaturePrefs, saveFeaturePrefs,
} from "@/lib/sounds";

/* ── Feature definitions ── */
interface Feature {
  id: string;
  icon: React.ElementType;
  emoji: string;
  title: string;
  desc: string;
  tag: "yangi" | "beta" | "eksklyuziv" | "tez_kunda";
  color: string;        // Tailwind gradient stops
  defaultOn: boolean;
  link?: string;
  unique: boolean;      // not on any other social platform
}

const FEATURES: Feature[] = [
  {
    id: "sound_notif",
    icon: Volume2,
    emoji: "🔔",
    title: "Ovozli Bildirishnomalar",
    desc: "Yangi xabar yoki qo'ng'iroq kelganda ovoz chiqaradi — SMS, chat va qo'ng'iroqlar uchun",
    tag: "yangi",
    color: "from-amber-500 to-orange-600",
    defaultOn: true,
    unique: false,
  },
  {
    id: "time_capsule",
    icon: Clock,
    emoji: "⏳",
    title: "Vaqt Kapsulasi",
    desc: "Xabar yoki post yozing — u 1 kun, 1 hafta, 1 oy yoki 1 yildan keyin yetib boradi. Hali birorta ijtimoiy tarmoqda yo'q!",
    tag: "eksklyuziv",
    color: "from-violet-500 to-purple-700",
    defaultOn: false,
    link: "/messages",
    unique: true,
  },
  {
    id: "anon_inbox",
    icon: MessageSquareDashed,
    emoji: "🎭",
    title: "Anonim Savol Qutisi",
    desc: "Istalgan kishi sizga anonim savol yuborsin — kim ekanini bilmasdan, lekin javob berish sizning xohishingizda",
    tag: "beta",
    color: "from-pink-500 to-rose-600",
    defaultOn: false,
    link: "/anon",
    unique: true,
  },
  {
    id: "mirror_mode",
    icon: Eye,
    emoji: "🪞",
    title: "Ko'zgu Rejimi",
    desc: "Profilingizni begona kishi ko'zi bilan ko'ring — qaysi postlar, bio va rasmlar birinchi taassurot qoldiradi",
    tag: "eksklyuziv",
    color: "from-cyan-500 to-teal-600",
    defaultOn: false,
    unique: true,
  },
  {
    id: "ghost_mode",
    icon: Ghost,
    emoji: "👻",
    title: "Arvoh Rejimi",
    desc: "1 soat davomida mutlaqo ko'rinmas bo'ling — hech kim online ekanligingizni ko'rmaydi, tarix qolmaydi",
    tag: "beta",
    color: "from-slate-400 to-gray-600",
    defaultOn: false,
    unique: true,
  },
  {
    id: "energy_broadcast",
    icon: Zap,
    emoji: "⚡",
    title: "Energiya Yozuvi",
    desc: "Bugungi energiya darajangizni 0-100% ko'rsating — do'stlaringiz sizni ovora qilish vaqtini biladi",
    tag: "eksklyuziv",
    color: "from-yellow-400 to-amber-600",
    defaultOn: false,
    unique: true,
  },
  {
    id: "emotion_radar",
    icon: Brain,
    emoji: "🧠",
    title: "Hissiyot Radari",
    desc: "Post yozishdan oldin AI hissiyotingizni tahlil qiladi va 'Bu g'azab postimi?' deb so'raydi — afterlik afsus bo'lmaydi",
    tag: "beta",
    color: "from-emerald-500 to-green-700",
    defaultOn: false,
    unique: true,
  },
  {
    id: "midnight_confess",
    icon: Moon,
    emoji: "🌙",
    title: "Yarim Tun Konfessiyasi",
    desc: "Faqat kechasi 23:00–05:00 oralig'ida ko'rinadigan postlar — eng samimiy fikrlaringiz uchun xavfsiz makon",
    tag: "eksklyuziv",
    color: "from-indigo-600 to-violet-900",
    defaultOn: false,
    unique: true,
  },
  {
    id: "grow_together",
    icon: Users,
    emoji: "🌱",
    title: "Birga O'sish",
    desc: "Bir xil maqsaddagi odamni toping — masalan 'kitob o'qish', '10 kg ariqlamoq' — va o'zaro rag'batlantiring",
    tag: "tez_kunda",
    color: "from-lime-500 to-emerald-600",
    defaultOn: false,
    unique: true,
  },
  {
    id: "social_aura",
    icon: Sparkles,
    emoji: "✨",
    title: "Ijtimoiy Aura",
    desc: "AI sizning postlaringiz, reaktsiyalaringiz va faolligingizga qarab noyob aura rangi generatsiya qiladi",
    tag: "tez_kunda",
    color: "from-fuchsia-500 to-pink-700",
    defaultOn: false,
    unique: true,
  },
  {
    id: "echo_detector",
    icon: Radio,
    emoji: "📡",
    title: "Echo Kamera Detektori",
    desc: "AI lentangiz bir tomonlama bo'lib qolsa ogohlantiradi — fikr xilma-xilligini saqlashga yordam beradi",
    tag: "beta",
    color: "from-blue-500 to-cyan-600",
    defaultOn: true,
    unique: true,
  },
  {
    id: "focus_shield",
    icon: Shield,
    emoji: "🛡️",
    title: "Diqqat Qalqoni",
    desc: "Belgilangan soatlarda faqat tanlagan do'stlaringizdan xabar qabul qilasiz — hamma narsadan uzilmang",
    tag: "yangi",
    color: "from-teal-500 to-cyan-700",
    defaultOn: false,
    unique: true,
  },
];

const TAG_STYLE: Record<string, string> = {
  yangi:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  beta:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
  eksklyuziv: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  tez_kunda:  "bg-purple-500/20 text-purple-400 border-purple-500/30",
};
const TAG_LABEL: Record<string, string> = {
  yangi: "Yangi", beta: "Beta", eksklyuziv: "OlCha Eksklyuziv", tez_kunda: "Tez kunda",
};

/* ── Feature card ── */
function FeatureCard({ f, enabled, onToggle }: {
  f: Feature; enabled: boolean; onToggle: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const Icon = f.icon;
  const isComing = f.tag === "tez_kunda";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        enabled && !isComing
          ? "border-white/15 bg-white/5"
          : "border-white/8 bg-white/[0.025]"
      }`}>

      {/* Enabled glow */}
      {enabled && !isComing && (
        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${f.color} pointer-events-none`}/>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${f.color} bg-opacity-20`}
            style={{ background: `linear-gradient(135deg, var(--tw-gradient-from, #7c3aed22), var(--tw-gradient-to, #4f46e522))` }}>
            <span className="text-xl">{f.emoji}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">{f.title}</span>
              {f.unique && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  🔥 NOYOB
                </span>
              )}
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TAG_STYLE[f.tag]}`}>
                {TAG_LABEL[f.tag]}
              </span>
            </div>
            <p className="text-white/45 text-xs mt-1 leading-relaxed line-clamp-2">{f.desc}</p>
          </div>

          {/* Toggle */}
          <button
            onClick={isComing ? undefined : onToggle}
            disabled={isComing}
            className="flex-shrink-0 mt-0.5">
            {isComing ? (
              <Lock className="w-5 h-5 text-white/20"/>
            ) : enabled ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <ToggleRight className="w-7 h-7 text-primary"/>
              </motion.div>
            ) : (
              <ToggleLeft className="w-7 h-7 text-white/30"/>
            )}
          </button>
        </div>

        {/* Expand / Link */}
        {enabled && !isComing && (f.link || f.desc.length > 80) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-white/8 flex items-center gap-3">
            {f.link && (
              <a href={f.link}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                Ochish <ChevronRight className="w-3 h-3"/>
              </a>
            )}
            <button onClick={() => setShowDetail(v => !v)}
              className="text-xs text-white/40 hover:text-white/60 transition-colors">
              {showDetail ? "Yopish" : "Batafsil"}
            </button>
          </motion.div>
        )}

        {showDetail && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 text-xs mt-2 leading-relaxed">
            {f.desc}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Energy Broadcast Widget (live feature) ── */
function EnergyWidget({ enabled }: { enabled: boolean }) {
  const [energy, setEnergy] = useState(() => {
    try { return Number(localStorage.getItem("olcha_energy") || "75"); } catch { return 75; }
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    try { localStorage.setItem("olcha_energy", String(energy)); } catch {}
    setSaved(true);
    playSuccessSound();
    setTimeout(() => setSaved(false), 2000);
  };

  if (!enabled) return null;

  const color = energy >= 70 ? "#22c55e" : energy >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚡</span>
        <span className="text-white font-semibold text-sm">Bugungi energiyangiz</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={0} max={100} value={energy}
          onChange={e => setEnergy(Number(e.target.value))}
          className="flex-1 h-2 rounded-full accent-primary"/>
        <span className="text-2xl font-bold w-12 text-right" style={{ color }}>{energy}%</span>
      </div>
      <div className="flex gap-2 mt-3">
        {[10, 25, 50, 75, 100].map(v => (
          <button key={v} onClick={() => setEnergy(v)}
            className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${energy === v ? "bg-primary text-white" : "bg-white/8 text-white/50 hover:bg-white/12"}`}>
            {v}%
          </button>
        ))}
      </div>
      <button onClick={save}
        className="w-full mt-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
        {saved ? <><CheckCircle2 className="w-4 h-4"/> Saqlandi!</> : "Ulashish"}
      </button>
    </motion.div>
  );
}

/* ── Main page ── */
export default function FeatureHubPage() {
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => loadFeaturePrefs());
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [filter, setFilter] = useState<"all" | "enabled" | "unique">("all");

  const isOn = (id: string, def = true) => id in prefs ? prefs[id] : def;

  const toggle = (id: string, def = true) => {
    const next = !isOn(id, def);
    const updated = { ...prefs, [id]: next };

    if (id === "sound_notif") {
      setSoundMuted(!next);
      setSoundOn(next);
      if (next) playSuccessSound();
    } else if (next) {
      playSuccessSound();
    }

    setPrefs(updated);
    saveFeaturePrefs(updated);
  };

  const enabledCount = FEATURES.filter(f => isOn(f.id, f.defaultOn) && f.tag !== "tez_kunda").length;
  const uniqueCount = FEATURES.filter(f => f.unique && f.tag !== "tez_kunda").length;

  const filtered = FEATURES.filter(f => {
    if (filter === "enabled") return isOn(f.id, f.defaultOn) && f.tag !== "tez_kunda";
    if (filter === "unique") return f.unique;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#060614 0%,#0a0820 50%,#050510 100%)" }}>
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}/>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }}/>
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/70"/>
          </button>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Funksiyalar Hub</h1>
            <p className="text-white/40 text-xs">OlCha'ning noyob imkoniyatlari</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Yoqilgan", value: enabledCount, color: "#22c55e", icon: "✅" },
            { label: "Noyob", value: uniqueCount, color: "#f59e0b", icon: "🔥" },
            { label: "Jami", value: FEATURES.length, color: "#7c3aed", icon: "⚡" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/5 p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-white/40 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sound quick toggle banner */}
        <motion.div
          className={`rounded-2xl border p-4 mb-5 flex items-center gap-4 cursor-pointer transition-all ${
            soundOn ? "border-amber-500/30 bg-amber-500/8" : "border-white/8 bg-white/5"
          }`}
          onClick={() => toggle("sound_notif", true)}
          whileTap={{ scale: 0.98 }}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            soundOn ? "bg-amber-500/20" : "bg-white/8"
          }`}>
            {soundOn ? "🔔" : "🔕"}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Ovozli bildirishnomalar</p>
            <p className="text-white/45 text-xs mt-0.5">
              {soundOn ? "Xabar va qo'ng'iroqlarda ovoz yoqilgan" : "Barcha ovozlar o'chirilgan"}
            </p>
          </div>
          <div className="flex-shrink-0">
            {soundOn
              ? <Volume2 className="w-5 h-5 text-amber-400"/>
              : <VolumeX className="w-5 h-5 text-white/30"/>}
          </div>
        </motion.div>

        {/* Energy widget if enabled */}
        <EnergyWidget enabled={isOn("energy_broadcast", false)} />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { k: "all", label: "Barchasi" },
            { k: "unique", label: "🔥 Noyob" },
            { k: "enabled", label: "✅ Yoqilgan" },
          ].map(({ k, label }) => (
            <button key={k} onClick={() => setFilter(k as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === k ? "bg-primary text-white" : "bg-white/8 text-white/50 hover:bg-white/12"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* "Not on other platforms" badge */}
        {filter === "unique" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 flex-shrink-0"/>
            <p className="text-amber-300/80 text-xs">
              Bu funksiyalar hali <strong>hech bir ijtimoiy tarmoqda</strong> yo'q — faqat OlCha'da!
            </p>
          </motion.div>
        )}

        {/* Feature cards */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(f => (
              <FeatureCard
                key={f.id}
                f={f}
                enabled={isOn(f.id, f.defaultOn)}
                onToggle={() => toggle(f.id, f.defaultOn)}
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Hozircha hech narsa yo'q</p>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
          <p className="text-white/30 text-xs leading-relaxed">
            OlCha doimiy rivojlanib boradi. Yangi funksiyalar har hafta qo'shiladi.
            Sizning fikringiz muhim — {" "}
            <span className="text-primary">feedback@olcha.uz</span>
          </p>
        </div>
      </div>
    </div>
  );
}
