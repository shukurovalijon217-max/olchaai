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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";

const ICON_MAP: Record<string, { name: "heart" | "message-circle" | "user-plus" | "at-sign"; color: string }> = {
  like: { name: "heart", color: "#ff2d9b" },
  comment: { name: "message-circle", color: "#7c5cfc" },
  follow: { name: "user-plus", color: "#00e5ff" },
  mention: { name: "at-sign", color: "#ffc400" },
};

const getTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: notifications = [], isLoading, refetch } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      refetch();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationPress = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await markRead.mutateAsync({ id: n.id });
        refetch();
      } catch (error) {
        console.error("Failed to mark as read", error);
      }
    }

    if (n.targetId && n.targetType === "post") {
      // Assuming a post detail screen exists at /post/[id]
      // router.push({ pathname: "/post/[id]", params: { id: n.targetId } });
      // But the instructions say: "do NOT invent navigation for target types that have no real screen"
      // Let's check if there is a post detail screen. 
      // Looking at the file list, artifacts/olcha-mobile/app/ does not seem to have a post detail screen.
      // It has feed, index, messages, profile, reels.
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <Pressable onPress={handleMarkAllRead}>
            <Feather name="check-circle" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(n) => n.id.toString()}
            renderItem={({ item: n }) => {
              const icon = ICON_MAP[n.type] || { name: "bell", color: colors.mutedForeground };
              const actorName = n.actorName || "Someone";
              const initials = actorName.slice(0, 2).toUpperCase();
              return (
                <Pressable
                  onPress={() => handleNotificationPress(n)}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.border },
                    !n.isRead && { backgroundColor: colors.primary + "0d" },
                  ]}
                >
                  <View style={[styles.actorAvatar, { backgroundColor: colors.primary + "33" }]}>
                    {n.actorAvatar ? (
                      <Text style={[styles.actorInitials, { color: colors.primary }]}>{initials}</Text>
                    ) : (
                      <Text style={[styles.actorInitials, { color: colors.primary }]}>{initials}</Text>
                    )}
                  </View>
                  <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                    <Feather name={icon.name as any} size={11} color="#fff" />
                  </View>
                  <View style={styles.content}>
                    <Text style={[styles.notifText, { color: colors.text }]}>
                      <Text style={{ fontWeight: "700" }}>{actorName}</Text> {n.message}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                      {getTimeAgo(n.createdAt)}
                    </Text>
                  </View>
                  {!n.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ color: colors.mutedForeground }}>No notifications yet</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
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
