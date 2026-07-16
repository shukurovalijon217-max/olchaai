import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Users, Play, Loader2 } from "lucide-react";
import { useListActiveLives, useStartLive } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export default function LiveExplorePage() {
  const { t } = useTranslation();
  const { data: lives = [], isLoading } = useListActiveLives();
  const startLive = useStartLive();
  const [, navigate] = useLocation();
  const { user: me } = useAuth();
  const [showStart, setShowStart] = useState(false);
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!title.trim()) return;
    setStarting(true);
    try {
      const stream = await startLive.mutateAsync({ data: { title: title.trim() } });
      navigate(`/live/${stream.id}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            {t("live_explore.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("live_explore.subtitle")}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowStart(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors"
        >
          <Radio className="w-4 h-4" />
          {t("live_explore.go_live")}
        </motion.button>
      </div>

      {/* Start live modal */}
      {showStart && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              {t("live_explore.start_title")}
            </h2>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleStart(); }}
              placeholder={t("live_explore.name_placeholder")}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-primary mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowStart(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/70">
                {t("live_explore.cancel")}
              </button>
              <button onClick={handleStart} disabled={!title.trim() || starting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                {t("live_explore.start")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Active lives */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : lives.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{t("live_explore.no_live")}</p>
          <p className="text-sm mt-1">{t("live_explore.be_first")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {lives.map((live, i) => (
            <motion.div
              key={live.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/live/${live.id}`)}
              className="bg-card rounded-2xl overflow-hidden border border-border cursor-pointer hover:border-red-500/40 transition-all group"
            >
              <div className="aspect-video bg-gradient-to-br from-red-500/20 to-primary/20 relative flex items-center justify-center">
                {live.thumbnailUrl
                  ? <img loading="lazy" decoding="async" src={live.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Radio className="w-10 h-10 text-red-400/60" />
                    </div>
                }
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  JONLI
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3" />
                  {live.viewerCount}
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{live.title}</p>
                {live.host && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
                      {live.host.avatarUrl
                        ? <img loading="lazy" decoding="async" src={live.host.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">{live.host?.displayName?.[0]}</div>
                      }
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{live.host.displayName}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
