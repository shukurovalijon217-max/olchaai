import OpenAI from "openai";

const USE_GROQ = !!process.env.GROQ_API_KEY;

/** Chat model to use — Llama 3.3 on Groq, gpt-4o-mini fallback on OpenAI */
export const AI_CHAT_MODEL = USE_GROQ ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

/* ── Groq (chat/text) client ────────────────────────────────────
   Groq OpenAI-compatible API — bepul ochiq modellar (Llama 3.3)
   Hujjat: https://console.groq.com/docs/openai
   ─────────────────────────────────────────────────────────────── */
let _groq: OpenAI | null = null;
function getGroqClient(): OpenAI {
  if (_groq) return _groq;
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    // Groq — bepul, tez (Llama 3.3)
    _groq = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
  } else {
    // Groq yo'q — OpenAI ga fallback
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("Na GROQ_API_KEY na OPENAI_API_KEY sozlanmagan.");
    _groq = new OpenAI({ apiKey: openaiKey });
  }
  return _groq;
}

/* ── OpenAI (image generation only) client ──────────────────────
   Faqat rasm yaratish uchun (DALL-E) — Groq rasm yaratmaydi
   ─────────────────────────────────────────────────────────────── */
let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY muhit o'zgaruvchisi sozlanmagan.");
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getGroqClient();
    const val = (client as any)[prop];
    if (typeof val === "function") return val.bind(client);
    return val;
  },
});

export const openaiImages: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAIClient();
    const val = (client as any)[prop];
    if (typeof val === "function") return val.bind(client);
    return val;
  },
});
