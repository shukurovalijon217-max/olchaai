import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, TrendingUp, Send, RotateCcw, Star, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import AIPaywall from "@/components/AIPaywall";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mode = "wisdom" | "trader";

interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Quote {
  uz: string;
  en: string;
  author: string;
}

const FALLBACK_QUOTES: Quote[] = [
  { uz: "Sukunat — ruhning tili. So'zlar esa uning soyasi.", en: "Silence is the language of the soul. Words are but its shadow.", author: "Rumi" },
  { uz: "Sabr — qalbning ilmuri. Har qanday bo'ronga dosh beradi.", en: "Patience is the anchor of the heart. It withstands every storm.", author: "Al-Ghazali" },
  { uz: "O'z-o'zingni bil — butun olamni bilasan.", en: "Know yourself — and you will know the entire universe.", author: "Ibn Arabi" },
];

/* ─── Floating particle ─────────────────────────────────────── */
function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-amber-400/40 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [-8, 8, -8], opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i, delay: i * 0.3, x: (i * 17 + 11) % 100, y: (i * 23 + 7) % 100,
}));

/* ─── Streaming message bubble ──────────────────────────────── */
function MuniMessage({ msg, streaming }: { msg: Msg; streaming: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
          <Star className="w-3.5 h-3.5 text-amber-400" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-amber-600/25 border border-amber-500/30 text-amber-100 rounded-tr-none"
            : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
        }`}
      >
        {msg.content}
        {streaming && !isUser && (
          <span className="inline-block w-0.5 h-4 bg-amber-400 ml-1 animate-pulse align-text-bottom" />
        )}
      </div>
    </motion.div>
  );
}

export default function MuniAIPage() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>("wisdom");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quote, setQuote] = useState<Quote>(FALLBACK_QUOTES[0]!);
  const [showPaywall, setShowPaywall] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ used: number; remaining: number; limit: number; isPremium: boolean } | null>(null);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  /* Load random quote on mount */
  useEffect(() => {
    fetch(`${API}/api/muni/quote`, { credentials: "include" })
      .then(r => r.json())
      .then((q: Quote) => setQuote(q))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearChat = useCallback(() => {
    esRef.current?.close();
    setMessages([]);
    setStreaming(false);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Msg = { id: nextId.current++, role: "user", content: text };
    const assistantMsg: Msg = { id: nextId.current++, role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(`${API}/api/muni/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, mode, history }),
      });

      if (resp.status === 402) {
        const data = await resp.json();
        setAiUsage({ used: data.used, remaining: 0, limit: data.limit ?? 5, isPremium: false });
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
        setShowPaywall(true);
        setStreaming(false);
        return;
      }

      if (!resp.ok || !resp.body) { setStreaming(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(part.slice(6)) as { content?: string; done?: boolean };
            if (json.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: m.content + json.content } : m
              ));
            }
            if (json.done) {
              setStreaming(false);
              const usage = (json as any).usage;
              if (usage) setAiUsage({ ...usage, limit: 5 });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setStreaming(false);
    }
  }, [input, streaming, mode, messages]);

  const quoteText = i18n.language.startsWith("uz") ? quote.uz : quote.en;

  return (
    <div className="min-h-screen bg-[#0a0805] text-white flex flex-col relative overflow-hidden">
      {/* Ambient particles */}
      {PARTICLES.map(p => <Particle key={p.id} {...p} />)}

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pb-4 border-b border-amber-900/30" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-100 tracking-wide">Muni AI</h1>
                <p className="text-xs text-amber-400/60">{t("muni.subtitle")}</p>
              </div>
            </div>
            <button onClick={clearChat} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quote */}
          <motion.div
            key={quote.uz}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-4 mb-5"
          >
            <p className="text-amber-200/80 text-sm italic leading-relaxed">"{quoteText}"</p>
            <p className="text-amber-400/50 text-xs mt-2 text-right">— {quote.author}</p>
          </motion.div>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("wisdom")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "wisdom"
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              <Brain className="w-3.5 h-3.5" /> {t("muni.mode_wisdom")}
            </button>
            <button
              onClick={() => setMode("trader")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "trader"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                  : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> {t("muni.mode_trader")}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-60 text-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-amber-400/60" />
                </div>
                <div>
                  <p className="text-white/40 text-sm">
                    {mode === "wisdom" ? t("muni.wisdom_hint") : t("muni.trader_hint")}
                  </p>
                </div>
              </motion.div>
            )}
            {messages.map((msg, i) => (
              <MuniMessage
                key={msg.id}
                msg={msg}
                streaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-6 pt-3 border-t border-amber-900/20">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={mode === "wisdom" ? t("muni.wisdom_ph") : t("muni.trader_ph")}
            className="flex-1 bg-white/5 border border-amber-900/30 focus:border-amber-500/40 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="w-11 h-11 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 flex items-center justify-center text-amber-400 disabled:opacity-30 transition-all flex-shrink-0"
          >
            {streaming
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400/50 border-t-amber-400 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      <AIPaywall
        show={showPaywall}
        used={aiUsage?.used ?? 5}
        limit={aiUsage?.limit ?? 5}
        onClose={() => setShowPaywall(false)}
        featureName="Muni AI"
      />
    </div>
  );
}
