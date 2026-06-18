import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/lib/api";

interface Props {
  post: Post;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}k`;
}

const AVATAR_GRADS: [string, string][] = [
  ["#7c3aed", "#a855f7"],
  ["#ec4899", "#f43f5e"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
];

export function PostCard({ post }: Props) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    setLikes((v) => v + (liked ? -1 : 1));
  };

  const gradIdx = (post.userId ?? 0) % AVATAR_GRADS.length;
  const avatarGrad = AVATAR_GRADS[gradIdx];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        {post.user?.avatarUrl ? (
          <Image source={{ uri: post.user.avatarUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={avatarGrad}
            style={styles.avatar}
          >
            <Text style={styles.avatarInitial}>
              {(post.user?.displayName ?? "U")[0].toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {post.user?.displayName ?? "OlCha Foydalanuvchi"}
            </Text>
            {post.user?.isVerified && (
              <Feather name="check-circle" size={13} color="#7c3aed" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{post.user?.username ?? "user"} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Pressable style={[styles.moreBtn, { backgroundColor: colors.muted }]}>
          <Feather name="more-horizontal" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={4}>
          {post.content}
        </Text>
      ) : null}

      {/* Media */}
      {post.mediaUrl ? (
        <LinearGradient
          colors={[avatarGrad[0] + "33", avatarGrad[1] + "1a"]}
          style={styles.mediaWrap}
        >
          <Image
            source={{ uri: post.mediaUrl }}
            style={styles.media}
            resizeMode="cover"
          />
        </LinearGradient>
      ) : null}

      {/* Actions */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.actions}>
        <Pressable
          style={[styles.action, liked && styles.actionActive]}
          onPress={handleLike}
        >
          <Feather
            name="heart"
            size={16}
            color={liked ? "#ec4899" : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: liked ? "#ec4899" : colors.mutedForeground }]}>
            {likes}
          </Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="message-circle" size={16} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentsCount ?? 0}
          </Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="repeat" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="share-2" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Pressable style={[styles.action, styles.aiBtn]}>
          <Feather name="zap" size={14} color="#a78bfa" />
          <Text style={styles.aiText}>AI</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  displayName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 10 },
  mediaWrap: { borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  media: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12 },
  divider: { height: 1, marginBottom: 10, opacity: 0.5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionActive: { backgroundColor: "rgba(236,72,153,0.1)" },
  actionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aiBtn: {
    marginLeft: "auto",
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  aiText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
});
