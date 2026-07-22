import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Ghost, Heart, Send, X, ChevronRight, MessageSquare,
  Eye, EyeOff, Flame, Sparkles, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = "";

interface Zone { id: number; slug: string; topic: string; description?: string; emoji: string; postCount: number; }
interface AnonPost { id: number; zoneId: number; content: string; likes: number; createdAt: string; }

const TIME_AGO = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hozir";
  if (diff < 3600) return `${Math.floor(diff / 60)}d oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s oldin`;
  return `${Math.floor(diff / 86400)}kun oldin`;
};

export default function AnonZonesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [posts, setPosts] = useState<AnonPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [ghostMode, setGhostMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/anon/zones`, { credentials: "include" });
      if (res.ok) setZones(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fetchPosts = async (zoneId: number) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API}/api/anon/zones/${zoneId}/posts`, { credentials: "include" });
      if (res.ok) setPosts(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingPosts(false); }
  };

  useEffect(() => { fetchZones(); }, []);

  const openZone = (zone: Zone) => {
    setSelectedZone(zone);
    fetchPosts(zone.id);
  };

  const handlePost = async () => {
    if (!newPost.trim() || !selectedZone || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}/api/anon/zones/${selectedZone.id}/posts`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost.trim() }),
      });
      if (res.ok) {
        const created: AnonPost = await res.json();
        setPosts(prev => [created, ...prev]);
        setNewPost("");
        setZones(prev => prev.map(z => z.id === selectedZone.id ? { ...z, postCount: z.postCount + 1 } : z));
      }
    } catch { /* ignore */ }
    finally { setPosting(false); }
  };

  const handleLike = async (post: AnonPost) => {
    if (likedIds.has(post.id)) return;
    try {
      const res = await fetch(`${API}/api/anon/zones/${post.zoneId}/posts/${post.id}/like`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        setLikedIds(prev => new Set([...prev, post.id]));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes + 1 } : p));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto px-4 pt-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-5">
        {selectedZone ? (
          <button onClick={() => setSelectedZone(null)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : null}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600/50"
            style={{ boxShadow: "0 0 16px rgba(100,116,139,0.3)" }}>
            <Ghost className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-base font-black">{selectedZone ? selectedZone.emoji + " " + selectedZone.topic : t("anon.title")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("anon.subtitle")}</p>
          </div>
        </div>
        {/* Ghost mode toggle */}
        <button onClick={() => setGhostMode(!ghostMode)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
            ghostMode ? "border-slate-500/30 bg-slate-500/10 text-slate-300" : "border-border/40 bg-muted text-muted-foreground"
          }`}>
          {ghostMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {ghostMode ? t("anon.ghost_on") : t("anon.ghost_off")}
        </button>
      </motion.div>

      {/* Ghost mode banner */}
      <AnimatePresence>
        {ghostMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-3.5 mb-4 border border-slate-500/20 bg-slate-500/8 flex items-center gap-2.5">
            <Ghost className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-400">{t("anon.ghost_desc")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone list */}
      {!selectedZone && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && zones.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Ghost className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("anon.no_zones")}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {zones.map((zone, i) => (
              <motion.button key={zone.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openZone(zone)}
                className="w-full text-left rounded-2xl p-4 border border-border/40 bg-card hover:border-border/70 transition-all group"
                style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-2xl shrink-0">
                    {zone.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-0.5">{zone.topic}</h3>
                    {zone.description && <p className="text-xs text-muted-foreground line-clamp-1">{zone.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <MessageSquare className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">{zone.postCount} {t("anon.posts")}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Zone posts */}
      {selectedZone && (
        <div className="space-y-3">
          {/* New post composer */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 border border-border/40 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Ghost className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400">{t("anon.anonymous")}</span>
            </div>
            <textarea value={newPost} onChange={e => setNewPost(e.target.value.slice(0, 500))}
              placeholder={t("anon.post_ph")} rows={3}
              className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-slate-500/50 resize-none placeholder:text-muted-foreground/50 mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition bg-slate-600 hover:bg-slate-500 disabled:opacity-50">
                {posting ? "..." : <><Send className="w-3.5 h-3.5" /> {t("anon.post")}</>}
              </motion.button>
            </div>
          </motion.div>

          {loadingPosts && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Ghost className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("anon.no_posts")}</p>
            </div>
          )}

          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-4 border border-border/30 bg-card/80"
              style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.5))" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-slate-700/60 border border-slate-600/30 flex items-center justify-center">
                  <Ghost className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-400">{t("anon.anonymous")}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{TIME_AGO(post.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleLike(post)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    likedIds.has(post.id) ? "text-pink-400" : "text-muted-foreground hover:text-pink-400"
                  }`}>
                  <Heart className={`w-3.5 h-3.5 ${likedIds.has(post.id) ? "fill-pink-400" : ""}`} />
                  {post.likes}
                </motion.button>
                {post.likes >= 10 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-500/70">
                    <Flame className="w-3 h-3" /> {t("anon.hot")}
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
