import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");

export interface Post {
  id: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  isVerified?: boolean;
  content: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video" | "text";
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  createdAt: string;
  isLiked?: boolean;
  hotTake?: { fire: number; cold: number };
}

interface Props {
  post: Post;
  onLike?: (id: number) => void;
}

const TYPE_THEME = {
  photo: { accent: "#22d3ee", glow: "rgba(34,211,238,0.35)", bg: "#060c14", label: "Photo" },
  video: { accent: "#f87171", glow: "rgba(248,113,113,0.35)", bg: "#0f0808", label: "Video" },
  text:  { accent: "#818cf8", glow: "rgba(129,140,248,0.35)", bg: "#06060f", label: "Post"  },
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

function fmtNum(n: number) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(1)+"K";
  return n.toString();
}

function HotTakeWidget({ post }: { post: Post }) {
  const colors = useColors();
  const [fire, setFire] = useState(post.hotTake?.fire ?? Math.floor(Math.random()*80+20));
  const [cold, setCold] = useState(post.hotTake?.cold ?? Math.floor(Math.random()*40+10));
  const [vote, setVote] = useState<"fire"|"cold"|null>(null);
  const total = fire + cold || 1;
  const fireP = Math.round((fire/total)*100);

  const castVote = (v: "fire"|"cold") => {
    if (vote) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVote(v);
    if (v === "fire") setFire(f => f+1);
    else setCold(c => c+1);
  };

  return (
    <View style={[ht.wrap, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }]}>
      <Text style={[ht.title, { color: colors.mutedForeground }]}>Hot Take</Text>
      <View style={ht.btns}>
        <Pressable
          style={[ht.btn, vote==="fire" && { backgroundColor: "rgba(239,68,68,0.25)", borderColor: "#ef4444" }]}
          onPress={() => castVote("fire")}
        >
          <Text style={ht.emoji}>🔥</Text>
          <Text style={[ht.btnLabel, { color: vote==="fire" ? "#ef4444" : colors.mutedForeground }]}>
            {fmtNum(fire)}
          </Text>
        </Pressable>
        <View style={ht.barWrap}>
          <View style={[ht.barBg, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={["#ef4444", "#22d3ee"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[ht.barFill, { width: `${fireP}%` as unknown as number }]}
            />
          </View>
          <Text style={[ht.pct, { color: colors.mutedForeground }]}>{fireP}% 🔥</Text>
        </View>
        <Pressable
          style={[ht.btn, vote==="cold" && { backgroundColor: "rgba(34,211,238,0.2)", borderColor: "#22d3ee" }]}
          onPress={() => castVote("cold")}
        >
          <Text style={ht.emoji}>🧊</Text>
          <Text style={[ht.btnLabel, { color: vote==="cold" ? "#22d3ee" : colors.mutedForeground }]}>
            {fmtNum(cold)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const ht = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 8 },
  title: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  btns: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 2 },
  emoji: { fontSize: 16 },
  btnLabel: { fontSize: 11, fontWeight: "700" },
  barWrap: { flex: 1, gap: 4 },
  barBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  pct: { fontSize: 10, textAlign: "center" },
});

export function PostCard({ post, onLike }: Props) {
  const colors = useColors();
  const type = post.mediaType ?? "text";
  const theme = TYPE_THEME[type] ?? TYPE_THEME.text;

  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [bookmarked, setBookmarked] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(v => !v);
    setLikeCount(v => liked ? v-1 : v+1);
    onLike?.(post.id);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
  };

  const initials = post.authorName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  // Aurora gradient border colors by post type
  const borderColors: [string, string, string] = type === "photo"
    ? ["#22d3ee", "#7857ff", "#22d3ee"]
    : type === "video"
    ? ["#f87171", "#7857ff", "#ec4899"]
    : ["#818cf8", "#7857ff", "#9d19ff"];

  return (
    <View style={[s.outerWrap, {
      shadowColor: theme.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 10,
    }]}>
      <LinearGradient
        colors={borderColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradBorder}
      >
        <View style={[s.card, { backgroundColor: theme.bg }]}>
          {/* Header */}
          <View style={s.header}>
            <View style={[s.avatarRing, { borderColor: theme.accent + "88" }]}>
              {post.authorAvatar ? (
                <Image source={{ uri: post.authorAvatar }} style={s.avatarImg} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.avatarImg}>
                  <Text style={s.avatarTxt}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={s.metaCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[s.name, { color: colors.text }]}>{post.authorName}</Text>
                {post.isVerified && (
                  <View style={[s.verifiedBadge, { backgroundColor: theme.accent + "22" }]}>
                    <Feather name="check" size={9} color={theme.accent} />
                  </View>
                )}
              </View>
              <Text style={[s.sub, { color: colors.mutedForeground }]}>
                @{post.authorUsername} · {timeAgo(post.createdAt)}
              </Text>
            </View>
            <View style={[s.typeBadge, { backgroundColor: theme.accent + "18", borderColor: theme.accent + "40" }]}>
              <Text style={[s.typeTxt, { color: theme.accent }]}>{theme.label}</Text>
            </View>
            <Pressable hitSlop={12} style={s.moreBtn}>
              <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Content */}
          <Text style={[s.content, { color: colors.text }]}>{post.content}</Text>

          {/* Media */}
          {post.mediaUrl && type === "photo" && (
            <View style={[s.mediaWrap, { shadowColor: theme.accent, shadowRadius: 8, shadowOpacity: 0.5 }]}>
              <Image
                source={{ uri: post.mediaUrl }}
                style={s.media}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(6,12,20,0.6)"]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}

          {/* HotTake (only on text posts) */}
          {type === "text" && <HotTakeWidget post={post} />}

          {/* Actions */}
          <View style={[s.actions, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
            <Pressable style={s.action} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Feather
                  name="heart"
                  size={19}
                  color={liked ? colors.rose : colors.mutedForeground}
                />
              </Animated.View>
              {likeCount > 0 && (
                <Text style={[s.actionTxt, { color: liked ? colors.rose : colors.mutedForeground }]}>
                  {fmtNum(likeCount)}
                </Text>
              )}
            </Pressable>

            <Pressable style={s.action}>
              <Feather name="message-circle" size={19} color={colors.mutedForeground} />
              {post.commentsCount > 0 && (
                <Text style={[s.actionTxt, { color: colors.mutedForeground }]}>
                  {fmtNum(post.commentsCount)}
                </Text>
              )}
            </Pressable>

            <Pressable style={s.action}>
              <Feather name="refresh-cw" size={17} color={colors.mutedForeground} />
            </Pressable>

            <Pressable style={s.action}>
              <Feather name="send" size={17} color={colors.mutedForeground} />
            </Pressable>

            <View style={{ flex: 1 }} />

            {post.viewsCount != null && (
              <View style={s.views}>
                <Feather name="eye" size={13} color={colors.mutedForeground} />
                <Text style={[s.actionTxt, { color: colors.mutedForeground }]}>{fmtNum(post.viewsCount)}</Text>
              </View>
            )}

            <Pressable onPress={() => setBookmarked(v=>!v)}>
              <Feather name="bookmark" size={18} color={bookmarked ? colors.amber : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  outerWrap: { marginHorizontal: 12, marginBottom: 12 },
  gradBorder: { borderRadius: 17, padding: 1 },
  card: { borderRadius: 16, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, paddingBottom: 8, gap: 8 },
  avatarRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 39, height: 39, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  metaCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 1 },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  typeBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  typeTxt: { fontSize: 11, fontWeight: "600" },
  moreBtn: { padding: 4 },
  content: { fontSize: 15, lineHeight: 22, paddingHorizontal: 12, paddingBottom: 10 },
  mediaWrap: { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, overflow: "hidden" },
  media: { width: "100%", height: W * 0.6, borderRadius: 12 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 2,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionTxt: { fontSize: 13, fontWeight: "600" },
  views: { flexDirection: "row", alignItems: "center", gap: 3, marginRight: 8 },
});
