import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

export interface Post {
  id: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video" | "text";
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
}

interface Props {
  post: Post;
  onLike?: (id: number) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function PostCard({ post, onLike }: Props) {
  const colors = useColors();
  const router = useRouter();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likesCount);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    setLikeCount((v) => (liked ? v - 1 : v + 1));
    onLike?.(post.id);
  };

  const initials = post.authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "33" }]}>
          {post.authorAvatar ? (
            <Image source={{ uri: post.authorAvatar }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: colors.text }]}>{post.authorName}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            @{post.authorUsername} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Pressable hitSlop={12}>
          <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

      {post.mediaUrl && post.mediaType === "photo" && (
        <Image
          source={{ uri: post.mediaUrl }}
          style={[styles.media, { backgroundColor: colors.surface }]}
          contentFit="cover"
        />
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Feather
            name="heart"
            size={18}
            color={liked ? colors.pink : colors.mutedForeground}
            style={liked ? styles.likedIcon : undefined}
          />
          <Text style={[styles.actionText, { color: liked ? colors.pink : colors.mutedForeground }]}>
            {likeCount > 0 ? likeCount : ""}
          </Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/post/${post.id}` as never)}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentsCount > 0 ? post.commentsCount : ""}
          </Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="repeat-2" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Pressable style={styles.action}>
          <Feather name="share" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    borderBottomWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  meta: { flex: 1 },
  name: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sub: {
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    fontFamily: "Inter_400Regular",
  },
  media: {
    width: "100%",
    height: SCREEN_W * 0.65,
    borderRadius: 12,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
});
