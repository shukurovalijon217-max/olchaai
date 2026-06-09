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
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { apiGet, type UserItem } from "@/lib/api";

const DEMO_USERS: UserItem[] = [
  { id: 1, username: "dilnoza_uz", displayName: "Dilnoza Yusupova", avatarUrl: null, isVerified: true, bio: "Blogger | Toshkent 🌿" },
  { id: 2, username: "sardor_b", displayName: "Sardor Baxtiyorov", avatarUrl: null, isVerified: false, bio: "Developer | Tech enthusiast" },
  { id: 3, username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true, bio: "Jurnalist | So'z ustasi ✍️" },
  { id: 4, username: "jasur_art", displayName: "Jasur Artistov", avatarUrl: null, isVerified: true, bio: "Musiqachi | Artist 🎵" },
  { id: 5, username: "nilufar_n", displayName: "Nilufar Nazarova", avatarUrl: null, isVerified: false, bio: "Fotograf | Tabiat ❤️" },
  { id: 6, username: "rustam_coding", displayName: "Rustam Toshmatov", avatarUrl: null, isVerified: false, bio: "Software Engineer" },
];

const TRENDING_TAGS = ["#OlCha", "#Toshkent", "#Uzbekistan", "#Tech", "#Musiqa", "#Sayohat", "#Sport", "#San'at"];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const { data: users } = useQuery<UserItem[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<UserItem[]>("/users"),
  });

  const allUsers = (users && users.length > 0) ? users : DEMO_USERS;
  const filtered = search.trim()
    ? allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.displayName.toLowerCase().includes(search.toLowerCase())
      )
    : allUsers;

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopPadding, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Qidirish</Text>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Foydalanuvchi qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `user-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }}
        ListHeaderComponent={
          !search ? (
            <View style={styles.tagsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trend mavzular</Text>
              <View style={styles.tags}>
                {TRENDING_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Tavsiya etilganlar</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
            <UserAvatar uri={item.avatarUrl} name={item.displayName} size={46} isVerified={item.isVerified} />
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: colors.foreground }]}>{item.displayName}</Text>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>@{item.username}</Text>
              {item.bio ? <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            <Pressable style={[styles.followBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.followText, { color: colors.primary }]}>Kuzatish</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, gap: 12 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", paddingTop: 8 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  tagsSection: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  userInfo: { flex: 1, gap: 2 },
  displayName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  followBtn: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 6 },
  followText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
