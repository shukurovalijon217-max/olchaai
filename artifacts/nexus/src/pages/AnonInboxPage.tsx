import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MessageSquareDashed, Copy, Check, Ghost, Send, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = "";

interface AnonQuestion {
  id: number;
  recipientId: number;
  content: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

const TIME_AGO = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hozir";
  if (diff < 3600) return `${Math.floor(diff / 60)}d oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s oldin`;
  return `${Math.floor(diff / 86400)}kun oldin`;
};

export default function AnonInboxPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<AnonQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [answering, setAnswering] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/anon-inbox`, { credentials: "include" });
      if (res.ok) setQuestions(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInbox(); }, []);

  const shareLink = user
    ? `${window.location.origin}/ask/${user.id}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const openAnswer = (q: AnonQuestion) => {
    setAnswering(q.id);
    setAnswerText(q.answer ?? "");
  };

  const submitAnswer = async (id: number) => {
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/anon-inbox/${id}/answer`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerText.trim() }),
      });
      if (res.ok) {
        const updated: AnonQuestion = await res.json();
        setQuestions(prev => prev.map(q => q.id === id ? updated : q));
        setAnswering(null);
        setAnswerText("");
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-5">
        <button onClick={() => history.back()}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center border border-pink-400/40"
            style={{ boxShadow: "0 0 16px rgba(236,72,153,0.35)" }}>
            <MessageSquareDashed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black">{t("anon_inbox.title")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("anon_inbox.subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* Share link */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 mb-4 border border-pink-500/20 bg-pink-500/8">
        <p className="text-xs text-muted-foreground mb-2.5">{t("anon_inbox.share_hint")}</p>
        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white transition bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t("anon_inbox.share_copied") : t("anon_inbox.share_btn")}
        </button>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Ghost className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("anon_inbox.empty")}</p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {unanswered.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {t("anon_inbox.unanswered")} ({unanswered.length})
              </h2>
              <div className="space-y-3">
                {unanswered.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl p-4 border border-border/40 bg-card"
                    style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Ghost className="w-4 h-4 text-pink-400" />
                      <span className="text-[10px] text-muted-foreground ml-auto">{TIME_AGO(q.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-3">{q.content}</p>
                    {answering === q.id ? (
                      <div className="space-y-2">
                        <textarea value={answerText} onChange={e => setAnswerText(e.target.value.slice(0, 1000))}
                          placeholder={t("anon_inbox.answer_ph")} rows={2}
                          className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-pink-500/50 resize-none placeholder:text-muted-foreground/50" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => submitAnswer(q.id)} disabled={!answerText.trim() || submitting}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition bg-pink-600 hover:bg-pink-500 disabled:opacity-50">
                            {submitting ? t("anon_inbox.answering") : <><Send className="w-3.5 h-3.5" /> {t("anon_inbox.answer_btn")}</>}
                          </button>
                          <button onClick={() => setAnswering(null)}
                            className="px-4 py-1.5 rounded-full text-xs font-semibold text-muted-foreground bg-muted hover:text-foreground">
                            {t("anon_inbox.back")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => openAnswer(q)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-pink-400 border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition">
                        {t("anon_inbox.answer_btn")}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {answered.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {t("anon_inbox.answered")} ({answered.length})
              </h2>
              <div className="space-y-3">
                {answered.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl p-4 border border-border/30 bg-card/80"
                    style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.5))" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Ghost className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground ml-auto">{TIME_AGO(q.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-3">{q.content}</p>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-[10px] font-semibold text-pink-400 mb-1">{t("anon_inbox.answer_label")}</p>
                      <p className="text-sm text-foreground/90">{q.answer}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
