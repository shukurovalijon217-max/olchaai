import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Notif {
  id: number;
  type: "like" | "comment" | "follow" | "mention";
  actorName: string;
  text: string;
  timeAgo: string;
  read: boolean;
}

const MOCK_NOTIFS: Notif[] = [
  { id: 1, type: "like", actorName: "Aziz K", text: "liked your post", timeAgo: "2m", read: false },
  { id: 2, type: "follow", actorName: "Malika Y", text: "started following you", timeAgo: "15m", read: false },
  { id: 3, type: "comment", actorName: "Timur R", text: 'commented: "Amazing work!"', timeAgo: "1h", read: false },
  { id: 4, type: "mention", actorName: "Nilufar H", text: "mentioned you in a post", timeAgo: "3h", read: true },
  { id: 5, type: "like", actorName: "Bobur T", text: "liked your reel", timeAgo: "5h", read: true },
  { id: 6, type: "follow", actorName: "Dilorom S", text: "started following you", timeAgo: "1d", read: true },
];

const ICON_MAP: Record<Notif["type"], { name: "heart" | "message-circle" | "user-plus" | "at-sign"; color: string }> = {
  like: { name: "heart", color: "#ff2d9b" },
  comment: { name: "message-circle", color: "#7c5cfc" },
  follow: { name: "user-plus", color: "#00e5ff" },
  mention: { name: "at-sign", color: "#ffc400" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <Pressable>
            <Feather name="check-circle" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <FlatList
          data={MOCK_NOTIFS}
          keyExtractor={(n) => n.id.toString()}
          renderItem={({ item: n }) => {
            const icon = ICON_MAP[n.type];
            const initials = n.actorName.slice(0, 2).toUpperCase();
            return (
              <Pressable
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  !n.read && { backgroundColor: colors.primary + "0d" },
                ]}
              >
                <View style={[styles.actorAvatar, { backgroundColor: colors.primary + "33" }]}>
                  <Text style={[styles.actorInitials, { color: colors.primary }]}>{initials}</Text>
                </View>
                <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                  <Feather name={icon.name} size={11} color="#fff" />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.notifText, { color: colors.text }]}>
                    <Text style={{ fontWeight: "700" }}>{n.actorName}</Text> {n.text}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{n.timeAgo}</Text>
                </View>
                {!n.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actorInitials: { fontSize: 15, fontWeight: "700" },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 40,
    top: 32,
  },
  content: { flex: 1, gap: 2 },
  notifText: { fontSize: 14, lineHeight: 20 },
  timeText: { fontSize: 12 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
