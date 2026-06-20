import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark,
  VolumeX, Volume2, BadgeCheck, Check,
} from "lucide-react";
import type { Post } from "@workspace/api-client-react";
import { PostType, useLikePost } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

/* ─────────────────────────────────────────────────
   CONTENT-TYPE THEMES  (photo / video / text)
───────────────────────────────────────────────── */
const THEMES: Record<string, {
  bg: string; accent: string; glow: string;
  badge: string; labelColor: string;
}> = {
  [PostType.photo]: {
    bg: "#060c14",  accent: "#22d3ee",
    glow: "rgba(34,211,238,0.45)",
    badge: "📷 Rasm", labelColor: "#67e8f9",
  },
  [PostType.video]: {
    bg: "#0f0808",  accent: "#f87171",
    glow: "rgba(248,113,113,0.45)",
    badge: "🎬 Video", labelColor: "#fca5a5",
  },
  [PostType.text]: {
    bg: "#06060f",  accent: "#818cf8",
    glow: "rgba(129,140,248,0.4)",
    badge: "✍️ Post", labelColor: "#a5b4fc",
  },
};

const getTheme = (type: string) => THEMES[type] ?? THEMES[PostType.text];

/* ─────────────────────────────────────────────────
   ENTRANCE ANIMATIONS PER TYPE
───────────────────────────────────────────────── */
type VariantMap = { initial: object; animate: object };

const ENTER: Record<string, VariantMap> = {
  [PostType.photo]: {
    initial: { scale: 0.82, opacity: 0, filter: "blur(12px)" },
    animate: {
      scale: 1, opacity: 1, filter: "blur(0px)",
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
    },
  },
  [PostType.video]: {
    initial: { y: 70, opacity: 0 },
    animate: {
      y: 0, opacity: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
  [PostType.text]: {
    initial: { rotateX: -18, opacity: 0, y: 30 },
    animate: {
      rotateX: 0, opacity: 1, y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
  },
};

/* ─────────────────────────────────────────────────
   FLOATING PARTICLES (text posts)
───────────────────────────────────────────────── */
function Particle({ accent }: { accent: string }) {
  const x     = Math.random() * 100;
  const delay = Math.random() * 4;
  const size  = Math.random() * 3 + 1;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, bottom: "-10px", width: size, height: size, background: accent, opacity: 0.5 }}
      animate={{ y: [0, -(Math.random() * 380 + 160)], opacity: [0.5, 0] }}
      transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, delay, ease: "easeOut" }}
    />
  );
}

/* ─────────────────────────────────────────────────
   MAIN FEED CARD
───────────────────────────────────────────────── */
interface FeedCardProps { post: Post; index: number; }

export default function FeedCard({ post }: FeedCardProps) {
  const theme  = getTheme(post.type);
  const enterV = ENTER[post.type] ?? ENTER[PostType.text];

  const { user }      = useAuth();
  const [, navigate]  = useLocation();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [liked, setLiked]   = useState(post.isLiked ?? false);
  const [likes, setLikes]   = useState(post.likesCount ?? 0);
  const [saved, setSaved]   = useState(false);
  const [muted, setMuted]   = useState(true);
  const [copied, setCopied] = useState(false);

  const cardRef  = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(cardRef, { amount: 0.55 });

  const likePost = useLikePost();

  const isVideo = post.type === PostType.video;
  const isPhoto = post.type === PostType.photo;
  const isText  = post.type === PostType.text;

  /* auto-play video when in view */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [isInView]);

  /* close panel when card scrolls out */
  useEffect(() => { if (!isInView) setActionsOpen(false); }, [isInView]);

  const handleLike = () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    likePost.mutate({ id: post.id });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const ACTIONS = [
    {
      id: "like",
      Icon: Heart,
      label: likes > 0 ? likes.toLocaleString() : "Like",
      active: liked,
      activeColor: "#f87171",
      fill: liked,
      fn: handleLike,
    },
    {
      id: "comment",
      Icon: MessageCircle,
      label: (post.commentsCount ?? 0) > 0 ? String(post.commentsCount) : "Izoh",
      active: false,
      activeColor: "#22d3ee",
      fill: false,
      fn: () => navigate(`/post/${post.id}`),
    },
    {
      id: "share",
      Icon: copied ? Check : Share2,
      label: copied ? "Nusxalandi!" : "Ulash",
      active: copied,
      activeColor: "#34d399",
      fill: false,
      fn: handleShare,
    },
    {
      id: "save",
      Icon: Bookmark,
      label: saved ? "Saqlandi" : "Saqlash",
      active: saved,
      activeColor: "#fbbf24",
      fill: saved,
      fn: () => setSaved(s => !s),
    },
  ];

  return (
    <div
      ref={cardRef}
      className="relative w-full overflow-hidden flex-shrink-0 select-none"
      style={{ height: "100dvh", scrollSnapAlign: "start", backgroundColor: theme.bg }}
    >

      {/* ══════════════════════════════════════
          LAYER 1 — UNIQUE BACKGROUND PER TYPE
      ══════════════════════════════════════ */}

      {/* PHOTO: blurred background */}
      {isPhoto && post.mediaUrl && (
        <img
          src={post.mediaUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            filter: "blur(28px) saturate(1.5) brightness(0.35)",
            transform: "scale(1.18)",
          }}
        />
      )}

      {/* TEXT: animated gradient mesh + floating particles */}
      {isText && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: `
                radial-gradient(ellipse at 25% 40%, ${theme.glow} 0%, transparent 55%),
                radial-gradient(ellipse at 75% 65%, rgba(59,130,246,0.16) 0%, transparent 55%)
              `,
            }}
          />
          {Array.from({ length: 14 }).map((_, i) => (
            <Particle key={i} accent={theme.accent} />
          ))}
        </>
      )}

      {/* VIDEO: subtle scanline overlay */}
      {isVideo && (
        <motion.div
          className="absolute inset-x-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accent}88, transparent)`,
            zIndex: 4,
            opacity: 0.6,
          }}
          animate={{ top: ["-2px", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* ══════════════════════════════════════
          LAYER 2 — MAIN CONTENT
      ══════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 2 }}
        initial={enterV.initial as any}
        animate={isInView ? (enterV.animate as any) : (enterV.initial as any)}
      >
        {isVideo && post.mediaUrl ? (
          <video
            ref={videoRef}
            src={post.mediaUrl}
            muted={muted}
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : isPhoto && post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt={post.content}
            className="max-w-[88%] max-h-[72%] object-contain rounded-2xl"
            style={{
              boxShadow: `0 0 70px ${theme.glow}, 0 30px 60px rgba(0,0,0,0.7)`,
            }}
          />
        ) : (
          /* TEXT post */
          <div className="max-w-[78%] text-center px-4" style={{ perspective: "800px" }}>
            <p
              className="text-2xl md:text-[2.1rem] font-extrabold text-white leading-snug"
              style={{ textShadow: `0 0 50px ${theme.glow}, 0 2px 8px rgba(0,0,0,0.8)` }}
            >
              {post.content}
            </p>
            {post.tags && post.tags.length > 0 && (
              <motion.div
                className="flex flex-wrap justify-center gap-1.5 mt-4"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.4 }}
              >
                {post.tags.slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: `${theme.accent}22`,
                      border: `1px solid ${theme.accent}44`,
                      color: theme.labelColor,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════
          LAYER 3 — GRADIENT OVERLAYS
      ══════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, transparent 22%, transparent 58%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* ══════════════════════════════════════
          LAYER 4 — USER INFO (top-left)
      ══════════════════════════════════════ */}
      <motion.div
        className="absolute left-4 flex items-center gap-2.5"
        style={{ top: 22, zIndex: 10 }}
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Avatar — always same 36px size */}
        <div className="relative flex-shrink-0">
          {post.author?.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
              style={{
                boxShadow: `0 0 0 2px ${theme.accent}99, 0 0 14px ${theme.glow}`,
              }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}cc, ${theme.bg})`,
                boxShadow: `0 0 0 2px ${theme.accent}88, 0 0 14px ${theme.glow}`,
              }}
            >
              {post.author?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
        </div>

        {/* Name */}
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-[13px] drop-shadow leading-none">
              {post.author?.displayName ?? "Foydalanuvchi"}
            </span>
            {post.author?.isVerified && (
              <BadgeCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            )}
          </div>
          <span className="text-white/55 text-[11px] leading-none mt-0.5 block">
            @{post.author?.username ?? "user"}
          </span>
        </div>
      </motion.div>

      {/* Content-type badge */}
      <motion.div
        className="absolute left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
        style={{
          top: 74,
          zIndex: 10,
          background: `${theme.accent}18`,
          border: `1px solid ${theme.accent}38`,
          color: theme.labelColor,
        }}
        initial={{ opacity: 0, y: -6 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        transition={{ delay: 0.28 }}
      >
        {theme.badge}
      </motion.div>

      {/* ══════════════════════════════════════
          LAYER 5 — ACTION ORB + PANEL (top-right)
      ══════════════════════════════════════ */}
      <div className="absolute right-4" style={{ top: 20, zIndex: 30 }}>

        {/* THE ORB */}
        <motion.button
          onClick={() => setActionsOpen(o => !o)}
          aria-label="Amallar"
          className="relative w-10 h-10 rounded-full flex items-center justify-center focus:outline-none"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${theme.accent}44, ${theme.bg}dd)`,
            border: `1.5px solid ${theme.accent}88`,
            boxShadow: `0 0 18px ${theme.glow}`,
          }}
          whileTap={{ scale: 0.86 }}
        >
          {/* Radar rings when closed */}
          {!actionsOpen && [1, 2].map(i => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ border: `1px solid ${theme.accent}` }}
              animate={{ scale: [1, 1.55 + i * 0.32], opacity: [0.55, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
            />
          ))}

          {/* Hamburger → X icon */}
          <div className="flex flex-col items-center gap-[3.5px]">
            <motion.span
              className="w-[14px] h-[2px] rounded-full bg-white block"
              animate={{ rotate: actionsOpen ? 45 : 0, y: actionsOpen ? 5.5 : 0 }}
              transition={{ duration: 0.22 }}
            />
            <motion.span
              className="w-[14px] h-[2px] rounded-full bg-white block"
              animate={{ opacity: actionsOpen ? 0 : 1, scaleX: actionsOpen ? 0 : 1 }}
              transition={{ duration: 0.18 }}
            />
            <motion.span
              className="w-[14px] h-[2px] rounded-full bg-white block"
              animate={{ rotate: actionsOpen ? -45 : 0, y: actionsOpen ? -5.5 : 0 }}
              transition={{ duration: 0.22 }}
            />
          </div>
        </motion.button>

        {/* ── SLIDE-DOWN ACTION PANEL ── */}
        <AnimatePresence>
          {actionsOpen && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.45, y: -10 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.45, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-2.5 w-[148px] rounded-2xl overflow-hidden flex flex-col gap-0.5 p-1.5"
              style={{
                background: "rgba(5,5,18,0.94)",
                backdropFilter: "blur(22px) saturate(1.6)",
                border: `1px solid ${theme.accent}28`,
                boxShadow: `0 12px 48px rgba(0,0,0,0.7), 0 0 24px ${theme.glow}`,
                transformOrigin: "top right",
              }}
            >
              {/* top glow line */}
              <div
                className="h-[1px] rounded-full mx-2 mb-0.5"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.accent}88, transparent)`,
                }}
              />

              {ACTIONS.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.065, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    action.fn();
                    if (action.id !== "share") setActionsOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full"
                  style={{
                    background: action.active ? `${action.activeColor}16` : "transparent",
                    border: action.active
                      ? `1px solid ${action.activeColor}30`
                      : "1px solid transparent",
                  }}
                  whileHover={{ x: 2 } as any}
                  whileTap={{ scale: 0.93 }}
                >
                  <action.Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{
                      color: action.active ? action.activeColor : "rgba(255,255,255,0.72)",
                    }}
                    fill={action.fill ? action.activeColor : "none"}
                  />
                  <span
                    className="text-xs font-semibold leading-none"
                    style={{
                      color: action.active ? action.activeColor : "rgba(255,255,255,0.82)",
                    }}
                  >
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════
          LAYER 6 — VOLUME TOGGLE (video only)
      ══════════════════════════════════════ */}
      {isVideo && (
        <motion.button
          className="absolute flex items-center justify-center w-8 h-8 rounded-full"
          style={{
            right: 16,
            bottom: 110,
            zIndex: 10,
            background: "rgba(0,0,0,0.52)",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
          onClick={() => setMuted(m => !m)}
          whileTap={{ scale: 0.88 }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 text-white" />
            : <Volume2 className="w-3.5 h-3.5 text-white" />
          }
        </motion.button>
      )}

      {/* ══════════════════════════════════════
          LAYER 7 — CAPTION (bottom-left, photos & videos)
      ══════════════════════════════════════ */}
      {!isText && (
        <motion.div
          className="absolute left-4 right-16"
          style={{ bottom: 36, zIndex: 10 }}
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-white text-[13px] font-medium leading-relaxed line-clamp-3 drop-shadow-lg">
            {post.content}
          </p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${theme.accent}1e`,
                    border: `1px solid ${theme.accent}38`,
                    color: theme.labelColor,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Click-outside backdrop to close actions panel */}
      {actionsOpen && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 20 }}
          onClick={() => setActionsOpen(false)}
        />
      )}
    </div>
  );
}
