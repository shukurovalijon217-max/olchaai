/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  OlCha Nebula — Lenta paneli                        ║
 * ║  Dunyoda birinchi gorizontal full-screen feed        ║
 * ║  Posts + Reels + Photos + Videos + Reklamalar       ║
 * ╚══════════════════════════════════════════════════════╝
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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

/* ── Screen dimensions ────────────────────────────────── */
const { width: W, height: H } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = `https://${DOMAIN}/api`;

/* ── Full media URL helper ────────────────────────────── */
function mUrl(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${DOMAIN}${raw}`;
}

/* ── Per-type visual config ───────────────────────────── */
type ContentKind = "video" | "photo" | "reel" | "ad" | "text";

const KIND: Record<ContentKind, {
  label: string; icon: string; accent: string;
  grad: [string, string, string];
}> = {
  video:  { label: "Klip",     icon: "play-circle", accent: "#ef4444", grad: ["#1a0808","#520d0d","#ef4444"] },
  reel:   { label: "Reel",     icon: "film",        accent: "#a855f7", grad: ["#150820","#3d1060","#a855f7"] },
  photo:  { label: "Rasm",     icon: "image",       accent: "#3b82f6", grad: ["#080f20","#102060","#3b82f6"] },
  ad:     { label: "Reklama",  icon: "zap",         accent: "#f59e0b", grad: ["#1a1000","#4a2e00","#f59e0b"] },
  text:   { label: "Post",     icon: "align-left",  accent: "#10b981", grad: ["#041410","#0a3828","#10b981"] },
};

/* ── Unified feed item ────────────────────────────────── */
interface Author {
  id: number; username: string; displayName: string;
  avatarUrl?: string | null; isVerified?: boolean;
}

interface FeedItem {
  id: string;
  kind: "post" | "reel";
  contentKind: ContentKind;
  caption: string;
  mediaUrl: string | null;   // photo/video URL
  videoUrl: string | null;   // reel video URL
  thumbUrl: string | null;
  duration?: number | null;
  author: Author;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isLiked: boolean;
  createdAt: string;
  rawId: number;
}

/* ── API raw types ────────────────────────────────────── */
interface RawPost {
  id: number; content: string; type: string;
  mediaUrl?: string | null; likesCount: number;
  commentsCount: number; isLiked?: boolean;
  createdAt: string;
  author?: Author;
}

interface RawReel {
  id: number; caption?: string | null;
  videoUrl?: string | null; thumbnailUrl?: string | null;
  duration?: number | null; likesCount: number;
  commentsCount: number; viewsCount?: number;
  isLiked?: boolean; createdAt: string;
  author?: Author;
}

function normPost(p: RawPost): FeedItem {
  const t = p.type === "video" ? "video" : p.type === "photo" ? "photo" : "text";
  return {
    id: `post-${p.id}`, kind: "post", contentKind: t as ContentKind,
    caption: p.content ?? "",
    mediaUrl: mUrl(p.mediaUrl), videoUrl: null, thumbUrl: null,
    author: p.author ?? { id: 0, username: "user", displayName: "OlCha User" },
    likesCount: p.likesCount ?? 0, commentsCount: p.commentsCount ?? 0,
    isLiked: p.isLiked ?? false, createdAt: p.createdAt,
    rawId: p.id,
  };
}

function normReel(r: RawReel): FeedItem {
  return {
    id: `reel-${r.id}`, kind: "reel", contentKind: "reel",
    caption: r.caption ?? "",
    mediaUrl: null,
    videoUrl: mUrl(r.videoUrl), thumbUrl: mUrl(r.thumbnailUrl),
    duration: r.duration,
    author: r.author ?? { id: 0, username: "user", displayName: "OlCha User" },
    likesCount: r.likesCount ?? 0, commentsCount: r.commentsCount ?? 0,
    viewsCount: r.viewsCount, isLiked: r.isLiked ?? false,
    createdAt: r.createdAt,
    rawId: r.id,
  };
}

/* ── Helpers ──────────────────────────────────────────── */
function ago(s: string): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m} d.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} s.`;
  return `${Math.floor(h / 24)} kun`;
}
function num(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}
function secs(s?: number | null): string {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ── Demo fallback posts ──────────────────────────────── */
const DEMO_AUTHOR: Author = { id: 0, username: "olcha_demo", displayName: "OlCha Demo", avatarUrl: null, isVerified: true };
const DEMO: FeedItem[] = [
  { id:"d1", kind:"post", contentKind:"photo",  caption:"O'zbekistondagi eng go'zal tog' manzarasi — Chimyon cho'qqisi 🏔️", mediaUrl:null, videoUrl:null, thumbUrl:null, author:{...DEMO_AUTHOR, displayName:"Dilnoza Yusupova", username:"dilnoza_uz"}, likesCount:14200, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-600000).toISOString(), rawId:1 },
  { id:"d2", kind:"reel",  contentKind:"reel",   caption:"Toshkent kechalari — bir daqiqada", mediaUrl:null, videoUrl:null, thumbUrl:null, duration:60, author:{...DEMO_AUTHOR, displayName:"Sardor Baxtiyorov", username:"sardor_b"}, likesCount:8900, commentsCount:156, isLiked:false, createdAt:new Date(Date.now()-1800000).toISOString(), rawId:2 },
  { id:"d3", kind:"post",  contentKind:"video",  caption:"React Native bilan professional ilova yaratish — live session 💻", mediaUrl:null, videoUrl:null, thumbUrl:null, author:{...DEMO_AUTHOR, displayName:"Kamol Eshmatov", username:"dev_kamol", isVerified:true}, likesCount:7800, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-3600000).toISOString(), rawId:3 },
  { id:"d4", kind:"post",  contentKind:"ad",     caption:"OlCha Premium — cheksiz AI kuchi, reklama yo'q, maxsus imkoniyatlar! ⚡ Bugun qo'shiling.", mediaUrl:null, videoUrl:null, thumbUrl:null, author:{...DEMO_AUTHOR, displayName:"OlCha Official", username:"olcha_official", isVerified:true}, likesCount:3100, commentsCount:45, isLiked:false, createdAt:new Date(Date.now()-9000000).toISOString(), rawId:5 },
  { id:"d5", kind:"post",  contentKind:"photo",  caption:"Samarqand — Registon maydoni, dunyoning eng go'zal arxitekturasi 🏛️", mediaUrl:null, videoUrl:null, thumbUrl:null, author:{...DEMO_AUTHOR, displayName:"Aziz Raximov", username:"aziz_photo"}, likesCount:31200, commentsCount:567, isLiked:false, createdAt:new Date(Date.now()-14400000).toISOString(), rawId:6 },
  { id:"d6", kind:"reel",  contentKind:"reel",   caption:"Xorazm oshi maxsus retsepti — oshpaz sirlarini oshkor qilaman 🍲", mediaUrl:null, videoUrl:null, thumbUrl:null, duration:45, author:{...DEMO_AUTHOR, displayName:"Muazzam Xoliqova", username:"oshpaz_pro"}, likesCount:19400, commentsCount:345, isLiked:false, createdAt:new Date(Date.now()-21600000).toISOString(), rawId:8 },
];

/* ── Category filters ─────────────────────────────────── */
const CATS = [
  { key: "all",   label: "✦ Hammasi" },
  { key: "photo", label: "📸 Rasm"   },
  { key: "video", label: "🎬 Klip"   },
  { key: "reel",  label: "✨ Reel"   },
  { key: "ad",    label: "⚡ Reklama" },
];

/* ══════════════════════════════════════════════════════
   AI ANALYSIS MODAL
══════════════════════════════════════════════════════ */
interface AIResult {
  tags?: string[];
  category?: string;
  summary?: string;
  sentiment?: string;
  analyzedAt?: string;
  aiMetadata?: string;
}

function AIModal({
  item, visible, onClose,
}: { item: FeedItem | null; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    if (!visible || !item) return;
    setResult(null); setError(false); setLoading(true);
    const body = {
      contentId: item.rawId,
      contentType: item.kind,
      caption: item.caption ?? "",
    };
    fetch(`${API_BASE}/ai/analyze-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(r => r.ok ? r.json() as Promise<AIResult> : Promise.reject())
      .then(d => setResult(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [visible, item?.id]);

  if (!item) return null;
  const k = KIND[item.contentKind] ?? KIND.text;

  const sentLabel = result?.sentiment === "positive" ? "Ijobiy 😊"
    : result?.sentiment === "negative" ? "Salbiy 😞" : "Neytral 😐";
  const sentColor = result?.sentiment === "positive" ? "#10b981"
    : result?.sentiment === "negative" ? "#ef4444" : "#f59e0b";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Dim overlay */}
      <Pressable style={styles.dimOverlay} onPress={onClose} />

      <View style={[styles.aiSheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
        <LinearGradient colors={["#0c0c22", "#10102e"]} style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { borderTopWidth: 1, borderTopColor: k.accent + "44", borderTopLeftRadius: 24, borderTopRightRadius: 24 }]} />

        {/* Handle bar */}
        <View style={[styles.sheetHandle, { backgroundColor: k.accent + "88" }]} />

        {/* Header */}
        <View style={styles.aiHeader}>
          <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.aiHeaderIcon}>
            <Feather name="zap" size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>OlCha AI Tahlil</Text>
            <Text style={styles.aiSubtitle} numberOfLines={1}>
              {item.author.displayName} · {k.label}
            </Text>
          </View>
          <Pressable style={styles.aiCloseBtn} onPress={onClose}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.45)" />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.aiCenter}>
            <ActivityIndicator color="#a78bfa" size="large" />
            <Text style={styles.aiHint}>OlCha AI tahlil qilmoqda...</Text>
          </View>
        ) : error ? (
          <View style={styles.aiCenter}>
            <Feather name="wifi-off" size={36} color="rgba(255,255,255,0.2)" />
            <Text style={styles.aiHint}>Tahlil ololmadi. Internet tekshiring.</Text>
          </View>
        ) : result ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Stats row */}
            <View style={styles.aiStatRow}>
              {/* Sentiment */}
              <View style={[styles.aiStatCard, { borderColor: sentColor + "55", backgroundColor: sentColor + "12" }]}>
                <Text style={styles.aiStatLabel}>Kayfiyat</Text>
                <Text style={[styles.aiStatValue, { color: sentColor }]}>{sentLabel}</Text>
              </View>
              {/* Category */}
              {result.category && (
                <View style={[styles.aiStatCard, { borderColor: k.accent + "55", backgroundColor: k.accent + "12" }]}>
                  <Text style={styles.aiStatLabel}>Toifa</Text>
                  <Text style={[styles.aiStatValue, { color: k.accent }]}>{result.category}</Text>
                </View>
              )}
            </View>

            {/* Summary */}
            {result.summary && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHeader}>
                  <Feather name="file-text" size={13} color="#a78bfa" />
                  <Text style={styles.aiBlockTitle}>AI Xulosa</Text>
                </View>
                <Text style={styles.aiBodyText}>{result.summary}</Text>
              </View>
            )}

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHeader}>
                  <Feather name="tag" size={13} color="#a78bfa" />
                  <Text style={styles.aiBlockTitle}>Teglar</Text>
                </View>
                <View style={styles.tagWrap}>
                  {result.tags.map(t => (
                    <View key={t} style={[styles.tagPill, { borderColor: k.accent + "55", backgroundColor: k.accent + "11" }]}>
                      <Text style={[styles.tagPillText, { color: k.accent }]}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* OlCha recommendation */}
            <View style={[styles.aiBlock, styles.aiRecoBox]}>
              <View style={styles.aiBlockHeader}>
                <Feather name="trending-up" size={13} color="#7c3aed" />
                <Text style={styles.aiBlockTitle}>OlCha tavsiyasi</Text>
              </View>
              <Text style={styles.aiBodyText}>
                Bu kontent{result.category ? ` "${result.category}"` : ""} toifasida{" "}
                {result.sentiment === "positive"
                  ? "ijobiy kayfiyatga ega va auditoriya bilan yaxshi rezonans hosil qiladi."
                  : result.sentiment === "negative"
                  ? "salbiy ton aniqlandi — kontent moderatsiyadan o'tkazilishi tavsiya etiladi."
                  : "neytral tonli bo'lib, keng auditoriyaga mos keladi."}
              </Text>
            </View>

            {/* Analyzed time */}
            {result.analyzedAt && (
              <Text style={styles.aiTimestamp}>
                Tahlil vaqti: {new Date(result.analyzedAt).toLocaleString("uz-UZ")}
              </Text>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   SINGLE FULL-SCREEN NEBULA CARD
══════════════════════════════════════════════════════ */
interface CardProps {
  item: FeedItem;
  isActive: boolean;
  total: number;
  index: number;
  liked: boolean;
  likes: number;
  onLike: () => void;
  onAI: () => void;
}

function NebulaCard({ item, isActive, total, index, liked, likes, onLike, onAI }: CardProps) {
  const insets = useSafeAreaInsets();
  const k = KIND[item.contentKind] ?? KIND.text;
  const hasVideo = (item.contentKind === "video" || item.contentKind === "reel")
    && (item.mediaUrl || item.videoUrl);
  const videoSrc = item.videoUrl ?? item.mediaUrl;
  const photoSrc = (item.contentKind === "photo" || item.contentKind === "text") ? item.mediaUrl : null;
  const avatarUri = mUrl(item.author.avatarUrl);

  const webAdj = Platform.OS === "web";
  const cardH = webAdj ? H - 134 : H;
  const topPad = insets.top + (webAdj ? 67 : 10);
  const botPad = insets.bottom + (webAdj ? 34 : 16);

  return (
    <View style={[styles.card, { width: W, height: cardH }]}>

      {/* ── FULL-SCREEN BACKGROUND ── */}
      {hasVideo && videoSrc ? (
        <Video
          source={{ uri: videoSrc }}
          style={styles.mediaBg}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : photoSrc ? (
        <Image source={{ uri: photoSrc }} style={styles.mediaBg} />
      ) : (
        <LinearGradient
          colors={k.grad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Depth overlay: dark top + dark bottom */}
      <LinearGradient
        colors={["rgba(0,0,0,0.60)", "transparent", "transparent", "rgba(0,0,0,0.80)"]}
        locations={[0, 0.28, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* No-media decorative orb */}
      {!hasVideo && !photoSrc && (
        <View style={styles.orbWrap}>
          <View style={[styles.orbRing3, { borderColor: k.accent + "18" }]} />
          <View style={[styles.orbRing2, { borderColor: k.accent + "35" }]} />
          <View style={[styles.orbRing1, { borderColor: k.accent + "55" }]} />
          <View style={[styles.orbCore, { backgroundColor: k.accent + "20" }]}>
            <Text style={[styles.orbSymbol, { color: k.accent }]}>
              {item.contentKind === "video" ? "▶" :
               item.contentKind === "reel" ? "✦" :
               item.contentKind === "photo" ? "◈" :
               item.contentKind === "ad" ? "⚡" : "✎"}
            </Text>
          </View>
        </View>
      )}

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        {/* Type badge */}
        <View style={[styles.kindBadge, { backgroundColor: k.accent + "30", borderColor: k.accent + "60" }]}>
          <Feather name={k.icon as any} size={11} color={k.accent} />
          <Text style={[styles.kindText, { color: k.accent }]}>{k.label}</Text>
        </View>

        {/* Dot progress */}
        <View style={styles.dotBar}>
          {Array.from({ length: Math.min(total, 9) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index % 9
                  ? [styles.dotOn, { backgroundColor: k.accent }]
                  : styles.dotOff,
              ]}
            />
          ))}
        </View>

        {/* AI button */}
        <Pressable style={styles.aiTopBtn} onPress={onAI}>
          <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.aiTopGrad}>
            <Feather name="zap" size={11} color="#fff" />
            <Text style={styles.aiTopText}>AI</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Duration badge (video/reel) */}
      {item.duration && (
        <View style={[styles.durationBadge, { top: topPad + 40 }]}>
          <Feather name="clock" size={10} color="rgba(255,255,255,0.7)" />
          <Text style={styles.durationText}>{secs(item.duration)}</Text>
        </View>
      )}

      {/* Views badge (reels) */}
      {item.viewsCount != null && item.viewsCount > 0 && (
        <View style={[styles.viewsBadge, { top: topPad + 40 }]}>
          <Feather name="eye" size={10} color="rgba(255,255,255,0.7)" />
          <Text style={styles.viewsText}>{num(item.viewsCount)}</Text>
        </View>
      )}

      {/* ── RIGHT ACTION BAR ── */}
      <View style={[styles.actionBar, { bottom: botPad + 100 }]}>
        {/* Like */}
        <Pressable style={styles.actionItem} onPress={onLike}>
          <LinearGradient
            colors={liked ? ["#ec4899", "#f43f5e"] : ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]}
            style={styles.actionCircle}
          >
            <Feather name="heart" size={23} color={liked ? "#fff" : "rgba(255,255,255,0.9)"} />
          </LinearGradient>
          <Text style={[styles.actionLabel, liked && { color: "#f9a8d4" }]}>{num(likes)}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={styles.actionItem}>
          <View style={styles.actionCircle}>
            <Feather name="message-circle" size={23} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.actionLabel}>{num(item.commentsCount ?? 0)}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={styles.actionItem}>
          <View style={styles.actionCircle}>
            <Feather name="share-2" size={23} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.actionLabel}>Ulash</Text>
        </Pressable>

        {/* Save */}
        <Pressable style={styles.actionItem}>
          <View style={styles.actionCircle}>
            <Feather name="bookmark" size={23} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.actionLabel}>Saqlash</Text>
        </Pressable>

        {/* AI */}
        <Pressable style={styles.actionItem} onPress={onAI}>
          <LinearGradient colors={["#5b21b6", "#7c3aed"]} style={styles.actionCircle}>
            <Feather name="zap" size={23} color="#fff" />
          </LinearGradient>
          <Text style={[styles.actionLabel, { color: "#c4b5fd" }]}>AI Tahlil</Text>
        </Pressable>
      </View>

      {/* ── BOTTOM INFO PANEL ── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.90)"]}
        style={[styles.bottomPanel, { paddingBottom: botPad }]}
      >
        {/* Author row */}
        <View style={styles.authorRow}>
          {/* Avatar */}
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <LinearGradient colors={[k.grad[1], k.grad[2]]} style={styles.avatarGrad}>
              <Text style={styles.avatarLetter}>
                {(item.author.displayName ?? "O")[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}

          {/* Name + handle */}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.author.displayName}
              </Text>
              {item.author.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: k.accent }]}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.handleRow}>
              @{item.author.username}
              <Text style={styles.dot2}> · </Text>
              {ago(item.createdAt)}
            </Text>
          </View>

          {/* Follow */}
          <Pressable style={[styles.followBtn, { borderColor: k.accent + "88" }]}>
            <Text style={[styles.followText, { color: k.accent }]}>+ Kuzatish</Text>
          </Pressable>
        </View>

        {/* Caption */}
        {!!item.caption && (
          <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
        )}

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Feather name="chevron-left"  size={13} color="rgba(255,255,255,0.25)" />
          <Text style={styles.swipeText}>chapga suring — keyingi</Text>
          <Feather name="chevron-right" size={13} color="rgba(255,255,255,0.25)" />
        </View>
      </LinearGradient>
    </View>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════ */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const flatRef = useRef<FlatList>(null);

  const [activeIdx, setActiveIdx]   = useState(0);
  const [activeCat, setActiveCat]   = useState("all");
  const [likedMap, setLikedMap]     = useState<Record<string, boolean>>({});
  const [likesMap, setLikesMap]     = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [aiItem, setAiItem]         = useState<FeedItem | null>(null);
  const [aiOpen, setAiOpen]         = useState(false);

  /* Fetch posts */
  const { data: rawPosts, isLoading: loadPosts, refetch: refetchPosts } = useQuery<RawPost[]>({
    queryKey: ["posts"],
    queryFn: () => fetch(`${API_BASE}/posts`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []),
  });

  /* Fetch reels */
  const { data: rawReels, isLoading: loadReels, refetch: refetchReels } = useQuery<RawReel[]>({
    queryKey: ["reels"],
    queryFn: () => fetch(`${API_BASE}/reels`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []),
  });

  const loading = loadPosts || loadReels;

  /* Merge + sort by date */
  const allItems: FeedItem[] = React.useMemo(() => {
    const posts  = (rawPosts  ?? []).map(normPost);
    const reels  = (rawReels  ?? []).map(normReel);
    const merged = [...posts, ...reels].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return merged.length > 0 ? merged : DEMO;
  }, [rawPosts, rawReels]);

  /* Filter by category */
  const feed = activeCat === "all"
    ? allItems
    : allItems.filter(i => i.contentKind === activeCat);

  /* Pull-to-refresh */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), refetchReels()]);
    setRefreshing(false);
  }, [refetchPosts, refetchReels]);

  /* Like toggle */
  const toggleLike = (item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const was = likedMap[item.id] ?? item.isLiked;
    const cur = likesMap[item.id] ?? item.likesCount;
    setLikedMap(p => ({ ...p, [item.id]: !was }));
    setLikesMap(p => ({ ...p, [item.id]: cur + (was ? -1 : 1) }));
  };

  /* AI open */
  const openAI = (item: FeedItem) => {
    setAiItem(item);
    setAiOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /* Viewable change */
  const onViewable = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.root}>
      {/* ── Floating category strip ── */}
      <View style={[styles.catBar, { top: insets.top + webTop + 4 }]}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATS.map(c => (
            <Pressable
              key={c.key}
              onPress={() => { setActiveCat(c.key); setActiveIdx(0); }}
              style={[styles.catChip, activeCat === c.key && styles.catChipActive]}
            >
              {activeCat === c.key && (
                <LinearGradient
                  colors={["#7c3aed", "#a855f7"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text style={[styles.catLabel, activeCat === c.key && { color: "#fff" }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── OlCha logo (top-left) ── */}
      <View style={[styles.logoBar, { top: insets.top + webTop + 48 }]}>
        <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.logoMark}>
          <Text style={styles.logoLetter}>O</Text>
        </LinearGradient>
        <Text style={styles.logoName}>OlCha</Text>
      </View>

      {/* ── Main feed ── */}
      {loading ? (
        <View style={styles.loadState}>
          <ActivityIndicator color="#7c3aed" size="large" />
          <Text style={styles.loadText}>OlCha Nebula yuklanmoqda...</Text>
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.loadState}>
          <Feather name="inbox" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={styles.loadText}>Bu toifada kontent yo'q</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={feed}
          keyExtractor={i => i.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewConfig.current}
          renderItem={({ item, index }) => (
            <NebulaCard
              item={item}
              isActive={index === activeIdx}
              total={feed.length}
              index={index}
              liked={likedMap[item.id] ?? item.isLiked}
              likes={likesMap[item.id] ?? item.likesCount}
              onLike={() => toggleLike(item)}
              onAI={() => openAI(item)}
            />
          )}
        />
      )}

      {/* AI Analysis modal */}
      <AIModal item={aiItem} visible={aiOpen} onClose={() => setAiOpen(false)} />
    </View>
  );
}

/* ══════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },

  /* Category bar */
  catBar: {
    position: "absolute", left: 0, right: 0, zIndex: 30,
    height: 40,
  },
  catScroll: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  catChip: {
    paddingHorizontal: 14, height: 32, borderRadius: 16,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.50)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
  },
  catChipActive: { borderColor: "#7c3aed66" },
  catLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.60)" },

  /* Logo */
  logoBar: {
    position: "absolute", left: 12, zIndex: 30,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.40)",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  logoMark: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  logoName: { color: "#c4b5fd", fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  /* Card */
  card: { overflow: "hidden", backgroundColor: "#070b15" },
  mediaBg: { ...StyleSheet.absoluteFillObject, resizeMode: "cover" } as any,

  /* Top bar */
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 10, gap: 10,
  },
  kindBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  kindText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dotBar: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { borderRadius: 4 },
  dotOn:  { width: 18, height: 4, borderRadius: 2 },
  dotOff: { width: 4,  height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)" },
  aiTopBtn: { borderRadius: 8, overflow: "hidden" },
  aiTopGrad: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  aiTopText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  /* Duration / views */
  durationBadge: {
    position: "absolute", left: 14, zIndex: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  durationText: { color: "rgba(255,255,255,0.80)", fontSize: 11, fontFamily: "Inter_500Medium" },
  viewsBadge: {
    position: "absolute", right: 14, zIndex: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  viewsText: { color: "rgba(255,255,255,0.80)", fontSize: 11, fontFamily: "Inter_500Medium" },

  /* Orb (no-media) */
  orbWrap: { position: "absolute", alignSelf: "center", top: "28%", alignItems: "center", justifyContent: "center" },
  orbRing3: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 1 },
  orbRing2: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 1 },
  orbRing1: { position: "absolute", width: 110, height: 110, borderRadius: 55, borderWidth: 1 },
  orbCore:  { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  orbSymbol: { fontSize: 30 },

  /* Action bar */
  actionBar: { position: "absolute", right: 14, gap: 20, alignItems: "center" },
  actionItem: { alignItems: "center", gap: 4 },
  actionCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  actionLabel: {
    color: "rgba(255,255,255,0.70)", fontSize: 11,
    fontFamily: "Inter_500Medium", textAlign: "center",
  },

  /* Bottom panel */
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 68,
    paddingHorizontal: 16, paddingTop: 56,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatarImg: { width: 46, height: 46, borderRadius: 14 },
  avatarGrad: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  displayName: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", flexShrink: 1 },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  verifiedCheck: { color: "#fff", fontSize: 9 },
  handleRow: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular" },
  dot2: { color: "rgba(255,255,255,0.25)" },
  followBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, backgroundColor: "rgba(0,0,0,0.30)",
  },
  followText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  caption: {
    color: "rgba(255,255,255,0.85)", fontSize: 14,
    fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 10,
  },
  swipeHint: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "center", marginTop: 2,
  },
  swipeText: { color: "rgba(255,255,255,0.22)", fontSize: 11, fontFamily: "Inter_400Regular" },

  /* Loading */
  loadState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadText: { color: "rgba(255,255,255,0.35)", fontSize: 13, fontFamily: "Inter_400Regular" },

  /* AI Sheet */
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  aiSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    minHeight: H * 0.52, overflow: "hidden",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 18,
  },
  aiHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginBottom: 18,
  },
  aiHeaderIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  aiTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  aiSubtitle: { color: "rgba(255,255,255,0.42)", fontSize: 11, marginTop: 1 },
  aiCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  aiCenter: { alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 40 },
  aiHint: { color: "rgba(255,255,255,0.38)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  aiStatRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  aiStatCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  aiStatLabel: { color: "rgba(255,255,255,0.38)", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 5 },
  aiStatValue: { fontSize: 15, fontFamily: "Inter_700Bold" },

  aiBlock: { marginBottom: 14 },
  aiBlockHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7 },
  aiBlockTitle: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  aiBodyText: {
    color: "rgba(255,255,255,0.78)", fontSize: 13,
    fontFamily: "Inter_400Regular", lineHeight: 20,
  },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tagPillText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiRecoBox: {
    flexDirection: "column",
    backgroundColor: "rgba(124,58,237,0.10)",
    borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(124,58,237,0.28)",
    padding: 14,
  },
  aiTimestamp: {
    color: "rgba(255,255,255,0.22)", fontSize: 10,
    fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4,
  },
});
