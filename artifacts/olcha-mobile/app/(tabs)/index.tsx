/**
 * OlCha Nebula Feed
 * ─────────────────
 * Full-screen horizontal page feed — each post/reel/clip/photo/ad
 * fills 100% of the screen. Swipe LEFT → next, RIGHT → prev.
 * Nothing like Instagram, TikTok, Facebook or YouTube.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { apiGet, type Post } from "@/lib/api";

/* ── Constants ────────────────────────────────────────── */
const { width: W, height: H } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = `https://${DOMAIN}/api`;

/* ── Per-type config ──────────────────────────────────── */
const TYPE_CFG: Record<string, { label: string; icon: string; accent: string; bg: [string, string, string] }> = {
  video:  { label: "Klip",     icon: "play-circle", accent: "#ef4444", bg: ["#1a0808","#4a0d0d","#ef4444"] },
  reel:   { label: "Reel",     icon: "film",        accent: "#a855f7", bg: ["#160820","#3d1060","#a855f7"] },
  image:  { label: "Rasm",     icon: "image",       accent: "#3b82f6", bg: ["#080f20","#102060","#3b82f6"] },
  ad:     { label: "Reklama",  icon: "zap",         accent: "#f59e0b", bg: ["#1a1000","#4a2e00","#f59e0b"] },
  text:   { label: "Post",     icon: "align-left",  accent: "#10b981", bg: ["#041410","#0a3828","#10b981"] },
};

const FALLBACK_GRADS: [string,string,string][] = [
  ["#1a0533","#3b1275","#7c3aed"],
  ["#0a1530","#1a3a7c","#3b82f6"],
  ["#1a0820","#5b1a5e","#a855f7"],
  ["#061a15","#0d5240","#10b981"],
  ["#1a0f00","#5c3000","#f59e0b"],
  ["#1a0012","#5c001e","#ec4899"],
  ["#050e1a","#0d3060","#0ea5e9"],
];

function gradFor(post: Post): [string,string,string] {
  return TYPE_CFG[post.type]?.bg ?? FALLBACK_GRADS[(post.id ?? 0) % FALLBACK_GRADS.length];
}

function mediaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${DOMAIN}${raw}`;
}

/* ── Helpers ──────────────────────────────────────────── */
function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m} d.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} s.`;
  return `${Math.floor(h / 24)} kun`;
}
function fmt(n: number) {
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return `${n}`;
}

/* ── AI Panel (slides up inside overlay) ─────────────── */
interface AIResult { tags?: string[]; category?: string; summary?: string; sentiment?: string }
function sentEmoji(s?: string) { return s==="positive"?"😊":s==="negative"?"😞":"😐"; }

/* ── DEMO data (when API has no posts) ───────────────── */
const DEMO: Post[] = [
  { id:1,  userId:1,  type:"image",  content:"O'zbekistonning eng go'zal tog' manzarasi — Chimyon cho'qqisi. 🏔️", mediaUrl:null, likesCount:14200, commentsCount:234, createdAt:new Date(Date.now()-600000).toISOString(),   user:{id:1, username:"dilnoza_uz",    displayName:"Dilnoza Yusupova",  avatarUrl:null, isVerified:true}},
  { id:2,  userId:2,  type:"video",  content:"AI bilan ishlash qanchalik qiziq! OlCha platformasida har kuni yangilik. 🚀", mediaUrl:null, likesCount:8900, commentsCount:156, createdAt:new Date(Date.now()-1800000).toISOString(), user:{id:2, username:"sardor_b",      displayName:"Sardor Baxtiyorov", avatarUrl:null, isVerified:false}},
  { id:3,  userId:3,  type:"reel",   content:"Toshkent metro liniyasi kengaymoqda — yangi stansiyalar! 🚇", mediaUrl:null, likesCount:23100, commentsCount:412, createdAt:new Date(Date.now()-3600000).toISOString(), user:{id:3, username:"malika_m",      displayName:"Malika Mirzayeva",  avatarUrl:null, isVerified:true}},
  { id:4,  userId:4,  type:"reel",   content:"Yangi albomim chiqdi! Barcha platformalarda tinglab ko'ring 🎵", mediaUrl:null, likesCount:45600, commentsCount:789, createdAt:new Date(Date.now()-7200000).toISOString(), user:{id:4, username:"jasur_art",      displayName:"Jasur Artistov",    avatarUrl:null, isVerified:true}},
  { id:5,  userId:5,  type:"ad",     content:"OlCha Premium — cheksiz AI kuchi, reklama yo'q, maxsus imkoniyatlar! ⚡", mediaUrl:null, likesCount:3100, commentsCount:45, createdAt:new Date(Date.now()-9000000).toISOString(), user:{id:5, username:"olcha_official", displayName:"OlCha Official",    avatarUrl:null, isVerified:true}},
  { id:6,  userId:6,  type:"image",  content:"Samarqand — Registon maydoni, dunyoning eng go'zal arxitekturasi 🏛️", mediaUrl:null, likesCount:31200, commentsCount:567, createdAt:new Date(Date.now()-14400000).toISOString(), user:{id:6, username:"aziz_photo",     displayName:"Aziz Raximov",     avatarUrl:null, isVerified:false}},
  { id:7,  userId:7,  type:"video",  content:"React Native bilan ilova yaratamiz — live coding sessiyasi 💻", mediaUrl:null, likesCount:7800, commentsCount:234, createdAt:new Date(Date.now()-18000000).toISOString(), user:{id:7, username:"dev_kamol",      displayName:"Kamol Eshmatov",   avatarUrl:null, isVerified:true}},
  { id:8,  userId:8,  type:"reel",   content:"Xorazm oshi maxsus retsepti — oshpaz sirlarini oshkor qilaman 🍲", mediaUrl:null, likesCount:19400, commentsCount:345, createdAt:new Date(Date.now()-21600000).toISOString(), user:{id:8, username:"oshpaz_pro",     displayName:"Muazzam Xoliqova", avatarUrl:null, isVerified:false}},
  { id:9,  userId:9,  type:"video",  content:"Kuniga 20 daqiqa mashq — 3 oyda natija kafolatlangan 💪", mediaUrl:null, likesCount:28900, commentsCount:678, createdAt:new Date(Date.now()-28800000).toISOString(), user:{id:9, username:"fit_bobur",      displayName:"Bobur Toshmatov",  avatarUrl:null, isVerified:true}},
];

const CATS = [
  {key:"all",   label:"✦ Hammasi"},
  {key:"image", label:"📸 Rasm"},
  {key:"video", label:"🎬 Klip"},
  {key:"reel",  label:"✨ Reel"},
  {key:"ad",    label:"⚡ Reklama"},
];

/* ═══════════════════════════════════════════════════════
   SINGLE FULL-SCREEN CARD
═══════════════════════════════════════════════════════ */
function NebulaCard({
  post, total, index: idx,
  onAI, onLike, liked, likes,
}: {
  post: Post; total: number; index: number;
  onAI: () => void; onLike: () => void; liked: boolean; likes: number;
}) {
  const insets = useSafeAreaInsets();
  const cfg = TYPE_CFG[post.type] ?? TYPE_CFG.text;
  const grad = gradFor(post);
  const uri = mediaUrl(post.mediaUrl);
  const webBot = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.card, { width: W, height: Platform.OS === "web" ? H - 134 : H }]}>
      {/* ── FULL-SCREEN BACKGROUND ── */}
      {uri ? (
        <Image source={{ uri }} style={styles.cardBg} />
      ) : (
        <LinearGradient colors={grad} style={styles.cardBg} start={{x:0,y:0}} end={{x:1,y:1}} />
      )}

      {/* Depth gradient layers */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)","transparent","transparent","rgba(0,0,0,0.70)"]}
        locations={[0,0.3,0.55,1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) }]}>
        {/* Type badge */}
        <View style={[styles.typePill, { backgroundColor: cfg.accent+"33", borderColor: cfg.accent+"66" }]}>
          <Feather name={cfg.icon as any} size={11} color={cfg.accent} />
          <Text style={[styles.typePillText, { color: cfg.accent }]}>{cfg.label}</Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {Array.from({length: Math.min(total, 9)}).map((_, i) => (
            <View key={i} style={[
              styles.dot,
              i === idx % 9
                ? [styles.dotActive, { backgroundColor: cfg.accent }]
                : styles.dotInactive,
            ]} />
          ))}
        </View>

        {/* AI badge */}
        <Pressable style={styles.aiBadge} onPress={onAI}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.aiGrad}>
            <Feather name="zap" size={11} color="#fff" />
            <Text style={styles.aiText}>AI</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── DECORATIVE CENTER ── (only shown when no media) */}
      {!uri && (
        <View style={styles.centerOrb}>
          <View style={[styles.orbRing1, { borderColor: cfg.accent+"25" }]} />
          <View style={[styles.orbRing2, { borderColor: cfg.accent+"40" }]} />
          <View style={[styles.orbRing3, { borderColor: cfg.accent+"60" }]} />
          <View style={[styles.orbCore, { backgroundColor: cfg.accent+"22" }]}>
            <Text style={[styles.orbIcon, { color: cfg.accent }]}>
              {post.type === "video" ? "▶" : post.type === "reel" ? "✦" : post.type === "image" ? "◈" : post.type === "ad" ? "⚡" : "✎"}
            </Text>
          </View>
        </View>
      )}

      {/* ── RIGHT ACTION BAR ── */}
      <View style={[styles.actionBar, { bottom: insets.bottom + webBot + 120 }]}>
        {/* Like */}
        <Pressable style={styles.actionBtn} onPress={onLike}>
          <LinearGradient
            colors={liked ? ["#ec4899","#f43f5e"] : ["rgba(255,255,255,0.10)","rgba(255,255,255,0.05)"]}
            style={styles.actionCircle}
          >
            <Feather name="heart" size={22} color={liked ? "#fff" : "rgba(255,255,255,0.9)"} />
          </LinearGradient>
          <Text style={styles.actionCount}>{fmt(likes)}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={styles.actionBtn}>
          <View style={styles.actionCircle}>
            <Feather name="message-circle" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.actionCount}>{fmt(post.commentsCount ?? 0)}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={styles.actionBtn}>
          <View style={styles.actionCircle}>
            <Feather name="share-2" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.actionCount}>Ulash</Text>
        </Pressable>

        {/* Bookmark */}
        <Pressable style={styles.actionBtn}>
          <View style={styles.actionCircle}>
            <Feather name="bookmark" size={22} color="rgba(255,255,255,0.9)" />
          </View>
        </Pressable>

        {/* AI */}
        <Pressable style={styles.actionBtn} onPress={onAI}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.actionCircle}>
            <Feather name="zap" size={22} color="#fff" />
          </LinearGradient>
          <Text style={[styles.actionCount, { color: "#c4b5fd" }]}>AI</Text>
        </Pressable>
      </View>

      {/* ── BOTTOM INFO ── */}
      <LinearGradient
        colors={["transparent","rgba(0,0,0,0.60)","rgba(0,0,0,0.92)"]}
        style={[styles.bottomInfo, { paddingBottom: insets.bottom + webBot + 16 }]}
      >
        {/* Author */}
        <View style={styles.authorRow}>
          <LinearGradient colors={[grad[1], grad[2]]} style={styles.avatar}>
            <Text style={styles.avatarText}>{(post.user?.displayName ?? "U")[0].toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>{post.user?.displayName ?? "OlCha User"}</Text>
              {post.user?.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: cfg.accent }]}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              )}
              <Text style={styles.handle}>@{post.user?.username}</Text>
            </View>
            <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
          </View>
          <Pressable style={[styles.followBtn, { borderColor: cfg.accent+"88" }]}>
            <Text style={[styles.followText, { color: cfg.accent }]}>+ Kuzat</Text>
          </Pressable>
        </View>

        {/* Content text */}
        <Text style={styles.contentText} numberOfLines={3}>{post.content}</Text>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Feather name="chevron-left" size={12} color="rgba(255,255,255,0.3)" />
          <Text style={styles.swipeText}>Suring</Text>
          <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.3)" />
        </View>
      </LinearGradient>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   AI ANALYSIS MODAL
═══════════════════════════════════════════════════════ */
function AIModal({ post, visible, onClose }: { post: Post | null; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);

  React.useEffect(() => {
    if (!visible || !post) return;
    setResult(null);
    setLoading(true);
    fetch(`${API_BASE}/ai/analyze-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contentId: post.id, contentType: "post", caption: post.content ?? "" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setResult(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, post?.id]);

  if (!post) return null;
  const cfg = TYPE_CFG[post.type] ?? TYPE_CFG.text;
  const grad = gradFor(post);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={[styles.aiModal, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
        <LinearGradient colors={["#0d0d22","#12102a"]} style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { borderTopWidth: 1, borderColor: cfg.accent+"33", borderRadius: 24 }]} />

        {/* Handle */}
        <View style={[styles.modalHandle, { backgroundColor: cfg.accent+"66" }]} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.modalHeaderIcon}>
            <Feather name="zap" size={16} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>OlCha AI Tahlil</Text>
            <Text style={styles.modalSub} numberOfLines={1}>{post.user?.displayName} · {cfg.label}</Text>
          </View>
          {result?.sentiment && <Text style={styles.sentimentEmoji}>{sentEmoji(result.sentiment)}</Text>}
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.aiLoading}>
            <ActivityIndicator color="#a78bfa" size="large" />
            <Text style={styles.aiLoadingText}>OlCha AI tahlil qilmoqda...</Text>
          </View>
        ) : result ? (
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
            {/* Sentiment + category row */}
            <View style={styles.aiMetaRow}>
              {result.sentiment && (
                <View style={styles.aiMetaChip}>
                  <Text style={styles.aiMetaLabel}>Kayfiyat</Text>
                  <Text style={styles.aiMetaVal}>
                    {sentEmoji(result.sentiment)} {result.sentiment === "positive" ? "Ijobiy" : result.sentiment === "negative" ? "Salbiy" : "Neytral"}
                  </Text>
                </View>
              )}
              {result.category && (
                <View style={[styles.aiMetaChip, { borderColor: cfg.accent+"55", backgroundColor: cfg.accent+"18" }]}>
                  <Text style={styles.aiMetaLabel}>Kategoriya</Text>
                  <Text style={[styles.aiMetaVal, { color: cfg.accent }]}>{result.category}</Text>
                </View>
              )}
            </View>

            {/* Summary */}
            {result.summary && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionLabel}>📝 Xulosa</Text>
                <Text style={styles.aiSummaryText}>{result.summary}</Text>
              </View>
            )}

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionLabel}>🏷 Teglar</Text>
                <View style={styles.tagsWrap}>
                  {result.tags.map(t => (
                    <View key={t} style={[styles.tagChip, { borderColor: cfg.accent+"44", backgroundColor: cfg.accent+"11" }]}>
                      <Text style={[styles.tagText, { color: cfg.accent }]}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Audience note */}
            <View style={[styles.aiSection, styles.audienceBox]}>
              <Feather name="users" size={13} color="#a78bfa" />
              <Text style={styles.audienceText}>
                Bu kontent {result.category ?? "umumiy"} toifasiga oid bo'lib, OlCha algoritmida
                faol ko'rsatilmoqda.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.aiLoading}>
            <Feather name="wifi-off" size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.aiLoadingText}>AI ma'lumot ololmadi</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════ */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCat, setActiveCat] = useState("all");
  const [likes, setLikes] = useState<Record<number, number>>({});
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [aiPost, setAiPost] = useState<Post | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: apiPosts, isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => apiGet<Post[]>("/posts"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rawPosts = (apiPosts && apiPosts.length > 0) ? apiPosts : DEMO;
  const posts = activeCat === "all" ? rawPosts : rawPosts.filter(p => p.type === activeCat);

  const getLikes = (p: Post) => likes[p.id] ?? p.likesCount ?? 0;
  const isLiked  = (p: Post) => liked[p.id] ?? false;

  const toggleLike = (p: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cur = isLiked(p);
    setLiked(prev => ({ ...prev, [p.id]: !cur }));
    setLikes(prev => ({ ...prev, [p.id]: getLikes(p) + (cur ? -1 : 1) }));
  };

  const openAI = (p: Post) => {
    setAiPost(p);
    setAiVisible(true);
  };

  const onViewable = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Category strip (floats above feed) ── */}
      <View style={[styles.catBar, { top: insets.top + webTop }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContent}>
          {CATS.map(c => (
            <Pressable key={c.key} onPress={() => { setActiveCat(c.key); setActiveIdx(0); }}
              style={[styles.catChip, activeCat === c.key && styles.catChipOn]}>
              {activeCat === c.key && (
                <LinearGradient colors={["#7c3aed","#a855f7"]} style={StyleSheet.absoluteFillObject}
                  start={{x:0,y:0}} end={{x:1,y:0}} />
              )}
              <Text style={[styles.catText, activeCat === c.key && { color: "#fff" }]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── OlCha logo pill (top-left, transparent) ── */}
      <View style={[styles.logoPill, { top: insets.top + webTop + 48 }]}>
        <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.logoGrad}>
          <Text style={styles.logoText}>O</Text>
        </LinearGradient>
        <Text style={styles.logoLabel}>OlCha</Text>
      </View>

      {/* ── FULL-SCREEN HORIZONTAL FEED ── */}
      {isLoading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator color="#7c3aed" size="large" />
          <Text style={styles.loadText}>OlCha Nebula yuklanmoqda...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={p => `nebula-${p.id}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          refreshing={refreshing}
          onRefresh={undefined}
          renderItem={({ item, index }) => (
            <NebulaCard
              post={item}
              total={posts.length}
              index={index}
              liked={isLiked(item)}
              likes={getLikes(item)}
              onLike={() => toggleLike(item)}
              onAI={() => openAI(item)}
            />
          )}
        />
      )}

      {/* AI Modal */}
      <AIModal post={aiPost} visible={aiVisible} onClose={() => setAiVisible(false)} />
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },

  /* Category bar */
  catBar: {
    position: "absolute", left: 0, right: 0, zIndex: 20,
    height: 40,
  },
  catContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  catChip: {
    paddingHorizontal: 14, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  catChipOn: { borderColor: "#7c3aed55" },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.65)" },

  /* Logo pill */
  logoPill: {
    position: "absolute", left: 14, zIndex: 20,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  logoGrad: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  logoLabel: { color: "#c4b5fd", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  /* Card */
  card: { overflow: "hidden", backgroundColor: "#070b15" },
  cardBg: { ...StyleSheet.absoluteFillObject, resizeMode: "cover" } as any,

  /* Top bar */
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 8, gap: 10,
  },
  typePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  typePillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dots: { flex: 1, flexDirection: "row", justifyContent: "center", gap: 4, alignItems: "center" },
  dot: { borderRadius: 4 },
  dotActive:  { width: 16, height: 4, borderRadius: 2 },
  dotInactive: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },
  aiBadge: { borderRadius: 8, overflow: "hidden" },
  aiGrad: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4 },
  aiText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  /* Center orb (no-media state) */
  centerOrb: {
    position: "absolute", alignSelf: "center",
    top: "30%", alignItems: "center", justifyContent: "center",
  },
  orbRing1: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1 },
  orbRing2: { position: "absolute", width: 170, height: 170, borderRadius: 85,  borderWidth: 1 },
  orbRing3: { position: "absolute", width: 110, height: 110, borderRadius: 55,  borderWidth: 1 },
  orbCore:  { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  orbIcon:  { fontSize: 28 },

  /* Right action bar */
  actionBar: { position: "absolute", right: 14, gap: 18 },
  actionBtn: { alignItems: "center", gap: 4 },
  actionCircle: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  actionCount: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_500Medium" },

  /* Bottom info */
  bottomInfo: {
    position: "absolute", bottom: 0, left: 0, right: 72,
    paddingHorizontal: 16, paddingTop: 50,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  displayName: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  verifiedCheck: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  handle: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular" },
  timeText: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  followBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    borderWidth: 1, backgroundColor: "rgba(0,0,0,0.3)",
  },
  followText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  contentText: {
    color: "rgba(255,255,255,0.88)", fontSize: 14,
    fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10,
  },
  swipeHint: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "center", marginTop: 4,
  },
  swipeText: { color: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "Inter_400Regular" },

  /* Loading */
  loadWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular" },

  /* AI Modal */
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  aiModal: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    minHeight: H * 0.5,
    overflow: "hidden",
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  modalHeaderIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  modalSub: { color: "rgba(255,255,255,0.45)", fontSize: 11 },
  sentimentEmoji: { fontSize: 24, marginRight: 4 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  aiLoading: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 40 },
  aiLoadingText: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "Inter_400Regular" },
  aiMetaRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  aiMetaChip: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
  },
  aiMetaLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  aiMetaVal: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  aiSection: { marginBottom: 16 },
  aiSectionLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  aiSummaryText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  audienceBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "rgba(124,58,237,0.10)", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "rgba(124,58,237,0.25)",
  },
  audienceText: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
