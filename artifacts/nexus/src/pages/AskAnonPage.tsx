import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Ghost, Send, CheckCircle2 } from "lucide-react";

const API = (import.meta.env.VITE_API_BASE_URL || "https://olchaai-api.onrender.com");

export default function AskAnonPage({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/anon-inbox/${userId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setContent("");
      } else if (res.status === 404) {
        setError(t("anon_inbox.user_not_found"));
      } else if (res.status === 429) {
        setError(t("anon_inbox.ask_rate_limited"));
      } else if (res.status === 422) {
        setError(t("anon_inbox.ask_blocked"));
      } else {
        setError(t("anon_inbox.ask_error"));
      }
    } catch {
      setError(t("anon_inbox.ask_error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl p-6 border border-pink-500/20"
        style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))" }}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center border border-pink-400/40 mb-3"
            style={{ boxShadow: "0 0 20px rgba(236,72,153,0.4)" }}>
            <Ghost className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-black">{t("anon_inbox.ask_title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t("anon_inbox.ask_subtitle")}</p>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-foreground">{t("anon_inbox.ask_success")}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{t("anon_inbox.ask_success_hint")}</p>
            <button onClick={() => setSent(false)}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90">
              {t("anon_inbox.ask_send")}
            </button>
          </div>
        ) : (
          <>
            <textarea value={content} onChange={e => setContent(e.target.value.slice(0, 500))}
              placeholder={t("anon_inbox.ask_ph")} rows={4}
              className="w-full bg-muted/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-pink-500/50 resize-none placeholder:text-muted-foreground/50 mb-2" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{content.length}/500</span>
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
            <button onClick={handleSend} disabled={!content.trim() || sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white transition bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 disabled:opacity-50">
              {sending ? t("anon_inbox.ask_sending") : <><Send className="w-3.5 h-3.5" /> {t("anon_inbox.ask_send")}</>}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
