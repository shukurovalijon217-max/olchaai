import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import type { NotifPrefs, PrivacySettings } from "@/context/AuthContext";
import {
  User, Lock, Bell, Palette, Shield, Globe, MapPin,
  Check, Loader2, Eye, EyeOff, Camera, ChevronRight, Search, X, Crown, Zap,
  CircleDollarSign, AlertTriangle, Upload,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { LANGUAGES, type LangCode, applyRTL, ensureTranslation } from "@/lib/i18n";
import { COUNTRIES, countryFlag, getCountryByCode } from "@/lib/countries";
import { useMediaUpload } from "@/hooks/useMediaUpload";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");

type Tab = "profile" | "account" | "notifications" | "appearance" | "privacy" | "language" | "location" | "monetization";

/* ─── Default preferences ─────────────────────────────────── */
const DEFAULT_NOTIF: NotifPrefs = {
  likes: true, comments: true, followers: true,
  messages: true, groups: false, premium: false,
};
const DEFAULT_PRIVACY: PrivacySettings = {
  privateProfile: false, activityStatus: true,
  readReceipts: true, suggestions: true, searchVisibility: true,
};

/* ─── Appearance state stored in localStorage ─────────────── */
function getAppearance() {
  try {
    const raw = localStorage.getItem("olcha_appearance");
    if (raw) return JSON.parse(raw) as { darkMode: boolean; animations: boolean; compactMode: boolean };
  } catch { /* ignore */ }
  return { darkMode: true, animations: true, compactMode: false };
}
function saveAppearance(val: { darkMode: boolean; animations: boolean; compactMode: boolean }) {
  localStorage.setItem("olcha_appearance", JSON.stringify(val));
  const html = document.documentElement;
  if (!val.animations) html.classList.add("no-animations");
  else html.classList.remove("no-animations");
  if (val.compactMode) html.classList.add("compact-mode");
  else html.classList.remove("compact-mode");
}
/* Apply stored appearance on module load */
(function applyStoredAppearance() {
  const a = getAppearance();
  const html = document.documentElement;
  if (!a.animations) html.classList.add("no-animations");
  if (a.compactMode) html.classList.add("compact-mode");
})();

/* ─── Panel color tokens ──────────────────────────────────── */
const COLOR: Record<string, { icon: string; border: string; glow: string; badge: string; ring: string; scanFrom: string; scanTo: string }> = {
  violet: { icon: "bg-violet-500/20 text-violet-400", border: "border-violet-500/50", glow: "shadow-[0_0_30px_-5px_rgba(139,92,246,0.35)]", badge: "bg-violet-500/20 text-violet-300", ring: "ring-violet-500/30", scanFrom: "from-violet-500/30", scanTo: "to-transparent" },
  blue:   { icon: "bg-blue-500/20 text-blue-400",     border: "border-blue-500/50",   glow: "shadow-[0_0_30px_-5px_rgba(59,130,246,0.35)]",   badge: "bg-blue-500/20 text-blue-300",   ring: "ring-blue-500/30",   scanFrom: "from-blue-500/30",   scanTo: "to-transparent" },
  amber:  { icon: "bg-amber-500/20 text-amber-400",   border: "border-amber-500/50",  glow: "shadow-[0_0_30px_-5px_rgba(245,158,11,0.35)]",  badge: "bg-amber-500/20 text-amber-300",  ring: "ring-amber-500/30",  scanFrom: "from-amber-500/30",  scanTo: "to-transparent" },
  rose:   { icon: "bg-rose-500/20 text-rose-400",     border: "border-rose-500/50",   glow: "shadow-[0_0_30px_-5px_rgba(244,63,94,0.35)]",   badge: "bg-rose-500/20 text-rose-300",   ring: "ring-rose-500/30",   scanFrom: "from-rose-500/30",   scanTo: "to-transparent" },
  emerald:{ icon: "bg-emerald-500/20 text-emerald-400",border:"border-emerald-500/50",glow: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.35)]",  badge: "bg-emerald-500/20 text-emerald-300",ring:"ring-emerald-500/30",scanFrom:"from-emerald-500/30",scanTo:"to-transparent" },
  cyan:   { icon: "bg-cyan-500/20 text-cyan-400",     border: "border-cyan-500/50",   glow: "shadow-[0_0_30px_-5px_rgba(6,182,212,0.35)]",   badge: "bg-cyan-500/20 text-cyan-300",   ring: "ring-cyan-500/30",   scanFrom: "from-cyan-500/30",   scanTo: "to-transparent" },
  orange: { icon: "bg-orange-500/20 text-orange-400", border: "border-orange-500/50", glow: "shadow-[0_0_30px_-5px_rgba(249,115,22,0.35)]",  badge: "bg-orange-500/20 text-orange-300",ring: "ring-orange-500/30", scanFrom: "from-orange-500/30", scanTo: "to-transparent" },
};

/* ─── Scan line ───────────────────────────────────────────── */
function ScanLine({ color }: { color: string }) {
  const c = COLOR[color]!;
  return (
    <motion.div className={`absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${c.scanFrom} ${c.scanTo} pointer-events-none`}
      initial={{ y: 0, opacity: 1 }} animate={{ y: "300%", opacity: 0 }} transition={{ duration: 0.55, ease: "easeOut" }} />
  );
}

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } } };
const staggerItem = { hidden: { opacity: 0, y: 10, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 380, damping: 28 } } };

function SF({ children }: { children: React.ReactNode }) {
  return <motion.div variants={staggerItem}>{children}</motion.div>;
}

/* ─── Panel card wrapper ──────────────────────────────────── */
interface PanelProps {
  color: string; icon: React.ElementType; label: string;
  preview?: React.ReactNode; isOpen: boolean; onToggle: () => void;
  children: React.ReactNode;
}
function Panel({ color, icon: Icon, label, preview, isOpen, onToggle, children }: PanelProps) {
  const c = COLOR[color]!;
  return (
    <motion.div layout className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? `${c.border} ${c.glow} bg-white/[0.04] ring-1 ${c.ring}` : "border-white/8 bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/15"}`}>
      <AnimatePresence>
        {isOpen && <motion.div className={`absolute inset-0 bg-gradient-to-br ${c.scanFrom} to-transparent pointer-events-none`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
      </AnimatePresence>
      <button onClick={onToggle} className="relative z-10 w-full flex items-center gap-4 px-5 py-4 text-left">
        <motion.div animate={{ scale: isOpen ? 1.08 : 1, rotate: isOpen ? 5 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon} ${isOpen ? "shadow-lg" : ""}`}>
          <Icon className="w-5 h-5" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{label}</p>
          {preview && !isOpen && <p className="text-xs text-white/40 mt-0.5 truncate">{preview}</p>}
        </div>
        <motion.div animate={{ rotate: isOpen ? 45 : 0, scale: isOpen ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? `${c.badge}` : "bg-white/8 text-white/40"}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <motion.line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <motion.line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 35, mass: 0.8 }} className="overflow-hidden relative">
            <ScanLine color={color} />
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="relative z-10 px-5 py-5">
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SF>
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{label}</label>
        {children}
      </div>
    </SF>
  );
}

const INPUT = "w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all";

/* ─── Controlled Toggle ───────────────────────────────────── */
function Toggle({ on, onChange, color = "violet" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  const c = COLOR[color]!;
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-12 rounded-full transition-all duration-300 flex-shrink-0 ${on ? `${c.icon.split(" ")[0]} ring-1 ${c.ring}` : "bg-white/10"}`}
      style={{ height: "26px" }}>
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-md ${on ? "bg-white" : "bg-white/50"}`}
        style={{ x: on ? "22px" : "0px" }} />
    </button>
  );
}

/* ─── Toggle row (controlled) ─────────────────────────────── */
function ToggleRow({ label, description, on, onChange, color = "violet" }: {
  label: string; description: string; on: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <motion.div variants={staggerItem} className="flex items-center justify-between py-3.5 border-b border-white/6 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <p className="text-xs text-white/35 mt-0.5">{description}</p>
      </div>
      <Toggle on={on} onChange={onChange} color={color} />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════════════ */
function ProfileContent() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile: upAvatar, isUploading: avatarUploading } = useMediaUpload({
    onSuccess: async (result) => {
      setAvatarUrl(result.serveUrl);
    },
  });
  const { uploadFile: upCover, isUploading: coverUploading } = useMediaUpload({
    onSuccess: async (result) => {
      setCoverUrl(result.serveUrl);
    },
  });

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ displayName, bio, avatarUrl, coverUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("settings.save_error")); return; }
      await refetch(); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError(t("common.network_error")); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SF>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/8">
          <div className="relative">
            {avatarUploading ? (
              <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center ring-2 ring-violet-500/30">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
            ) : avatarUrl ? (
              <img loading="lazy" decoding="async" src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-500/30 flex items-center justify-center text-xl font-bold text-violet-300 ring-2 ring-violet-500/30">
                {(displayName || user?.displayName || "?")[0]?.toUpperCase()}
              </div>
            )}
            <button onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center hover:bg-violet-400 transition">
              <Camera className="w-3 h-3 text-white" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upAvatar(f); e.target.value = ""; }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.displayName}</p>
            <p className="text-xs text-white/40">@{user?.username}</p>
            {user?.isVerified && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400">
                <Check className="w-3 h-3" /> {t("settings.verified")}
              </span>
            )}
          </div>
          <button onClick={() => avatarInputRef.current?.click()}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 text-violet-300 text-xs font-medium transition">
            <Upload className="w-3 h-3" /> {t("settings.upload_photo") ?? "Rasm yuklash"}
          </button>
        </div>
      </SF>

      <Field label={t("settings.name_label")}>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={INPUT} placeholder={t("settings.name_ph")} />
      </Field>
      <Field label="Bio">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={160}
          className={`${INPUT} resize-none`} placeholder={t("settings.bio_ph")} />
        <p className="text-xs text-white/30 mt-1 text-right">{bio.length}/160</p>
      </Field>

      <Field label={t("settings.cover_label")}>
        <div className="flex gap-2">
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} className={`${INPUT} flex-1`} placeholder="https://..." />
          <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading}
            className="px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
            {coverUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upCover(f); e.target.value = ""; }} />
        </div>
      </Field>

      {error && <SF><div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div></SF>}
      {success && <SF><div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> {t("settings.profile_saved")}</div></SF>}
      <SF>
        <button onClick={handleSave} disabled={saving || avatarUploading || coverUploading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-sm font-semibold transition-all disabled:opacity-40">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("common.save")}
        </button>
      </SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ACCOUNT
═══════════════════════════════════════════════════════════════ */
function AccountContent() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(""); const [newPass, setNewPass] = useState(""); const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false); const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleChange = async () => {
    if (newPass !== confirm) { setError(t("settings.pass_mismatch")); return; }
    if (newPass.length < 6) { setError(t("settings.pass_too_short")); return; }
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ currentPassword: current, newPassword: newPass }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Xato"); return; }
      setSuccess(true); setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError(t("common.network_error")); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SF>
        <div className="p-4 rounded-xl bg-white/5 border border-white/8">
          <p className="text-xs text-white/40 mb-0.5 uppercase tracking-wider font-semibold">Email</p>
          <p className="text-sm font-semibold text-white">{user?.email}</p>
          <p className="text-xs text-white/30 mt-1">{t("settings.email_immutable")}</p>
        </div>
      </SF>
      <SF><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t("settings.change_password")}</p></SF>
      <Field label={t("settings.current_pass")}>
        <div className="relative">
          <input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} className={`${INPUT} pr-11`} placeholder="••••••••" />
          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
      <Field label={t("settings.new_pass")}>
        <div className="relative">
          <input type={showNew ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} className={`${INPUT} pr-11`} placeholder="••••••••" />
          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
      <Field label={t("settings.confirm_pass")}>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={INPUT} placeholder="••••••••" />
      </Field>
      {error && <SF><div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div></SF>}
      {success && <SF><div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> {t("settings.pass_changed")}</div></SF>}
      <SF>
        <button onClick={handleChange} disabled={saving || !current || !newPass || !confirm}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-semibold transition-all disabled:opacity-40">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("settings.change_password")}
        </button>
      </SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   NOTIFICATIONS — saves to API
═══════════════════════════════════════════════════════════════ */
function NotificationsContent() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT_NOTIF, ...(user?.notifPrefs ?? {}) });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(async (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true); setSuccess(false);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/auth/preferences`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ notifPrefs: next }),
        });
        if (res.ok) { await refetch(); setSuccess(true); setTimeout(() => setSuccess(false), 2000); }
      } finally { setSaving(false); }
    }, 600);
  }, [prefs, refetch]);

  return (
    <div>
      <SF><div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{t("settings.notifications")}</p>
        <div className="flex items-center gap-1.5">
          {saving && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
          {success && <span className="flex items-center gap-1 text-xs text-green-400"><Check className="w-3 h-3" /> Saqlandi</span>}
        </div>
      </div></SF>
      <SF>
        <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/6 overflow-hidden">
          <ToggleRow color="amber" label={t("settings.notif_likes")} description={t("settings.notif_likes_desc")} on={prefs.likes} onChange={v => update("likes", v)} />
          <ToggleRow color="amber" label={t("settings.notif_comments")} description={t("settings.notif_comments_desc")} on={prefs.comments} onChange={v => update("comments", v)} />
          <ToggleRow color="amber" label={t("settings.notif_followers")} description={t("settings.notif_followers_desc")} on={prefs.followers} onChange={v => update("followers", v)} />
          <ToggleRow color="amber" label={t("settings.notif_messages")} description={t("settings.notif_messages_desc")} on={prefs.messages} onChange={v => update("messages", v)} />
          <ToggleRow color="amber" label={t("settings.notif_groups")} description={t("settings.notif_groups_desc")} on={prefs.groups} onChange={v => update("groups", v)} />
          <ToggleRow color="amber" label={t("settings.notif_premium")} description={t("settings.notif_premium_desc")} on={prefs.premium} onChange={v => update("premium", v)} />
        </div>
      </SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   APPEARANCE — localStorage + real CSS class application
═══════════════════════════════════════════════════════════════ */
function AppearanceContent() {
  const { t } = useTranslation();
  const [app, setApp] = useState(getAppearance);

  const update = (key: keyof typeof app, value: boolean) => {
    const next = { ...app, [key]: value };
    setApp(next);
    saveAppearance(next);
  };

  return (
    <div className="space-y-4">
      <SF>
        <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/6 overflow-hidden">
          <ToggleRow color="rose" label={t("settings.dark_mode")} description={t("settings.dark_mode_desc")} on={app.darkMode} onChange={v => update("darkMode", v)} />
          <ToggleRow color="rose" label={t("settings.animations")} description={t("settings.animations_desc")} on={app.animations} onChange={v => update("animations", v)} />
          <ToggleRow color="rose" label={t("settings.compact_mode")} description={t("settings.compact_mode_desc")} on={app.compactMode} onChange={v => update("compactMode", v)} />
        </div>
      </SF>
      <SF>
        <div className="p-3 rounded-xl border border-white/8 bg-white/3 text-xs text-white/40 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          Sozlamalar qurilmangizda saqlanadi. Animatsiyalar va compact rejim darhol qo'llaniladi.
        </div>
      </SF>
      <SF>
        <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/25">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t("settings.custom_themes")}</p>
              <p className="text-xs text-white/40 mt-0.5">{t("settings.custom_themes_desc")}</p>
            </div>
            <Link href="/premium">
              <button className="text-xs text-yellow-400 font-semibold flex items-center gap-1 hover:opacity-80 transition">
                {t("nav.premium")} <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      </SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRIVACY — saves to API + real Delete Account
═══════════════════════════════════════════════════════════════ */
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!password) { setError("Parolni kiriting"); return; }
    setDeleting(true); setError(null);
    try {
      const res = await fetch(`${API}/api/auth/account`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Xato"); return; }
      await logout();
      navigate("/");
    } catch { setError(t("common.network_error")); }
    finally { setDeleting(false); }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#120808] p-6 space-y-4"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white">{t("settings.delete_account")}</p>
            <p className="text-xs text-white/40">{t("settings.danger_irreversible")}</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 space-y-1">
          <p>• Barcha post, reel va hikoyalaringiz o'chiriladi</p>
          <p>• Follower/following ma'lumotlari o'chiriladi</p>
          <p>• Bu amalni qaytarib bo'lmaydi</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Parol bilan tasdiqlang</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              className={`${INPUT} pr-11`} placeholder="Joriy parolingiz" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 accent-red-500" />
          <span className="text-xs text-white/50">Men bu amalni anglayman va qaytarib bo'lmasligini bilaman</span>
        </label>
        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 transition">
            Bekor qilish
          </button>
          <button onClick={handleDelete} disabled={deleting || !password || !confirmed}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2">
            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            O'chirib yuborish
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PrivacyContent() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({ ...DEFAULT_PRIVACY, ...(user?.privacySettings ?? {}) });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(async (key: keyof PrivacySettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true); setSuccess(false);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/auth/preferences`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ privacySettings: next }),
        });
        if (res.ok) { await refetch(); setSuccess(true); setTimeout(() => setSuccess(false), 2000); }
      } finally { setSaving(false); }
    }, 600);
  }, [settings, refetch]);

  return (
    <div className="space-y-4">
      <SF><div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{t("settings.privacy")}</p>
        <div className="flex items-center gap-1.5">
          {saving && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
          {success && <span className="flex items-center gap-1 text-xs text-green-400"><Check className="w-3 h-3" /> Saqlandi</span>}
        </div>
      </div></SF>
      <SF>
        <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/6 overflow-hidden">
          <ToggleRow color="emerald" label={t("settings.priv_profile")} description={t("settings.priv_profile_desc")} on={settings.privateProfile} onChange={v => update("privateProfile", v)} />
          <ToggleRow color="emerald" label={t("settings.priv_activity")} description={t("settings.priv_activity_desc")} on={settings.activityStatus} onChange={v => update("activityStatus", v)} />
          <ToggleRow color="emerald" label={t("settings.priv_read")} description={t("settings.priv_read_desc")} on={settings.readReceipts} onChange={v => update("readReceipts", v)} />
          <ToggleRow color="emerald" label={t("settings.priv_suggest")} description={t("settings.priv_suggest_desc")} on={settings.suggestions} onChange={v => update("suggestions", v)} />
          <ToggleRow color="emerald" label={t("settings.priv_search")} description={t("settings.priv_search_desc")} on={settings.searchVisibility} onChange={v => update("searchVisibility", v)} />
        </div>
      </SF>
      <SF>
        <Link href="/privacy"
          className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{t("privacy_policy.title")}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </Link>
      </SF>
      <SF>
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold text-red-400 mb-1">{t("settings.danger_zone")}</p>
          <p className="text-xs text-white/35 mb-3">{t("settings.danger_irreversible")}</p>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("settings.delete_account")}
          </button>
        </div>
      </SF>
      <AnimatePresence>
        {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LANGUAGE — fully working
═══════════════════════════════════════════════════════════════ */
const POPULAR_LANGS: LangCode[] = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

function LangRow({ lang, current, onSelect, loadingCode }: { lang: typeof LANGUAGES[0]; current: LangCode; onSelect: (c: LangCode) => void; loadingCode: LangCode | null }) {
  const isSelected = lang.code === current;
  const isLoading = loadingCode === lang.code;
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSelect(lang.code)} disabled={!!loadingCode}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left w-full ${isSelected ? "bg-cyan-500/15 border border-cyan-500/35 ring-1 ring-cyan-500/20" : isLoading ? "bg-amber-500/10 border border-amber-500/30" : "border border-transparent hover:bg-white/6 hover:border-white/10"}`}>
      <span className="text-xl w-8 text-center flex-shrink-0">{lang.flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{lang.native}</p>
        <p className="text-xs text-white/40 truncate">{isLoading ? "Translating with AI…" : lang.name}</p>
      </div>
      {lang.rtl && !isLoading && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">RTL</span>}
      {isLoading && <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />}
      {isSelected && !isLoading && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}><Check className="w-4 h-4 text-cyan-400 flex-shrink-0" /></motion.div>}
    </motion.button>
  );
}

function LanguageContent() {
  const { t, i18n: i18nInst } = useTranslation();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState(false);
  const [translating, setTranslating] = useState<LangCode | null>(null);
  const currentCode = i18nInst.language.split("-")[0] as LangCode;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q));
  }, [search]);

  const popularLangs = LANGUAGES.filter(l => POPULAR_LANGS.includes(l.code));
  const otherLangs = filtered.filter(l => !POPULAR_LANGS.includes(l.code));
  const filteredPopular = search ? filtered.filter(l => POPULAR_LANGS.includes(l.code)) : popularLangs;
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  const handleChange = async (code: LangCode) => {
    if (translating) return;
    localStorage.setItem("olcha_lang_user", code);
    if (code !== "uz" && code !== "en" && !i18nInst.hasResourceBundle(code, "translation")) {
      setTranslating(code);
      try { await ensureTranslation(code); } catch { /* fallback to en */ }
      setTranslating(null);
    }
    i18nInst.changeLanguage(code);
    applyRTL(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
    // Persist language preference to server so it follows the user across devices
    fetch(`${API}/api/auth/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ notifPrefs: { language: code } }),
    }).catch(() => { /* non-critical — localStorage is the fallback */ });
  };

  return (
    <div className="space-y-4">
      <SF>
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/8 flex items-center gap-3">
          <span className="text-3xl">{currentLang!.flag}</span>
          <div className="flex-1">
            <p className="text-xs text-white/40 mb-0.5">{t("lang.current")}</p>
            <p className="text-sm font-semibold text-white">{currentLang!.native}</p>
            <p className="text-xs text-white/40">{currentLang!.name}</p>
          </div>
          {currentLang!.rtl && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">RTL</span>}
          <Check className="w-5 h-5 text-cyan-400" />
        </div>
      </SF>
      {translating && (
        <SF>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>AI tarjima qilinmoqda… ({LANGUAGES.find(l => l.code === translating)?.native})</span>
          </div>
        </SF>
      )}
      {applied && !translating && <SF><div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> {t("lang.applied")}</div></SF>}
      <SF>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("lang.search")} className={`${INPUT} pl-9 pr-9`} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
        </div>
      </SF>
      {filteredPopular.length > 0 && (
        <SF>
          {!search && <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{t("lang.popular")}</p>}
          <div className="space-y-1">{filteredPopular.map(lang => <LangRow key={lang.code} lang={lang} current={currentCode} onSelect={handleChange} loadingCode={translating} />)}</div>
        </SF>
      )}
      {otherLangs.length > 0 && (
        <SF>
          {!search && <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{t("lang.all")}</p>}
          <div className="space-y-1">{otherLangs.map(lang => <LangRow key={lang.code} lang={lang} current={currentCode} onSelect={handleChange} loadingCode={translating} />)}</div>
        </SF>
      )}
      {filtered.length === 0 && <SF><div className="text-center py-8 text-white/30 text-sm"><Globe className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>{t("lang.not_found")}</p></div></SF>}
      <SF><p className="text-xs text-white/25 text-center">{t("lang.count", { count: LANGUAGES.length })}</p></SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LOCATION — saves to API
═══════════════════════════════════════════════════════════════ */
const ALL_TIMEZONES = [
  { label: "UTC+05:00 — Toshkent (O'zbekiston)", value: "Asia/Tashkent" },
  { label: "UTC+05:00 — Samarqand", value: "Asia/Samarkand" },
  { label: "UTC+06:00 — Olmaota (Qozog'iston)", value: "Asia/Almaty" },
  { label: "UTC+05:00 — Bishkek (Qirg'iziston)", value: "Asia/Bishkek" },
  { label: "UTC+05:00 — Dushanbe (Tojikiston)", value: "Asia/Dushanbe" },
  { label: "UTC+05:00 — Ashgabat (Turkmaniston)", value: "Asia/Ashgabat" },
  { label: "UTC+04:00 — Boku (Ozarbayjon)", value: "Asia/Baku" },
  { label: "UTC+03:00 — Moskva (Rossiya)", value: "Europe/Moscow" },
  { label: "UTC+03:00 — Istanbul (Turkiya)", value: "Europe/Istanbul" },
  { label: "UTC+02:00 — Kyiv (Ukraina)", value: "Europe/Kyiv" },
  { label: "UTC+04:30 — Kobul (Afg'oniston)", value: "Asia/Kabul" },
  { label: "UTC+03:30 — Tehran (Eron)", value: "Asia/Tehran" },
  { label: "UTC+05:30 — Mumbai, Dehli (Hindiston)", value: "Asia/Kolkata" },
  { label: "UTC+06:00 — Daka (Bangladesh)", value: "Asia/Dhaka" },
  { label: "UTC+07:00 — Bangkok (Tailand)", value: "Asia/Bangkok" },
  { label: "UTC+07:00 — Jakarta (Indoneziya)", value: "Asia/Jakarta" },
  { label: "UTC+08:00 — Pekin, Shanghai (Xitoy)", value: "Asia/Shanghai" },
  { label: "UTC+09:00 — Tokio (Yaponiya)", value: "Asia/Tokyo" },
  { label: "UTC+09:00 — Seul (Janubiy Koreya)", value: "Asia/Seoul" },
  { label: "UTC+03:00 — Riyadh (Saudiya Arabistoni)", value: "Asia/Riyadh" },
  { label: "UTC+04:00 — Dubai (BAA)", value: "Asia/Dubai" },
  { label: "UTC+02:00 — Qohira (Misr)", value: "Africa/Cairo" },
  { label: "UTC+00:00 — London (Buyuk Britaniya)", value: "Europe/London" },
  { label: "UTC+01:00 — Berlin (Germaniya)", value: "Europe/Berlin" },
  { label: "UTC+01:00 — Paris (Fransiya)", value: "Europe/Paris" },
  { label: "UTC-05:00 — Nyu-York (AQSh)", value: "America/New_York" },
  { label: "UTC-08:00 — Los-Anjeles (AQSh)", value: "America/Los_Angeles" },
  { label: "UTC-03:00 — San-Paulu (Braziliya)", value: "America/Sao_Paulo" },
  { label: "UTC+10:00 — Sidney (Avstraliya)", value: "Australia/Sydney" },
  { label: "UTC+00:00 — UTC", value: "UTC" },
];

function LocationContent() {
  const { user, refetch } = useAuth();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState(user?.country ?? "");
  const [saving, setSaving] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState<string | null>(null);

  const autoTz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } }, []);
  const [selectedTz, setSelectedTz] = useState(user?.timezone || autoTz);
  const [previewTime, setPreviewTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setPreviewTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const previewStr = useMemo(() => {
    try {
      const ti = previewTime.toLocaleTimeString("en-GB", { timeZone: selectedTz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const d = previewTime.toLocaleDateString("en-GB", { timeZone: selectedTz, day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
      return `${ti}  ${d}`;
    } catch { return "—"; }
  }, [previewTime, selectedTz]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [search]);

  const selectedCountry = getCountryByCode(selectedCode);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    const c = COUNTRIES.find(x => x.code === code);
    if (c?.timezones.length) setSelectedTz(c.timezones[0]!);
    setSearch("");
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...(selectedCode ? { country: selectedCode } : {}), timezone: selectedTz }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("common.error")); return; }
      await refetch(); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError(t("common.network_error")); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SF>
        <div className="p-4 rounded-xl border border-orange-500/25 bg-orange-500/8">
          <p className="text-xs text-white/40 mb-2">{t("settings.lt_preview")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCountry && <span className="text-xl">{countryFlag(selectedCountry.code)}</span>}
            {selectedCountry && <span className="text-sm font-semibold text-white">{selectedCountry.name}</span>}
            <span className="text-sm font-mono text-orange-400">{previewStr}</span>
          </div>
        </div>
      </SF>
      <Field label={t("settings.lt_timezone")}>
        <p className="text-xs text-white/35 mb-2">{t("settings.lt_auto")} <span className="text-white/60">{autoTz}</span></p>
        <select value={selectedTz} onChange={e => setSelectedTz(e.target.value)} className={INPUT}>
          {ALL_TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          {!ALL_TIMEZONES.find(tz => tz.value === selectedTz) && <option value={selectedTz}>{selectedTz}</option>}
        </select>
      </Field>
      <Field label={t("settings.lt_country")}>
        {selectedCountry && (
          <div className="mb-2 p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2">
            <span className="text-xl">{countryFlag(selectedCountry.code)}</span>
            <div className="flex-1"><span className="text-sm font-semibold text-white">{selectedCountry.name}</span><span className="text-xs text-white/40 ml-2">{selectedCountry.nameEn}</span></div>
            <button onClick={() => setSelectedCode("")} className="text-white/30 hover:text-white/60 p-1"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("settings.lt_search_ph")} className={`${INPUT} pl-9 pr-9`} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
        </div>
        <div className="max-h-52 overflow-y-auto rounded-xl border border-white/8 bg-white/3 divide-y divide-white/5">
          {filtered.slice(0, search ? 50 : 10).map(c => (
            <button key={c.code} onClick={() => handleSelect(c.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/6 ${c.code === selectedCode ? "bg-orange-500/15" : ""}`}>
              <span className="text-lg w-7 text-center flex-shrink-0">{countryFlag(c.code)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs text-white/40 truncate">{c.nameEn}</p>
              </div>
              {c.code === selectedCode && <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />}
            </button>
          ))}
          {!search && filtered.length > 10 && <div className="px-3 py-2 text-xs text-white/30 text-center">{t("settings.lt_show_all", { count: filtered.length })}</div>}
          {filtered.length === 0 && <div className="py-5 text-center text-sm text-white/30"><Globe className="w-5 h-5 mx-auto mb-1 opacity-40" />{t("settings.lt_not_found")}</div>}
        </div>
      </Field>
      {error && <SF><div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div></SF>}
      {success && <SF><div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> {t("common.success")}</div></SF>}
      <SF>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-sm font-semibold transition-all disabled:opacity-40">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("common.save")}
        </button>
      </SF>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MONETIZATION — fetches from API
═══════════════════════════════════════════════════════════════ */
function MonetizationContent() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/creator/monetization/eligibility`, { credentials: "include" });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApply = async () => {
    setApplying(true); setApplyError("");
    try {
      const r = await fetch(`${API}/api/creator/monetization/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) { setApplyError(json.error ?? t("settings.mon_error")); return; }
      await load();
    } finally { setApplying(false); }
  };

  const pct = (cur: number, req: number) => Math.min(100, req > 0 ? Math.round(cur / req * 100) : 0);
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : String(n);
  const uzs = (n: number) => Math.round(n / 100).toLocaleString("uz-UZ") + " so'm";

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" /></div>;

  const s = data?.status ?? "none";
  const cr = data?.criteria;

  return (
    <div className="space-y-4">
      <SF>
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${s === "active" ? "bg-emerald-500/10 border-emerald-500/30" : s === "applied" ? "bg-amber-500/10 border-amber-500/30" : s === "rejected" ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s === "active" ? "bg-emerald-500/20 text-emerald-400" : s === "applied" ? "bg-amber-500/20 text-amber-400" : s === "rejected" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"}`}>
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${s === "active" ? "text-emerald-400" : s === "applied" ? "text-amber-400" : s === "rejected" ? "text-red-400" : "text-white/50"}`}>
              {s === "active" ? t("settings.mon_active") : s === "applied" ? t("settings.mon_pending") : s === "rejected" ? t("settings.mon_rejected") : t("settings.mon_inactive")}
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              {s === "active" ? t("settings.mon_active_desc") : s === "applied" ? t("settings.mon_pending_desc") : s === "rejected" ? (data?.rejectionReason ?? t("settings.mon_rejected")) : t("settings.mon_inactive_desc")}
            </p>
          </div>
        </div>
      </SF>
      {s !== "active" && cr && (
        <SF>
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t("settings.mon_requirements")}</p>
            {([ { key: "followers", label: t("settings.mon_followers"), emoji: "👥" }, { key: "totalViews", label: t("settings.mon_views"), emoji: "👁" }, { key: "contentCount", label: t("settings.mon_content"), emoji: "🎬" } ] as const).map(({ key, label, emoji }) => {
              const c = cr[key as keyof typeof cr];
              if (!c) return null;
              const p = pct(c.current, c.required);
              return (
                <div key={key} className={`rounded-xl p-3 border transition-colors ${c.met ? "border-emerald-500/25 bg-emerald-500/6" : "border-white/8 bg-white/3"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white/60">{emoji} {label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${c.met ? "text-emerald-400" : "text-white/70"}`}>{fmt(c.current)} / {fmt(c.required)}</span>
                      {c.met && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${c.met ? "bg-emerald-400" : "bg-gradient-to-r from-amber-600 to-amber-400"}`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SF>
      )}
      {data?.canApply && (
        <SF>
          {applyError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-2">{applyError}</div>}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleApply} disabled={applying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "#000" }}>
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleDollarSign className="w-4 h-4" />}
            {applying ? t("settings.mon_submitting") : data?.autoApprove ? t("settings.mon_enable") : t("settings.mon_apply")}
          </motion.button>
        </SF>
      )}
      {s === "active" && data?.earnings && (
        <SF>
          <div className="rounded-xl p-3.5 bg-emerald-500/8 border border-emerald-500/20 space-y-1">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t("settings.mon_earnings")}</p>
            <p className="text-2xl font-bold text-emerald-400">{uzs(data.earnings.balance ?? 0)}</p>
            <p className="text-xs text-white/30">{t("settings.mon_min_payout")} {uzs(data.earnings.minPayout ?? 5000000)}</p>
          </div>
        </SF>
      )}
      {!data && !loading && <SF><p className="text-sm text-white/30 text-center py-4">{t("settings.mon_no_data")}</p></SF>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { t, i18n: i18nRef } = useTranslation();
  const { user } = useAuth();
  const currentCode = i18nRef.language.split("-")[0] as LangCode;
  const currentLang = LANGUAGES.find(l => l.code === currentCode);

  const [openPanel, setOpenPanel] = useState<Tab | null>("profile");
  const toggle = (id: Tab) => setOpenPanel(prev => prev === id ? null : id);

  const PANELS: { id: Tab; icon: typeof User; label: string; color: string; preview?: React.ReactNode }[] = [
    { id: "profile",       icon: User,              color: "violet", label: t("settings.profile"),              preview: user?.displayName ? `${user.displayName} · @${user.username}` : undefined },
    { id: "account",       icon: Lock,              color: "blue",   label: t("settings.account"),              preview: user?.email },
    { id: "notifications", icon: Bell,              color: "amber",  label: t("settings.notifications"),        preview: t("settings.notif_preview") },
    { id: "appearance",    icon: Palette,           color: "rose",   label: t("settings.appearance"),           preview: t("settings.appearance_preview") },
    { id: "privacy",       icon: Shield,            color: "emerald",label: t("settings.privacy"),              preview: t("settings.privacy_preview") },
    { id: "language",      icon: Globe,             color: "cyan",   label: t("settings.language"),             preview: currentLang ? `${currentLang.flag} ${currentLang.native}` : undefined },
    { id: "location",      icon: MapPin,            color: "orange", label: t("settings.loc_time"),             preview: user?.country ? `${countryFlag(user.country)} ${getCountryByCode(user.country)?.name ?? ""}` : t("settings.lt_not_set") },
    { id: "monetization",  icon: CircleDollarSign,  color: "amber",  label: t("settings.monetization_label"),  preview: t("settings.monetization_preview") },
  ];

  const CONTENT: Record<Tab, React.ReactNode> = {
    profile:       <ProfileContent />,
    account:       <AccountContent />,
    notifications: <NotificationsContent />,
    appearance:    <AppearanceContent />,
    privacy:       <PrivacyContent />,
    language:      <LanguageContent />,
    location:      <LocationContent />,
    monetization:  <MonetizationContent />,
  };

  return (
    <div className="min-h-screen bg-[#080810]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white/60" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("settings.title")}</h1>
          </div>
          <p className="text-sm text-white/35 ml-11">{t("settings.subtitle")}</p>
        </motion.div>
        <motion.div className="space-y-2" initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
          {PANELS.map(({ id, icon, label, color, preview }) => (
            <motion.div key={id} variants={{ hidden: { opacity: 0, y: 20, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 28 } } }}>
              <Panel color={color} icon={icon} label={label} preview={preview} isOpen={openPanel === id} onToggle={() => toggle(id)}>
                {CONTENT[id]}
              </Panel>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
