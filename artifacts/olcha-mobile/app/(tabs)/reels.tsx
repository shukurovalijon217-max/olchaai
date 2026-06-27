import { Feather } from "@expo/vector-icons";
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

const MOCK_REELS: Reel[] = [
  {
    id: 1,
    authorId: 1,
    authorName: "Aziz K",
    authorUsername: "azizk",
    videoUrl: "",
    thumbnailUrl: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600",
    caption: "Building the future of social tech in Tashkent 💜",
    likesCount: 14200,
    commentsCount: 342,
    isLiked: false,
  },
  {
    id: 2,
    authorId: 2,
    authorName: "Malika Y",
    authorUsername: "malika_y",
    videoUrl: "",
    thumbnailUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600",
    caption: "Ancient Samarkand vibes ✨ #Uzbekistan #Travel",
    likesCount: 38900,
    commentsCount: 1247,
    isLiked: true,
  },
  {
    id: 3,
    authorId: 3,
    authorName: "Timur R",
    authorUsername: "timur_dev",
    videoUrl: "",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600",
    caption: "Shipping at 2am hits different 🚀 #DevLife",
    likesCount: 5600,
    commentsCount: 128,
    isLiked: false,
  },
  {
    id: 4,
    authorId: 4,
    authorName: "Dilnoza A",
    authorUsername: "dilnoza_art",
    videoUrl: "",
    thumbnailUrl: "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=600",
    caption: "Traditional Uzbek art meets modern design 🎨",
    likesCount: 22100,
    commentsCount: 456,
    isLiked: false,
  },
];

export default function ReelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={[styles.topBar, { top: topPad }]}>
        <Text style={styles.topTitle}>OTube</Text>
        <Pressable>
          <Feather name="camera" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={MOCK_REELS}
        keyExtractor={(r) => r.id.toString()}
        renderItem={({ item, index }) => (
          <ReelCard reel={item} isActive={index === activeIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        contentContainerStyle={{ paddingBottom: botPad }}
        getItemLayout={(_, index) => ({ length: H, offset: H * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
