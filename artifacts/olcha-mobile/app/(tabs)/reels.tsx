import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelCard, type Reel } from "@/components/ReelCard";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

const { height: H } = Dimensions.get("window");

interface ApiReel {
  id: number;
  authorId: number;
  title?: string;
  description?: string;
  caption?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  createdAt: string;
  isLiked?: boolean;
  tags?: string[];
  author?: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

function mapReel(r: ApiReel): Reel {
  return {
    id: r.id,
    authorId: r.authorId,
    authorName: r.author?.displayName ?? "OlCha User",
    authorUsername: r.author?.username ?? "user",
    authorAvatar: r.author?.avatarUrl ?? undefined,
    isVerified: r.author?.isVerified ?? false,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    videoUrl: r.videoUrl ?? undefined,
    caption: r.caption ?? r.description ?? r.title ?? undefined,
    audioTrack: "Original Sound",
    likesCount: r.likesCount ?? 0,
    commentsCount: r.commentsCount ?? 0,
    viewsCount: r.viewsCount ?? undefined,
    isLiked: r.isLiked ?? false,
    tags: r.tags ?? [],
  };
}

type FilterTab = "all" | "trending" | "following";

export default function ReelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarH = Platform.OS === "web" ? 84 : 58;

  const fetchReels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/reels?limit=20");
      if (res.ok) {
        const data = await res.json() as ApiReel[];
        setReels((data ?? []).map(mapReel));
      }
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReels().finally(() => setLoading(false));
  }, [fetchReels]);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIdx(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 });

  if (loading) {
    return (
      <View style={[rs.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7857ff" />
        <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 12, fontSize: 14 }}>OTube yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={[rs.container, { backgroundColor: "#000" }]}>
      <View style={[rs.topBar, { top: topPad }]} pointerEvents="box-none">
        <View style={rs.filterRow}>
          {(["all", "trending", "following"] as FilterTab[]).map(t => (
            <Pressable key={t} onPress={() => setFilterTab(t)} style={[
              rs.filterBtn,
              filterTab === t && { backgroundColor: "rgba(120,87,255,0.35)", borderColor: "rgba(120,87,255,0.6)" }
            ]}>
              <Text style={[rs.filterTxt, { color: filterTab===t ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                {t === "all" ? "Hammasi" : t === "trending" ? "🔥 Trending" : "Following"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={rs.topRight}>
          <Pressable style={rs.topBtn}>
            <Feather name="search" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Pressable style={rs.topBtn}>
            <Feather name="camera" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>
      </View>

      <View style={[rs.otubeLabel, { top: topPad + 4 }]} pointerEvents="none">
        <LinearGradient colors={["#f59e0b", "#ef4444"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={rs.otubePill}>
          <Feather name="play-circle" size={13} color="#fff" />
          <Text style={rs.otubeTxt}>OTube</Text>
        </LinearGradient>
      </View>

      {reels.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Feather name="play-circle" size={64} color="rgba(255,255,255,0.2)" />
          <Text style={{ color: "rgba(255,255,255,0.4)", marginTop: 16, fontSize: 16 }}>OTube video yo'q</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={r => r.id.toString()}
          renderItem={({ item, index }) => (
            <ReelCard reel={item} isActive={index === activeIdx} tabBarHeight={tabBarH} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={H}
          decelerationRate="fast"
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewConfig.current}
          getItemLayout={(_, idx) => ({ length: H, offset: H * idx, index: idx })}
        />
      )}
    </View>
  );
}

const rs = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    left: 0, right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  otubeLabel: {
    position: "absolute",
    left: 16,
    zIndex: 30,
  },
  otubePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  otubeTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 6, marginTop: 34 },
  filterBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  filterTxt: { fontSize: 12, fontWeight: "600" },
  topRight: { flexDirection: "row", gap: 4, marginTop: 34 },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
});
