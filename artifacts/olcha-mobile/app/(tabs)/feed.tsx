import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState, useMemo } from "react";
import {
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
import { StoryRow, type Story } from "@/components/StoryRow";
import { useColors } from "@/hooks/useColors";
import { useListPosts, useListStories, useLikePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type FeedTab = "for-you" | "following";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FeedTab>("for-you");

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useListPosts({
    type: tab === "following" ? "text" : undefined // MOCK filter for now if API doesn't support following tab explicitly
  });

  const { data: storiesData, refetch: refetchStories } = useListStories();
  const { mutate: likePost } = useLikePost();

  const posts: Post[] = useMemo(() => {
    return (postsData || []).map(p => ({
      id: p.id,
      authorId: p.author?.id || 0,
      authorName: p.author?.displayName || p.author?.username || "Unknown",
      authorUsername: p.author?.username || "unknown",
      authorAvatar: p.author?.avatarUrl || undefined,
      isVerified: p.author?.isVerified,
      content: p.content,
      mediaUrl: p.mediaUrl || undefined,
      mediaType: p.type as any,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      viewsCount: 0,
      createdAt: p.createdAt,
      isLiked: p.isLiked,
    }));
  }, [postsData]);

  const stories: Story[] = useMemo(() => {
    return (storiesData || []).map(s => ({
      id: s.id,
      userId: s.author?.id || 0,
      username: s.author?.username || "unknown",
      avatarUrl: s.author?.avatarUrl || undefined,
      viewed: s.isViewed,
    }));
  }, [storiesData]);

  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), refetchStories()]);
    setRefreshing(false);
  }, [refetchPosts, refetchStories]);

  const handleLike = useCallback((id: number) => {
    // Optimistic UI update handled in PostCard via internal state, 
    // but we also trigger the mutation and invalidate
    likePost({ id }, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    });
  }, [likePost, queryClient]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Glass header */}
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
              <Text style={s.logoText}>OlchaAI</Text>
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
              <StoryRow stories={stories} />
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 90 + botPad, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        style={{ marginTop: topPad + 80 }}
      />
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
});
