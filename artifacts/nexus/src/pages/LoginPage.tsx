import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Search, Check, X, Globe } from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { LANGUAGES, type LangCode, applyRTL } from "@/lib/i18n";

/* ─── Popular languages shown first ──────────────────────────── */
const POPULAR = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

/* ─── 3D Animated Language Switcher ─────────────────────────── */
function LangSwitcher() {
  const { i18n: i18nInst } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  const currentCode = i18nInst.language.split("-")[0] as LangCode;
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* 3D tilt on hover */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotX = useSpring(useTransform(mouseY, [-20, 20], [12, -12]), { stiffness: 300, damping: 20 });
  const rotY = useSpring(useTransform(mouseX, [-20, 20], [-12, 12]), { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const handleSelect = (code: LangCode) => {
    localStorage.setItem("olcha_lang", code);
    i18nInst.changeLanguage(code);
    applyRTL(code);
    setOpen(false);
    setSearch("");
  };

  const filtered = LANGUAGES.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q);
  });
  const popular = filtered.filter(l => POPULAR.includes(l.code));
  const others = filtered.filter(l => !POPULAR.includes(l.code));

  return (
    <div ref={ref} className="relative" style={{ zIndex: 100 }}>
      {/* 3D Globe Button */}
      <motion.div
        ref={btnRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 600, transformStyle: "preserve-3d" }}
        whileTap={{ scale: 0.94 }}
      >
        <motion.button
          onClick={() => setOpen(v => !v)}
          style={{
            rotateX: rotX,
            rotateY: rotY,
            transformStyle: "preserve-3d",
            background: "linear-gradient(135deg, rgba(40,18,6,0.95) 0%, rgba(70,30,10,0.9) 100%)",
            border: "1px solid rgba(180,100,30,0.4)",
            boxShadow: open
              ? "0 0 22px rgba(200,120,40,0.5), inset 0 1px 0 rgba(255,200,100,0.15)"
              : "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,200,100,0.08)",
            color: "#d4a96a",
          }}
          className="relative flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold select-none overflow-hidden"
        >
          {/* Spinning ring behind the globe (CSS animation) */}
          <div className="relative w-7 h-7 flex-shrink-0" style={{ transformStyle: "preserve-3d" }}>
            {/* Globe orb */}
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 35%, rgba(220,140,50,0.3), rgba(120,60,20,0.6))",
                boxShadow: "0 0 12px rgba(200,120,40,0.4), inset 0 0 8px rgba(0,0,0,0.5)",
                border: "1px solid rgba(200,140,60,0.3)",
                transformStyle: "preserve-3d",
              }}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400/70" />
            </motion.div>
            {/* Flag overlay */}
            <div className="absolute inset-0 flex items-center justify-center text-base" style={{ lineHeight: 1 }}>
              {currentLang.flag}
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c8a050" }}>
            {currentCode}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="w-3 h-3 border-r-2 border-b-2 rounded-sm"
            style={{ borderColor: "rgba(200,160,80,0.6)", transform: open ? "rotate(225deg)" : "rotate(45deg)" }}
          />
        </motion.button>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,6,2,0.97)",
              border: "1px solid rgba(120,60,20,0.5)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(180,100,30,0.15)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Search */}
            <div className="p-3 border-b" style={{ borderColor: "rgba(100,50,15,0.4)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#7a4820" }} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl text-xs focus:outline-none"
                  style={{
                    background: "rgba(30,12,4,0.9)",
                    border: "1px solid rgba(100,50,15,0.5)",
                    color: "#c8a060",
                  }}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#7a4820" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Language list */}
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              {!search && (
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a3010" }}>
                  Popular
                </p>
              )}
              {popular.map(lang => (
                <LangOption key={lang.code} lang={lang} current={currentCode} onSelect={handleSelect} />
              ))}
              {others.length > 0 && (
                <>
                  {!search && (
                    <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a3010" }}>
                      All languages
                    </p>
                  )}
                  {others.map(lang => (
                    <LangOption key={lang.code} lang={lang} current={currentCode} onSelect={handleSelect} />
                  ))}
                </>
              )}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: "#7a4820" }}>No results</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LangOption({ lang, current, onSelect }: {
  lang: (typeof LANGUAGES)[number]; current: string; onSelect: (c: LangCode) => void;
}) {
  const isCurrent = lang.code === current;
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={() => onSelect(lang.code)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
      style={{
        background: isCurrent ? "rgba(120,60,15,0.3)" : "transparent",
        borderLeft: isCurrent ? "2px solid rgba(200,120,40,0.7)" : "2px solid transparent",
      }}
    >
      <span className="text-lg">{lang.flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: isCurrent ? "#d4a960" : "#8a5530" }}>{lang.native}</p>
        <p className="text-[10px] truncate" style={{ color: "#5a3010" }}>{lang.name}</p>
      </div>
      {lang.rtl && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(120,60,15,0.4)", color: "#7a4820" }}>RTL</span>}
      {isCurrent && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#c8a040" }} />}
    </motion.button>
  );
}

/* ─── Main Login Page ────────────────────────────────────────── */
export default function LoginPage() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();

  const [form, setForm] = useState({
    username: "", displayName: "", email: "", password: ""
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        const res = await login(form.email, form.password);
        if (res.error) { setError(res.error); return; }
      } else {
        if (!form.username.trim()) { setError(t("auth.username_req")); return; }
        if (!form.displayName.trim()) { setError(t("auth.name_req")); return; }
        const res = await register(form.username, form.displayName, form.email, form.password);
        if (res.error) { setError(res.error); return; }
      }
      setLocation("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative" style={{ background: "#0a0604" }}>

      {/* ── Language switcher (absolute top-right) ── */}
      <div className="absolute top-5 right-5 z-50">
        <LangSwitcher />
      </div>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(180,10,0,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="relative z-10 text-center flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <NexusLogo ringSize={130} showText={false} />
          </motion.div>
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <span style={{
              display: "block",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.35em",
              fontWeight: 400,
              fontSize: "2.6rem",
              background: "linear-gradient(180deg, #d4a96a 0%, #f0c060 28%, #a06030 62%, #6a3a18 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              OlCha
            </span>
          </motion.div>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: "#6b5040", maxWidth: 320, lineHeight: 1.6, fontSize: "0.95rem" }}
          >
            {t("auth.tagline")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {["Instagram", "TikTok", "Facebook", "Snapchat", "Telegram"].map((p, i) => (
              <motion.span
                key={p}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.65 + i * 0.07 }}
                style={{
                  padding: "3px 10px", borderRadius: 8,
                  border: "1px solid #3a2010", background: "rgba(60,30,10,0.4)",
                  color: "#7a5030", fontSize: "0.72rem", fontWeight: 500,
                }}
              >
                {p}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "rgba(10,6,4,0.5)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <NexusLogo ringSize={38} showText={true} fontSize="1.1rem" letterSpacing="0.2em" />
          </div>

          {/* Tab */}
          <div className="flex rounded-xl p-1 mb-7" style={{ background: "rgba(40,20,8,0.8)", border: "1px solid #2a1408" }}>
            {(["login", "signup"] as const).map(tabKey => (
              <button key={tabKey} type="button" onClick={() => { setTab(tabKey); setError(""); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={tab === tabKey
                  ? { background: "rgba(80,40,16,0.9)", color: "#d4a96a", border: "1px solid #4a2810" }
                  : { color: "#5a3a20", border: "1px solid transparent" }
                }
              >
                {tabKey === "login" ? t("auth.login") : t("auth.register")}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === "login" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "login" ? 12 : -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {tab === "signup" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                      {t("auth.username")}
                    </label>
                    <input
                      value={form.username}
                      onChange={set("username")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                      style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                      placeholder="asilbek_dev"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                      {t("auth.full_name")}
                    </label>
                    <input
                      value={form.displayName}
                      onChange={set("displayName")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                      style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                      placeholder="Asilbek Karimov"
                      autoComplete="name"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                  placeholder="siz@olcha.uz"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none pr-10 transition-all"
                    style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                    placeholder="••••••••"
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#5a3a20" }}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(180,20,0,0.15)", border: "1px solid rgba(180,20,0,0.3)" }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#e05030" }} />
                    <span className="text-xs" style={{ color: "#e05030" }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.975 }}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all mt-2 relative overflow-hidden"
                style={{
                  background: loading
                    ? "rgba(80,20,0,0.5)"
                    : "linear-gradient(135deg, #8a1800 0%, #c02000 50%, #8a1800 100%)",
                  color: "#ffcca0",
                  border: "1px solid #aa2800",
                  boxShadow: loading ? "none" : "0 0 18px rgba(180,20,0,0.35)",
                  letterSpacing: "0.06em",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {/* Shimmer when loading */}
                {loading && (
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.08) 50%, transparent 100%)" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {loading ? t("common.loading") : tab === "login" ? t("auth.enter") : t("auth.join")}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-xs mt-6" style={{ color: "#4a2810" }}>
            {tab === "login" ? t("auth.no_account") + " " : t("auth.have_account") + " "}
            <button
              type="button"
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: "#c07030" }}
              className="hover:underline font-semibold"
            >
              {tab === "login" ? t("auth.register") : t("auth.login")}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
