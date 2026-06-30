import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Notif {
  id: number;
  type: "like" | "comment" | "follow" | "mention" | string;
  actorName?: string;
  actorUsername?: string;
  text?: string;
  message?: string;
  timeAgo?: string;
  createdAt?: string;
  isRead?: boolean;
  read?: boolean;
}

const ICON_MAP: Record<string, { icon: "heart" | "message-circle" | "user-plus" | "at-sign" | "bell"; color: string }> = {
  like:    { icon: "heart",          color: "#ff2d9b" },
  comment: { icon: "message-circle", color: "#7c5cfc" },
  follow:  { icon: "user-plus",      color: "#00e5ff" },
  mention: { icon: "at-sign",        color: "#ffc400" },
};

function timeAgo(d?: string): string {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await apiFetch("/api/notifications");
      if (res.ok) {
        const data = await res.json() as Notif[];
        setNotifs(data ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Bildirishnomalar</Text>
          <Pressable onPress={() => {}}>
            <Feather name="check-circle" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notifs}
            keyExtractor={(n) => n.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item: n }) => {
              const iconInfo = ICON_MAP[n.type] ?? { icon: "bell" as const, color: colors.primary };
              const name = n.actorName ?? n.actorUsername ?? "User";
              const initials = name.slice(0, 2).toUpperCase();
              const isRead = n.isRead ?? n.read ?? true;
              const displayText = n.text ?? n.message ?? "";
              const displayTime = n.timeAgo ?? timeAgo(n.createdAt);
              return (
                <Pressable
                  style={[
                    styles.row,
                    { borderBottomColor: colors.border },
                    !isRead && { backgroundColor: colors.primary + "0d" },
                  ]}
                >
                  <View style={[styles.actorAvatar, { backgroundColor: colors.primary + "33" }]}>
                    <Text style={[styles.actorInitials, { color: colors.primary }]}>{initials}</Text>
                  </View>
                  <View style={[styles.iconBadge, { backgroundColor: iconInfo.color }]}>
                    <Feather name={iconInfo.icon} size={11} color="#fff" />
                  </View>
                  <View style={styles.content}>
                    <Text style={[styles.notifText, { color: colors.text }]}>
                      <Text style={{ fontWeight: "700" }}>{name}</Text>
                      {displayText ? ` ${displayText}` : ""}
                    </Text>
                    {displayTime ? <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{displayTime}</Text> : null}
                  </View>
                  {!isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                <LinearGradient colors={["rgba(120,87,255,0.15)", "rgba(157,25,255,0.1)"]} style={{ width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="bell" size={36} color={colors.primary} />
                </LinearGradient>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Bildirishnoma yo'q</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center" }}>Yangi faollik paytida bu yerda ko'rinadi</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
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
