import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Search, Plus, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListConversations, useGetConversationMessages, useSendMessage, getGetConversationMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const ME_ID = 1;

export default function MessagesPage() {
  const { t } = useTranslation();
  const { data: convs = [], isLoading } = useListConversations();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const qc = useQueryClient();

  const activeConv = convs.find(c => c.id === activeId) || convs[0];
  const convId = activeConv?.id || null;

  const { data: messages = [] } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) }
  });

  const send = useSendMessage();

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
    <div className="flex h-screen max-h-screen overflow-hidden">
      {/* Conversations list */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
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
              const isActive = conv.id === (activeConv?.id);
              return (
                <motion.div
                  key={conv.id}
                  whileHover={{ x: 2 }}
                  onClick={() => setActiveId(conv.id)}
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

      {/* Chat area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
              {getOtherParticipant(activeConv)?.avatarUrl ? (
                <img src={getOtherParticipant(activeConv)!.avatarUrl!} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{getOtherParticipant(activeConv)?.displayName?.[0]}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{getOtherParticipant(activeConv)?.displayName}</p>
              <p className="text-xs text-emerald-400">{t("msg.active")}</p>
            </div>
          </div>

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
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-border">
            <div className="flex items-center gap-3">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder={t("msg.msg_ph")}
                className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!text.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">{t("msg.select_conv")}</p>
        </div>
      )}
    </div>
  );
}
