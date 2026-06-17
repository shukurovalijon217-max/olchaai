import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles, Image, FileText,
  Wand2, ChevronRight, Mic, MicOff, Volume2, Loader2, StopCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message { id: number; role: "user" | "assistant"; content: string; createdAt: string; }
interface Conversation { id: number; title: string; createdAt: string; }

export default function AIChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [captionTopic, setCaptionTopic] = useState("");
  const [captionResult, setCaptionResult] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "voice" | "caption" | "image">("chat");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageResult, setImageResult] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [voiceAudio, setVoiceAudio] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const QUICK_ACTIONS = [
    { icon: Wand2, label: t("ai.quick_caption"), prompt: "Instagram uchun jozibali caption yoz: " },
    { icon: FileText, label: t("ai.quick_edit"), prompt: "Quyidagi matnni yaxshila: " },
    { icon: Sparkles, label: t("ai.quick_idea"), prompt: "OlCha uchun kontent g'oyalar ber" },
    { icon: Image, label: t("ai.quick_prompt"), prompt: "DALL-E uchun ajoyib rasm prompt yoz: " },
  ];

  const TABS = [
    { id: "chat", label: t("ai.tab_chat") },
    { id: "voice", label: `🎙 ${t("ai.tab_voice")}` },
    { id: "caption", label: "Caption" },
    { id: "image", label: t("ai.tab_image") },
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streaming]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function loadConversations() {
    setLoadingConvs(true);
    try {
      const r = await fetch(`${API}/api/openai/conversations`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setConversations(data);
        if (data.length > 0 && !activeConv) openConversation(data[data.length - 1].id);
      }
    } finally {
      setLoadingConvs(false);
    }
  }

  async function openConversation(id: number) {
    setActiveConv(id);
    const r = await fetch(`${API}/api/openai/conversations/${id}`, { credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setMsgs(data.messages || []);
    }
  }

  async function newConversation(): Promise<number | null> {
    const title = `${t("ai.tab_chat")} ${new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    const r = await fetch(`${API}/api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title }),
    });
    if (r.ok) {
      const conv = await r.json();
      setConversations(prev => [...prev, conv]);
      setActiveConv(conv.id);
      setMsgs([]);
      return conv.id as number;
    }
    return null;
  }

  async function deleteConversation(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`${API}/api/openai/conversations/${id}`, { method: "DELETE", credentials: "include" });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConv === id) { setActiveConv(null); setMsgs([]); }
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    let convId = activeConv;
    if (!convId) {
      convId = await newConversation();
      if (!convId) return;
    }

    const userMsg: Message = { id: Date.now(), role: "user", content: input.trim(), createdAt: new Date().toISOString() };
    setMsgs(prev => [...prev, userMsg]);
    const sentInput = input.trim();
    setInput("");
    setStreaming(true);

    const aiMsgId = Date.now() + 1;
    setMsgs(prev => [...prev, { id: aiMsgId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

    try {
      const r = await fetch(`${API}/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: sentInput }),
      });
      if (!r.body) return;

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + parsed.content } : m));
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = processVoice;
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setVoiceTranscript("");
      setVoiceResponse("");
      setVoiceAudio(null);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      alert(t("ai.mic_error"));
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(tr => tr.stop());
    setIsRecording(false);
    setVoiceLoading(true);
  }

  async function processVoice() {
    try {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const r = await fetch(`${API}/api/openai/voice-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audioBase64: base64 }),
      });

      if (r.ok) {
        const data = await r.json();
        setVoiceTranscript(data.transcript ?? "");
        setVoiceResponse(data.response ?? "");
        setVoiceAudio(data.audioBase64 ?? null);
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          audio.play().catch(() => {});
        }
      }
    } catch {
      setVoiceResponse(t("ai.voice_error"));
    } finally {
      setVoiceLoading(false);
    }
  }

  function playVoiceResponse() {
    if (!voiceAudio) return;
    const audio = new Audio(`data:audio/mp3;base64,${voiceAudio}`);
    audio.play().catch(() => {});
  }

  async function generateCaption() {
    if (!captionTopic.trim()) return;
    setCaptionLoading(true);
    setCaptionResult("");
    try {
      const r = await fetch(`${API}/api/openai/generate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: captionTopic, tone: "qiziqarli", platform: "OlCha" }),
      });
      if (r.ok) {
        const data = await r.json();
        setCaptionResult(data.caption || "");
      }
    } finally {
      setCaptionLoading(false);
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageResult("");
    try {
      const r = await fetch(`${API}/api/openai/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      if (r.ok) {
        const data = await r.json();
        setImageResult(data.url || data.b64_json || "");
      }
    } finally {
      setImageLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">OlCha AI</h1>
              <p className="text-[11px] text-muted-foreground">{t("ai.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
            {TABS.map(tab_ => (
              <button key={tab_.id} onClick={() => setTab(tab_.id as typeof tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${tab === tab_.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {tab_.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex gap-4">

        {/* ── Chat Tab ── */}
        {tab === "chat" && (
          <>
            <div className="hidden md:flex w-56 flex-col gap-2 flex-shrink-0">
              <button onClick={newConversation}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm font-semibold">
                <Plus className="w-4 h-4" /> {t("ai.new_chat")}
              </button>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {loadingConvs ? (
                  <div className="text-xs text-muted-foreground px-2">{t("common.loading")}</div>
                ) : conversations.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-2">{t("ai.no_chats")}</div>
                ) : (
                  conversations.slice().reverse().map(c => (
                    <button key={c.id} onClick={() => openConversation(c.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors group ${activeConv === c.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1 truncate">{c.title}</span>
                      <Trash2 onClick={(e) => deleteConversation(c.id, e)}
                        className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 text-destructive" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-400" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground mb-1">{t("ai.welcome_title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("ai.welcome_sub")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
                    {QUICK_ACTIONS.map(a => (
                      <button key={a.label} onClick={async () => { await newConversation(); setInput(a.prompt); }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                        <a.icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground">{a.label}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                  <button onClick={newConversation}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    {t("ai.start_chat")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0 max-h-[calc(100vh-280px)]">
                    <AnimatePresence initial={false}>
                      {msgs.map(m => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-blue-600"}`}>
                            {m.role === "user" ? (user?.displayName?.[0] || "U") : <Bot className="w-4 h-4 text-white" />}
                          </div>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm"
                          }`}>
                            {m.content || (streaming && m.role === "assistant" ? (
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                              </span>
                            ) : "")}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={t("ai.placeholder")}
                      rows={2}
                      className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
                    />
                    <button onClick={sendMessage} disabled={streaming || !input.trim()}
                      className="px-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Voice Tab ── */}
        {tab === "voice" && (
          <div className="flex-1 flex flex-col items-center justify-start gap-6 py-8 max-w-lg mx-auto w-full">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">{t("ai.voice_title")}</h2>
              <p className="text-sm text-muted-foreground">Whisper STT + GPT-4o + TTS</p>
            </div>

            {/* Mic button */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-red-500/15 animate-ping" />
                  <div className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-pulse" />
                </>
              )}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => { if (isRecording) stopRecording(); else startRecording(); }}
                disabled={voiceLoading}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                    : voiceLoading
                    ? "bg-muted cursor-not-allowed"
                    : "bg-gradient-to-br from-violet-500 to-blue-600 hover:from-violet-400 hover:to-blue-500 shadow-violet-500/30"
                }`}
              >
                {voiceLoading ? (
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                ) : isRecording ? (
                  <StopCircle className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </motion.button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {isRecording
                ? `🔴 ${t("ai.recording")} ${recordingSeconds}s`
                : voiceLoading
                ? `⏳ ${t("ai.analyzing")}`
                : voiceTranscript
                ? `✅ ${t("ai.retry")}`
                : `👆 ${t("ai.press_speak")}`}
            </p>

            <AnimatePresence>
              {voiceTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-card border border-border rounded-2xl p-4 space-y-1"
                >
                  <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <MicOff className="w-3 h-3" /> {t("ai.you_said")}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{voiceTranscript}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {voiceResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-violet-400 font-semibold flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" /> OlCha AI:
                    </p>
                    {voiceAudio && (
                      <button
                        onClick={playVoiceResponse}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-semibold hover:bg-violet-500/30 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> {t("ai.listen")}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{voiceResponse}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!voiceTranscript && !voiceLoading && (
              <div className="w-full grid grid-cols-2 gap-2 mt-2">
                {[
                  t("ai.tab_chat"),
                  "GPT-4o + Whisper",
                  "OlCha AI",
                  "DALL-E 3",
                ].map(tip => (
                  <div key={tip} className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground text-center">
                    {tip}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Caption Tab ── */}
        {tab === "caption" && (
          <div className="flex-1 max-w-2xl mx-auto space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">AI Caption Generator</h2>
                  <p className="text-xs text-muted-foreground">{t("ai.caption_sub")}</p>
                </div>
              </div>
              <textarea
                value={captionTopic}
                onChange={e => setCaptionTopic(e.target.value)}
                placeholder={t("ai.topic_ph")}
                rows={3}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
              />
              <button onClick={generateCaption} disabled={captionLoading || !captionTopic.trim()}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {captionLoading ? t("ai.creating") : `Caption ${t("ai.generate")}`}
              </button>
            </div>
            {captionResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{t("ai.result")}</h3>
                  <button onClick={() => { navigator.clipboard.writeText(captionResult); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                    {t("ai.copy")}
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{captionResult}</p>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Image Tab ── */}
        {tab === "image" && (
          <div className="flex-1 max-w-2xl mx-auto space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Image className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{t("ai.image_title")}</h2>
                  <p className="text-xs text-muted-foreground">{t("ai.image_sub")}</p>
                </div>
              </div>
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder={t("ai.image_ph")}
                rows={3}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
              />
              <button onClick={generateImage} disabled={imageLoading || !imagePrompt.trim()}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {imageLoading ? t("ai.image_creating") : t("ai.create_image")}
              </button>
            </div>
            {imageLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("ai.ai_creating")}</p>
                </div>
              </div>
            )}
            {imageResult && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <img src={imageResult.startsWith("http") ? imageResult : `data:image/png;base64,${imageResult}`} alt="AI generated" className="w-full rounded-xl" />
                <a href={imageResult.startsWith("http") ? imageResult : `data:image/png;base64,${imageResult}`} download="olcha-ai-image.png" target="_blank" rel="noreferrer"
                  className="block w-full text-center py-2.5 rounded-xl bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors">
                  {t("ai.download")}
                </a>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
