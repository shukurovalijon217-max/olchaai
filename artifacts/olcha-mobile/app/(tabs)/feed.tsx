import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { StoryRow } from "@/components/StoryRow";
import { useColors } from "@/hooks/useColors";

const POSTS: Post[] = [
  {
    id: 1, authorId: 1, authorName: "Aziz Karimov", authorUsername: "azizk",
    isVerified: true,
    content: "OlCha'ning AI-powered feed algoritmi boshqa platformalarnikidan butunlay farqli. Har bir foydalanuvchi uchun real-time personalization! 🚀",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900",
    likesCount: 4200, commentsCount: 312, viewsCount: 89000,
    createdAt: new Date(Date.now()-3600000).toISOString(), isLiked: false,
  },
  {
    id: 2, authorId: 2, authorName: "Malika Yusupova", authorUsername: "malika_y",
    isVerified: true,
    content: "Samarqandning Registon maydoni quyosh botayotganda dunyadagi eng go'zal manzaralardan biri. Bu erda bo'lish har safar yangiday his tug'diradi ✨",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=900",
    likesCount: 15800, commentsCount: 847, viewsCount: 234000,
    createdAt: new Date(Date.now()-7200000).toISOString(), isLiked: true,
  },
  {
    id: 3, authorId: 3, authorName: "Timur Rashidov", authorUsername: "timur_dev",
    content: "Ijtimoiy tarmoqlar kelajagi — AI va shaxsiylashtirishda. OlCha aynan shu yo'lda. Boshqalar hali tushunmayapti, biz esa allaqachon qurmoqdamiz.",
    mediaType: "text",
    likesCount: 2340, commentsCount: 189,
    createdAt: new Date(Date.now()-14400000).toISOString(), isLiked: false,
  },
  {
    id: 4, authorId: 4, authorName: "Nilufar Hassan", authorUsername: "nilufar.h",
    isVerified: true,
    content: "Tong sahari kod yozish — qahva va ilhom bilan 🌅 OlCha mobile interfeysi shunchalar yoqimli ki, ishlamay bo'lmayapti!",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900",
    likesCount: 8700, commentsCount: 423, viewsCount: 67000,
    createdAt: new Date(Date.now()-86400000).toISOString(), isLiked: false,
  },
  {
    id: 5, authorId: 5, authorName: "Bobur Tashkentov", authorUsername: "bobur_t",
    content: "O'zbekiston texnologiya sektori 2024-yilda 340% o'sdi. Biz global darajada raqobatlasha olamiz. OlCha — buning isboti!",
    mediaType: "text",
    likesCount: 6500, commentsCount: 291,
    createdAt: new Date(Date.now()-172800000).toISOString(), isLiked: false,
  },
  {
    id: 6, authorId: 6, authorName: "Dilorom Art", authorUsername: "dilo_art",
    isVerified: false,
    content: "An'anaviy o'zbek naqshlari va zamonaviy dizayn uyg'unlashganda — sof sehrdir 🎨 Mening yangi kolleksiyamdan bir parcha.",
    mediaType: "photo",
    mediaUrl: "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=900",
    likesCount: 12400, commentsCount: 678, viewsCount: 198000,
    createdAt: new Date(Date.now()-259200000).toISOString(), isLiked: false,
  },
];

type FeedTab = "for-you" | "following";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1400));
    setRefreshing(false);
  }, []);

  const handleLike = useCallback((id: number) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount-1 : p.likesCount+1 } : p
      )
    );
  }, []);

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
