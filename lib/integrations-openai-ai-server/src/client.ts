import OpenAI from "openai";

/* ── Groq (chat/text) client ────────────────────────────────────
   Groq OpenAI-compatible API — bepul ochiq modellar (Llama 3.3)
   Hujjat: https://console.groq.com/docs/openai
   ─────────────────────────────────────────────────────────────── */
let _groq: OpenAI | null = null;
function getGroqClient(): OpenAI {
  if (_groq) return _groq;
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY muhit o'zgaruvchisi sozlanmagan.");
  _groq = new OpenAI({
    apiKey: key,
    baseURL: "https://api.groq.com/openai/v1",
  });
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
