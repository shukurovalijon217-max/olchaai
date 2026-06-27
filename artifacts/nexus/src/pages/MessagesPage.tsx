import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Search, Plus, MessageCircle, Ghost, Flame, Clock, X, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListConversations, useGetConversationMessages, useSendMessage, getGetConversationMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const ME_ID = 1;

export default function MessagesPage() {
  const { t } = useTranslation();
  const { data: convs = [], isLoading } = useListConversations();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [ephemeral, setEphemeral] = useState(false);
  const [showEphemeralHint, setShowEphemeralHint] = useState(false);
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const activeConv = convs.find(c => c.id === activeId) || (activeId === null ? undefined : convs[0]);
  const convId = activeConv?.id || null;

  const { data: messages = [] } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) }
  });

  const send = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConv = (id: number) => {
    setActiveId(id);
    setShowList(false);
  };

  const handleSend = () => {
    if (!text.trim() || !convId) return;
    send.mutate({ id: convId, data: { senderId: ME_ID, content: text } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(convId) });
        setText("");
      }
    });
  };

  const getOtherParticipant = (conv: typeof convs[0]) =>
    conv.participants?.find(p => p.id !== ME_ID) || conv.participants?.[0];

  return (
    <div className="flex overflow-hidden" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      {/* ── Conversations sidebar ── */}
      <div
        className={`${showList ? "flex" : "hidden"} md:flex w-full md:w-72 flex-shrink-0 border-r border-border bg-sidebar flex-col`}
      >
        {/* Sidebar header */}
        <div
          className="border-b border-border flex-shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingLeft: 16, paddingRight: 16, paddingBottom: 12 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">{t("msg.title")}</h2>
            <button className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              placeholder={t("msg.search_ph")}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))
          ) : convs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("msg.no_convs")}</div>
          ) : (
            convs.map((conv) => {
              const other = getOtherParticipant(conv);
              const isActive = conv.id === activeConv?.id;
              return (
                <motion.div
                  key={conv.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">{other?.displayName?.[0] || "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{other?.displayName || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || t("msg.start_conv")}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div className={`${!showList ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0`}>
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-4 border-b border-border flex-shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}
          >
            {/* Back button – mobile only */}
            <button
              onClick={() => setShowList(true)}
              className="md:hidden w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {getOtherParticipant(activeConv)?.avatarUrl ? (
                <img src={getOtherParticipant(activeConv)!.avatarUrl!} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{getOtherParticipant(activeConv)?.displayName?.[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{getOtherParticipant(activeConv)?.displayName}</p>
              <p className="text-xs text-emerald-400">{t("msg.active")}</p>
            </div>

            {/* Ephemeral toggle */}
            <div className="relative flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setEphemeral(v => !v); setShowEphemeralHint(true); setTimeout(() => setShowEphemeralHint(false), 2500); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  ephemeral
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <Ghost className={`w-3.5 h-3.5 ${ephemeral ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">{t("msg.ghost_mode")}</span>
              </motion.button>
              <AnimatePresence>
                {showEphemeralHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    className="absolute top-10 right-0 z-50 w-56 px-3 py-2 rounded-xl bg-card border border-violet-500/30 shadow-xl text-xs text-muted-foreground"
                  >
                    {ephemeral ? t("msg.ghost_on_hint") : t("msg.ghost_off_hint")}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Ghost mode banner */}
          <AnimatePresence>
            {ephemeral && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-violet-500/8 border-b border-violet-500/20 flex-shrink-0"
              >
                <Ghost className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 animate-pulse" />
                <p className="text-xs text-violet-400 font-medium">{t("msg.ghost_banner")}</p>
                <button onClick={() => setEphemeral(false)} className="ml-auto text-violet-400/60 hover:text-violet-400">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((msg, i) => {
              const isMe = msg.senderId === ME_ID;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("msg.say_hello")}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className={`px-5 border-t transition-colors flex-shrink-0 ${ephemeral ? "border-violet-500/30 bg-violet-500/5" : "border-border"}`}
            style={{ paddingTop: 12, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <div className="flex items-center gap-3">
              {ephemeral && (
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-3.5 h-3.5 text-violet-400" />
                </div>
              )}
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder={ephemeral ? t("msg.ghost_ph") : t("msg.msg_ph")}
                className={`flex-1 px-4 py-2.5 rounded-xl bg-card border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none transition-colors ${
                  ephemeral ? "border-violet-500/40 focus:border-violet-500/60" : "border-border focus:border-primary/40"
                }`}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!text.trim()}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40 flex-shrink-0 ${
                  ephemeral ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {ephemeral ? <Ghost className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            {ephemeral && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="w-3 h-3 text-violet-400/60" />
                <p className="text-[10px] text-violet-400/60">{t("msg.ghost_timer_hint")}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No conversation selected – desktop empty state */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">{t("msg.select_conv")}</p>
        </div>
      )}
    </div>
  );
}
