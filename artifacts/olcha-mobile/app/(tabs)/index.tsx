import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, type Post } from "@/lib/api";

const { width: W, height: H } = Dimensions.get("window");
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const CARD_GRADS: [string, string, string][] = [
  ["#1a0533", "#3b1275", "#7c3aed"],
  ["#0a1530", "#1a3a7c", "#3b82f6"],
  ["#1a0820", "#5b1a5e", "#a855f7"],
  ["#061a15", "#0d5240", "#10b981"],
  ["#1a0f00", "#5c3000", "#f59e0b"],
  ["#1a0012", "#5c001e", "#ec4899"],
  ["#050e1a", "#0d3060", "#0ea5e9"],
];

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  video: { label: "Klip", icon: "play-circle", color: "#ef4444" },
  reel: { label: "Reel", icon: "film", color: "#a855f7" },
  image: { label: "Rasm", icon: "image", color: "#3b82f6" },
  ad: { label: "Reklama", icon: "zap", color: "#f59e0b" },
  text: { label: "Post", icon: "align-left", color: "#10b981" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m} d.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} s.`;
  return `${Math.floor(h / 24)} k.`;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

/* ─── AI Analysis Panel ──────────────────────────────── */
interface AIAnalysis {
  tags?: string[];
  category?: string;
  summary?: string;
  sentiment?: string;
}

function sentimentEmoji(s?: string) {
  if (s === "positive") return "😊";
  if (s === "negative") return "😞";
  return "😐";
}

/* ─── Media / Gradient Background ───────────────────── */
function CardBg({ post, style }: { post: Post; style?: object }) {
  const grad = CARD_GRADS[(post.id ?? 0) % CARD_GRADS.length];
  return (
    <LinearGradient
      colors={[grad[0], grad[1], grad[2]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFillObject, style]}
    />
  );
}

/* ─── HERO card (full-width, tall) ──────────────────── */
function HeroCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.text;

  return (
    <Pressable onPress={onPress} style={styles.heroCard}>
      <CardBg post={post} />
      {/* Diagonal shimmer */}
      <View style={styles.heroShimmer} />
      {/* Top badges */}
      <View style={styles.heroBadgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + "33", borderColor: typeInfo.color + "66" }]}>
          <Feather name={typeInfo.icon as any} size={10} color={typeInfo.color} />
          <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>
        <View style={styles.aiBadge}>
          <Feather name="zap" size={10} color="#a78bfa" />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* Hero label */}
      <View style={styles.heroTopLabel}>
        <Text style={styles.heroTopText}>✦ FEATURED</Text>
      </View>

      {/* Bottom overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.92)"]}
        style={styles.heroBottom}
      >
        <View style={styles.heroAuthor}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{(post.user?.displayName ?? "U")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroDisplayName} numberOfLines={1}>{post.user?.displayName ?? "OlCha User"}</Text>
              {post.user?.isVerified && <Text style={styles.heroVerified}>✓</Text>}
            </View>
            <Text style={styles.heroUsername}>@{post.user?.username ?? "user"} · {timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.heroContent} numberOfLines={2}>{post.content}</Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.heroAction} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLiked(v => !v); setLikes(v => v + (liked ? -1 : 1)); }}>
            <Feather name="heart" size={18} color={liked ? "#ec4899" : "rgba(255,255,255,0.8)"} />
            <Text style={styles.heroActionText}>{formatCount(likes)}</Text>
          </Pressable>
          <Pressable style={styles.heroAction}>
            <Feather name="message-circle" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroActionText}>{formatCount(post.commentsCount ?? 0)}</Text>
          </Pressable>
          <Pressable style={styles.heroAction}>
            <Feather name="share-2" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.expandBtn}>
            <Feather name="maximize-2" size={14} color="#a78bfa" />
            <Text style={styles.expandText}>Ochish</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ─── HALF card (two side by side) ──────────────────── */
function HalfCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.text;

  return (
    <Pressable onPress={onPress} style={styles.halfCard}>
      <CardBg post={post} />
      <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + "33", borderColor: typeInfo.color + "66", position: "absolute", top: 8, left: 8 }]}>
        <Feather name={typeInfo.icon as any} size={9} color={typeInfo.color} />
        <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
      </View>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.82)"]}
        style={styles.halfBottom}
      >
        <Text style={styles.halfName} numberOfLines={1}>{post.user?.displayName ?? "User"}</Text>
        <Text style={styles.halfContent} numberOfLines={2}>{post.content}</Text>
        <View style={styles.halfStats}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLiked(v => !v); setLikes(v => v + (liked ? -1 : 1)); }}>
            <Text style={{ color: liked ? "#ec4899" : "rgba(255,255,255,0.6)", fontSize: 11 }}>
              ♥ {formatCount(likes)}
            </Text>
          </Pressable>
          <Text style={styles.halfTime}>{timeAgo(post.createdAt)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ─── WIDE card (full-width, medium) ────────────────── */
function WideCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.text;
  const grad = CARD_GRADS[(post.id ?? 0) % CARD_GRADS.length];

  return (
    <Pressable onPress={onPress} style={styles.wideCard}>
      {/* Horizontal gradient (left=info, right=visual) */}
      <LinearGradient
        colors={[grad[0], grad[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Right visual accent */}
      <LinearGradient
        colors={[grad[1] + "00", grad[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFillObject, { left: "40%" }]}
      />
      {/* Concentric rings on right */}
      <View style={[styles.wideRing, { right: 24, width: 120, height: 120, borderRadius: 60, borderColor: grad[2] + "30" }]} />
      <View style={[styles.wideRing, { right: 40, width: 80, height: 80, borderRadius: 40, borderColor: grad[2] + "50" }]} />

      <View style={styles.wideContent}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + "33", borderColor: typeInfo.color + "66" }]}>
          <Feather name={typeInfo.icon as any} size={9} color={typeInfo.color} />
          <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>
        <Text style={styles.wideDisplayName}>{post.user?.displayName ?? "User"}{post.user?.isVerified ? " ✓" : ""}</Text>
        <Text style={styles.wideText} numberOfLines={3}>{post.content}</Text>
        <View style={styles.wideStats}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLiked(v => !v); setLikes(v => v + (liked ? -1 : 1)); }}>
            <Text style={{ color: liked ? "#ec4899" : "rgba(255,255,255,0.55)", fontSize: 12 }}>
              ♥ {formatCount(likes)}
            </Text>
          </Pressable>
          <Text style={styles.wideDot}>·</Text>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
            💬 {formatCount(post.commentsCount ?? 0)}
          </Text>
          <Text style={styles.wideDot}>·</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{timeAgo(post.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ─── MINI card (1/3 width strip) ───────────────────── */
function MiniCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.text;
  return (
    <Pressable onPress={onPress} style={styles.miniCard}>
      <CardBg post={post} />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.miniOverlay}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + "33", borderColor: typeInfo.color + "66" }]}>
          <Feather name={typeInfo.icon as any} size={8} color={typeInfo.color} />
        </View>
        <Text style={styles.miniName} numberOfLines={1}>{post.user?.displayName?.split(" ")[0] ?? "User"}</Text>
        <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>♥ {formatCount(post.likesCount ?? 0)}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/* ─── Full-screen Immersive Overlay ─────────────────── */
function ImmersiveOverlay({ post, visible, onClose }: { post: Post | null; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

  React.useEffect(() => {
    if (post) { setLiked(false); setLikes(post.likesCount ?? 0); setShowAI(false); setAnalysis(null); }
  }, [post]);

  const loadAI = async () => {
    if (!post) return;
    if (analysis) { setShowAI(v => !v); return; }
    setAiLoading(true);
    setShowAI(true);
    try {
      const res = await fetch(`${API_BASE}/ai/analyze-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentId: post.id, contentType: "post", caption: post.content ?? "" }),
      });
      if (res.ok) setAnalysis(await res.json());
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  if (!post) return null;
  const grad = CARD_GRADS[(post.id ?? 0) % CARD_GRADS.length];
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.text;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.immRoot}>
        {/* Background */}
        <LinearGradient colors={[grad[0], grad[1], grad[2]]} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFillObject} />

        {/* Close */}
        <Pressable style={[styles.immClose, { top: insets.top + 8 }]} onPress={onClose}>
          <Feather name="x" size={20} color="#fff" />
        </Pressable>

        {/* Type badge top-left */}
        <View style={[styles.typeBadge, { position: "absolute", top: insets.top + 12, left: 16, backgroundColor: typeInfo.color + "33", borderColor: typeInfo.color + "66" }]}>
          <Feather name={typeInfo.icon as any} size={11} color={typeInfo.color} />
          <Text style={[styles.typeBadgeText, { color: typeInfo.color, fontSize: 11 }]}>{typeInfo.label}</Text>
        </View>

        {/* Right action bar */}
        <View style={[styles.immActions, { bottom: insets.bottom + 140 }]}>
          <Pressable style={styles.immAction} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setLiked(v => !v); setLikes(v => v + (liked ? -1 : 1)); }}>
            <LinearGradient colors={liked ? ["#ec4899", "#f43f5e"] : ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]} style={styles.immActionBg}>
              <Feather name="heart" size={22} color={liked ? "#fff" : "rgba(255,255,255,0.85)"} />
            </LinearGradient>
            <Text style={styles.immActionLabel}>{formatCount(likes)}</Text>
          </Pressable>
          <Pressable style={styles.immAction}>
            <View style={styles.immActionBg}>
              <Feather name="message-circle" size={22} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.immActionLabel}>{formatCount(post.commentsCount ?? 0)}</Text>
          </Pressable>
          <Pressable style={styles.immAction}>
            <View style={styles.immActionBg}>
              <Feather name="share-2" size={22} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.immActionLabel}>Ulash</Text>
          </Pressable>
          <Pressable style={styles.immAction} onPress={loadAI}>
            <LinearGradient colors={showAI ? ["#7c3aed", "#a855f7"] : ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]} style={styles.immActionBg}>
              {aiLoading ? <ActivityIndicator size="small" color="#a78bfa" /> : <Feather name="zap" size={22} color={showAI ? "#fff" : "#a78bfa"} />}
            </LinearGradient>
            <Text style={[styles.immActionLabel, { color: "#a78bfa" }]}>AI</Text>
          </Pressable>
        </View>

        {/* Center: big decorative orb */}
        <View style={styles.immOrb}>
          <LinearGradient colors={[grad[2] + "55", grad[2] + "11"]} style={styles.immOrbGrad}>
            <Text style={styles.immOrbInitial}>{(post.user?.displayName ?? "O")[0].toUpperCase()}</Text>
          </LinearGradient>
        </View>

        {/* Bottom info */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.9)"]}
          style={[styles.immBottom, { paddingBottom: insets.bottom + 16 }]}
        >
          {/* Author row */}
          <View style={styles.immAuthorRow}>
            <LinearGradient colors={[grad[1], grad[2]]} style={styles.immAvatar}>
              <Text style={styles.immAvatarText}>{(post.user?.displayName ?? "U")[0].toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.immAuthorName}>{post.user?.displayName ?? "OlCha User"}</Text>
                {post.user?.isVerified && (
                  <View style={styles.verifiedBadge}><Text style={{ fontSize: 9, color: "#fff" }}>✓</Text></View>
                )}
              </View>
              <Text style={styles.immAuthorHandle}>@{post.user?.username ?? "user"} · {timeAgo(post.createdAt)}</Text>
            </View>
            <Pressable style={styles.followBtn}>
              <Text style={styles.followBtnText}>Kuzatish</Text>
            </Pressable>
          </View>
          <Text style={styles.immContent}>{post.content}</Text>

          {/* AI Analysis panel */}
          {showAI && (
            <View style={styles.aiPanel}>
              <View style={styles.aiPanelHeader}>
                <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.aiPanelIcon}>
                  <Feather name="zap" size={12} color="#fff" />
                </LinearGradient>
                <Text style={styles.aiPanelTitle}>OlCha AI Tahlil</Text>
                {analysis?.sentiment && (
                  <Text style={styles.aiSentiment}>{sentimentEmoji(analysis.sentiment)}</Text>
                )}
              </View>
              {aiLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
                  <ActivityIndicator size="small" color="#a78bfa" />
                  <Text style={styles.aiLoadingText}>OlCha AI tahlil qilmoqda...</Text>
                </View>
              ) : analysis ? (
                <>
                  {analysis.category && (
                    <View style={styles.aiCatBadge}>
                      <Text style={styles.aiCatText}>{analysis.category}</Text>
                    </View>
                  )}
                  {analysis.summary && (
                    <Text style={styles.aiSummary}>{analysis.summary}</Text>
                  )}
                  {analysis.tags && analysis.tags.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {analysis.tags.slice(0, 6).map(tag => (
                          <View key={tag} style={styles.aiTag}>
                            <Text style={styles.aiTagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </>
              ) : (
                <Text style={styles.aiLoadingText}>AI ma'lumot ololmadi.</Text>
              )}
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

/* ─── Category strip ─────────────────────────────────── */
const CATEGORIES = [
  { key: "all", label: "Hammasi" },
  { key: "image", label: "📸 Rasmlar" },
  { key: "video", label: "🎬 Videolar" },
  { key: "reel", label: "✨ Reels" },
  { key: "ad", label: "⚡ Reklama" },
];

/* ─── Block layout (groups of 4) ────────────────────── */
function FeedBlock({ posts, onPress }: { posts: Post[]; onPress: (p: Post) => void }) {
  const [p0, p1, p2, p3] = posts;
  return (
    <View style={styles.block}>
      {p0 && <HeroCard post={p0} onPress={() => onPress(p0)} />}
      {(p1 || p2) && (
        <View style={styles.halfRow}>
          {p1 && <HalfCard post={p1} onPress={() => onPress(p1)} />}
          {p2 && <HalfCard post={p2} onPress={() => onPress(p2)} />}
        </View>
      )}
      {p3 && <WideCard post={p3} onPress={() => onPress(p3)} />}
    </View>
  );
}

/* ─── Mini strip (3 posts side by side) ─────────────── */
function MiniStrip({ posts, onPress }: { posts: Post[]; onPress: (p: Post) => void }) {
  return (
    <View style={styles.miniRow}>
      {posts.map(p => <MiniCard key={`mini-${p.id}`} post={p} onPress={() => onPress(p)} />)}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════ */
const DEMO_POSTS: Post[] = [
  { id: 1, userId: 1, content: "O'zbekistondagi eng go'zal tog'lar haqida yangi post! 🏔️ Chimyon, Ugom, Nuratau — har biri alohida hayrat beradi!", mediaUrl: null, type: "image", likesCount: 14200, commentsCount: 234, createdAt: new Date(Date.now() - 600000).toISOString(), user: { id: 1, username: "dilnoza_uz", displayName: "Dilnoza Yusupova", avatarUrl: null, isVerified: true } },
  { id: 2, userId: 2, content: "Bugun yangi loyiha boshladim. AI bilan ishlash juda qiziq! OlCha platformasida ko'p narsalar o'rganish mumkin 🚀", mediaUrl: null, type: "video", likesCount: 8900, commentsCount: 156, createdAt: new Date(Date.now() - 1800000).toISOString(), user: { id: 2, username: "sardor_b", displayName: "Sardor Baxtiyorov", avatarUrl: null, isVerified: false } },
  { id: 3, userId: 3, content: "Toshkent kunlari... Shahrimiz har kuni yangilanib bormoqda! Yangi metro liniyasi ochildi 🚇", mediaUrl: null, type: "reel", likesCount: 23100, commentsCount: 412, createdAt: new Date(Date.now() - 3600000).toISOString(), user: { id: 3, username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true } },
  { id: 4, userId: 4, content: "Musiqa — ruhning ozuqasi. Yangi albomim chiqdi! Barcha platformalarda tinglab ko'ring 🎵", mediaUrl: null, type: "reel", likesCount: 45600, commentsCount: 789, createdAt: new Date(Date.now() - 7200000).toISOString(), user: { id: 4, username: "jasur_art", displayName: "Jasur Artistov", avatarUrl: null, isVerified: true } },
  { id: 5, userId: 5, content: "OlCha Premium — yangi imkoniyatlar dunyosi! Bugun ulaning va AI kuchini his qiling ⚡", mediaUrl: null, type: "ad", likesCount: 3100, commentsCount: 45, createdAt: new Date(Date.now() - 9000000).toISOString(), user: { id: 5, username: "olcha_official", displayName: "OlCha Official", avatarUrl: null, isVerified: true } },
  { id: 6, userId: 6, content: "Samarqand — tarixiy shahar, jahon merosi. Registon maydoni har safar hayrat baxsh etadi 🏛️", mediaUrl: null, type: "image", likesCount: 31200, commentsCount: 567, createdAt: new Date(Date.now() - 14400000).toISOString(), user: { id: 6, username: "aziz_photo", displayName: "Aziz Raximov", avatarUrl: null, isVerified: false } },
  { id: 7, userId: 7, content: "Live coding session: React Native bilan yangi ilovalar quramiz. Qo'shiling! 💻", mediaUrl: null, type: "video", likesCount: 7800, commentsCount: 234, createdAt: new Date(Date.now() - 18000000).toISOString(), user: { id: 7, username: "dev_kamol", displayName: "Kamol Eshmatov", avatarUrl: null, isVerified: true } },
  { id: 8, userId: 8, content: "Oshpazlik — bu ham san'at! Bugungi maxsus taom: Xorazm oshining sirli retsepti 🍲", mediaUrl: null, type: "reel", likesCount: 19400, commentsCount: 345, createdAt: new Date(Date.now() - 21600000).toISOString(), user: { id: 8, username: "oshpaz_pro", displayName: "Muazzam Xoliqova", avatarUrl: null, isVerified: false } },
  { id: 9, userId: 9, content: "Fit bo'lish oson! Kuniga 20 daqiqa — va 3 oyda natija. Men bilan mashq qiling 💪", mediaUrl: null, type: "video", likesCount: 28900, commentsCount: 678, createdAt: new Date(Date.now() - 28800000).toISOString(), user: { id: 9, username: "fit_bobur", displayName: "Bobur Toshmatov", avatarUrl: null, isVerified: true } },
];

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [immersiveVisible, setImmersiveVisible] = useState(false);

  const { data: apiPosts, isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => apiGet<Post[]>("/posts"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rawPosts = (apiPosts && apiPosts.length > 0) ? apiPosts : DEMO_POSTS;
  const posts = activeCategory === "all" ? rawPosts : rawPosts.filter(p => p.type === activeCategory);

  const handlePress = (p: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPost(p);
    setImmersiveVisible(true);
  };

  /* Build layout: blocks of 4 + mini strips */
  const sections: Array<{ type: "block"; posts: Post[] } | { type: "mini"; posts: Post[] }> = [];
  let i = 0;
  let blockIndex = 0;
  while (i < posts.length) {
    if (blockIndex % 3 === 2) {
      // Every 3rd block insert a mini strip of 3
      sections.push({ type: "mini", posts: posts.slice(i, i + 3) });
      i += 3;
    } else {
      sections.push({ type: "block", posts: posts.slice(i, i + 4) });
      i += 4;
    }
    blockIndex++;
  }

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#070b15", "#08091a", "#070b15"]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? webTopPadding : 0) }]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>O</Text>
          </LinearGradient>
          <Text style={styles.headerTitle}>OlCha</Text>
          <View style={styles.liveDot}>
            <View style={styles.liveDotInner} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={[styles.headerBtn, { borderColor: "#1e2a3d" }]}>
            <Feather name="bell" size={18} color="rgba(255,255,255,0.75)" />
          </Pressable>
          <Pressable style={[styles.headerBtn, { borderColor: "#1e2a3d" }]}>
            <Feather name="search" size={18} color="rgba(255,255,255,0.75)" />
          </Pressable>
          <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(user?.displayName ?? "O")[0].toUpperCase()}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Category strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catStrip} contentContainerStyle={styles.catContent}>
        {CATEGORIES.map(cat => (
          <Pressable key={cat.key} onPress={() => setActiveCategory(cat.key)}
            style={[styles.catChip, activeCategory === cat.key && styles.catChipActive]}>
            {activeCategory === cat.key && (
              <LinearGradient colors={["#7c3aed", "#a855f7"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            )}
            <Text style={[styles.catChipText, activeCategory === cat.key && { color: "#fff" }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Feed */}
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#7c3aed" />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(_, idx) => `section-${idx}`}
          renderItem={({ item }) =>
            item.type === "block"
              ? <FeedBlock posts={item.posts} onPress={handlePress} />
              : <MiniStrip posts={item.posts} onPress={handlePress} />
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + webBottomPadding + 80 }}
        />
      )}

      {/* Immersive overlay */}
      <ImmersiveOverlay post={selectedPost} visible={immersiveVisible} onClose={() => setImmersiveVisible(false)} />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────── */
const GAP = 3;
const HALF_W = (W - GAP * 3) / 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(30,42,61,0.6)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerLogoText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#c4b5fd", letterSpacing: 1 },
  liveDot: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  liveDotInner: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#ef4444" },
  liveText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#ef4444", letterSpacing: 0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  headerAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },

  /* Category strip */
  catStrip: { maxHeight: 42, marginTop: 8 },
  catContent: { paddingHorizontal: 12, gap: 8, alignItems: "center", height: 36 },
  catChip: {
    paddingHorizontal: 14, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  catChipActive: { borderColor: "#7c3aed55" },
  catChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },

  /* Blocks */
  block: { gap: GAP, marginBottom: GAP },

  /* HERO card */
  heroCard: { width: W, height: 260, overflow: "hidden" },
  heroShimmer: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.06,
    backgroundColor: "#fff",
    transform: [{ skewX: "-20deg" }, { scaleX: 0.3 }],
  },
  heroBadgeRow: {
    position: "absolute", top: 12, left: 12, right: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  heroTopLabel: { position: "absolute", top: 12, left: "50%", marginLeft: -36 },
  heroTopText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.35)", letterSpacing: 2 },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingTop: 40 },
  heroAuthor: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  heroAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroDisplayName: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  heroVerified: { color: "#7c3aed", fontSize: 12 },
  heroUsername: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroContent: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 10 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroAction: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  heroActionText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium" },
  expandBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(124,58,237,0.25)", borderWidth: 1, borderColor: "rgba(124,58,237,0.4)" },
  expandText: { color: "#a78bfa", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  /* HALF card */
  halfRow: { flexDirection: "row", gap: GAP },
  halfCard: { width: HALF_W, height: 190, overflow: "hidden" },
  halfBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 30 },
  halfName: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  halfContent: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15, marginBottom: 6 },
  halfStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  halfTime: { color: "rgba(255,255,255,0.4)", fontSize: 10 },

  /* WIDE card */
  wideCard: { width: W, height: 140, overflow: "hidden", justifyContent: "center" },
  wideContent: { padding: 16, flex: 1, justifyContent: "center" },
  wideRing: { position: "absolute", borderWidth: 1 },
  wideDisplayName: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 6, marginBottom: 4 },
  wideText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 8, maxWidth: "65%" },
  wideStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  wideDot: { color: "rgba(255,255,255,0.3)", fontSize: 12 },

  /* MINI strip */
  miniRow: { flexDirection: "row", gap: GAP },
  miniCard: { flex: 1, height: 140, overflow: "hidden" },
  miniOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 8, paddingTop: 24, alignItems: "flex-start", gap: 3 },
  miniName: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold", width: "100%" },

  /* Badges */
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
    backgroundColor: "rgba(124,58,237,0.25)", borderWidth: 1, borderColor: "rgba(124,58,237,0.4)",
  },
  aiBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#a78bfa" },

  /* IMMERSIVE overlay */
  immRoot: { flex: 1, backgroundColor: "#070b15" },
  immClose: {
    position: "absolute", right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  immOrb: {
    position: "absolute", top: "20%", left: "50%", marginLeft: -70,
    width: 140, height: 140,
  },
  immOrbGrad: { flex: 1, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  immOrbInitial: { fontSize: 72, color: "rgba(255,255,255,0.15)", fontFamily: "Inter_700Bold" },
  immActions: {
    position: "absolute", right: 14, gap: 16,
  },
  immAction: { alignItems: "center", gap: 4 },
  immActionBg: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  immActionLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_500Medium" },
  immBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 40,
  },
  immAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  immAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  immAvatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  immAuthorName: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  immAuthorHandle: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },
  followBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(124,58,237,0.3)", borderWidth: 1, borderColor: "rgba(124,58,237,0.5)" },
  followBtnText: { color: "#c4b5fd", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  immContent: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 12 },

  /* AI panel */
  aiPanel: {
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 14, padding: 12,
  },
  aiPanelHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  aiPanelIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  aiPanelTitle: { color: "#c4b5fd", fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  aiSentiment: { fontSize: 18 },
  aiCatBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(124,58,237,0.25)", marginBottom: 6 },
  aiCatText: { color: "#a78bfa", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiSummary: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  aiLoadingText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  aiTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)" },
  aiTagText: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular" },
});
