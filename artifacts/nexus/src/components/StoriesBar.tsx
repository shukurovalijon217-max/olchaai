import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useListStories } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onCreateStory?: () => void;
  onAvatarClick?: (authorId: number, rect: DOMRect) => void;
}

interface StoryGroup {
  author: { id?: number; username?: string; displayName?: string; avatarUrl?: string };
  count: number;
}

function buildGroups(stories: any[]): StoryGroup[] {
  const map = new Map<number, StoryGroup>();
  for (const s of stories) {
    const uid: number = s.author?.id ?? -1;
    if (!map.has(uid)) map.set(uid, { author: s.author ?? {}, count: 0 });
    map.get(uid)!.count++;
  }
  return Array.from(map.values());
}

export default function StoriesBar({ onCreateStory, onAvatarClick }: Props) {
  const { data: stories = [] } = useListStories();
  const { user } = useAuth();
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const groups = buildGroups(stories as any[]);

  const handleClick = (authorId: number | undefined) => {
    if (authorId == null || !onAvatarClick) return;
    const el = itemRefs.current.get(authorId);
    if (el) onAvatarClick(authorId, el.getBoundingClientRect());
  };

  return (
    <>
      <style>{`
        @keyframes sv-glow {
          0%,100% {
            box-shadow: 0 0 0 2px #a855f7,
                        0 0 10px rgba(168,85,247,0.65),
                        0 0 22px rgba(168,85,247,0.3);
          }
          50% {
            box-shadow: 0 0 0 2.5px #ec4899,
                        0 0 18px rgba(236,72,153,0.85),
                        0 0 38px rgba(236,72,153,0.38);
          }
        }
      `}</style>

      <div style={{
        display: "flex",
        overflowX: "auto",
        gap: 18,
        padding: "10px 14px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch" as any,
      }}>

        {/* ── Add story bubble ── */}
        <motion.div
          whileTap={{ scale: 0.88 }}
          onClick={onCreateStory}
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 5,
            flexShrink: 0, cursor: "pointer",
          }}
        >
          <div style={{ position: "relative", width: 54, height: 54 }}>
            {/* Avatar with static glow border */}
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg,#1e0040,#0a0820)",
              boxShadow: "0 0 0 2px rgba(168,85,247,0.45), 0 0 10px rgba(168,85,247,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              ) : (
                <span style={{ fontSize: 20, fontWeight: 800, color: "rgba(168,85,247,0.6)" }}>
                  {(user?.displayName || user?.username || "G")[0].toUpperCase()}
                </span>
              )}
            </div>
            {/* + badge */}
            <div style={{
              position: "absolute", bottom: 1, right: 1,
              width: 19, height: 19, borderRadius: "50%",
              background: "linear-gradient(135deg,#a855f7,#6366f1)",
              border: "2px solid #06060f",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus style={{ width: 11, height: 11, color: "#fff" }}/>
            </div>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: "rgba(255,255,255,0.4)",
            maxWidth: 54, textAlign: "center",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            Story
          </span>
        </motion.div>

        {/* ── Story group bubbles ── */}
        <AnimatePresence>
          {groups.map((g, i) => (
            <motion.div
              key={g.author?.id ?? i}
              ref={(el: HTMLDivElement | null) => {
                if (el && g.author?.id != null) itemRefs.current.set(g.author.id!, el);
              }}
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 26 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleClick(g.author?.id)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5,
                flexShrink: 0, cursor: "pointer",
              }}
            >
              <div style={{ position: "relative", width: 54, height: 54 }}>
                {/* Avatar — glows by itself, no outer ring */}
                <div style={{
                  width: 54, height: 54, borderRadius: "50%",
                  overflow: "hidden",
                  background: "linear-gradient(135deg,#2d0a4e,#0a1240)",
                  /* pulsing glow — the avatar "burns" */
                  animation: "sv-glow 2.4s ease-in-out infinite",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {g.author?.avatarUrl ? (
                    <img src={g.author.avatarUrl} alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy" decoding="async"/>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#a855f7" }}>
                      {(g.author?.displayName || g.author?.username || "?")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Count badge */}
                {g.count > 1 && (
                  <div style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 17, height: 17, borderRadius: "50%",
                    background: "#a855f7",
                    border: "2px solid #06060f",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 800, color: "#fff",
                  }}>
                    {g.count}
                  </div>
                )}
              </div>

              <span style={{
                fontSize: 9, fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                maxWidth: 54, textAlign: "center",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {g.author?.username ?? ""}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {groups.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", paddingTop: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              Hali story yo'q
            </span>
          </div>
        )}
      </div>
    </>
  );
}
