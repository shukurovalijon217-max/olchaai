import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";

const DEMO_STATS = [
  { label: "Postlar", value: "48" },
  { label: "Kuzatuvchilar", value: "1.2K" },
  { label: "Kuzatilayotgan", value: "340" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const displayUser = user ?? {
    displayName: "OlCha Foydalanuvchi",
    username: "olcha_user",
    bio: "OlCha platformasini kashf eting!",
    avatarUrl: null,
    isVerified: false,
  };

  const DEMO_POSTS = Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }));

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + webTopPadding, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>@{displayUser.username}</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarRow}>
          <UserAvatar uri={displayUser.avatarUrl} name={displayUser.displayName} size={80} isVerified={displayUser.isVerified} />
          <View style={styles.statsRow}>
            {DEMO_STATS.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>{displayUser.displayName}</Text>
          {displayUser.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{displayUser.bio}</Text>
          ) : (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>OlCha foydalanuvchisi 🌟</Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editText, { color: colors.foreground }]}>Profilni tahrirlash</Text>
          </Pressable>
          <Pressable style={[styles.shareBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="share-2" size={16} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.gridHeader, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <Pressable style={styles.gridTab}>
          <Feather name="grid" size={22} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.gridTab}>
          <Feather name="bookmark" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={styles.gridTab}>
          <Feather name="tag" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {DEMO_POSTS.map((post) => (
          <View
            key={post.id}
            style={[styles.gridItem, { backgroundColor: colors.card }]}
          >
            <View style={styles.gridPlaceholder}>
              <Feather name="image" size={24} color={colors.mutedForeground} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const ITEM_SIZE = (Platform.OS === "web" ? 400 : 0) / 3;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileSection: { padding: 16, gap: 12 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bioSection: { gap: 4 },
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridHeader: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  gridTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%", aspectRatio: 1, borderWidth: 0.5, borderColor: "#000", alignItems: "center", justifyContent: "center" },
  gridPlaceholder: { alignItems: "center", justifyContent: "center" },
});
