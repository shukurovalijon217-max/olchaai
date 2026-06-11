import { useState, useEffect, useRef, ElementType } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  BookOpen, Search, Plus, Star, BookMarked, CheckCircle2,
  Clock, Heart, X, BookX, Sparkles, Globe, ExternalLink,
  ArrowRight, Zap, Hash, BookCopy, Languages, Mic, MicOff,
  Volume2, VolumeX, Copy, Check, ArrowLeftRight, ChevronDown,
  Loader2
} from "lucide-react";

/* ── World Languages ────────────────────────────────────────────────────── */
const LANGUAGES = [
  { code: "uz", name: "O'zbek", flag: "🇺🇿" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh-CN", name: "中文(简体)", flag: "🇨🇳" },
  { code: "zh-TW", name: "中文(繁體)", flag: "🇹🇼" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "kk", name: "Қазақша", flag: "🇰🇿" },
  { code: "ky", name: "Кыргызча", flag: "🇰🇬" },
  { code: "tg", name: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "tk", name: "Türkmençe", flag: "🇹🇲" },
  { code: "az", name: "Azərbaycanca", flag: "🇦🇿" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "be", name: "Беларуская", flag: "🇧🇾" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "th", name: "ภาษาไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "ta", name: "தமிழ்", flag: "🇱🇰" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "sq", name: "Shqip", flag: "🇦🇱" },
  { code: "hr", name: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", name: "Српски", flag: "🇷🇸" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻" },
  { code: "et", name: "Eesti", flag: "🇪🇪" },
  { code: "ka", name: "ქართული", flag: "🇬🇪" },
  { code: "hy", name: "Հայերեն", flag: "🇦🇲" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
  { code: "my", name: "မြန်မာ", flag: "🇲🇲" },
  { code: "km", name: "ខ្មែរ", flag: "🇰🇭" },
  { code: "lo", name: "ລາວ", flag: "🇱🇦" },
  { code: "si", name: "සිංහල", flag: "🇱🇰" },
  { code: "ne", name: "नेपाली", flag: "🇳🇵" },
  { code: "am", name: "አማርኛ", flag: "🇪🇹" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "so", name: "Soomaali", flag: "🇸🇴" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "mt", name: "Malti", flag: "🇲🇹" },
  { code: "is", name: "Íslenska", flag: "🇮🇸" },
  { code: "ga", name: "Gaeilge", flag: "🇮🇪" },
  { code: "cy", name: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "eu", name: "Euskara", flag: "🇪🇸" },
  { code: "gl", name: "Galego", flag: "🇪🇸" },
  { code: "ca", name: "Català", flag: "🇪🇸" },
  { code: "mk", name: "Македонски", flag: "🇲🇰" },
  { code: "bs", name: "Bosanski", flag: "🇧🇦" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮" },
];

/* ── Language Picker ─────────────────────────────────────────────────────── */
function LangPicker({ value, onChange, showAuto = false }: {
  value: string; onChange: (code: string) => void; showAuto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(q.toLowerCase()) ||
    l.code.toLowerCase().includes(q.toLowerCase())
  );
  const selected = value === "auto" ? null : LANGUAGES.find(l => l.code === value);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors min-w-[130px]">
        <span className="text-base leading-none">{value === "auto" ? "🌐" : (selected?.flag ?? "🌐")}</span>
        <span className="flex-1 text-xs truncate">{value === "auto" ? "Auto-aniqlash" : (selected?.name ?? value)}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="absolute top-full mt-1 left-0 z-50 w-56 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-2 border-b border-border">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Til qidirish..."
                  className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
              </div>
              <div className="max-h-56 overflow-y-auto">
                {showAuto && (
                  <button onClick={() => { onChange("auto"); setOpen(false); setQ(""); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${value === "auto" ? "bg-primary/10 text-primary" : "text-foreground"}`}>
                    <span className="text-sm">🌐</span> Auto-aniqlash
                  </button>
                )}
                {filtered.map(l => (
                  <button key={l.code} onClick={() => { onChange(l.code); setOpen(false); setQ(""); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${value === l.code ? "bg-primary/10 text-primary font-semibold" : "text-foreground"}`}>
                    <span className="text-sm">{l.flag}</span> {l.name}
                    <span className="ml-auto text-[10px] text-muted-foreground uppercase">{l.code}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 3D Search Engine Card ──────────────────────────────────────────────── */
function SearchEngineCard3D({ label, href, logo, className = "", textColor = "text-foreground" }: { label: string; href: string; logo: React.ReactNode; className?: string; textColor?: string }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-1, 1], [12, -12]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 300, damping: 30 });
  const glareX = useTransform(mx, [-1, 1], ["-30%", "130%"]);
  const glareY = useTransform(my, [-1, 1], ["-30%", "130%"]);

  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  }
  function onMouseLeave() { mx.set(0); my.set(0); }

  return (
    <motion.a
      ref={cardRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 600, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      className={`relative flex flex-col items-center justify-center gap-2.5 py-5 px-3 rounded-2xl cursor-pointer overflow-hidden select-none border ${className}`}
    >
      {/* Glare highlight */}
      <motion.div
        className="absolute w-28 h-28 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
          left: glareX,
          top: glareY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
      {/* Logo layer — lifted in Z */}
      <motion.div style={{ translateZ: 20, transformStyle: "preserve-3d" as const }} className="relative z-10">
        {logo}
      </motion.div>
      {/* Label */}
      <motion.span style={{ translateZ: 12 }} className={`text-xs font-bold tracking-wide relative z-10 ${textColor}`}>
        {label}
      </motion.span>
    </motion.a>
  );
}

/* ── Google G logo ── */
const GoogleLogo = () => (
  <div style={{
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #fff 0%, #f1f3f4 100%)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <svg width="26" height="26" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#FBBC05" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  </div>
);

/* ── Yandex Y logo ── */
const YandexLogo = () => (
  <div style={{
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #FF3C00 0%, #cc2200 100%)",
    boxShadow: "0 4px 16px rgba(255,60,0,0.45), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,140,100,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <text x="6" y="24" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="22" fill="white">Я</text>
    </svg>
  </div>
);

/* ── Scholar cap logo ── */
const ScholarLogo = () => (
  <div style={{
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
    boxShadow: "0 4px 16px rgba(26,115,232,0.45), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(100,180,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" fill="white"/>
      <path d="M18.5 12.57l-6.5 3.57-6.5-3.57V16l6.5 3.5 6.5-3.5v-3.43z" fill="rgba(255,255,255,0.6)"/>
    </svg>
  </div>
);

/* ── Web search engines config ── */
const WEB_ENGINES = [
  { label: "Google",  bg: "bg-white/5 border-white/10",        textColor: "text-slate-200", Logo: GoogleLogo  },
  { label: "Yandex",  bg: "bg-red-500/10 border-red-500/20",   textColor: "text-red-300",   Logo: YandexLogo  },
  { label: "Scholar", bg: "bg-blue-500/10 border-blue-500/20", textColor: "text-blue-300",  Logo: ScholarLogo },
];

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Book {
  id: number;
  googleBookId: string;
  title: string;
  authors: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  categories?: string | null;
  language?: string | null;
  status: string;
  currentPage: number;
  rating?: number | null;
  review?: string | null;
  isFavorite: boolean;
  addedAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
  description?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  categories?: string[];
  language?: string | null;
  isbn?: string | null;
}

interface AiSearchResult {
  query: string;
  ai: {
    summary?: string;
    topics?: string[];
    suggestedSearches?: string[];
    bookTypes?: string[];
    webQuery?: string;
  };
  aiAvailable?: boolean;
  books: SearchResult[];
  webSearches: { google: string; yandex: string; scholar: string };
}

type SearchSource = "all" | "library" | "google" | "yandex" | "ai";

const STATUS_CONFIG: Record<string, { label: string; icon: ElementType; color: string }> = {
  want_to_read: { label: "O'qimoqchi", icon: BookMarked, color: "text-blue-400" },
  reading: { label: "O'qilmoqda", icon: Clock, color: "text-amber-400" },
  completed: { label: "O'qildi", icon: CheckCircle2, color: "text-emerald-400" },
  dropped: { label: "To'xtatildi", icon: BookX, color: "text-destructive" },
};

export default function LibraryPage() {
  const [tab, setTab] = useState<"library" | "search" | "popular" | "translate">("library");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>("all");
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // ── Translation state ──
  const [srcLang, setSrcLang] = useState("auto");
  const [tgtLang, setTgtLang] = useState("uz");
  const [srcText, setSrcText] = useState("");
  const [tgtText, setTgtText] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsTarget, setTtsTarget] = useState<"src" | "tgt" | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const [popular, setPopular] = useState<SearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState("");
  const [editPage, setEditPage] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (tab === "popular" && popular.length === 0) loadPopular(); }, [tab]);

  async function loadBooks() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/library/books`, { credentials: "include" });
      if (r.ok) setBooks(await r.json());
    } finally { setLoading(false); }
  }

  async function loadPopular() {
    setPopularLoading(true);
    try {
      const r = await fetch(`${API}/api/library/search/popular`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setPopular(d.items || []); }
    } finally { setPopularLoading(false); }
  }

  // ── Translation helpers ────────────────────────────────────────────────
  async function doTranslate(textOverride?: string, tgtOverride?: string) {
    const q = (textOverride ?? srcText).trim();
    const to = tgtOverride ?? tgtLang;
    if (!q) return;
    setTranslateLoading(true); setTranslateError(""); setTgtText("");
    try {
      const r = await fetch(
        `${API}/api/library/translate?q=${encodeURIComponent(q)}&from=${srcLang}&to=${to}`,
        { credentials: "include" }
      );
      const d = await r.json();
      if (!r.ok) { setTranslateError(d.error ?? "Xato"); return; }
      setTgtText(d.translatedText ?? "");
      if (d.detectedLanguage && d.detectedLanguage !== "auto") setDetectedLang(d.detectedLanguage);
    } catch { setTranslateError("Tarjima serveriga ulanib bo'lmadi"); }
    finally { setTranslateLoading(false); }
  }

  function speakText(text: string, lang: string, which: "src" | "tgt") {
    if (!text.trim()) return;
    if (isSpeaking && ttsTarget === which) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false); setTtsTarget(null); return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const langCode = lang === "auto" ? "en" : lang.split("-")[0];
    // Try to find a voice matching the language
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(langCode));
    if (match) utt.voice = match;
    utt.lang = lang === "auto" ? "en" : lang;
    utt.rate = 0.9;
    utt.onend = () => { setIsSpeaking(false); setTtsTarget(null); };
    utt.onerror = () => { setIsSpeaking(false); setTtsTarget(null); };
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true); setTtsTarget(which);
  }

  function toggleListen() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { alert("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi"); return; }
    if (isListening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.stop();
      setIsListening(false); return;
    }
    const rec = new SpeechRec();
    rec.lang = srcLang === "auto" ? "uz-UZ" : srcLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      setSrcText(transcript);
      setIsListening(false);
      doTranslate(transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }

  function swapLangs() {
    if (srcLang === "auto") return;
    const newSrc = tgtLang;
    const newTgt = srcLang;
    const newSrcText = tgtText;
    setSrcLang(newSrc); setTgtLang(newTgt);
    setSrcText(newSrcText); setTgtText("");
    setDetectedLang("");
    if (newSrcText.trim()) setTimeout(() => doTranslate(newSrcText, newTgt), 50);
  }

  function copyTranslation() {
    if (!tgtText) return;
    navigator.clipboard.writeText(tgtText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  async function doSearch(source?: SearchSource, queryOverride?: string) {
    const q = (queryOverride ?? searchQ).trim();
    if (!q) return;
    const src = source ?? searchSource;
    setSearchLoading(true);
    setAiResult(null);
    setSearchResults([]);
    try {
      if (src === "google") {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
        setSearchLoading(false); return;
      }
      if (src === "yandex") {
        window.open(`https://yandex.com/search/?text=${encodeURIComponent(q)}`, "_blank");
        setSearchLoading(false); return;
      }
      if (src === "ai" || src === "all") {
        const r = await fetch(`${API}/api/library/ai-search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (r.ok) {
          const d: AiSearchResult = await r.json();
          setAiResult(d);
          if (d.books.length > 0) {
            setSearchResults(d.books);
          } else if (d.ai.webQuery) {
            // Fallback: search Open Library with English query from AI
            const fb = await fetch(`${API}/api/library/search?q=${encodeURIComponent(d.ai.webQuery)}`, { credentials: "include" });
            if (fb.ok) { const fd = await fb.json(); setSearchResults(fd.items || []); }
          }
        }
      } else {
        const r = await fetch(`${API}/api/library/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (r.ok) { const d = await r.json(); setSearchResults(d.items || []); }
      }
    } finally { setSearchLoading(false); }
  }

  async function addBook(item: SearchResult) {
    setAddingId(item.id);
    try {
      const r = await fetch(`${API}/api/library/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          googleBookId: item.id,
          title: item.title,
          authors: item.authors,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          publishedDate: item.publishedDate,
          pageCount: item.pageCount,
          categories: item.categories,
          language: item.language,
          isbn: item.isbn,
        }),
      });
      if (r.ok) { await loadBooks(); setTab("library"); }
      else if (r.status === 409) alert("Bu kitob allaqachon kutubxonangizda");
    } finally { setAddingId(null); }
  }

  async function updateBook(id: number, updates: Partial<Book>) {
    const r = await fetch(`${API}/api/library/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    if (r.ok) {
      const updated = await r.json();
      setBooks(prev => prev.map(b => b.id === id ? updated : b));
      setSelected(updated);
    }
  }

  async function deleteBook(id: number) {
    if (!confirm("Kitobni kutubxonadan o'chirish?")) return;
    await fetch(`${API}/api/library/books/${id}`, { method: "DELETE", credentials: "include" });
    setBooks(prev => prev.filter(b => b.id !== id));
    setSelected(null);
  }

  const filtered = filter === "all" ? books : filter === "fav" ? books.filter(b => b.isFavorite) : books.filter(b => b.status === filter);
  const stats = {
    total: books.length,
    reading: books.filter(b => b.status === "reading").length,
    completed: books.filter(b => b.status === "completed").length,
    fav: books.filter(b => b.isFavorite).length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Kutubxona</h1>
              <p className="text-[11px] text-muted-foreground">{stats.total} kitob · {stats.completed} o'qildi</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 bg-muted rounded-xl p-1">
            {([
              { id: "library", label: "Mening" },
              { id: "search", label: "Qidirish" },
              { id: "popular", label: "Mashhur" },
              { id: "translate", label: "🌐 Tarjima" },
            ] as { id: "library"|"search"|"popular"|"translate"; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">

        {/* ── My Library Tab ── */}
        {tab === "library" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Jami", value: stats.total, icon: BookOpen, color: "text-primary" },
                { label: "O'qilmoqda", value: stats.reading, icon: Clock, color: "text-amber-400" },
                { label: "O'qildi", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
                { label: "Sevimli", value: stats.fav, icon: Heart, color: "text-rose-400" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
                  <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: "all", label: "Hammasi" },
                { id: "reading", label: "O'qilmoqda" },
                { id: "want_to_read", label: "O'qimoqchi" },
                { id: "completed", label: "O'qildi" },
                { id: "fav", label: "Sevimlilar" },
                { id: "dropped", label: "To'xtatildi" },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-border hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                <p className="text-muted-foreground text-sm">
                  {books.length === 0 ? "Kutubxonangiz bo'sh. Kitob qidiring!" : "Bu filtrdagi kitoblar yo'q"}
                </p>
                {books.length === 0 && (
                  <button onClick={() => setTab("search")}
                    className="px-4 py-2 rounded-xl bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors">
                    Kitob qidirish
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(book => {
                  const cfg = STATUS_CONFIG[book.status];
                  return (
                    <motion.button key={book.id} onClick={() => { setSelected(book); setEditRating(book.rating || 0); setEditReview(book.review || ""); setEditPage(book.currentPage || 0); }}
                      whileHover={{ y: -2 }} className="text-left group">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                        {book.thumbnailUrl ? (
                          <img src={book.thumbnailUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        {book.isFavorite && <Heart className="absolute top-2 right-2 w-4 h-4 text-rose-400 fill-rose-400" />}
                        <div className={`absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-semibold ${cfg.color}`}>
                          <cfg.icon className="w-2.5 h-2.5" /> {cfg.label}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{book.authors}</p>
                      {book.rating && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < book.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Search Tab ── */}
        {tab === "search" && (
          <div className="space-y-5">

            {/* ── Hero search bar ── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="relative">
              <motion.div
                animate={searchFocused ? {
                  boxShadow: "0 0 0 3px rgba(var(--primary-rgb, 214 90 50) / 0.25), 0 0 30px rgba(var(--primary-rgb, 214 90 50) / 0.12)"
                } : { boxShadow: "0 0 0 1px transparent" }}
                transition={{ duration: 0.25 }}
                className="relative flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
                <motion.div
                  animate={searchLoading ? { rotate: 360 } : { rotate: 0 }}
                  transition={searchLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}>
                  {searchLoading
                    ? <Zap className="w-5 h-5 text-primary" />
                    : <Search className="w-5 h-5 text-muted-foreground" />}
                </motion.div>
                <input
                  ref={searchInputRef}
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doSearch()}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Kitob, mavzu, muallif... har qanday narsani qidiring"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
                />
                {searchQ && (
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                    onClick={() => { setSearchQ(""); setSearchResults([]); setAiResult(null); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            </motion.div>

            {/* ── Source selector ── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {([
                { id: "all",     label: "Hammasi",    icon: Zap,        color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30" },
                { id: "library", label: "Kutubxona",  icon: BookCopy,   color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30" },
                { id: "ai",      label: "AI Tahlil",  icon: Sparkles,   color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30" },
                { id: "google",  label: "Google",     icon: Globe,      color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30" },
                { id: "yandex",  label: "Yandex",     icon: ExternalLink,color: "text-red-400",   bg: "bg-red-400/10",    border: "border-red-400/30" },
              ] as { id: SearchSource; label: string; icon: ElementType; color: string; bg: string; border: string }[]).map(s => (
                <motion.button key={s.id} whileTap={{ scale: 0.95 }}
                  onClick={() => { setSearchSource(s.id); if (searchQ.trim()) doSearch(s.id); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    searchSource === s.id
                      ? `${s.bg} ${s.border} ${s.color}`
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}>
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </motion.button>
              ))}

              <button onClick={() => doSearch()} disabled={searchLoading || !searchQ.trim()}
                className="flex-shrink-0 ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-all active:scale-95">
                {searchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : <ArrowRight className="w-3.5 h-3.5" />}
                Qidirish
              </button>
            </div>

            {/* ── Quick 3D web-search cards (show when query entered, no results yet) ── */}
            <AnimatePresence>
              {searchQ.trim() && !searchLoading && searchResults.length === 0 && !aiResult && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-3 gap-3">
                  {WEB_ENGINES.map((eng, i) => {
                    const urls = [
                      `https://www.google.com/search?q=${encodeURIComponent(searchQ)}`,
                      `https://yandex.com/search/?text=${encodeURIComponent(searchQ)}`,
                      `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQ)}`,
                    ];
                    return (
                      <motion.div key={eng.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <SearchEngineCard3D
                          label={eng.label}
                          href={urls[i]}
                          logo={<eng.Logo />}
                          className={eng.bg}
                          textColor={eng.textColor}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Loading skeleton ── */}
            {searchLoading && (
              <div className="space-y-4">
                <div className="h-28 rounded-2xl bg-muted animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="aspect-[2/3] rounded-xl bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                      <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
                      <div className="h-2.5 rounded bg-muted animate-pulse w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI / Web Result card ── */}
            <AnimatePresence>
              {!searchLoading && aiResult && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-2xl border p-5 space-y-4 ${
                    aiResult.aiAvailable
                      ? "border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-primary/5"
                      : "border-border bg-card"
                  }`}>

                  {/* Header */}
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      aiResult.aiAvailable ? "bg-violet-500/15" : "bg-muted"
                    }`}>
                      <Sparkles className={`w-4 h-4 ${aiResult.aiAvailable ? "text-violet-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {aiResult.aiAvailable ? "AI Tahlil" : "Qidiruv natijalari"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        «{aiResult.query}» so'rovi bo'yicha
                      </p>
                    </div>
                  </div>

                  {/* AI unavailable notice */}
                  {!aiResult.aiAvailable && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                      AI tahlil vaqtincha mavjud emas. Quyidagi manbalarda qidirishingiz mumkin:
                    </p>
                  )}

                  {/* Summary (only when AI available) */}
                  {aiResult.aiAvailable && aiResult.ai.summary && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                      className="text-sm text-foreground/90 leading-relaxed">
                      {aiResult.ai.summary}
                    </motion.p>
                  )}

                  {/* Topics (only when AI available) */}
                  {aiResult.aiAvailable && (aiResult.ai.topics?.length ?? 0) > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                      className="flex flex-wrap gap-2">
                      {aiResult.ai.topics!.map((t, i) => (
                        <motion.button key={t} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                          onClick={() => { setSearchQ(t); doSearch(undefined, t); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-400/10 border border-violet-400/20 text-violet-400 text-xs font-medium hover:bg-violet-400/20 transition-colors">
                          <Hash className="w-2.5 h-2.5" /> {t}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Suggested searches (only when AI available) */}
                  {aiResult.aiAvailable && (aiResult.ai.suggestedSearches?.length ?? 0) > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                      className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Tavsiya etilgan qidiruvlar
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.ai.suggestedSearches!.map((s, i) => (
                          <motion.button key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                            onClick={() => { setSearchQ(s); doSearch(undefined, s); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-foreground/80 hover:text-foreground hover:bg-muted transition-colors">
                            <Search className="w-3 h-3 text-muted-foreground" /> {s}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Web search 3D cards — always shown */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="grid grid-cols-3 gap-2 pt-1">
                    {WEB_ENGINES.map((eng, i) => {
                      const hrefs = [
                        aiResult.webSearches.google,
                        aiResult.webSearches.yandex,
                        aiResult.webSearches.scholar,
                      ];
                      return (
                        <SearchEngineCard3D
                          key={eng.label}
                          label={eng.label}
                          href={hrefs[i]}
                          logo={<eng.Logo />}
                          className={eng.bg}
                          textColor={eng.textColor}
                        />
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Book results ── */}
            {!searchLoading && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-3">
                  <BookCopy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">Kitoblar</span>
                  <span className="text-xs text-muted-foreground ml-auto">{searchResults.length} natija</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {searchResults.map((item, idx) => {
                    const inLib = books.some(b => b.googleBookId === item.id);
                    return (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                            </div>
                          )}
                          <button onClick={() => !inLib && addBook(item)} disabled={inLib || addingId === item.id}
                            className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${inLib ? "" : "bg-background/70 backdrop-blur-sm"}`}>
                            {inLib ? (
                              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Qo'shilgan
                              </span>
                            ) : (
                              <motion.span whileTap={{ scale: 0.95 }}
                                className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {addingId === item.id ? "..." : "Qo'shish"}
                              </motion.span>
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.authors?.join(", ")}</p>
                        {item.publishedDate && (
                          <p className="text-[10px] text-muted-foreground/60">{item.publishedDate.slice(0, 4)}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Empty state ── */}
            {!searchLoading && !aiResult && searchResults.length === 0 && !searchQ.trim() && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 space-y-4">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                    <Search className="w-8 h-8 text-primary/60" />
                  </div>
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">Universal qidiruv</p>
                  <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
                    Kitob nomi, mavzu yoki muallif kiriting. Google, Yandex va AI orqali qidiring.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Python dasturlash", "Tarix kitoblari", "Motivatsiya", "Ilm-fan"].map((hint, i) => (
                    <motion.button key={hint} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.07 }}
                      onClick={() => { setSearchQ(hint); doSearch(undefined, hint); }}
                      className="px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                      {hint}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        )}

        {/* ── Popular Tab ── */}
        {tab === "popular" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Mashhur kitoblar</h2>
              <button onClick={loadPopular} className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                Yangilash
              </button>
            </div>
            {popularLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {popular.map(item => {
                  const inLib = books.some(b => b.googleBookId === item.id);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        <button onClick={() => !inLib && addBook(item)} disabled={inLib || addingId === item.id}
                          className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${!inLib ? "bg-background/70 backdrop-blur-sm" : ""}`}>
                          {inLib ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Qo'shilgan
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                              <Plus className="w-3 h-3" /> {addingId === item.id ? "..." : "Qo'shish"}
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.authors?.join(", ")}</p>
                      {item.language && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">{item.language}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Translate Tab ── */}
        {tab === "translate" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Languages className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Jahon Tarjimon</h2>
                <p className="text-[11px] text-muted-foreground">75+ til · Ovozli kirish/chiqish</p>
              </div>
            </div>

            {/* Language pair selector */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <LangPicker value={srcLang} onChange={v => { setSrcLang(v); setDetectedLang(""); }} showAuto />
              </div>
              <button onClick={swapLangs} disabled={srcLang === "auto"}
                className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-90">
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <LangPicker value={tgtLang} onChange={v => { setTgtLang(v); if (srcText.trim()) doTranslate(undefined, v); }} />
              </div>
            </div>

            {/* Source text */}
            <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {srcLang === "auto"
                    ? (detectedLang ? `Aniqlandi: ${LANGUAGES.find(l => l.code === detectedLang)?.name ?? detectedLang}` : "Manba matn")
                    : (LANGUAGES.find(l => l.code === srcLang)?.name ?? srcLang)}
                </span>
                {detectedLang && srcLang === "auto" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                    {LANGUAGES.find(l => l.code === detectedLang)?.flag} Auto
                  </span>
                )}
              </div>
              <textarea
                value={srcText}
                onChange={e => setSrcText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) doTranslate(); }}
                placeholder="Matn kiriting yoki mikrofon tugmasini bosing..."
                rows={5}
                className="w-full px-3 pb-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex items-center justify-between px-3 pb-3 border-t border-border/50 pt-2">
                <div className="flex items-center gap-1.5">
                  {/* Mic / Voice input */}
                  <button onClick={toggleListen}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}>
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isListening ? "To'xtatish" : "Ovoz"}
                  </button>
                  {/* TTS for source */}
                  {srcText && (
                    <button onClick={() => speakText(srcText, srcLang === "auto" ? "en" : srcLang, "src")}
                      className={`p-1.5 rounded-xl transition-all ${isSpeaking && ttsTarget === "src" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      {isSpeaking && ttsTarget === "src" ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{srcText.length}/5000</span>
              </div>
            </div>

            {/* Translate button */}
            <motion.button
              onClick={() => doTranslate()}
              disabled={!srcText.trim() || translateLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
            >
              {translateLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Tarjima qilinmoqda...</>
              ) : (
                <><Languages className="w-4 h-4" /> Tarjima qilish</>
              )}
            </motion.button>

            {/* Error */}
            {translateError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                ⚠️ {translateError}
              </motion.div>
            )}

            {/* Target text */}
            <AnimatePresence>
              {(tgtText || translateLoading) && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="relative bg-gradient-to-br from-blue-500/5 to-violet-600/5 border border-blue-500/20 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                      {LANGUAGES.find(l => l.code === tgtLang)?.flag} {LANGUAGES.find(l => l.code === tgtLang)?.name ?? tgtLang}
                    </span>
                    <div className="flex items-center gap-1">
                      {tgtText && (
                        <>
                          <button onClick={() => speakText(tgtText, tgtLang, "tgt")}
                            className={`p-1.5 rounded-lg transition-all ${isSpeaking && ttsTarget === "tgt" ? "text-violet-400 bg-violet-400/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                            {isSpeaking && ttsTarget === "tgt" ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={copyTranslation}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3 min-h-[80px]">
                    {translateLoading ? (
                      <div className="flex items-center gap-2 py-6">
                        <div className="flex gap-1">
                          {[0,1,2].map(i => (
                            <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                              className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">Tarjima qilinmoqda...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tgtText}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick language suggestions */}
            {!srcText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Tez tarjima tillari:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { from: "uz", to: "en", label: "O'zbek → English" },
                    { from: "en", to: "uz", label: "English → O'zbek" },
                    { from: "ru", to: "uz", label: "Русский → O'zbek" },
                    { from: "uz", to: "ru", label: "O'zbek → Русский" },
                    { from: "en", to: "ru", label: "English → Русский" },
                    { from: "ar", to: "uz", label: "عربي → O'zbek" },
                  ].map(pair => (
                    <button key={`${pair.from}-${pair.to}`}
                      onClick={() => { setSrcLang(pair.from); setTgtLang(pair.to); }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${srcLang === pair.from && tgtLang === pair.to
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}>
                      {pair.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tips */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🎤", title: "Ovozli kirish", desc: "Mikrofon tugmasi orqali gapiring" },
                { icon: "🔊", title: "Ovozli o'qish", desc: "Natijani eshitish uchun bosing" },
                { icon: "⌨️", title: "Tez tarjima", desc: "Ctrl+Enter bilan tarjima" },
              ].map(tip => (
                <div key={tip.title} className="bg-muted/50 rounded-xl p-2.5 text-center">
                  <div className="text-lg mb-1">{tip.icon}</div>
                  <p className="text-[10px] font-semibold text-foreground mb-0.5">{tip.title}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{tip.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Book Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm px-4 pb-4"
            onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 flex-shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                    {selected.thumbnailUrl ? (
                      <img src={selected.thumbnailUrl} alt={selected.title} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground opacity-40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-foreground text-sm leading-tight">{selected.title}</h2>
                      <button onClick={() => setSelected(null)} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selected.authors}</p>
                    {selected.publishedDate && <p className="text-[10px] text-muted-foreground">{selected.publishedDate.slice(0, 4)}</p>}
                    {selected.pageCount && <p className="text-[10px] text-muted-foreground">{selected.pageCount} sahifa</p>}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Holat</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                      <button key={id} onClick={() => updateBook(selected.id, { status: id })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selected.status === id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border hover:text-foreground"}`}>
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} /> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                {selected.status === "reading" && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Progress</p>
                    <div className="flex items-center gap-3">
                      <input type="number" value={editPage} onChange={e => setEditPage(Number(e.target.value))} min={0} max={selected.pageCount || 9999}
                        className="w-20 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                      <span className="text-xs text-muted-foreground">/ {selected.pageCount || "?"} sahifa</span>
                      <button onClick={() => updateBook(selected.id, { currentPage: editPage })}
                        className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                        Saqlash
                      </button>
                    </div>
                    {selected.pageCount && (
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (selected.currentPage / selected.pageCount) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Rating */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Baho</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => { setEditRating(i + 1); updateBook(selected.id, { rating: i + 1 }); }}>
                        <Star className={`w-6 h-6 transition-colors ${i < editRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground hover:text-amber-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Favorite */}
                <button onClick={() => updateBook(selected.id, { isFavorite: !selected.isFavorite })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selected.isFavorite ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <Heart className={`w-3.5 h-3.5 ${selected.isFavorite ? "fill-rose-400" : ""}`} />
                  {selected.isFavorite ? "Sevimlilardan chiqarish" : "Sevimlilarga qo'shish"}
                </button>

                {/* Review */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sharh</p>
                  <textarea value={editReview} onChange={e => setEditReview(e.target.value)} rows={3}
                    placeholder="Kitob haqida fikringiz..."
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
                  <button onClick={() => updateBook(selected.id, { review: editReview })}
                    className="mt-2 w-full py-2 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                    Sharh saqlash
                  </button>
                </div>

                {/* Delete */}
                <button onClick={() => deleteBook(selected.id)}
                  className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors">
                  Kutubxonadan o'chirish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
