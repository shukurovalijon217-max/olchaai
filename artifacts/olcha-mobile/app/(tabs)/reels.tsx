import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const DEMO_REELS = [
  { id: 1, title: "Toshkentda kechki sayohat", user: { username: "dilnoza_uz", displayName: "Dilnoza", avatarUrl: null }, likesCount: 12400, commentsCount: 234, color: "#1A0A0A" },
  { id: 2, title: "Oshpaz maxsus taom: somsa", user: { username: "sardor_b", displayName: "Sardor", avatarUrl: null }, likesCount: 8900, commentsCount: 156, color: "#0A1A0A" },
  { id: 3, title: "Chordana ko'chasi — jonli manzara", user: { username: "malika_m", displayName: "Malika", avatarUrl: null }, likesCount: 23100, commentsCount: 412, color: "#0A0A1A" },
  { id: 4, title: "Yangi musiqa — studio sessiyasi", user: { username: "jasur_art", displayName: "Jasur", avatarUrl: null }, likesCount: 45600, commentsCount: 789, color: "#1A1A0A" },
  { id: 5, title: "Fergana vodiysida bahori", user: { username: "nilufar_n", displayName: "Nilufar", avatarUrl: null }, likesCount: 31200, commentsCount: 567, color: "#1A0A1A" },
];

function ReelItem({ item, isActive }: { item: typeof DEMO_REELS[0]; isActive: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(item.likesCount);

  const itemHeight = Platform.OS === "web" ? SCREEN_HEIGHT - 134 : SCREEN_HEIGHT;

  return (
    <View style={[styles.reelItem, { height: itemHeight, backgroundColor: item.color }]}>
      <View style={styles.reelBg}>
        <View style={[styles.reelGradient, { backgroundColor: item.color }]} />
        <View style={styles.playIndicator}>
          <Feather name={isActive ? "pause" : "play"} size={48} color="rgba(255,255,255,0.3)" />
        </View>
      </View>

      <View style={[styles.reelOverlay, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]}>
        <View style={styles.reelLeft}>
          <UserAvatar uri={item.user.avatarUrl} name={item.user.displayName} size={44} />
          <View style={styles.reelMeta}>
            <Text style={styles.reelUser}>@{item.user.username}</Text>
            <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
          </View>
          <View style={styles.reelTags}>
            <View style={[styles.tag, { backgroundColor: "rgba(124,58,237,0.3)" }]}>
              <Text style={styles.tagText}>#OlCha</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: "rgba(168,85,247,0.3)" }]}>
              <Text style={styles.tagText}>#Trending</Text>
            </View>
          </View>
        </View>

        <View style={styles.reelRight}>
          <Pressable
            style={styles.reelAction}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLiked((v) => !v);
              setLikes((v) => v + (liked ? -1 : 1));
            }}
          >
            <Feather name="heart" size={28} color={liked ? colors.primary : "#fff"} />
            <Text style={styles.reelActionText}>{(likes / 1000).toFixed(1)}K</Text>
          </Pressable>
          <Pressable style={styles.reelAction}>
            <Feather name="message-circle" size={28} color="#fff" />
            <Text style={styles.reelActionText}>{item.commentsCount}</Text>
          </Pressable>
          <Pressable style={styles.reelAction}>
            <Feather name="share-2" size={28} color="#fff" />
          </Pressable>
          <Pressable style={styles.reelAction}>
            <Feather name="bookmark" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const itemHeight = Platform.OS === "web" ? Dimensions.get("window").height - 134 : Dimensions.get("window").height;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      <FlatList
        data={DEMO_REELS}
        keyExtractor={(item) => `reel-${item.id}`}
        renderItem={({ item, index }) => <ReelItem item={item} isActive={index === activeIndex} />}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        removeClippedSubviews
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        windowSize={3}
        initialNumToRender={2}
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  reelItem: { width: SCREEN_WIDTH, justifyContent: "flex-end" },
  reelBg: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  reelGradient: { ...StyleSheet.absoluteFillObject, opacity: 0.8 },
  playIndicator: { opacity: 0.4 },
  reelOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  reelLeft: { flex: 1, gap: 8 },
  reelUser: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reelTitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  reelTags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  reelMeta: { gap: 4 },
  reelRight: { gap: 20, alignItems: "center" },
  reelAction: { alignItems: "center", gap: 4 },
  reelActionText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
});
