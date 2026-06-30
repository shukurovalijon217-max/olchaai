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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard, type Post } from "@/components/PostCard";
import { StoryRow } from "@/components/StoryRow";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

type FeedTab = "for-you" | "following";

interface ApiPost {
  id: number;
  authorId: number;
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  createdAt: string;
  isLiked?: boolean;
  author?: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

function mapPost(p: ApiPost): Post {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.author?.displayName ?? "OlCha User",
    authorUsername: p.author?.username ?? "user",
    authorAvatar: p.author?.avatarUrl ?? undefined,
    isVerified: p.author?.isVerified ?? false,
    content: p.content,
    mediaType: (p.mediaType as Post["mediaType"]) ?? "text",
    mediaUrl: p.mediaUrl ?? undefined,
    likesCount: p.likesCount ?? 0,
    commentsCount: p.commentsCount ?? 0,
    viewsCount: p.viewsCount ?? undefined,
    createdAt: p.createdAt,
    isLiked: p.isLiked ?? false,
  };
}

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/posts?limit=30");
      if (res.ok) {
        const data = await res.json() as ApiPost[];
        setPosts((data ?? []).map(mapPost));
      }
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts().finally(() => setLoading(false));
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLike = useCallback(async (id: number) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
    try {
      await apiFetch(`/api/posts/${id}/like`, { method: "POST" });
    } catch {}
  }, []);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,13,26,0.94)" }]} />
        )}
        <View style={s.headerContent}>
          <View style={s.logoRow}>
            <LinearGradient
              colors={["#7857ff", "#22d3ee", "#ec4899"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.logoGrad}
            >
              <Text style={s.logoText}>OlCha</Text>
            </LinearGradient>
            <View style={[s.aiBadge, { backgroundColor: "rgba(120,87,255,0.2)", borderColor: "rgba(120,87,255,0.4)" }]}>
              <Text style={[s.aiBadgeTxt, { color: colors.primary }]}>AI</Text>
            </View>
          </View>
          <View style={s.headerActions}>
            <Pressable onPress={() => router.push("/search" as never)} style={s.headerBtn}>
              <Feather name="search" size={21} color={colors.textSecondary ?? colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push("/notifications" as never)} style={s.headerBtn}>
              <Feather name="bell" size={21} color={colors.textSecondary ?? colors.text} />
              <View style={[s.notifDot, { backgroundColor: colors.rose }]} />
            </Pressable>
          </View>
        </View>
        <View style={[s.tabs, { borderBottomColor: colors.borderSubtle ?? colors.border }]}>
          {(["for-you", "following"] as FeedTab[]).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={s.tabBtn}>
              <Text style={[s.tabTxt, { color: tab===t ? colors.text : colors.mutedForeground }]}>
                {t === "for-you" ? "For You" : "Following"}
              </Text>
              {tab === t && (
                <LinearGradient
                  colors={["#7857ff", "#22d3ee"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.tabBar}
                />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={[s.loadingList, { marginTop: topPad + 80 }]}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id.toString()}
          renderItem={({ item }) => <PostCard post={item} onLike={handleLike} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <>
              <View style={[s.storiesBorder, { borderBottomColor: colors.borderSubtle ?? colors.border }]}>
                <StoryRow />
              </View>
              <View style={[s.divider, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
                <Feather name="zap" size={12} color={colors.amber} />
                <Text style={[s.dividerTxt, { color: colors.mutedForeground }]}>
                  AI-curated for you
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="inbox" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>Postlar topilmadi</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 90 + botPad, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ marginTop: topPad + 80 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoGrad: { borderRadius: 4 },
  logoText: {
    fontSize: 26, fontWeight: "800", letterSpacing: -0.5,
    color: "transparent",
    paddingHorizontal: 2,
  },
  aiBadge: {
    borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
  },
  aiBadgeTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 8, position: "relative" },
  notifDot: {
    position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { marginRight: 24, paddingBottom: 10, paddingTop: 4, position: "relative" },
  tabTxt: { fontSize: 15, fontWeight: "600" },
  tabBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  storiesBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  dividerTxt: { fontSize: 12 },
  loadingList: { paddingHorizontal: 12, paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 15 },
});
