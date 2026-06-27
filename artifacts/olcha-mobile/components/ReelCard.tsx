import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");

export interface Reel {
  id: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  duration?: number;
}

interface Props {
  reel: Reel;
  isActive: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function ReelCard({ reel, isActive }: Props) {
  const colors = useColors();
  const [liked, setLiked] = useState(reel.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(reel.likesCount);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked((v) => !v);
    setLikeCount((v) => (liked ? v - 1 : v + 1));
  };

  const initials = reel.authorName.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { width: W, height: H }]}>
      {reel.thumbnailUrl ? (
        <Image
          source={{ uri: reel.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={["#0a0018", "#12002a", "#000008"]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={["transparent", "transparent", "rgba(0,0,8,0.92)"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.sidebar}>
        <Pressable style={styles.sideBtn} onPress={handleLike}>
          <Feather name="heart" size={26} color={liked ? colors.pink : "#fff"} />
          <Text style={styles.sideLabel}>{fmtNum(likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.sideBtn}>
          <Feather name="message-circle" size={26} color="#fff" />
          <Text style={styles.sideLabel}>{fmtNum(reel.commentsCount)}</Text>
        </Pressable>
        <Pressable style={styles.sideBtn}>
          <Feather name="share-2" size={24} color="#fff" />
          <Text style={styles.sideLabel}>Share</Text>
        </Pressable>
        <Pressable style={styles.sideBtn}>
          <Feather name="bookmark" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.bottomInfo}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "44" }]}>
            {reel.authorAvatar ? (
              <Image source={{ uri: reel.authorAvatar }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.authorName}>@{reel.authorUsername}</Text>
          <Pressable style={[styles.followBtn, { borderColor: "#fff" }]}>
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
        </View>
        {reel.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{reel.caption}</Text>
        ) : null}
        <View style={styles.musicRow}>
          <Feather name="music" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.musicText}>Original Audio · OlCha</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#000",
  },
  sidebar: {
    position: "absolute",
    right: 12,
    bottom: 120,
    gap: 20,
    alignItems: "center",
  },
  sideBtn: {
    alignItems: "center",
    gap: 3,
  },
  sideLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomInfo: {
    position: "absolute",
    left: 14,
    right: 70,
    bottom: 40,
    gap: 6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  authorName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  followBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  caption: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  musicText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
});
