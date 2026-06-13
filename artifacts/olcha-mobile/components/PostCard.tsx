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
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}k`;
}

export function PostCard({ post }: Props) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    setLikes((v) => v + (liked ? -1 : 1));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <UserAvatar
          uri={post.user?.avatarUrl}
          name={post.user?.displayName}
          size={36}
          isVerified={post.user?.isVerified}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {post.user?.displayName ?? "OlCha Foydalanuvchi"}
          </Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{post.user?.username ?? "user"} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
      </View>

      {post.content ? (
        <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={4}>
          {post.content}
        </Text>
      ) : null}

      {post.mediaUrl ? (
        <Image
          source={{ uri: post.mediaUrl }}
          style={[styles.media, { backgroundColor: colors.card }]}
          resizeMode="cover"
          progressiveRenderingEnabled
          fadeDuration={150}
          defaultSource={require("@/assets/images/icon.png")}
        />
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Feather name="heart" size={20} color={liked ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.actionText, { color: liked ? colors.primary : colors.mutedForeground }]}>{likes}</Text>
        </Pressable>
        <Pressable style={styles.action}>
          <Feather name="message-circle" size={20} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.commentsCount ?? 0}</Text>
        </Pressable>
        <Pressable style={styles.action}>
          <Feather name="repeat" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={styles.action}>
          <Feather name="share-2" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  userInfo: { flex: 1 },
  displayName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 10 },
  media: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 10 },
  divider: { height: 0.5, marginBottom: 8 },
  actions: { flexDirection: "row", gap: 24 },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
