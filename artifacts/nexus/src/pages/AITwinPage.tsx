import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bot, Send, Settings, ChevronLeft, Power, Brain, Sparkles, MessageCircle, User, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TwinConfig {
  id: number; userId: number; isEnabled: boolean;
  personality: string | null; topics: string | null; bio: string | null;
  totalChats: number; lastActiveAt: string | null;
}
interface Message { id: number; role: string; content: string; createdAt: string; }
interface TwinUser { id: number; username: string; displayName: string; avatar: string | null; }

function TwinChatView({ twinUser, onBack }: { twinUser: TwinUser; onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/twin/${twinUser.id}/chats`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setChatId(d.chatId); setMessages(d.messages ?? []); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [twinUser.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    const tmpMsg: Message = { id: Date.now(), role: "user", content: msg, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tmpMsg]);
    try {
      const res = await fetch(`${API}/api/twin/${twinUser.id}/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, chatId }),
      });
      if (res.ok) {
        const d = await res.json();
        setChatId(d.chatId);
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: d.reply, createdAt: new Date().toISOString() }]);
      }
    } finally { setSending(false); }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 border-b border-white/10 bg-black/20" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: "12px" }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
          <ChevronLeft className="w-4 h-4 text-white" />
        </motion.button>
        <div className="relative flex-shrink-0">
          {twinUser.avatar ? <img src={twinUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> :
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold">
              {twinUser.displayName?.[0]?.toUpperCase()}
            </div>}
          <Bot className="absolute -bottom-1 -right-1 w-4 h-4 text-blue-400 bg-[#0a0604] rounded-full p-0.5" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{twinUser.displayName} <span className="text-blue-400 text-xs">{t("twin.ai_badge")}</span></div>
          <div className="text-white/40 text-xs">@{twinUser.username} {t("twin.digital_copy")}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Bot className="w-12 h-12 text-blue-400/30 mb-3" />
            <p className="text-white/40 text-sm">{twinUser.displayName} — {t("twin.start_chat")}</p>
          </div>
        ) : (
          messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: msg.role === "user" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === "user" ? "bg-violet-500/20 text-white rounded-tr-sm" : "bg-blue-500/10 border border-blue-500/20 text-white/90 rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </motion.div>
          ))
        )}
        {sending && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <motion.div key={i} className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={t("twin.write_ph")}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-blue-500/60" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-40">
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
        <p className="text-white/25 text-[10px] text-center mt-2">{t("twin.ai_responds")} {twinUser.displayName} {t("twin.ai_responds_sfx")}</p>
      </div>
    </div>
  );
}

function MyTwinSetup({ config, onSaved }: { config: TwinConfig | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(config?.isEnabled ?? false);
  const [personality, setPersonality] = useState(config?.personality ?? "");
  const [topics, setTopics] = useState(config?.topics ?? "");
  const [bio, setBio] = useState(config?.bio ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API}/api/twin/config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled, personality, topics, bio }),
      });
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
        <div>
          <div className="text-white font-medium text-sm">{t("twin.active_label")}</div>
          <div className="text-white/50 text-xs mt-0.5">{t("twin.active_desc")}</div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsEnabled(!isEnabled)}
          className={`w-12 h-6 rounded-full transition-colors relative ${isEnabled ? "bg-blue-500" : "bg-white/20"}`}>
          <motion.div animate={{ x: isEnabled ? 24 : 2 }} transition={{ type: "spring", stiffness: 500 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full" />
        </motion.button>
      </div>

      {isEnabled && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">{t("twin.personality_label")}</label>
            <textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={2}
              placeholder={t("twin.personality_ph")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/60 resize-none" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">{t("twin.interests_label")}</label>
            <input value={topics} onChange={e => setTopics(e.target.value)}
              placeholder={t("twin.interests_ph")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/60" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">{t("twin.bio_label")}</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
              placeholder={t("twin.bio_ph")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/60 resize-none" />
          </div>
        </motion.div>
      )}

      {config && (
        <div className="flex gap-4 text-center">
          <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-white font-bold text-xl">{config.totalChats}</div>
            <div className="text-white/50 text-xs">{t("twin.chats_label")}</div>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-blue-400 font-bold text-xl">{isEnabled ? "🟢" : "🔴"}</div>
            <div className="text-white/50 text-xs">{t("twin.status_label")}</div>
          </div>
        </div>
      )}

      <motion.button whileTap={{ scale: 0.95 }} onClick={save} disabled={saving}
        className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
        {saving ? t("twin.saving") : t("twin.save")}
      </motion.button>
    </div>
  );
}

export default function AITwinPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const [config, setConfig] = useState<TwinConfig | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [twinUser, setTwinUser] = useState<TwinUser | null>(null);
  const [chatTarget, setChatTarget] = useState<TwinUser | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user && tab === "mine") {
      fetch(`${API}/api/twin/config`, { credentials: "include" })
        .then(r => r.json()).then(d => setConfig(d)).catch(() => {});
    }
  }, [user, tab]);

  async function searchTwin() {
    if (!searchUser.trim()) return;
    setSearching(true); setSearchError(""); setTwinUser(null);
    try {
      const res = await fetch(`${API}/api/twin/${searchUser.trim()}`, { credentials: "include" });
      if (res.ok) setTwinUser(await res.json().then((d: any) => d.user));
      else setSearchError(t("twin.not_active"));
    } catch { setSearchError(t("twin.search_error")); }
    finally { setSearching(false); }
  }

  if (chatTarget) return <TwinChatView twinUser={chatTarget} onBack={() => setChatTarget(null)} />;

  return (
    <div className="h-full flex flex-col bg-[#0a0604]">
      <div className="px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
        <h1 className="text-white font-bold text-xl flex items-center gap-2 mb-1">
          <Bot className="w-5 h-5 text-blue-400" /> {t("twin.title")}
        </h1>
        <p className="text-white/40 text-xs mb-3">{t("twin.subtitle")}</p>

        <div className="flex gap-2">
          {(["explore", "mine"] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${tab === tabKey ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              {tabKey === "explore" ? t("twin.search_tab") : t("twin.mine_tab")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "explore" ? (
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/30 to-violet-900/20 border border-blue-500/20">
              <Brain className="w-8 h-8 text-blue-400 mb-2" />
              <h3 className="text-white font-semibold text-sm">{t("twin.what_is")}</h3>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{t("twin.what_is_desc")}</p>
            </div>

            <div>
              <label className="text-white/60 text-xs mb-2 block">{t("twin.search_label")}</label>
              <div className="flex gap-2">
                <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchTwin()}
                  placeholder={t("twin.search_ph")}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/60" />
                <motion.button whileTap={{ scale: 0.9 }} onClick={searchTwin} disabled={searching}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : t("twin.search_btn")}
                </motion.button>
              </div>
              {searchError && <p className="text-red-400 text-xs mt-2">{searchError}</p>}
            </div>

            <AnimatePresence>
              {twinUser && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    {twinUser.avatar ? <img src={twinUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> :
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-lg font-bold">
                        {twinUser.displayName?.[0]}
                      </div>}
                    <div>
                      <div className="font-semibold text-white">{twinUser.displayName}</div>
                      <div className="text-blue-400 text-xs">@{twinUser.username}</div>
                    </div>
                    <Bot className="w-5 h-5 text-blue-400 ml-auto" />
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setChatTarget(twinUser)}
                    className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" /> {t("twin.start_chat")}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          user ? (
            <MyTwinSetup config={config} onSaved={() => {
              fetch(`${API}/api/twin/config`, { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => { if (d) setConfig(d); }).catch(() => {});
            }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center p-8">
              <Bot className="w-12 h-12 text-blue-400/30 mb-3" />
              <p className="text-white/40 text-sm">{t("twin.login")}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
