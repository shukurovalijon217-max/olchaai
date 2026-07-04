import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState, useMemo } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelCard } from "@/components/ReelCard";
import { useColors } from "@/hooks/useColors";
import { useListReels, Reel } from "@workspace/api-client-react";

const { width: W, height: H } = Dimensions.get("window");

type FilterTab = "all" | "trending" | "following";

export default function ReelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarH = Platform.OS === "web" ? 84 : 58;

  const { data, isLoading, refetch } = useListReels();
  const reels = (data as Reel[]) || [];

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIdx(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 });

  if (isLoading && !reels.length) {
    return (
      <View style={[rs.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7857ff" />
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
        onRefresh={refetch}
        refreshing={isLoading}
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
