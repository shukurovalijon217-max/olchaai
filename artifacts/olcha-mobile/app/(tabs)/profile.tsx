import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");
const IMG_SIZE = (SCREEN_W - 4) / 3;

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400",
  "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400",
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400",
  "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=400",
];

type ProfileTab = "posts" | "reels" | "tagged";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const displayName = user?.displayName ?? "OlCha User";
  const username = user?.username ?? "user";
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const stats = [
    { label: "Posts", value: "42" },
    { label: "Followers", value: user?.followersCount?.toString() ?? "1.2K" },
    { label: "Following", value: user?.followingCount?.toString() ?? "340" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 90 + botPad }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1a0038", colors.background]}
        style={[styles.banner, { paddingTop: topPad }]}
      />

      <View style={[styles.header, { marginTop: -(topPad + 40) }]}>
        <View style={styles.topActions}>
          <View />
          <View style={styles.headerBtns}>
            <Pressable style={[styles.iconBtn, { backgroundColor: colors.card }]}>
              <Feather name="settings" size={18} color={colors.text} onPress={() => router.push("/settings" as never)} />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              onPress={logout}
            >
              <Feather name="log-out" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.avatarWrap, { borderColor: colors.background }]}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[colors.primary, colors.violet]} style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
          )}
          {user?.isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
              <Feather name="star" size={10} color="#000" />
            </View>
          )}
        </View>

        <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.username, { color: colors.mutedForeground }]}>@{username}</Text>

        {user?.bio ? (
          <Text style={[styles.bio, { color: colors.textSecondary ?? colors.text }]}>{user.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.editBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/edit-profile" as never)}
          >
            <Text style={[styles.editBtnText, { color: colors.text }]}>Edit Profile</Text>
          </Pressable>
          <Pressable style={[styles.shareBtn, { borderColor: colors.border }]}>
            <Feather name="share-2" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabBar, { borderColor: colors.border }]}>
        {(["posts", "reels", "tagged"] as ProfileTab[]).map((t) => (
          <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
            <Feather
              name={t === "posts" ? "grid" : t === "reels" ? "film" : "tag"}
              size={22}
              color={tab === t ? colors.text : colors.mutedForeground}
            />
            {tab === t && (
              <View style={[styles.tabActiveBar, { backgroundColor: colors.text }]} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {MOCK_IMAGES.map((url, i) => (
          <Pressable key={i} style={[styles.gridItem, { width: IMG_SIZE, height: IMG_SIZE }]}>
            <Image source={{ uri: url }} style={{ width: IMG_SIZE, height: IMG_SIZE }} contentFit="cover" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    height: 160,
  },
  header: {
    paddingHorizontal: 16,
    alignItems: "flex-start",
    paddingBottom: 8,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  headerBtns: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    borderRadius: 45,
    borderWidth: 3,
    marginBottom: 10,
    overflow: "visible",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitials: { color: "#fff", fontSize: 28, fontWeight: "700" },
  premiumBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  username: { fontSize: 14, marginBottom: 8 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 12, maxWidth: "90%" },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 14,
  },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8, width: "100%" },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "600" },
  shareBtn: {
    width: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabActiveBar: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 1.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    paddingTop: 2,
  },
  gridItem: {
    overflow: "hidden",
  },
});
