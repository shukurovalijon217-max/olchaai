import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Languages, Volume2, ChevronDown, Loader2, Sparkles, Wand2 } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import AIPaywall from "@/components/AIPaywall";

const API = (import.meta.env.VITE_API_BASE_URL);

type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface VoiceProfile {
  detectedLang: string;
  formality: "formal" | "casual" | "mixed";
  energy: "calm" | "moderate" | "energetic";
  sentiment: "neutral" | "positive" | "concerned";
  ttsVoice: TtsVoice;
  styleHint: string;
}

interface TranslateResult {
  success: boolean;
  originalText: string;
  translatedText: string;
  audioBase64: string | null;
  voiceProfile: VoiceProfile | null;
  targetLang: string;
}

/* ─── Waveform visualizer ─────────────────────────────────────── */
function Waveform({ active }: { active: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="flex items-center justify-center gap-[2px] h-12">
      {bars.map(i => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={active ? {
            height: [`${8 + Math.sin(i * 0.7) * 8}px`, `${24 + Math.sin(i * 0.9 + 1) * 12}px`, `${8 + Math.sin(i * 0.7) * 8}px`],
            opacity: [0.5, 1, 0.5],
          } : { height: "4px", opacity: 0.2 }}
          transition={{ duration: 0.8 + (i % 5) * 0.12, repeat: active ? Infinity : 0, ease: "easeInOut", delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}

/* ─── Language picker ─────────────────────────────────────────── */
function LangPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find(l => l.code === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm hover:border-primary/40 transition-colors min-w-[130px]"
      >
        <span className="text-lg">{selected?.flag ?? "🌐"}</span>
        <span className="text-foreground/80">{selected?.native ?? value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-foreground/40 ml-auto" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-auto max-h-72 min-w-[200px]"
          >
            <p className="text-[10px] font-semibold text-muted-foreground px-3 pt-3 pb-1 uppercase tracking-wider">{label}</p>
            {LANGUAGES.slice(0, 25).map(lang => (
              <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors text-sm ${value === lang.code ? "text-primary bg-primary/10" : "text-foreground/80"}`}>
                <span>{lang.flag}</span>
                <span>{lang.native}</span>
                {value === lang.code && <span className="ml-auto text-primary text-xs">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Voice profile badge ─────────────────────────────────────── */
function ProfileBadge({ profile }: { profile: VoiceProfile }) {
  const { t } = useTranslation("voice_translate");
  const energyColors: Record<string, string> = {
    calm: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    moderate: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    energetic: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  const formalColors: Record<string, string> = {
    formal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    casual: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    mixed: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const energyLabel: Record<string, string> = {
    calm: t("energy_calm"),
    energetic: t("energy_energetic"),
    moderate: t("energy_moderate"),
  };
  const formalLabel: Record<string, string> = {
    formal: t("formal_formal"),
    casual: t("formal_casual"),
    mixed: t("formal_mixed"),
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("voice_profile")}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${energyColors[profile.energy] ?? ""}`}>
          {energyLabel[profile.energy] ?? profile.energy}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${formalColors[profile.formality] ?? ""}`}>
          {formalLabel[profile.formality] ?? profile.formality}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full border bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-medium">
          TTS: {profile.ttsVoice}
        </span>
      </div>
      {profile.styleHint && (
        <p className="text-xs text-muted-foreground italic">"{profile.styleHint}"</p>
      )}
    </div>
  );
}

export default function VoiceTranslatorPage() {
  const { t } = useTranslation("voice_translate");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [sourceLang, setSourceLang] = useState("uz");
  const [targetLang, setTargetLang] = useState("en");
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ used: number; remaining: number; limit: number; isPremium: boolean } | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await translate(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setError(t("mic_error"));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
    setProcessing(true);
  }, []);

  const translate = useCallback(async (blob: Blob) => {
    setProcessing(true);
    setResult(null);
    setError(null);
    try {
      const arrayBuf = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));

      const resp = await fetch(`${API}/api/voice/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audioBase64: base64, targetLang, sourceLang }),
      });
      const data = await resp.json() as TranslateResult & { error?: string; usage?: { used: number; remaining: number; isPremium: boolean } };
      if (resp.status === 402) {
        const d = data as any;
        setAiUsage({ used: d.used, remaining: 0, limit: d.limit ?? 5, isPremium: false });
        setShowPaywall(true);
        return;
      }
      if (!resp.ok || !data.success) { setError(data.error ?? t("translate_error")); return; }
      if (data.usage) setAiUsage({ ...data.usage, limit: 5 });
      setResult(data);
    } catch {
      setError(t("translate_error_retry"));
    } finally {
      setProcessing(false);
    }
  }, [targetLang, sourceLang, t]);

  const translateText = useCallback(async () => {
    if (!textInput.trim()) return;
    setProcessing(true);
    setResult(null);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/voice/translate-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: textInput, targetLang }),
      });
      const data = await resp.json() as { originalText: string; translatedText: string; audioBase64: string; targetLang: string };
      setResult({ success: true, voiceProfile: null, ...data });
    } catch { setError(t("translate_error")); }
    finally { setProcessing(false); }
  }, [textInput, targetLang, t, setAiUsage, setShowPaywall]);

  const playAudio = useCallback(() => {
    if (!result?.audioBase64) return;
    const src = `data:audio/mp3;base64,${result.audioBase64}`;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = src;
    audioRef.current.play().catch(() => {});
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Language pair */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <LangPicker value={sourceLang} onChange={setSourceLang} label={t("source_lang")} />
          <motion.div
            animate={{ rotate: processing ? 360 : 0 }}
            transition={{ duration: 1, repeat: processing ? Infinity : 0, ease: "linear" }}
            className="text-primary/60"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <LangPicker value={targetLang} onChange={setTargetLang} label={t("target_lang")} />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTextMode(false)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!textMode ? "bg-primary/15 border border-primary/30 text-primary" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            <Mic className="w-3.5 h-3.5 inline mr-2" />{t("voice_mode")}
          </button>
          <button onClick={() => setTextMode(true)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${textMode ? "bg-primary/15 border border-primary/30 text-primary" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {t("text_mode")}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!textMode ? (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Record button */}
              <div className="bg-card border border-border rounded-3xl p-8 mb-6 flex flex-col items-center gap-6">
                <Waveform active={recording} />
                <motion.button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={processing}
                  whileTap={{ scale: 0.93 }}
                  animate={recording ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.3)", "0 0 0 16px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0.3)"] } : {}}
                  transition={{ duration: 1.5, repeat: recording ? Infinity : 0 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border-2 ${
                    recording
                      ? "bg-destructive/20 border-destructive/60 text-destructive"
                      : "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                  } disabled:opacity-40`}
                >
                  {processing
                    ? <Loader2 className="w-8 h-8 animate-spin" />
                    : recording
                      ? <MicOff className="w-8 h-8" />
                      : <Mic className="w-8 h-8" />
                  }
                </motion.button>
                <p className="text-sm text-muted-foreground">
                  {processing ? t("processing") : recording ? t("stop_hint") : t("press_speak")}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-card border border-border rounded-3xl p-5 mb-6">
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={t("text_placeholder")}
                  rows={4}
                  className="w-full bg-transparent text-foreground placeholder-muted-foreground text-sm resize-none outline-none leading-relaxed"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={translateText}
                    disabled={!textInput.trim() || processing}
                    className="px-5 py-2 bg-primary/15 border border-primary/30 text-primary rounded-xl text-sm font-medium hover:bg-primary/25 transition-colors disabled:opacity-40"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : t("translate_btn")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-6 text-sm text-destructive">
            {error}
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Original */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("original")}</p>
                <p className="text-foreground text-sm leading-relaxed">{result.originalText}</p>
              </div>

              {/* Translated */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{t("translation")}</p>
                  {result.audioBase64 && (
                    <button onClick={playAudio}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-xl text-xs text-primary font-medium hover:bg-primary/25 transition-colors">
                      <Volume2 className="w-3.5 h-3.5" /> {t("listen")}
                    </button>
                  )}
                </div>
                <p className="text-foreground text-sm leading-relaxed">{result.translatedText}</p>
              </div>

              {/* Voice profile */}
              {result.voiceProfile && <ProfileBadge profile={result.voiceProfile} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AIPaywall
        show={showPaywall}
        used={aiUsage?.used ?? 5}
        limit={aiUsage?.limit ?? 5}
        onClose={() => setShowPaywall(false)}
        featureName="Voice Translator"
      />
    </div>
  );
}
