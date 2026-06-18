import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";
import type { Post } from "@/lib/api";

interface Props {
  post: Post;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m} daqiqa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  return `${Math.floor(h / 24)} kun`;
}

export function PostCard({ post }: Props) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const [bookmarked, setBookmarked] = useState(false);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    setLikes((v) => v + (liked ? -1 : 1));
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked((v) => !v);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <UserAvatar
              uri={post.user?.avatarUrl}
              name={post.user?.displayName}
              size={36}
              isVerified={post.user?.isVerified}
            />
          </View>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {post.user?.displayName ?? "OlCha Foydalanuvchi"}
            </Text>
            {post.user?.isVerified && (
              <Feather name="check-circle" size={13} color={colors.gold} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{post.user?.username ?? "user"} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Pressable style={[styles.moreBtn, { backgroundColor: colors.background }]}>
          <Feather name="more-horizontal" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={5}>
          {post.content}
        </Text>
      ) : null}

      {/* Media */}
      {post.mediaUrl ? (
        <View style={[styles.mediaWrap, { borderColor: colors.border }]}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={styles.media}
            resizeMode="cover"
            progressiveRenderingEnabled
            fadeDuration={150}
          />
        </View>
      ) : null}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Feather
            name={liked ? "heart" : "heart"}
            size={18}
            color={liked ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: liked ? colors.primary : colors.mutedForeground }]}>
            {likes > 0 ? likes : ""}
          </Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentsCount && post.commentsCount > 0 ? post.commentsCount : ""}
          </Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="repeat" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="share-2" size={18} color={colors.mutedForeground} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable style={styles.action} onPress={handleBookmark}>
          <Feather
            name="bookmark"
            size={18}
            color={bookmarked ? colors.gold : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  avatarWrap: {},
  avatarRing: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 1.5,
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
  userInfo: { flex: 1 },
  displayName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  mediaWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  media: { width: "100%", aspectRatio: 4 / 3 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 20,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
