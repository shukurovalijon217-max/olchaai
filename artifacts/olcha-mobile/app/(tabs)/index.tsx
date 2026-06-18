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
      id: 3, userId: 3, content: "Toshkent kunlari... Shahrimiz har kuni yangilanib bormoqda! Yangi metro liniyasi ochildi.", mediaUrl: null, type: "text", likesCount: 234, commentsCount: 45, createdAt: new Date(Date.now() - 3600000).toISOString(),
      user: { id: 3, username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true }
    },
    {
      id: 4, userId: 4, content: "Musiqa — ruhning ozuqasi. Yangi albomim chiqdi! Barcha platformalarda tinglab ko'ring 🎵", mediaUrl: null, type: "text", likesCount: 512, commentsCount: 89, createdAt: new Date(Date.now() - 7200000).toISOString(),
      user: { id: 4, username: "jasur_art", displayName: "Jasur Artistov", avatarUrl: null, isVerified: false }
    },
  ];

  const displayPosts = (posts && posts.length > 0) ? posts : DEMO_POSTS;

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.root}>
      {/* Aurora background */}
      <LinearGradient
        colors={["#070b15", "#0a0d1e", "#070b15"]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top aurora glow */}
      <View style={[styles.auroraGlow, { pointerEvents: "none" } as any]} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? webTopPadding : 0),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={styles.logo}>OlCha</Text>
        <View style={styles.headerActions}>
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bell" size={19} color={colors.foreground} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="send" size={19} color={colors.foreground} />
          </Pressable>
          <LinearGradient
            colors={["#7c3aed", "#a855f7"]}
            style={styles.avatarGrad}
          >
            <Text style={styles.avatarInitial}>
              {(user?.displayName ?? "O")[0].toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={displayPosts}
          keyExtractor={(item) => `post-${item.id}`}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={<StoryBar stories={[]} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + webBottomPadding + 80, paddingTop: 4 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },
  auroraGlow: {
    position: "absolute",
    top: -80,
    left: "20%",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(124,58,237,0.15)",
    ...Platform.select({ web: { filter: "blur(50px)" } }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,42,61,0.8)",
  },
  logo: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#a78bfa",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGrad: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  loader: { flex: 1, alignSelf: "center" },
});
