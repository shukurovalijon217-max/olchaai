import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { PostCard, type Post } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { StoryRow } from "@/components/StoryRow";
import { useColors } from "@/hooks/useColors";

const MOCK_POSTS: Post[] = [
  {
    id: 1,
    authorId: 1,
    authorName: "Aziz Karimov",
    authorUsername: "azizk",
    content: "Just launched my new project on OlCha! The AI feed is incredible 🚀 Already getting so much engagement from the community here.",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    likesCount: 142,
    commentsCount: 23,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isLiked: false,
  },
  {
    id: 2,
    authorId: 2,
    authorName: "Malika Yusupova",
    authorUsername: "malika_y",
    content: "Golden hour in Samarkand never gets old. Every time I visit, the Registan takes my breath away.",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
    likesCount: 389,
    commentsCount: 47,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isLiked: true,
  },
  {
    id: 3,
    authorId: 3,
    authorName: "Timur Rashidov",
    authorUsername: "timur_dev",
    content: "The future of social media is AI-powered and hyper-personalized. What OlCha is building is exactly where the industry needs to go.",
    likesCount: 56,
    commentsCount: 12,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    mediaType: "text",
  },
  {
    id: 4,
    authorId: 4,
    authorName: "Nilufar Hassan",
    authorUsername: "nilufar.h",
    content: "Morning coding session with coffee ☕ Working on the new OlCha mobile features. The dark theme is absolutely perfect.",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    likesCount: 234,
    commentsCount: 31,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isLiked: false,
  },
  {
    id: 5,
    authorId: 5,
    authorName: "Bobur Tashkentov",
    authorUsername: "bobur_t",
    content: "Uzbekistan tech scene is booming! Proud to be part of this incredible community building world-class products.",
    likesCount: 178,
    commentsCount: 29,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    mediaType: "text",
  },
];

type FeedTab = "for-you" | "following";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  }, []);

  const handleLike = useCallback((id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.logo, { color: colors.cyan }]}>OlCha</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/search" as never)} style={styles.iconBtn}>
              <Feather name="search" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push("/notifications" as never)} style={styles.iconBtn}>
              <Feather name="bell" size={22} color={colors.text} />
              <View style={[styles.notifDot, { backgroundColor: colors.pink }]} />
            </Pressable>
          </View>
        </View>
        <View style={styles.tabs}>
          {(["for-you", "following"] as FeedTab[]).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tab}>
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.text : colors.mutedForeground }]}>
                {tab === "for-you" ? "For You" : "Following"}
              </Text>
              {activeTab === tab && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(i) => i.toString()}
          renderItem={() => <SkeletonCard />}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id.toString()}
          renderItem={({ item }) => <PostCard post={item} onLike={handleLike} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={<StoryRow stories={[]} />}
          contentContainerStyle={{ paddingBottom: 90 + botPad }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 8,
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily: "Inter_700Bold",
  },
  headerActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 8, position: "relative" },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 10,
    paddingTop: 4,
    position: "relative",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
});
