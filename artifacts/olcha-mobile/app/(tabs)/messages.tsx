import { router } from "expo-router";
import React, { useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, type Conversation } from "@/lib/api";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m}d`;
  if (h < 24) return `${h}s`;
  return `${d}k`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const { data: convs = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiGet<Conversation[]>("/messages/conversations"),
    refetchInterval: 10000,
  });

  const deleteConv = useMutation({
    mutationFn: (id: number) => apiDelete(`/messages/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const DEMO: Conversation[] = [
    { id: 1, participantId: 2, lastMessage: "Rahmat! Yaxshi bo'ldi 😊", updatedAt: new Date(Date.now() - 172800000).toISOString(), participant: { id: 2, username: "dilnoza_uz", displayName: "Dilnoza Yusupova", avatarUrl: null, isVerified: true, bio: null } },
    { id: 2, participantId: 3, lastMessage: "Ertaga uchrashamizmi?", updatedAt: new Date(Date.now() - 10800000).toISOString(), participant: { id: 3, username: "sardor_b", displayName: "Sardor Baxtiyorov", avatarUrl: null, isVerified: false, bio: null } },
    { id: 3, participantId: 4, lastMessage: "Yangi maqolani ko'rdingizmi?", updatedAt: new Date(Date.now() - 3600000).toISOString(), participant: { id: 4, username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true, bio: null } },
  ];

  const displayConvs = convs.length > 0 ? convs : DEMO;

  const renderRightActions = (convId: number) => (
    <Pressable
      style={[styles.deleteAction, { backgroundColor: "#ef4444" }]}
      onPress={() => deleteConv.mutate(convId)}
    >
      <Feather name="trash-2" size={18} color="#fff" />
      <Text style={styles.deleteLabel}>O'chirish</Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTopPadding, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Xabarlar</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{displayConvs.length} suhbat</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={17} color={colors.foreground} />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.primary }]}>
            <Feather name="edit" size={17} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={displayConvs}
        keyExtractor={(item) => `conv-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90, paddingTop: 6 }}
        renderItem={({ item }) => {
          const name = item.participant?.displayName ?? "Foydalanuvchi";
          const username = item.participant?.username ?? "";
          const isVerified = item.participant?.isVerified ?? false;
          return (
            <Swipeable
              renderRightActions={() => renderRightActions(item.id)}
              friction={2}
              overshootRight={false}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.convRow,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.card : "transparent" },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: { id: String(item.id), name },
                  })
                }
              >
                <View>
                  <View style={[styles.avatarRing, { borderColor: "rgba(192,57,43,0.4)" }]}>
                    <UserAvatar uri={item.participant?.avatarUrl} name={name} size={46} isVerified={isVerified} />
                  </View>
                  <View style={[styles.onlineDot, { backgroundColor: "#22C55E", borderColor: colors.background }]} />
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTop}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.convName, { color: colors.foreground }]}>{name}</Text>
                      {isVerified && (
                        <Feather name="check-circle" size={12} color={colors.gold} style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                      {timeAgo(item.updatedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.convMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.lastMessage ?? "Xabar yo'q"}
                  </Text>
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    paddingTop: 8,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  avatarRing: {
    borderRadius: 27,
    borderWidth: 1.5,
    padding: 1.5,
  },
  onlineDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
  convInfo: { flex: 1, gap: 3 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  convTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  convMsg: { fontSize: 13, fontFamily: "Inter_400Regular" },
  deleteAction: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginVertical: 4,
    marginRight: 10,
    borderRadius: 14,
  },
  deleteLabel: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
