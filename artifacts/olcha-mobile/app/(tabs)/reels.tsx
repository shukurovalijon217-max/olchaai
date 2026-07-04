import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
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

const { width: W, height: H } = Dimensions.get("window");

const MOCK: Reel[] = [
  {
    id: 1, authorId: 1, authorName: "Aziz Karimov", authorUsername: "azizk",
    isVerified: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800",
    caption: "OlchaAI'da reel qilish — eng oson va eng go'zal tajriba. Sizda ham bormi?",
    audioTrack: "Dua Lipa — Levitating",
    likesCount: 142000, commentsCount: 3420, viewsCount: 2800000,
    isLiked: false, tags: ["olcha", "tech", "uzbekistan"],
  },
  {
    id: 2, authorId: 2, authorName: "Malika Yusupova", authorUsername: "malika_y",
    isVerified: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800",
    caption: "Registon quyosh botayotganda — dunyo manzaralari sirasida top 10 da! 🌅 Samarqand forever 💜",
    audioTrack: "Original Sound · malika_y",
    likesCount: 389000, commentsCount: 12470, viewsCount: 8900000,
    isLiked: true, tags: ["samarkand", "travel", "uzbekistan"],
  },
  {
    id: 3, authorId: 3, authorName: "Timur Dev", authorUsername: "timur_dev",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    caption: "2am coding session + coffee + dark theme = perfection ☕ Ship it!",
    audioTrack: "Lo-fi Hip Hop Beats",
    likesCount: 56700, commentsCount: 1280, viewsCount: 1200000,
    isLiked: false, tags: ["coding", "devlife", "startup"],
  },
  {
    id: 4, authorId: 4, authorName: "Dilnoza Art", authorUsername: "dilnoza_art",
    isVerified: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=800",
    caption: "O'zbek naqshlari + zamonaviy dizayn = yangi estetika. Bu kolleksiya 3 oy mehnat!",
    audioTrack: "Traditional Uzbek Beat Remix",
    likesCount: 221000, commentsCount: 4560, viewsCount: 4500000,
    isLiked: false, tags: ["art", "design", "uzbek"],
  },
  {
    id: 5, authorId: 5, authorName: "Kamol Umarov", authorUsername: "kamol_u",
    isVerified: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800",
    caption: "Morning routine that changed my life. Wake up 5am, gym, meditate, code. Results? Judge yourself 💪",
    audioTrack: "Rocky Theme — Survivor",
    likesCount: 891000, commentsCount: 23400, viewsCount: 18000000,
    isLiked: false, tags: ["motivation", "fitness", "mindset"],
  },
];

type FilterTab = "all" | "trending" | "following";

export default function ReelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarH = Platform.OS === "web" ? 84 : 58;

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIdx(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 });

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

      <FlatList
        data={MOCK}
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
    </View>
  );
}

const rs = StyleSheet.create({
  container: { flex: 1 },
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
