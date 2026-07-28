import OpenAI from "openai";

const USE_GROQ = !!process.env.GROQ_API_KEY;

/** Chat model — Groq Llama 3.3 (10x tez, 3x arzon) yoki OpenAI fallback */
export const AI_CHAT_MODEL = USE_GROQ ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

/** Whisper model — Groq whisper-large-v3 (tezroq) yoki OpenAI whisper-1 */
export const WHISPER_MODEL  = USE_GROQ ? "whisper-large-v3" : "whisper-1";

/* ── Groq (chat + transcription) client ─────────────────────────
   Groq OpenAI-compatible API — Llama 3.3 + Whisper large v3
   https://console.groq.com/docs/openai
   ─────────────────────────────────────────────────────────────── */
let _groq: OpenAI | null = null;
function getGroqClient(): OpenAI {
  if (_groq) return _groq;
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    _groq = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
  } else {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("Na GROQ_API_KEY na OPENAI_API_KEY sozlanmagan.");
    _groq = new OpenAI({ apiKey: openaiKey });
  }
  return _groq;
}

/* ── OpenAI (images + TTS) client ───────────────────────────────
   DALL-E va TTS-1 faqat OpenAI da mavjud — Groq qo'llab-quvvatlamaydi
   ─────────────────────────────────────────────────────────────── */
let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY muhit o'zgaruvchisi sozlanmagan.");
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

function makeProxy(getClient: () => OpenAI): OpenAI {
  return new Proxy({} as OpenAI, {
    get(_target, prop) {
      const client = getClient();
      const val = (client as any)[prop];
      return typeof val === "function" ? val.bind(client) : val;
    },
  });
}

/** Chat + Transcription → Groq (tez) yoki OpenAI (fallback) */
export const openai: OpenAI = makeProxy(getGroqClient);

/** Image generation (DALL-E) → har doim OpenAI */
export const openaiImages: OpenAI = makeProxy(getOpenAIClient);

/** TTS (text-to-speech) → har doim OpenAI (Groq TTS yo'q) */
export const openaiAudio: OpenAI = makeProxy(getOpenAIClient);
