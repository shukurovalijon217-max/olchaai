import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, TrendingUp, BadgeCheck, Users, Check, UserPlus,
  Flame, Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListPosts, useGetTrendingTopics, useGetAiSuggestions,
  useListGroups, useListUsers, useFollowUser, useJoinGroup,
  getListGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

/* ────────────────────────────────────────────────────────────
   Reusable horizontal scroll strip — touch/swipe only
   ──────────────────────────────────────────────────────────── */
function HScroll({
  children,
  gap = 10,
  px = 16,
}: {
  children: React.ReactNode;
  gap?: number;
  px?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap,
        overflowX: "auto",
        paddingLeft: px,
        paddingRight: px,
        paddingBottom: 4,
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
    >
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section header
   ──────────────────────────────────────────────────────────── */
function SectionHead({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", marginBottom: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 10,
        background: "rgba(139,92,246,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════════════════════ */
export default function ExplorePage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const { data: posts = [] }      = useListPosts();
  const { data: topics = [] }     = useGetTrendingTopics();
  const { data: suggestions }     = useGetAiSuggestions();
  const { data: groups = [] }     = useListGroups();
  const { data: searchUsers = [] } = useListUsers({ search: query || undefined });

  const followMut = useFollowUser({
    mutation: {
      onSuccess: (data, vars) => {
        setFollowedIds(prev => {
          const n = new Set(prev);
          data.following ? n.add(vars.id) : n.delete(vars.id);
          return n;
        });
      },
    },
  });

  const joinMut = useJoinGroup({
    mutation: {
      onSuccess: (_d, vars) => {
        setJoinedIds(prev => { const n = new Set(prev); n.add(vars.id); return n; });
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  const photoPosts    = posts.filter(p => p.mediaUrl);
  const suggestedUsers = suggestions?.users ?? [];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 80, display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Search ── */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--muted-foreground)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("explore.search_ph")}
            style={{
              width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              borderRadius: 18, background: "var(--card)", border: "1.5px solid var(--border)",
              color: "var(--foreground)", fontSize: 14, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      </div>

      {/* ── Trend topics ── */}
      {topics.length > 0 && (
        <section>
          <SectionHead
            icon={<TrendingUp style={{ width: 14, height: 14, color: "#8b5cf6" }} />}
            title={t("explore.trending")}
          />
          <HScroll gap={8}>
            {topics.map((topic, i) => (
              <motion.div
                key={topic.tag}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  flexShrink: 0, width: 130, borderRadius: 18, padding: "14px 14px",
                  background: "var(--card)", border: "1.5px solid var(--border)", cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>{topic.category}</p>
                <p style={{ fontWeight: 800, fontSize: 13, color: "var(--foreground)" }}>#{topic.tag}</p>
                <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}>
                  {topic.postCount.toLocaleString()} post
                </p>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginTop: 4, display: "block" }}>
                  +{topic.growth.toFixed(1)}%
                </span>
              </motion.div>
            ))}
          </HScroll>
        </section>
      )}

      {/* ── Postlarni kashf qilish (carousel) ── */}
      {photoPosts.length > 0 && (
        <section>
          <SectionHead
            icon={<Layers style={{ width: 14, height: 14, color: "#8b5cf6" }} />}
            title={t("explore.explore_posts")}
            sub="Yangi postlar"
          />
          <HScroll gap={8}>
            {photoPosts.slice(0, 20).map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  flexShrink: 0, width: 110, height: 110, borderRadius: 16,
                  overflow: "hidden", cursor: "pointer", position: "relative",
                  border: "1px solid var(--border)", background: "var(--card)",
                }}
              >
                {post.mediaUrl ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={post.mediaUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(59,130,246,0.2))",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 8,
                  }}>
                    <p style={{ fontSize: 10, color: "var(--foreground)", textAlign: "center", lineHeight: 1.4,
                      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                      {post.content}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </HScroll>
        </section>
      )}

      {/* ── Kuzatish uchun odamlar (story-circle carousel) ── */}
      {suggestedUsers.length > 0 && !query && (
        <section>
          <SectionHead
            icon={<Users style={{ width: 14, height: 14, color: "#8b5cf6" }} />}
            title={t("explore.people_to_follow")}
            sub="Siz uchun tavsiya"
          />
          <HScroll gap={12}>
            {suggestedUsers.map((u, i) => {
              const isFollowed = followedIds.has(u.id) || u.isFollowing;
              const isMe = me?.id === u.id;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ flexShrink: 0, width: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                >
                  {/* Avatar with gradient ring */}
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 62, height: 62, borderRadius: "50%", padding: 2,
                      background: isFollowed
                        ? "rgba(139,92,246,0.2)"
                        : "linear-gradient(135deg,#8b5cf6,#3b82f6,#ec4899)",
                    }}>
                      <div style={{
                        width: "100%", height: "100%", borderRadius: "50%",
                        overflow: "hidden", background: "var(--card)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {u.avatarUrl ? (
                          <img loading="lazy" decoding="async" src={u.avatarUrl} alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6" }}>
                            {(u.displayName ?? u.username)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {u.isVerified && (
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <BadgeCheck style={{ width: 14, height: 14, color: "#8b5cf6" }} />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", textAlign: "center",
                    width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.displayName ?? u.username}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: -4, textAlign: "center",
                    width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{u.username}
                  </p>

                  {/* Follow button */}
                  {!isMe && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      disabled={followMut.isPending}
                      onClick={() => followMut.mutate({ id: u.id })}
                      style={{
                        width: "100%", padding: "5px 0", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        border: isFollowed ? "1.5px solid rgba(139,92,246,0.4)" : "none",
                        background: isFollowed ? "transparent" : "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                        color: isFollowed ? "#8b5cf6" : "white",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        transition: "all 0.2s",
                      }}
                    >
                      {isFollowed ? (
                        <><Check style={{ width: 9, height: 9 }} /> Kuzatilmoqda</>
                      ) : (
                        <><UserPlus style={{ width: 9, height: 9 }} /> Kuzatish</>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </HScroll>
        </section>
      )}

      {/* ── Search results ── */}
      {query && searchUsers.length > 0 && (
        <section>
          <SectionHead
            icon={<Users style={{ width: 14, height: 14, color: "#8b5cf6" }} />}
            title="Natijalar"
            sub={`"${query}" bo'yicha`}
          />
          <HScroll gap={12}>
            {searchUsers.map((u, i) => {
              const isFollowed = followedIds.has(u.id) || u.isFollowing;
              const isMe = me?.id === u.id;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ flexShrink: 0, width: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                >
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 62, height: 62, borderRadius: "50%", padding: 2,
                      background: isFollowed ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg,#8b5cf6,#3b82f6,#ec4899)",
                    }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                        background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {u.avatarUrl ? (
                          <img loading="lazy" decoding="async" src={u.avatarUrl} alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6" }}>
                            {(u.displayName ?? u.username)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {u.isVerified && (
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18,
                        borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BadgeCheck style={{ width: 14, height: 14, color: "#8b5cf6" }} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", textAlign: "center",
                    width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.displayName ?? u.username}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: -4, textAlign: "center",
                    width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{u.username}
                  </p>
                  {!isMe && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      disabled={followMut.isPending}
                      onClick={() => followMut.mutate({ id: u.id })}
                      style={{
                        width: "100%", padding: "5px 0", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        border: isFollowed ? "1.5px solid rgba(139,92,246,0.4)" : "none",
                        background: isFollowed ? "transparent" : "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                        color: isFollowed ? "#8b5cf6" : "white",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                      }}
                    >
                      {isFollowed ? <><Check style={{ width: 9, height: 9 }} /> Kuzatilmoqda</> : <><UserPlus style={{ width: 9, height: 9 }} /> Kuzatish</>}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </HScroll>
        </section>
      )}

      {/* ── Instagram-style Rekomendatsiyalar ── */}
      {suggestedUsers.length > 0 && !query && (
        <section>
          <SectionHead
            icon={<Flame style={{ width: 14, height: 14, color: "#f97316" }} />}
            title="Tavsiya etiladi"
            sub="Instagram uslubida"
          />
          <HScroll gap={10}>
            {suggestedUsers.slice(0, 10).map((u, i) => {
              const isFollowed = followedIds.has(u.id) || u.isFollowing;
              const isMe = me?.id === u.id;
              return (
                <motion.div
                  key={`rec-${u.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    flexShrink: 0, width: 150,
                    border: "1.5px solid var(--border)", background: "var(--card)",
                    cursor: "pointer", borderRadius: 20,
                    /* NO overflow:hidden — lets avatar peek out of cover */
                  }}
                >
                  {/* Cover — only top corners rounded */}
                  <div style={{
                    height: 72,
                    background: `linear-gradient(135deg,hsl(${(i * 47 + 200) % 360},60%,25%),hsl(${(i * 47 + 260) % 360},70%,15%))`,
                    borderRadius: "18px 18px 0 0",
                    position: "relative",
                  }}>
                    {/* Avatar — centred on cover bottom edge */}
                    <div style={{
                      position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
                      width: 46, height: 46, borderRadius: "50%",
                      border: "3px solid var(--card)",
                      background: "var(--card)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", zIndex: 2,
                    }}>
                      {u.avatarUrl ? (
                        <img loading="lazy" decoding="async" src={u.avatarUrl} alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#8b5cf6" }}>
                          {(u.displayName ?? u.username)?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: "28px 10px 12px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 2 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: "var(--foreground)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                        {u.displayName ?? u.username}
                      </p>
                      {u.isVerified && <BadgeCheck style={{ width: 12, height: 12, color: "#8b5cf6", flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 10 }}>
                      @{u.username}
                    </p>
                    {!isMe && (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        disabled={followMut.isPending}
                        onClick={() => followMut.mutate({ id: u.id })}
                        style={{
                          width: "100%", padding: "6px 0", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          border: isFollowed ? "1.5px solid rgba(139,92,246,0.4)" : "none",
                          background: isFollowed ? "transparent" : "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                          color: isFollowed ? "#8b5cf6" : "white", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s",
                        }}
                      >
                        {isFollowed ? <><Check style={{ width: 10, height: 10 }} /> Kuzatilmoqda</> : <><UserPlus style={{ width: 10, height: 10 }} /> Kuzatish</>}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </HScroll>
        </section>
      )}

      {/* ── Guruhlar (carousel) ── */}
      {groups.length > 0 && (
        <section>
          <SectionHead
            icon={<Users style={{ width: 14, height: 14, color: "#22d3ee" }} />}
            title={t("explore.popular_communities")}
            sub="Mashhur jamoalar"
          />
          <HScroll gap={10}>
            {groups.map((group, i) => {
              const isJoined = joinedIds.has(group.id) || group.isMember;
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    flexShrink: 0, width: 160, borderRadius: 20, overflow: "hidden",
                    border: "1.5px solid var(--border)", background: "var(--card)",
                  }}
                >
                  {/* Cover */}
                  <div style={{
                    height: 68,
                    background: `linear-gradient(135deg,hsl(${(i * 53 + 180) % 360},55%,22%),hsl(${(i * 53 + 230) % 360},65%,12%))`,
                    position: "relative", display: "flex", alignItems: "flex-end", padding: "0 12px 8px",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, overflow: "hidden",
                      background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {group.avatarUrl ? (
                        <img loading="lazy" decoding="async" src={group.avatarUrl} alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{group.name[0]}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: "10px 12px 12px" }}>
                    <p style={{ fontWeight: 800, fontSize: 12, color: "var(--foreground)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                      {group.name}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 10 }}>
                      {group.membersCount.toLocaleString()} a'zo · {group.category}
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      disabled={isJoined || joinMut.isPending}
                      onClick={() => !isJoined && joinMut.mutate({ id: group.id })}
                      style={{
                        width: "100%", padding: "6px 0", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        border: isJoined ? "1.5px solid rgba(34,211,238,0.4)" : "none",
                        background: isJoined ? "transparent" : "linear-gradient(135deg,#0891b2,#0e7490)",
                        color: isJoined ? "#22d3ee" : "white",
                        cursor: isJoined ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s",
                      }}
                    >
                      {isJoined ? <><Check style={{ width: 10, height: 10 }} /> A'zo</> : "Qo'shilish"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </HScroll>
        </section>
      )}
    </div>
  );
}
