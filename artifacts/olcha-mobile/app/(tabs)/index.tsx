import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { PostCard } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { apiGet, type Post } from "@/lib/api";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts, isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => apiGet<Post[]>("/posts"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const DEMO_POSTS: Post[] = [
    {
      id: 1, userId: 1, content: "O'zbekistondagi eng go'zal tog'lar haqida yangi post! 🏔️ Chimyon, Ugom, Nuratau — hammasi ajoyib!", mediaUrl: null, type: "text", likesCount: 142, commentsCount: 23, createdAt: new Date(Date.now() - 600000).toISOString(),
      user: { id: 1, username: "dilnoza_uz", displayName: "Dilnoza Yusupova", avatarUrl: null, isVerified: true }
    },
    {
      id: 2, userId: 2, content: "Bugun yangi loyiha boshladim. AI bilan ishlash juda qiziq! OlCha platformasida ko'p narsalar o'rganish mumkin.", mediaUrl: null, type: "text", likesCount: 88, commentsCount: 12, createdAt: new Date(Date.now() - 1800000).toISOString(),
      user: { id: 2, username: "sardor_b", displayName: "Sardor Baxtiyorov", avatarUrl: null, isVerified: false }
    },
    {
      id: 3, userId: 3, content: "Toshkent kunlari... Shahrimiz har kuni yangilanib bormoqda! Yangi metro liniyasi ochildi. 🚇", mediaUrl: null, type: "text", likesCount: 234, commentsCount: 45, createdAt: new Date(Date.now() - 3600000).toISOString(),
      user: { id: 3, username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true }
    },
    {
      id: 4, userId: 4, content: "Musiqa — ruhning ozuqasi. Yangi albomim chiqdi! Barcha platformalarda tinglab ko'ring 🎵✨", mediaUrl: null, type: "text", likesCount: 512, commentsCount: 89, createdAt: new Date(Date.now() - 7200000).toISOString(),
      user: { id: 4, username: "jasur_art", displayName: "Jasur Artistov", avatarUrl: null, isVerified: true }
    },
  ];

  const displayPosts = (posts && posts.length > 0) ? posts : DEMO_POSTS;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? webTopPadding : 0),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>OlCha</Text>
          <View style={[styles.liveBadge, { backgroundColor: "rgba(192,57,43,0.15)", borderColor: "rgba(192,57,43,0.3)" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: colors.primary }]}>LIVE</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="send" size={18} color={colors.foreground} />
          </Pressable>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <UserAvatar uri={user?.avatarUrl} name={user?.displayName} size={26} />
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : (
        <FlatList
          data={displayPosts}
          keyExtractor={(item) => `post-${item.id}`}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={<StoryBar stories={[]} />}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: insets.bottom + webBottomPadding + 90, paddingTop: 4 }}
        />
      )}

      {/* Compose button */}
      <Pressable
        style={[styles.composeFab, { backgroundColor: colors.primary }]}
        onPress={() => {}}
      >
        <LinearGradient
          colors={["#C0392B", "#B8860B"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Feather name="edit-3" size={20} color="#fff" />
      </Pressable>
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
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    color: "#B8860B",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#C0392B",
  },
  liveText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 1.5,
  },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  composeFab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
