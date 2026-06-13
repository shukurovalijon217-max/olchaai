import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  User, Lock, Bell, Palette, Shield, Crown,
  Check, Loader2, Eye, EyeOff, Camera, ChevronRight, Globe, Search, X,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { LANGUAGES, type LangCode, applyRTL } from "@/lib/i18n";
import { COUNTRIES, countryFlag, getCountryByCode } from "@/lib/countries";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "profile" | "account" | "notifications" | "appearance" | "privacy" | "language" | "location";

function ProfileTab() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName, bio, avatarUrl, coverUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Saqlashda xato"); return; }
      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Profil ma'lumotlari</h2>
        <p className="text-sm text-muted-foreground">Boshqalar ko'radigan ma'lumotlaringizni tahrirlang</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary border-2 border-border">
              {(displayName || user?.displayName || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Camera className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user?.username}</p>
          {user?.isVerified && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400">
              <Check className="w-3 h-3" /> Tasdiqlangan
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Ism *</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="To'liq ismingiz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
            placeholder="O'zingiz haqingizda qisqacha..."
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/160</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Avatar URL</label>
          <input
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Cover rasmi URL</label>
          <input
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="https://..."
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> Profil muvaffaqiyatli saqlandi!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("common.save")}
      </button>
    </div>
  );
}

function AccountTab() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleChange = async () => {
    if (newPass !== confirm) { setError("Yangi parollar mos emas"); return; }
    if (newPass.length < 6) { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Xato"); return; }
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("settings.account")}</h2>
        <p className="text-sm text-muted-foreground">Email va parolingizni boshqaring</p>
      </div>

      <div className="p-4 rounded-xl border border-border bg-muted/20">
        <p className="text-xs text-muted-foreground mb-0.5">Email manzil</p>
        <p className="text-sm font-medium text-foreground">{user?.email}</p>
        <p className="text-xs text-muted-foreground mt-1">Email o'zgartirilmaydi</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Parolni o'zgartirish</h3>
        <div className="relative">
          <label className="block text-sm font-medium text-foreground mb-1.5">Joriy parol</label>
          <input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-foreground mb-1.5">Yangi parol</label>
          <input
            type={showNew ? "text" : "password"}
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Yangi parolni tasdiqlang</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {success && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> Parol muvaffaqiyatli o'zgartirildi!
        </div>
      )}

      <button
        onClick={handleChange}
        disabled={saving || !current || !newPass || !confirm}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Parolni o'zgartirish
      </button>
    </div>
  );
}

function ToggleSetting({ label, description, defaultChecked = false }: {
  label: string; description: string; defaultChecked?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function NotificationsTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("settings.notifications")}</h2>
        <p className="text-sm text-muted-foreground">Qaysi bildirishnomalarni olishni tanlang</p>
      </div>
      <div className="p-4 rounded-xl border border-border bg-card space-y-0">
        <ToggleSetting label="Yoqtirishlar" description="Post va reellaringiz yoqtirilganda" defaultChecked />
        <ToggleSetting label="Izohlar" description="Postlaringizga izoh yozilganda" defaultChecked />
        <ToggleSetting label="Yangi obunachilar" description="Kimdir sizga obuna bo'lganda" defaultChecked />
        <ToggleSetting label="Xabarlar" description="Yangi xabar kelganda" defaultChecked />
        <ToggleSetting label="Guruh faolligi" description="Guruhlaringizdagi yangiliklar" />
        <ToggleSetting label="Premium yangiliklar" description="OlCha Premium haqidagi yangiliklar" />
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("settings.appearance")}</h2>
        <p className="text-sm text-muted-foreground">Ilova ko'rinishini sozlang</p>
      </div>
      <div className="p-4 rounded-xl border border-border bg-card space-y-0">
        <ToggleSetting label="Qorong'i rejim" description="Platforma qorong'i mavzuda ko'rsatiladi" defaultChecked />
        <ToggleSetting label="Animatsiyalar" description="Silliq o'tish animatsiyalari" defaultChecked />
        <ToggleSetting label="Kompakt rejim" description="Kichikroq oraliqlar va elementlar" />
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Maxsus mavzular</p>
            <p className="text-xs text-muted-foreground mt-0.5">Premium foydalanuvchilar uchun eksklyuziv ranglar</p>
          </div>
          <Link href="/premium">
            <button className="text-xs text-yellow-400 font-medium flex items-center gap-1 hover:opacity-80 transition">
              {t("nav.premium")} <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("settings.privacy")}</h2>
        <p className="text-sm text-muted-foreground">Kim nimani ko'rishini boshqaring</p>
      </div>
      <div className="p-4 rounded-xl border border-border bg-card space-y-0">
        <ToggleSetting label="Shaxsiy profil" description="Faqat obunachilar postlaringizni ko'radi" />
        <ToggleSetting label="Faollik holati" description="Onlayn ekanligingiz ko'rsatiladi" defaultChecked />
        <ToggleSetting label="O'qildi belgisi" description="Xabarlarda o'qildi belgisini ko'rsatish" defaultChecked />
        <ToggleSetting label="Tavsiya qilinish" description="Boshqa foydalanuvchilarga tavsiya qilinish" defaultChecked />
        <ToggleSetting label="Qidiruv natijalari" description="Qidiruvda topilish imkoni" defaultChecked />
      </div>
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
        <p className="text-sm font-semibold text-red-400 mb-1">Xavfli zona</p>
        <p className="text-xs text-muted-foreground mb-3">Bu amalni qaytarib bo'lmaydi</p>
        <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition">
          Akkauntni o'chirish
        </button>
      </div>
    </div>
  );
}

const POPULAR_LANGS: LangCode[] = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

function LanguageTab() {
  const { t, i18n: i18nInst } = useTranslation();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState(false);
  const currentCode = i18nInst.language.split("-")[0] as LangCode;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.includes(q)
    );
  }, [search]);

  const popularLangs = LANGUAGES.filter(l => POPULAR_LANGS.includes(l.code));
  const otherLangs = filtered.filter(l => !POPULAR_LANGS.includes(l.code));
  const filteredPopular = search ? filtered.filter(l => POPULAR_LANGS.includes(l.code)) : popularLangs;

  const handleChange = (code: LangCode) => {
    localStorage.setItem("olcha_lang", code);
    i18nInst.changeLanguage(code);
    applyRTL(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("lang.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("lang.subtitle")}</p>
      </div>

      {/* Current language card */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
        <span className="text-3xl">{currentLang.flag}</span>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">{t("lang.current")}</p>
          <p className="text-sm font-semibold text-foreground">{currentLang.native}</p>
          <p className="text-xs text-muted-foreground">{currentLang.name}</p>
        </div>
        {currentLang.rtl && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">RTL</span>
        )}
        <Check className="w-5 h-5 text-primary" />
      </div>

      {applied && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {t("lang.applied")}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("lang.search")}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Popular */}
      {filteredPopular.length > 0 && (
        <div>
          {!search && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("lang.popular")}</p>}
          <div className="grid grid-cols-1 gap-1.5">
            {filteredPopular.map(lang => (
              <LangRow key={lang.code} lang={lang} current={currentCode} onSelect={handleChange} />
            ))}
          </div>
        </div>
      )}

      {/* All others */}
      {otherLangs.length > 0 && (
        <div>
          {!search && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("lang.all")}</p>}
          <div className="grid grid-cols-1 gap-1.5">
            {otherLangs.map(lang => (
              <LangRow key={lang.code} lang={lang} current={currentCode} onSelect={handleChange} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Til topilmadi</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {LANGUAGES.length} ta til qo'llab-quvvatlanadi
      </p>
    </div>
  );
}

function LangRow({ lang, current, onSelect }: {
  lang: typeof LANGUAGES[0];
  current: LangCode;
  onSelect: (code: LangCode) => void;
}) {
  const isSelected = lang.code === current;
  return (
    <button
      onClick={() => onSelect(lang.code)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left w-full group ${
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "border border-transparent hover:bg-muted/50 hover:border-border"
      }`}
    >
      <span className="text-xl w-8 text-center flex-shrink-0">{lang.flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lang.native}</p>
        <p className="text-xs text-muted-foreground truncate">{lang.name}</p>
      </div>
      {lang.rtl && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">RTL</span>
      )}
      {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

/* ── All major IANA timezones ───────────────────────────────── */
const ALL_TIMEZONES: { label: string; value: string }[] = [
  { label: "UTC+05:00 — Toshkent, Samarqand (O'zbekiston)",   value: "Asia/Tashkent" },
  { label: "UTC+05:00 — Samarqand",                           value: "Asia/Samarkand" },
  { label: "UTC+06:00 — Olmaota (Qozog'iston)",               value: "Asia/Almaty" },
  { label: "UTC+05:00 — Bishkek (Qirg'iziston)",              value: "Asia/Bishkek" },
  { label: "UTC+05:00 — Dushanbe (Tojikiston)",               value: "Asia/Dushanbe" },
  { label: "UTC+05:00 — Ashgabat (Turkmaniston)",             value: "Asia/Ashgabat" },
  { label: "UTC+04:00 — Boku (Ozarbayjon)",                   value: "Asia/Baku" },
  { label: "UTC+04:00 — Tbilisi (Gruziya)",                   value: "Asia/Tbilisi" },
  { label: "UTC+04:00 — Yerevan (Armaniston)",                value: "Asia/Yerevan" },
  { label: "UTC+03:00 — Moskva, Sankt-Peterburg (Rossiya)",   value: "Europe/Moscow" },
  { label: "UTC+04:00 — Samara (Rossiya)",                    value: "Europe/Samara" },
  { label: "UTC+05:00 — Yekaterinburg (Rossiya)",             value: "Asia/Yekaterinburg" },
  { label: "UTC+06:00 — Omsk (Rossiya)",                      value: "Asia/Omsk" },
  { label: "UTC+07:00 — Krasnoyarsk (Rossiya)",               value: "Asia/Krasnoyarsk" },
  { label: "UTC+08:00 — Irkutsk (Rossiya)",                   value: "Asia/Irkutsk" },
  { label: "UTC+09:00 — Yakutsk (Rossiya)",                   value: "Asia/Yakutsk" },
  { label: "UTC+10:00 — Vladivostok (Rossiya)",               value: "Asia/Vladivostok" },
  { label: "UTC+03:00 — Istanbul (Turkiya)",                  value: "Europe/Istanbul" },
  { label: "UTC+02:00 — Kyiv (Ukraina)",                      value: "Europe/Kyiv" },
  { label: "UTC+03:00 — Minsk (Belarus)",                     value: "Europe/Minsk" },
  { label: "UTC+04:30 — Kobul (Afg'oniston)",                 value: "Asia/Kabul" },
  { label: "UTC+03:30 — Tehran (Eron)",                       value: "Asia/Tehran" },
  { label: "UTC+05:00 — Karachi (Pokiston)",                  value: "Asia/Karachi" },
  { label: "UTC+05:30 — Mumbai, Dehli (Hindiston)",           value: "Asia/Kolkata" },
  { label: "UTC+05:45 — Katmandu (Nepal)",                    value: "Asia/Kathmandu" },
  { label: "UTC+06:00 — Daka (Bangladesh)",                   value: "Asia/Dhaka" },
  { label: "UTC+06:30 — Yangon (Myanma)",                     value: "Asia/Rangoon" },
  { label: "UTC+07:00 — Bangkok (Tailand)",                   value: "Asia/Bangkok" },
  { label: "UTC+07:00 — Ho Chi Minh (Vyetnam)",               value: "Asia/Ho_Chi_Minh" },
  { label: "UTC+07:00 — Jakarta (Indoneziya)",                value: "Asia/Jakarta" },
  { label: "UTC+08:00 — Pekin, Shanghai (Xitoy)",             value: "Asia/Shanghai" },
  { label: "UTC+08:00 — Kuala Lumpur (Malayziya)",            value: "Asia/Kuala_Lumpur" },
  { label: "UTC+08:00 — Singapur",                            value: "Asia/Singapore" },
  { label: "UTC+08:00 — Manila (Filippin)",                   value: "Asia/Manila" },
  { label: "UTC+09:00 — Tokio (Yaponiya)",                    value: "Asia/Tokyo" },
  { label: "UTC+09:00 — Seul (Janubiy Koreya)",               value: "Asia/Seoul" },
  { label: "UTC+08:00 — Ulaanbaatar (Mo'g'uliston)",          value: "Asia/Ulaanbaatar" },
  { label: "UTC+03:00 — Riyadh (Saudiya Arabistoni)",         value: "Asia/Riyadh" },
  { label: "UTC+04:00 — Dubai (BAA)",                         value: "Asia/Dubai" },
  { label: "UTC+02:00 — Quddus (Isroil)",                     value: "Asia/Jerusalem" },
  { label: "UTC+03:00 — Bagdad (Iroq)",                       value: "Asia/Baghdad" },
  { label: "UTC+02:00 — Qohira (Misr)",                       value: "Africa/Cairo" },
  { label: "UTC+01:00 — Kasablanka (Marokash)",               value: "Africa/Casablanca" },
  { label: "UTC+01:00 — Tunis",                               value: "Africa/Tunis" },
  { label: "UTC+01:00 — Jazoir",                              value: "Africa/Algiers" },
  { label: "UTC+02:00 — Tripoli (Liviya)",                    value: "Africa/Tripoli" },
  { label: "UTC+01:00 — Lagos (Nigeriya)",                    value: "Africa/Lagos" },
  { label: "UTC+03:00 — Nairobi (Keniya)",                    value: "Africa/Nairobi" },
  { label: "UTC+02:00 — Johanesburg (Janubiy Afrika)",        value: "Africa/Johannesburg" },
  { label: "UTC+00:00 — London (Buyuk Britaniya)",            value: "Europe/London" },
  { label: "UTC+01:00 — Berlin (Germaniya)",                  value: "Europe/Berlin" },
  { label: "UTC+01:00 — Paris (Fransiya)",                    value: "Europe/Paris" },
  { label: "UTC+01:00 — Rim (Italiya)",                       value: "Europe/Rome" },
  { label: "UTC+01:00 — Madrid (Ispaniya)",                   value: "Europe/Madrid" },
  { label: "UTC+01:00 — Amsterdam (Niderlandiya)",            value: "Europe/Amsterdam" },
  { label: "UTC+01:00 — Varshava (Polsha)",                   value: "Europe/Warsaw" },
  { label: "UTC+02:00 — Afina (Gretsiya)",                    value: "Europe/Athens" },
  { label: "UTC+01:00 — Vena (Avstriya)",                     value: "Europe/Vienna" },
  { label: "UTC+01:00 — Syurih (Shveytsariya)",               value: "Europe/Zurich" },
  { label: "UTC-05:00 — Nyu-York (AQSh Sharq)",               value: "America/New_York" },
  { label: "UTC-06:00 — Chikago (AQSh Markaziy)",             value: "America/Chicago" },
  { label: "UTC-07:00 — Denver (AQSh Tog')",                  value: "America/Denver" },
  { label: "UTC-08:00 — Los-Anjeles (AQSh G'arb)",            value: "America/Los_Angeles" },
  { label: "UTC-05:00 — Toronto (Kanada)",                    value: "America/Toronto" },
  { label: "UTC-08:00 — Vankuver (Kanada)",                   value: "America/Vancouver" },
  { label: "UTC-06:00 — Mexiko-siti (Meksika)",               value: "America/Mexico_City" },
  { label: "UTC-03:00 — San-Paulu (Braziliya)",               value: "America/Sao_Paulo" },
  { label: "UTC-03:00 — Buenos-Ayres (Argentina)",            value: "America/Argentina/Buenos_Aires" },
  { label: "UTC+10:00 — Sidney (Avstraliya)",                 value: "Australia/Sydney" },
  { label: "UTC+08:00 — Pert (Avstraliya)",                   value: "Australia/Perth" },
  { label: "UTC+12:00 — Oklend (Yangi Zelandiya)",            value: "Pacific/Auckland" },
  { label: "UTC+00:00 — UTC",                                 value: "UTC" },
];

/* ── Location / Country Tab ──────────────────────────────────── */
function LocationTab() {
  const { user, refetch } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState(user?.country ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Auto-detect timezone default */
  const autoTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
  }, []);
  const [selectedTz, setSelectedTz] = useState(user?.timezone || autoTz);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const selectedCountry = getCountryByCode(selectedCode);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    const c = COUNTRIES.find(x => x.code === code);
    /* Suggest country's first timezone, but user can still override */
    if (c?.timezones.length) setSelectedTz(c.timezones[0]);
    setSearch("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...(selectedCode ? { country: selectedCode } : {}),
          timezone: selectedTz,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Saqlashda xato"); return; }
      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setSaving(false);
    }
  };

  /* Live preview clock using selected timezone */
  const [previewTime, setPreviewTime] = useState(() => new Date());
  useMemo(() => { /* refresh every render is fine for a preview */ }, []);
  const previewStr = useMemo(() => {
    try {
      const t = previewTime.toLocaleTimeString("en-GB", { timeZone: selectedTz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const d = previewTime.toLocaleDateString("en-GB", { timeZone: selectedTz, day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
      return `${t}  ${d}`;
    } catch { return "—"; }
  }, [previewTime, selectedTz]);

  /* Tick every second for preview */
  useState(() => {
    const id = setInterval(() => setPreviewTime(new Date()), 1000);
    return () => clearInterval(id);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Joylashuv va vaqt</h2>
        <p className="text-sm text-muted-foreground">Davlat va vaqt zonangizni belgilang — sidebar'da ko'rsatiladi</p>
      </div>

      {/* Live preview */}
      <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
        <p className="text-xs text-muted-foreground mb-1">Ko'rinishi (jonli):</p>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCountry && (
            <span className="text-base">{countryFlag(selectedCountry.code)}</span>
          )}
          {selectedCountry && (
            <span className="text-sm font-semibold text-foreground">{selectedCountry.name}</span>
          )}
          <span className="text-sm font-mono text-violet-400">{previewStr}</span>
        </div>
      </div>

      {/* ── Vaqt zonasi (always visible) ── */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Vaqt zonasi (UTC offset)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Avtomatik aniqlangan: <span className="text-foreground font-medium">{autoTz}</span>
        </p>
        <select
          value={selectedTz}
          onChange={e => setSelectedTz(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        >
          {ALL_TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
          {/* If current tz not in list, show it */}
          {!ALL_TIMEZONES.find(t => t.value === selectedTz) && (
            <option value={selectedTz}>{selectedTz}</option>
          )}
        </select>
      </div>

      {/* ── Davlat tanlash ── */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Davlat <span className="text-muted-foreground font-normal">(ixtiyoriy)</span>
        </label>
        {selectedCountry && (
          <div className="mb-2 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-2">
            <span className="text-xl">{countryFlag(selectedCountry.code)}</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">{selectedCountry.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{selectedCountry.nameEn}</span>
            </div>
            <button
              onClick={() => setSelectedCode("")}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Davlat nomi bilan qidiring..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border/40">
          {filtered.slice(0, search ? 50 : 10).map(c => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                c.code === selectedCode ? "bg-primary/10" : ""
              }`}
            >
              <span className="text-lg w-7 text-center flex-shrink-0">{countryFlag(c.code)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.nameEn}</p>
              </div>
              {c.code === selectedCode && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
          {!search && filtered.length > 10 && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              Qidirish orqali barchani ko'ring ({filtered.length} ta davlat)
            </div>
          )}
          {filtered.length === 0 && (
            <div className="py-5 text-center text-sm text-muted-foreground">
              <Globe className="w-5 h-5 mx-auto mb-1 opacity-40" />
              Davlat topilmadi
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> Saqlandi! Sidebar'da darhol ko'rinadi.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Saqlash
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const TABS: { id: Tab; icon: typeof User; label: string }[] = [
    { id: "profile", icon: User, label: t("settings.profile") },
    { id: "account", icon: Lock, label: t("settings.account") },
    { id: "notifications", icon: Bell, label: t("settings.notifications") },
    { id: "appearance", icon: Palette, label: t("settings.appearance") },
    { id: "privacy", icon: Shield, label: t("settings.privacy") },
    { id: "language", icon: Globe, label: t("settings.language") },
    { id: "location", icon: MapPin, label: "Joylashuv" },
  ];

  const Content = {
    profile: ProfileTab,
    account: AccountTab,
    notifications: NotificationsTab,
    appearance: AppearanceTab,
    privacy: PrivacyTab,
    language: LanguageTab,
    location: LocationTab,
  }[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("settings.subtitle")}</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <aside className="w-52 flex-shrink-0 hidden sm:block">
            <nav className="space-y-0.5">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    activeTab === id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile tab bar */}
          <div className="sm:hidden w-full mb-4">
            <div className="flex flex-col gap-1">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-6 rounded-2xl border border-border bg-card">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
