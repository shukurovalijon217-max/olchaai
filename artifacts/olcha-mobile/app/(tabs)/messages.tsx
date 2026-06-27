import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationRow, type Conversation } from "@/components/ConversationRow";
import { useColors } from "@/hooks/useColors";

const CONVOS: Conversation[] = [
  { id: 1, participantName: "Aziz Karimov", participantUsername: "azizk", lastMessage: "Hey, yangi postingni ko'rdim 🔥", lastMessageAt: new Date(Date.now()-180000).toISOString(), unreadCount: 3, isOnline: true, isPremium: true },
  { id: 2, participantName: "Malika Yusupova", participantUsername: "malika_y", lastMessage: "Samarqandga bormoqchimisiz? 🌙", lastMessageAt: new Date(Date.now()-900000).toISOString(), unreadCount: 1, isOnline: true },
  { id: 3, participantName: "Timur Rashidov", participantUsername: "timur_dev", lastMessage: "Kollab qilaylikmi bu project'da?", lastMessageAt: new Date(Date.now()-3600000).toISOString(), unreadCount: 0, isOnline: false },
  { id: 4, participantName: "Nilufar Hassan", participantUsername: "nilufar.h", lastMessage: "Dizayning juda zo'r chiqibdi! ✨", lastMessageAt: new Date(Date.now()-86400000).toISOString(), unreadCount: 0, isOnline: false, isPremium: true },
  { id: 5, participantName: "Bobur Tashkentov", participantUsername: "bobur_t", lastMessage: "Meetup'ga kelasizmi keyingi hafta?", lastMessageAt: new Date(Date.now()-172800000).toISOString(), unreadCount: 0, isOnline: true },
  { id: 6, participantName: "Dilorom Saydullayeva", participantUsername: "dilo_art", lastMessage: "Rasm zo'r chiqibdi mashallah 🎨", lastMessageAt: new Date(Date.now()-259200000).toISOString(), unreadCount: 0, isOnline: false },
  { id: 7, participantName: "Kamol Umarov", participantUsername: "kamol_u", lastMessage: "Gym ko'rishamizmi? 💪", lastMessageAt: new Date(Date.now()-604800000).toISOString(), unreadCount: 0, isOnline: true, isPremium: true },
];

type MsgTab = "all" | "requests" | "groups";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [msgTab, setMsgTab] = useState<MsgTab>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const filtered = CONVOS.filter(c =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );
  const unreadTotal = CONVOS.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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

        {/* Search */}
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

        {/* Tabs */}
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

      <FlatList
        data={filtered}
        keyExtractor={c => c.id.toString()}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        contentContainerStyle={{ paddingBottom: 90 + botPad, paddingTop: topPad + 126 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient colors={["rgba(120,87,255,0.15)", "rgba(157,25,255,0.1)"]} style={s.emptyIcon}>
              <Feather name="message-circle" size={36} color={colors.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Xabar yo'q</Text>
            <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
              Birinchi xabarni yuborish uchun yangi suhbat boshlang
            </Text>
          </View>
        }
      />
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
  empty: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
