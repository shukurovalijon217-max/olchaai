import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  User, Lock, Bell, Palette, Shield, Crown,
  Check, Loader2, Eye, EyeOff, Camera, ChevronRight, Globe, Search, X
} from "lucide-react";
import { Link } from "wouter";
import { LANGUAGES, type LangCode, applyRTL } from "@/lib/i18n";
import i18n from "i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "profile" | "account" | "notifications" | "appearance" | "privacy" | "language";

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
    i18n.changeLanguage(code);
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
  ];

  const Content = {
    profile: ProfileTab,
    account: AccountTab,
    notifications: NotificationsTab,
    appearance: AppearanceTab,
    privacy: PrivacyTab,
    language: LanguageTab,
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
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
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
