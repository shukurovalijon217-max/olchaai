import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Conversation {
  id: number;
  participantName: string;
  participantUsername?: string;
  participantAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isPremium?: boolean;
}

function timeAgo(d?: string) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

interface Props {
  conversation: Conversation;
}

export function ConversationRow({ conversation: c }: Props) {
  const colors = useColors();
  const router = useRouter();
  const initials = c.participantName.slice(0,2).toUpperCase();
  const hasUnread = (c.unreadCount ?? 0) > 0;

  return (
    <Pressable
      style={[cr.row, { borderBottomColor: colors.borderSubtle ?? colors.border }]}
      onPress={() => router.push(`/messages/${c.id}` as never)}
    >
      <View style={cr.avatarWrap}>
        <LinearGradient
          colors={c.isPremium ? ["#f59e0b", "#ef4444"] : ["#7857ff", "#9d19ff"]}
          style={cr.ring}
        >
          <View style={[cr.avatarInner, { backgroundColor: colors.background }]}>
            {c.participantAvatar ? (
              <Image source={{ uri: c.participantAvatar }} style={cr.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#1d2d40", "#243550"]} style={cr.avatar}>
                <Text style={[cr.initials, { color: colors.primary }]}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
        {c.isOnline && (
          <View style={[cr.online, { backgroundColor: colors.green, borderColor: colors.background }]} />
        )}
      </View>

      <View style={cr.body}>
        <View style={cr.topRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[cr.name, { color: hasUnread ? colors.text : colors.textSecondary ?? colors.mutedForeground }]}>
              {c.participantName}
            </Text>
            {c.isPremium && (
              <Text style={{ fontSize: 10 }}>👑</Text>
            )}
          </View>
          <Text style={[cr.time, { color: colors.mutedForeground }]}>{timeAgo(c.lastMessageAt)}</Text>
        </View>
        <View style={cr.botRow}>
          <Text
            style={[cr.preview, { color: hasUnread ? colors.textSecondary ?? colors.text : colors.mutedForeground, fontWeight: hasUnread ? "500" : "400" }]}
            numberOfLines={1}
          >
            {c.lastMessage ?? "Start a conversation..."}
          </Text>
          {hasUnread && (
            <LinearGradient colors={["#7857ff", "#9d19ff"]} style={cr.badge}>
              <Text style={cr.badgeTxt}>{c.unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const cr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { position: "relative" },
  ring: { width: 54, height: 54, borderRadius: 27, padding: 1.5, alignItems: "center", justifyContent: "center" },
  avatarInner: { width: 51, height: 51, borderRadius: 26, overflow: "hidden" },
  avatar: { width: 51, height: 51, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 17, fontWeight: "700" },
  online: { position: "absolute", bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600" },
  time: { fontSize: 12 },
  botRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  preview: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
