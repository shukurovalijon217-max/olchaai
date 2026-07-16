import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Heart, Zap, Brain, Coffee, Music, Star, Moon, Sun, RefreshCw, Globe, Flame } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");

interface MoodEntry {
  id: number; mood: string; energyLevel: number; note: string | null;
  createdAt: string; userId: number; username: string; displayName: string; avatar: string | null;
}

const MOODS = [
  { key: "energetic", label: "Energetik", emoji: "⚡", icon: Zap, color: "#f59e0b", bg: "from-amber-500/20 to-yellow-500/10", desc: "Kuchli, faol, harakat qilgim kelyapti" },
  { key: "calm", label: "Xotirjam", emoji: "🧘", icon: Moon, color: "#06b6d4", bg: "from-cyan-500/20 to-teal-500/10", desc: "Tinch, muvozanatlangan, huzurli" },
  { key: "creative", label: "Ijodiy", emoji: "🎨", icon: Star, color: "#a855f7", bg: "from-purple-500/20 to-violet-500/10", desc: "G'oyalar bor, yaratgim kelyapti" },
  { key: "philosophical", label: "Falsafiy", emoji: "🤔", icon: Brain, color: "#6366f1", bg: "from-indigo-500/20 to-blue-500/10", desc: "Chuqur fikrlar, savollar" },
  { key: "social", label: "Ijtimoiy", emoji: "🤝", icon: Heart, color: "#ec4899", bg: "from-pink-500/20 to-rose-500/10", desc: "Odamlar bilan muloqot qilgim kelyapti" },
  { key: "focused", label: "Diqqatli", emoji: "🎯", icon: Flame, color: "#ef4444", bg: "from-red-500/20 to-rose-500/10", desc: "Ish ustida, konsentratsiyalangan" },
  { key: "melancholic", label: "Melanxolik", emoji: "🌧️", icon: Coffee, color: "#94a3b8", bg: "from-slate-500/20 to-gray-500/10", desc: "Nostalgi, fikrli kayfiyat" },
  { key: "inspired", label: "Ilhomli", emoji: "✨", icon: Sun, color: "#10b981", bg: "from-emerald-500/20 to-teal-500/10", desc: "Katta kuchim bor, ishlash vaqti!" },
];

const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.key, m]));

function MoodBubble({ entry, index }: { entry: MoodEntry; index: number }) {
  const mood = MOOD_MAP[entry.mood] ?? MOODS[0];
  const size = 60 + entry.energyLevel * 6;
  const x = 10 + (index * 37 + entry.energyLevel * 13) % 75;
  const y = 10 + (index * 29 + entry.energyLevel * 17) % 75;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.15, zIndex: 50 }}
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size, height: size, zIndex: 10 + index }}
      className="cursor-pointer group"
    >
      <div className="w-full h-full rounded-full flex flex-col items-center justify-center relative"
        style={{ background: `radial-gradient(circle, ${mood.color}44, ${mood.color}22)`, border: `2px solid ${mood.color}55`, boxShadow: `0 0 ${entry.energyLevel * 3}px ${mood.color}44` }}>
        <span className="text-lg">{mood.emoji}</span>
        {entry.avatar ? (
          <img loading="lazy" decoding="async" src={entry.avatar} alt="" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-black object-cover" />
        ) : (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-black bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-[8px] text-white font-bold">
            {entry.displayName?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-36">
        <div className="bg-[#18181b] border border-white/20 rounded-xl p-2 text-center">
          <div className="font-semibold text-white text-xs">{entry.displayName}</div>
          <div className="text-white/60 text-[10px]">{mood.emoji} {mood.label}</div>
          {entry.note && <div className="text-white/50 text-[10px] mt-0.5 truncate">{entry.note}</div>}
        </div>
      </div>
    </motion.div>
  );
}

function MoodStats({ entries }: { entries: MoodEntry[] }) {
  const { t } = useTranslation();
  const counts = MOODS.map(m => ({ ...m, count: entries.filter(e => e.mood === m.key).length }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);
  if (counts.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {counts.map(m => (
        <div key={m.key} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-sm">{m.emoji}</span>
          <span className="text-white/70 text-xs">{t(`mood.${m.key}`)}</span>
          <span className="text-xs font-bold" style={{ color: m.color }}>{m.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function MoodMapPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedMood, setSelectedMood] = useState("");
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");

  async function fetchData() {
    setLoading(true);
    try {
      const [mapRes, myRes] = await Promise.all([
        fetch(`${API}/api/mood/map`, { credentials: "include" }),
        user ? fetch(`${API}/api/mood/my`, { credentials: "include" }) : Promise.resolve(null),
      ]);
      if (mapRes.ok) setEntries(await mapRes.json());
      if (myRes?.ok) setMyMood(await myRes.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, [user]);

  async function saveMood() {
    if (!selectedMood) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/mood`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, energyLevel: energy, note: note.trim() || null }),
      });
      if (res.ok) { setShowSelector(false); setNote(""); fetchData(); }
    } finally { setSaving(false); }
  }

  const currentMoodInfo = myMood ? MOOD_MAP[myMood.mood] : null;

  return (
    <div className="h-full flex flex-col bg-[#0a0604]">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" /> {t("mood.title")}
            </h1>
            <p className="text-white/40 text-xs mt-0.5">{entries.length} {t("mood.subtitle_online")}</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={fetchData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </motion.button>
            {["map", "list"].map(v => (
              <button key={v} onClick={() => setView(v as "map" | "list")}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${view === v ? "bg-cyan-500 text-white" : "bg-white/5 text-white/60"}`}>
                {v === "map" ? "🗺️" : "📋"}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSelector(!showSelector)}
            className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 ${currentMoodInfo ? `bg-gradient-to-r ${currentMoodInfo.bg} border-white/20` : "bg-white/5 border-white/10 hover:border-cyan-500/40"}`}>
            {currentMoodInfo ? (
              <>
                <span className="text-2xl">{currentMoodInfo.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-medium">{t("mood.current")} {t(`mood.${myMood?.mood}`)}</div>
                  <div className="text-white/50 text-xs">{t("mood.energy")}: {myMood?.energyLevel}/10 • {t("mood.click_change")}</div>
                </div>
              </>
            ) : (
              <>
                <Heart className="w-5 h-5 text-cyan-400" />
                <span className="text-white/60 text-sm">{t("mood.share_mood")}</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showSelector && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 border-t border-white/10">
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {MOODS.map(m => (
                  <motion.button key={m.key} whileTap={{ scale: 0.9 }} onClick={() => setSelectedMood(m.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${selectedMood === m.key ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[10px] text-white/60 text-center leading-tight">{m.label}</span>
                  </motion.button>
                ))}
              </div>
              {selectedMood && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{t("mood.energy")}</span><span className="font-bold" style={{ color: MOOD_MAP[selectedMood]?.color }}>{energy}/10</span>
                    </div>
                    <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(+e.target.value)}
                      className="w-full accent-violet-500" />
                  </div>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder={t("mood.note_ph")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-cyan-500/60" />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={saveMood} disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50">
                    {saving ? t("mood.saving") : `🌍 ${t("mood.add_to_map")}`}
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-2">
        <MoodStats entries={entries} />
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          </div>
        ) : view === "map" ? (
          <div className="relative w-full h-full" style={{ background: "radial-gradient(ellipse at center, #0c1a2e 0%, #0a0604 100%)" }}>
            {entries.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <Globe className="w-16 h-16 text-cyan-400/20 mb-4" />
                <p className="text-white/30 text-sm">{t("mood.no_moods")}</p>
              </div>
            ) : (
              entries.map((e, i) => <MoodBubble key={e.id} entry={e} index={i} />)
            )}
            <div className="absolute bottom-4 right-4 text-white/20 text-xs">{t("mood.map_realtime")}</div>
          </div>
        ) : (
          <div className="overflow-y-auto h-full px-4 pb-4 space-y-2">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-white/30 text-sm">{t("mood.no_moods")}</p>
              </div>
            ) : (
              entries.map(e => {
                const mood = MOOD_MAP[e.mood] ?? MOODS[0];
                return (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${mood.bg} border border-white/10`}>
                    <div className="relative flex-shrink-0">
                      {e.avatar ? <img loading="lazy" decoding="async" src={e.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {e.displayName?.[0]?.toUpperCase()}
                        </div>}
                      <span className="absolute -bottom-1 -right-1 text-base">{mood.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{e.displayName}</span>
                        <span className="text-white/40 text-xs">@{e.username}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: mood.color }}>{t(`mood.${e.mood}`)}</span>
                        <span className="text-white/30 text-xs">•</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < e.energyLevel ? mood.color : "rgba(255,255,255,0.1)" }} />
                          ))}
                        </div>
                      </div>
                      {e.note && <p className="text-white/50 text-xs mt-0.5 truncate">{e.note}</p>}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
