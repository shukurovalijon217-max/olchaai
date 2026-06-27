import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Conversation {
  id: number;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

interface Props {
  conversation: Conversation;
}

export function ConversationRow({ conversation: c }: Props) {
  const colors = useColors();
  const router = useRouter();
  const initials = c.participantName.slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={[styles.row, { borderColor: colors.border }]}
      onPress={() => router.push(`/messages/${c.id}` as never)}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "33" }]}>
          {c.participantAvatar ? (
            <Image source={{ uri: c.participantAvatar }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
          )}
        </View>
        {c.isOnline && (
          <View style={[styles.onlineDot, { backgroundColor: colors.green, borderColor: colors.background }]} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {c.participantName}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(c.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
            {c.lastMessage ?? "Say hello!"}
          </Text>
          {(c.unreadCount ?? 0) > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{c.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  initials: { fontSize: 16, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: { flex: 1, gap: 3 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 15, fontWeight: "600", flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preview: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
