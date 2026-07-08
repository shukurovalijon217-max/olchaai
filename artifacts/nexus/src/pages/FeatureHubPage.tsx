import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Clock, MessageSquareDashed, Eye, Ghost, Zap, Brain,
  Volume2, VolumeX, Users, Moon, Sparkles, ChevronRight,
  Lock, CheckCircle2, ToggleLeft, ToggleRight, Flame,
  Star, ArrowLeft, Radio, Shield, X, Search, UserPlus,
} from "lucide-react";
import {
  isSoundEnabled, setSoundMuted, playSuccessSound,
  loadFeaturePrefs, saveFeaturePrefs,
} from "@/lib/sounds";

/* ── Feature definitions ──
 * Title/description text lives in i18n (featurehub.feat_<id>_title / _desc)
 * so the Feature Hub fully translates when the app language changes.
 */
interface Feature {
  id: string;
  icon: React.ElementType;
  emoji: string;
  tag: "yangi" | "beta" | "eksklyuziv" | "tez_kunda";
  color: string;        // Tailwind gradient stops
  defaultOn: boolean;
  link?: string;
  unique: boolean;      // not on any other social platform
}

const FEATURES: Feature[] = [
  { id: "sound_notif", icon: Volume2, emoji: "🔔", tag: "yangi", color: "from-amber-500 to-orange-600", defaultOn: true, unique: false },
  { id: "time_capsule", icon: Clock, emoji: "⏳", tag: "eksklyuziv", color: "from-violet-500 to-purple-700", defaultOn: false, link: "/messages", unique: true },
  { id: "anon_inbox", icon: MessageSquareDashed, emoji: "🎭", tag: "beta", color: "from-pink-500 to-rose-600", defaultOn: false, link: "/anon-inbox", unique: true },
  { id: "mirror_mode", icon: Eye, emoji: "🪞", tag: "eksklyuziv", color: "from-cyan-500 to-teal-600", defaultOn: false, link: "/profile?mirror=1", unique: true },
  { id: "ghost_mode", icon: Ghost, emoji: "👻", tag: "beta", color: "from-slate-400 to-gray-600", defaultOn: false, unique: true },
  { id: "energy_broadcast", icon: Zap, emoji: "⚡", tag: "eksklyuziv", color: "from-yellow-400 to-amber-600", defaultOn: false, unique: true },
  { id: "emotion_radar", icon: Brain, emoji: "🧠", tag: "beta", color: "from-emerald-500 to-green-700", defaultOn: false, unique: true },
  { id: "midnight_confess", icon: Moon, emoji: "🌙", tag: "eksklyuziv", color: "from-indigo-600 to-violet-900", defaultOn: false, unique: true },
  { id: "grow_together", icon: Users, emoji: "🌱", tag: "yangi", color: "from-lime-500 to-emerald-600", defaultOn: false, unique: true },
  { id: "social_aura", icon: Sparkles, emoji: "✨", tag: "beta", color: "from-fuchsia-500 to-pink-700", defaultOn: false, unique: true },
  { id: "echo_detector", icon: Radio, emoji: "📡", tag: "beta", color: "from-blue-500 to-cyan-600", defaultOn: true, unique: true },
  { id: "focus_shield", icon: Shield, emoji: "🛡️", tag: "yangi", color: "from-teal-500 to-cyan-700", defaultOn: false, unique: true },
];

const TAG_STYLE: Record<string, string> = {
  yangi:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  beta:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
  eksklyuziv: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  tez_kunda:  "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

/* ── Feature card ── */
function FeatureCard({ f, enabled, onToggle }: {
  f: Feature; enabled: boolean; onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);
  const Icon = f.icon;
  const isComing = f.tag === "tez_kunda";
  const title = t(`featurehub.feat_${f.id}_title`);
  const desc = t(`featurehub.feat_${f.id}_desc`);

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
              <span className="text-white font-semibold text-sm">{title}</span>
              {f.unique && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  🔥 {t("featurehub.unique_badge")}
                </span>
              )}
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TAG_STYLE[f.tag]}`}>
                {t(`featurehub.tag_${f.tag}`)}
              </span>
            </div>
            <p className="text-white/45 text-xs mt-1 leading-relaxed line-clamp-2">{desc}</p>
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
        {enabled && !isComing && (f.link || desc.length > 80) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-white/8 flex items-center gap-3">
            {f.link && (
              <a href={f.link}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                {t("featurehub.open")} <ChevronRight className="w-3 h-3"/>
              </a>
            )}
            <button onClick={() => setShowDetail(v => !v)}
              className="text-xs text-white/40 hover:text-white/60 transition-colors">
              {showDetail ? t("featurehub.detail_close") : t("featurehub.detail_more")}
            </button>
          </motion.div>
        )}

        {showDetail && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 text-xs mt-2 leading-relaxed">
            {desc}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Ghost Mode Widget (live feature) ── */
function GhostWidget({ active, ghostUntil, toggling, onToggle }: {
  active: boolean; ghostUntil: string | null; toggling: boolean; onToggle: () => void;
}) {
  const { t } = useTranslation();
  if (!active) return null;

  const minutesLeft = ghostUntil ? Math.max(0, Math.round((new Date(ghostUntil).getTime() - Date.now()) / 60000)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">👻</span>
        <span className="text-white font-semibold text-sm">{t("featurehub.feat_ghost_mode_title")}</span>
      </div>
      <p className="text-white/45 text-xs mb-3">
        {active
          ? t("featurehub.ghost_active_until", { minutes: minutesLeft })
          : t("featurehub.ghost_inactive_hint")}
      </p>
      <button onClick={onToggle} disabled={toggling}
        className={`w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
          active ? "bg-white/10 text-white hover:bg-white/15" : "bg-primary text-white hover:bg-primary/90"
        }`}>
        {toggling
          ? t("featurehub.ghost_updating")
          : active ? t("featurehub.ghost_deactivate") : t("featurehub.ghost_activate")}
      </button>
    </motion.div>
  );
}

/* ── Focus Shield Widget (live feature) ── */
interface FocusShieldConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedUserIds: number[];
}
const DEFAULT_FOCUS_SHIELD: FocusShieldConfig = { enabled: false, startHour: 22, endHour: 7, allowedUserIds: [] };

interface MiniUser { id: number; displayName?: string; username?: string; avatarUrl?: string | null }

function FocusShieldWidget({ config, saving, onSaveHours, onAddAllowed, onRemoveAllowed }: {
  config: FocusShieldConfig;
  saving: boolean;
  onSaveHours: (start: number, end: number) => void;
  onAddAllowed: (u: MiniUser) => void;
  onRemoveAllowed: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [startHour, setStartHour] = useState(config.startHour);
  const [endHour, setEndHour] = useState(config.endHour);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState<Record<number, MiniUser>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MiniUser[]>([]);

  useEffect(() => { setStartHour(config.startHour); setEndHour(config.endHour); }, [config.startHour, config.endHour]);

  useEffect(() => {
    const missing = config.allowedUserIds.filter(id => !allowedUsers[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(id =>
      fetch(`${API}/api/users/${id}`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    )).then(users => {
      if (cancelled) return;
      setAllowedUsers(prev => {
        const next = { ...prev };
        users.forEach(u => { if (u) next[u.id] = u; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [config.allowedUserIds, allowedUsers]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/users?search=${encodeURIComponent(query)}&limit=8`, { credentials: "include" });
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 320);
    return () => clearTimeout(timer);
  }, [query]);

  const hoursChanged = startHour !== config.startHour || endHour !== config.endHour;

  const saveHours = () => {
    onSaveHours(startHour, endHour);
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 1600);
  };

  if (!config.enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🛡️</span>
        <span className="text-white font-semibold text-sm">{t("featurehub.feat_focus_shield_title")}</span>
      </div>
      <p className="text-white/45 text-xs mb-3">
        {t("featurehub.focus_shield_active_hint", {
          start: String(config.startHour).padStart(2, "0"),
          end: String(config.endHour).padStart(2, "0"),
        })}
      </p>

      {/* Hours */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <label className="text-white/40 text-[10px] block mb-1">{t("featurehub.focus_shield_start")}</label>
          <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}
            className="w-full bg-white/8 text-white text-sm rounded-lg px-2 py-1.5 border border-white/10">
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-white/40 text-[10px] block mb-1">{t("featurehub.focus_shield_end")}</label>
          <select value={endHour} onChange={e => setEndHour(Number(e.target.value))}
            className="w-full bg-white/8 text-white text-sm rounded-lg px-2 py-1.5 border border-white/10">
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>
      {hoursChanged && (
        <button onClick={saveHours} disabled={saving}
          className="w-full mb-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
          {hoursSaved ? t("featurehub.focus_shield_hours_saved") : t("featurehub.focus_shield_save_hours")}
        </button>
      )}

      {/* Allowed friends */}
      <div className="pt-3 border-t border-white/8">
        <p className="text-white/60 text-xs font-semibold mb-1">{t("featurehub.focus_shield_allowed_title")}</p>
        <p className="text-white/30 text-[10px] mb-2">{t("featurehub.focus_shield_allowed_hint")}</p>

        {config.allowedUserIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {config.allowedUserIds.map(id => {
              const u = allowedUsers[id];
              return (
                <span key={id} className="flex items-center gap-1 bg-white/8 rounded-full pl-2 pr-1 py-1 text-xs text-white/80">
                  {u?.displayName ?? u?.username ?? `#${id}`}
                  <button onClick={() => onRemoveAllowed(id)}
                    className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                    <X className="w-2.5 h-2.5"/>
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-white/25 text-[10px] mb-2">{t("featurehub.focus_shield_no_allowed")}</p>
        )}

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2"/>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t("featurehub.focus_shield_search_placeholder")}
            className="w-full bg-white/8 text-white text-xs rounded-lg pl-8 pr-2 py-2 border border-white/10 placeholder:text-white/30"/>
        </div>
        {results.length > 0 && (
          <div className="mt-1.5 rounded-lg border border-white/8 bg-black/30 overflow-hidden">
            {results.filter(r => !config.allowedUserIds.includes(r.id)).map(r => (
              <button key={r.id} onClick={() => { onAddAllowed(r); setQuery(""); setResults([]); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/8 transition-colors text-left">
                <span className="text-white text-xs flex-1 truncate">{r.displayName ?? r.username}</span>
                <UserPlus className="w-3.5 h-3.5 text-primary"/>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Grow Together Widget (live feature) ── */
function GrowTogetherWidget({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [goalText, setGoalText] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    fetch(`${API}/api/grow-together/goal`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.goal_text) setGoalText(data.goal_text); })
      .catch(() => {});
    fetch(`${API}/api/grow-together/connections`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setConnections)
      .catch(() => {});
  }, [enabled]);

  const saveGoal = async () => {
    if (!goalText.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/grow-together/goal`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText }),
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); void loadMatches(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const loadMatches = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/grow-together/matches`, { credentials: "include" });
      if (r.ok) setMatches(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const connect = async (partnerId: number) => {
    try {
      await fetch(`${API}/api/grow-together/connect/${partnerId}`, { method: "POST", credentials: "include" });
      setConnected(prev => new Set([...prev, partnerId]));
    } catch { /* ignore */ }
  };

  if (!enabled) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🌱</span>
        <span className="text-white font-semibold text-sm">{t("featurehub.feat_grow_together_title")}</span>
      </div>
      <label className="text-white/40 text-[10px] block mb-1">{t("featurehub.grow_together_goal_label")}</label>
      <div className="flex gap-2 mb-3">
        <input value={goalText} onChange={e => setGoalText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void saveGoal(); }}
          placeholder={t("featurehub.grow_together_goal_ph")}
          className="flex-1 bg-white/8 text-white text-xs rounded-lg px-3 py-2 border border-white/10 placeholder:text-white/30 outline-none focus:border-white/20"/>
        <button onClick={() => void saveGoal()} disabled={saving || !goalText.trim()}
          className="px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saved ? "✓" : saving ? t("featurehub.grow_together_saving") : t("featurehub.grow_together_save")}
        </button>
      </div>
      {connections.length > 0 && (
        <div className="mb-3">
          <p className="text-white/50 text-[10px] font-semibold mb-1.5">{t("featurehub.grow_together_connected_title")}</p>
          <div className="space-y-1.5">
            {connections.slice(0, 3).map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <span className="text-white text-xs flex-1 truncate">{c.displayName || c.username}</span>
                <span className="text-white/30 text-[10px] truncate max-w-[100px]">{c.goal_text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => void loadMatches()} disabled={loading || !goalText.trim()}
        className="w-full py-2 rounded-xl bg-white/8 text-white/60 text-xs font-semibold hover:bg-white/12 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
        <UserPlus className="w-3.5 h-3.5"/>
        {loading ? "..." : t("featurehub.grow_together_find")}
      </button>
      {matches.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {matches.slice(0, 5).map((m: any) => (
            <div key={m.user_id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
              <span className="text-white text-xs flex-1 truncate">{m.displayName || m.username}</span>
              <span className="text-white/30 text-[10px] truncate max-w-[80px]">{m.goal_text}</span>
              <button onClick={() => void connect(m.user_id)} disabled={connected.has(m.user_id)}
                className="text-[10px] px-2 py-1 rounded-lg bg-primary/80 text-white font-semibold disabled:opacity-40">
                {connected.has(m.user_id) ? "✓" : t("featurehub.grow_together_connect")}
              </button>
            </div>
          ))}
        </div>
      )}
      {matches.length === 0 && goalText && !loading && (
        <p className="text-white/25 text-[10px] text-center mt-2">{t("featurehub.grow_together_no_matches")}</p>
      )}
    </motion.div>
  );
}

/* ── Social Aura Widget (live feature) ── */
interface AuraData { score: number; color: string; label: string; gradient: string; stats: Record<string, number> }

function SocialAuraWidget({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [aura, setAura] = useState<AuraData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/users/aura`, { credentials: "include" });
      if (r.ok) setAura(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (enabled) void load(); }, [enabled]);

  if (!enabled) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-white font-semibold text-sm">{t("featurehub.social_aura_your")}</span>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-30">
          {loading ? t("featurehub.social_aura_refreshing") : t("featurehub.social_aura_refresh")}
        </button>
      </div>
      {aura ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: aura.gradient, boxShadow: `0 0 24px ${aura.color}66` }}>
              {aura.score}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{aura.label}</p>
              <p className="text-white/40 text-[10px]">{t("featurehub.social_aura_score")}: {aura.score}/100</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: "posts30", label: t("featurehub.social_aura_posts"), val: aura.stats.posts30 },
              { key: "likesReceived", label: t("featurehub.social_aura_likes"), val: aura.stats.likesReceived },
              { key: "commentsMade", label: t("featurehub.social_aura_comments"), val: aura.stats.commentsMade },
              { key: "newFollowers", label: t("featurehub.social_aura_followers"), val: aura.stats.newFollowers },
            ].map(s => (
              <div key={s.key} className="bg-white/5 rounded-lg px-2.5 py-2">
                <p className="text-white font-semibold text-sm">{s.val ?? 0}</p>
                <p className="text-white/35 text-[9px]">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full mx-auto mb-2 animate-pulse"
            style={{ background: "linear-gradient(135deg,#9d00ff,#4400aa)" }}/>
          <p className="text-white/30 text-xs">{loading ? t("featurehub.social_aura_refreshing") : "..."}</p>
        </div>
      )}
    </motion.div>
  );
}

/* ── Energy Broadcast Widget (live feature) ── */
function EnergyWidget({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [energy, setEnergy] = useState(75);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    let cancelled = false;
    fetch(`${API}/api/mood/my`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        if (data?.energyLevel) setEnergy(Math.min(100, Math.max(0, data.energyLevel * 10)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [enabled, loaded]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mood: "energetic",
          energyLevel: Math.max(1, Math.round(energy / 10)),
          isPublic: true,
          expiresInHours: 24,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      playSuccessSound();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* silently ignore - button just won't show saved state */
    } finally {
      setSaving(false);
    }
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
        <span className="text-white font-semibold text-sm">{t("featurehub.energy_title")}</span>
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
      <p className="text-white/30 text-[10px] mt-2">{t("featurehub.energy_followers_hint")}</p>
      <button onClick={save} disabled={saving}
        className="w-full mt-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
        {saved
          ? <><CheckCircle2 className="w-4 h-4"/> {t("featurehub.energy_saved")}</>
          : saving ? t("featurehub.energy_sharing") : t("featurehub.energy_share")}
      </button>
    </motion.div>
  );
}

/* ── Main page ── */
export default function FeatureHubPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => loadFeaturePrefs());
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [filter, setFilter] = useState<"all" | "enabled" | "unique">("all");
  const [ghostActive, setGhostActive] = useState(false);
  const [ghostUntil, setGhostUntil] = useState<string | null>(null);
  const [ghostToggling, setGhostToggling] = useState(false);
  const [ghostLoaded, setGhostLoaded] = useState(false);
  const [focusShield, setFocusShield] = useState<FocusShieldConfig>(DEFAULT_FOCUS_SHIELD);
  const [focusShieldSaving, setFocusShieldSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/ghost/my`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setGhostActive(!!data.active);
        setGhostUntil(data.ghostUntil ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGhostLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/focus-shield/my`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setFocusShield(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isOn = (id: string, def = true) => {
    if (id === "ghost_mode") return ghostActive;
    if (id === "focus_shield") return focusShield.enabled;
    return id in prefs ? prefs[id] : def;
  };

  const updateFocusShield = async (patch: Partial<FocusShieldConfig>) => {
    setFocusShieldSaving(true);
    try {
      const res = await fetch(`${API}/api/focus-shield`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("focus shield update failed");
      const data = await res.json();
      setFocusShield(data);
      playSuccessSound();
    } catch {
      /* silently ignore - state stays as-is */
    } finally {
      setFocusShieldSaving(false);
    }
  };

  const toggleGhost = async () => {
    setGhostToggling(true);
    try {
      const res = await fetch(`${API}/api/ghost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enable: !ghostActive }),
      });
      if (!res.ok) throw new Error("ghost toggle failed");
      const data = await res.json();
      setGhostActive(!!data.active);
      setGhostUntil(data.ghostUntil ?? null);
      if (data.active) playSuccessSound();
    } catch {
      /* silently ignore - state stays as-is */
    } finally {
      setGhostToggling(false);
    }
  };

  const toggle = (id: string, def = true) => {
    if (id === "ghost_mode") { void toggleGhost(); return; }
    if (id === "focus_shield") { void updateFocusShield({ enabled: !focusShield.enabled }); return; }

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
            <h1 className="text-white font-bold text-xl tracking-tight">{t("featurehub.title")}</h1>
            <p className="text-white/40 text-xs">{t("featurehub.subtitle")}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: t("featurehub.stat_enabled"), value: enabledCount, color: "#22c55e", icon: "✅" },
            { label: t("featurehub.stat_unique"), value: uniqueCount, color: "#f59e0b", icon: "🔥" },
            { label: t("featurehub.stat_total"), value: FEATURES.length, color: "#7c3aed", icon: "⚡" },
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
            <p className="text-white font-semibold text-sm">{t("featurehub.sound_banner_title")}</p>
            <p className="text-white/45 text-xs mt-0.5">
              {soundOn ? t("featurehub.sound_banner_on") : t("featurehub.sound_banner_off")}
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

        {/* Ghost mode widget if active */}
        <GhostWidget active={ghostActive} ghostUntil={ghostUntil} toggling={ghostToggling || !ghostLoaded} onToggle={toggleGhost} />

        {/* Focus shield widget if active */}
        <FocusShieldWidget
          config={focusShield}
          saving={focusShieldSaving}
          onSaveHours={(start, end) => void updateFocusShield({ startHour: start, endHour: end })}
          onAddAllowed={u => void updateFocusShield({ allowedUserIds: [...focusShield.allowedUserIds, u.id] })}
          onRemoveAllowed={id => void updateFocusShield({ allowedUserIds: focusShield.allowedUserIds.filter(x => x !== id) })}
        />

        {/* Grow Together widget if enabled */}
        <GrowTogetherWidget enabled={isOn("grow_together", false)} />

        {/* Social Aura widget if enabled */}
        <SocialAuraWidget enabled={isOn("social_aura", false)} />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { k: "all", label: t("featurehub.filter_all"), emoji: "" },
            { k: "unique", label: t("featurehub.filter_unique"), emoji: "🔥 " },
            { k: "enabled", label: t("featurehub.filter_enabled"), emoji: "✅ " },
          ].map(({ k, label, emoji }) => (
            <button key={k} onClick={() => setFilter(k as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === k ? "bg-primary text-white" : "bg-white/8 text-white/50 hover:bg-white/12"
              }`}>
              {emoji}{label}
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
              {t("featurehub.unique_banner")}
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
            <p className="text-sm">{t("featurehub.empty")}</p>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
          <p className="text-white/30 text-xs leading-relaxed">
            {t("featurehub.footer")} {" "}
            <span className="text-primary">feedback@gilosai.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
