import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationRow, type Conversation } from "@/components/ConversationRow";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";

interface ApiConversation {
  id: number;
  lastMessage?: string;
  updatedAt?: string;
  participants?: Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isPremium?: boolean;
  }>;
}

type MsgTab = "all" | "requests" | "groups";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [msgTab, setMsgTab] = useState<MsgTab>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const fetchConvos = useCallback(async () => {
    try {
      const res = await apiFetch("/api/conversations");
      if (res.ok) {
        const data = await res.json() as ApiConversation[];
        const mapped: Conversation[] = (data ?? []).map(c => {
          const other = c.participants?.find(p => p.id !== user?.id) ?? c.participants?.[0];
          return {
            id: c.id,
            participantName: other?.displayName ?? "User",
            participantUsername: other?.username ?? "user",
            participantAvatar: other?.avatarUrl ?? undefined,
            lastMessage: c.lastMessage ?? undefined,
            lastMessageAt: c.updatedAt ?? undefined,
            unreadCount: 0,
            isOnline: false,
            isPremium: other?.isPremium ?? false,
          };
        });
        setConvos(mapped);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchConvos().finally(() => setLoading(false));
  }, [fetchConvos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConvos();
    setRefreshing(false);
  }, [fetchConvos]);

  const filtered = convos.filter(c =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );
  const unreadTotal = convos.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,13,26,0.95)" }]} />
        )}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[s.title, { color: colors.text }]}>Messages</Text>
            {unreadTotal > 0 && (
              <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.unreadBadge}>
                <Text style={s.unreadTxt}>{unreadTotal}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable style={[s.hBtn, { backgroundColor: colors.glass ?? "rgba(255,255,255,0.07)" }]}>
              <Feather name="video" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              style={[s.hBtn, { backgroundColor: colors.glass ?? "rgba(255,255,255,0.07)" }]}
              onPress={() => router.push("/new-message" as never)}
            >
              <Feather name="edit-2" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={[s.searchWrap, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={s.tabRow}>
          {(["all", "requests", "groups"] as MsgTab[]).map(t => (
            <Pressable key={t} onPress={() => setMsgTab(t)} style={[
              s.tabBtn,
              msgTab === t
                ? { backgroundColor: "rgba(120,87,255,0.25)", borderColor: "rgba(120,87,255,0.5)" }
                : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border }
            ]}>
              <Text style={[s.tabTxt, { color: msgTab===t ? colors.primary : colors.mutedForeground }]}>
                {t === "all" ? "Hammasi" : t === "requests" ? "So'rovlar" : "Guruhlar"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={[s.loadingWrap, { marginTop: topPad + 126 }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id.toString()}
          renderItem={({ item }) => <ConversationRow conversation={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ paddingBottom: 90 + botPad, paddingTop: topPad + 126 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <LinearGradient colors={["rgba(120,87,255,0.15)", "rgba(157,25,255,0.1)"]} style={s.emptyIcon}>
                <Feather name="message-circle" size={36} color={colors.primary} />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: colors.text }]}>
                {search ? "Topilmadi" : "Xabar yo'q"}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi xabarni yuborish uchun yangi suhbat boshlang"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, overflow: "hidden", paddingBottom: 8 },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  title: { fontSize: 24, fontWeight: "800" },
  unreadBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  tabBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  tabTxt: { fontSize: 13, fontWeight: "600" },
  loadingWrap: { flex: 1, alignItems: "center", paddingTop: 60 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
