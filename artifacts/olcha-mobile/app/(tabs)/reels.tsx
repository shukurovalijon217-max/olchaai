import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API = `https://${DOMAIN}/api`;

function mu(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${DOMAIN}${raw}`;
}

function num(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ago(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "Hozir";
  if (s < 3600) return `${Math.floor(s / 60)}d`;
  if (s < 86400) return `${Math.floor(s / 3600)}s`;
  return `${Math.floor(s / 86400)}k`;
}

interface RReel {
  id: number;
  caption?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  createdAt: string;
  author?: {
    id: number; username: string; displayName: string;
    avatarUrl?: string | null; isVerified?: boolean;
  };
}

function ReelItem({ item, isActive }: { item: RReel; isActive: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likes, setLikes] = useState(item.likesCount);

  const itemHeight = Platform.OS === "web" ? SCREEN_HEIGHT - 134 : SCREEN_HEIGHT;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const videoSrc = mu(item.videoUrl);
  const thumbSrc = mu(item.thumbnailUrl);
  const authorName = item.author?.displayName ?? "OlCha";
  const authorUser = item.author?.username ?? "olcha";

  const toggleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const was = liked;
    setLiked(!was);
    setLikes(v => v + (was ? -1 : 1));
    fetch(`${API}/reels/${item.id}/like`, { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { liked: boolean; likesCount: number }) => {
        setLiked(d.liked);
        setLikes(d.likesCount);
      })
      .catch(() => {
        setLiked(was);
        setLikes(v => v + (was ? 1 : -1));
      });
  };

  return (
    <View style={[styles.reelItem, { height: itemHeight, backgroundColor: "#04060f" }]}>
      {/* Media background */}
      {videoSrc ? (
        <Video
          source={{ uri: videoSrc }}
          style={StyleSheet.absoluteFillObject as any}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : thumbSrc ? (
        <Image source={{ uri: thumbSrc }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={["#120820", "#3b0f6b", "#a855f7"]}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.noMediaCenter}>
            <View style={styles.playRing}>
              <Feather name="film" size={32} color="rgba(168,85,247,0.7)" />
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Gradient overlays */}
      <LinearGradient
        colors={["rgba(4,6,15,0.6)", "transparent", "transparent", "rgba(4,6,15,0.9)"]}
        locations={[0, 0.25, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Author — top left */}
      <View style={[styles.authorRow, { top: topPad + 12 }]}>
        <UserAvatar uri={item.author?.avatarUrl ?? null} name={authorName} size={36} isVerified={item.author?.isVerified} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
          <Text style={styles.authorSub}>@{authorUser} · {ago(item.createdAt)}</Text>
        </View>
        <Pressable style={styles.followChip}>
          <Text style={styles.followTxt}>+ Kuzat</Text>
        </Pressable>
      </View>

      {/* Right action bar */}
      <View style={[styles.rightBar, { top: topPad + 80, bottom: botPad + 80 }]}>
        <Pressable style={styles.rBtn} onPress={toggleLike}>
          <View style={[styles.rCircle, liked && { backgroundColor: "#a855f7" }]}>
            <Feather name="heart" size={22} color={liked ? "#fff" : "rgba(255,255,255,0.9)"} />
          </View>
          <Text style={[styles.rLabel, liked && { color: "#a855f7" }]}>{num(likes)}</Text>
        </Pressable>

        <Pressable style={styles.rBtn}>
          <View style={styles.rCircle}>
            <Feather name="message-circle" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.rLabel}>{num(item.commentsCount)}</Text>
        </Pressable>

        <Pressable style={styles.rBtn}>
          <View style={[styles.rCircle, { borderColor: "rgba(59,130,246,0.5)", backgroundColor: "rgba(59,130,246,0.12)" }]}>
            <Feather name="share-2" size={20} color="#93c5fd" />
          </View>
          <Text style={[styles.rLabel, { color: "#93c5fd" }]}>Ulash</Text>
        </Pressable>

        <Pressable style={styles.rBtn}>
          <View style={styles.rCircle}>
            <Feather name="bookmark" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.rLabel}>Saqlash</Text>
        </Pressable>
      </View>

      {/* Bottom info */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 16 }]}>
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        ) : null}
        <View style={styles.audioRow}>
          <Feather name="music" size={11} color="rgba(255,255,255,0.55)" />
          <Text style={styles.audioTxt}>OlCha · Asl audio</Text>
        </View>
        {!!item.viewsCount && (
          <View style={styles.viewsChip}>
            <Feather name="eye" size={11} color="rgba(255,255,255,0.45)" />
            <Text style={styles.viewsTxt}>{num(item.viewsCount)} ko'rish</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const { data: reels = [], isLoading } = useQuery<RReel[]>({
    queryKey: ["reels"],
    queryFn: () =>
      fetch(`${API}/reels`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
  });

  const itemHeight = Platform.OS === "web" ? SCREEN_HEIGHT - 134 : SCREEN_HEIGHT;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Reellar yuklanmoqda...
        </Text>
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={["#3b0f6b", "#7c3aed"]} style={styles.emptyOrb}>
          <Feather name="film" size={32} color="#fff" />
        </LinearGradient>
        <Text style={{ color: colors.foreground, marginTop: 16, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
          Hali reel yo'q
        </Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 6, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 40 }}>
          Birinchi reelni yuklang va auditoriyangizni kengaytiring
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={reels}
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
  root: { flex: 1 },
  reelItem: { width: SCREEN_WIDTH, overflow: "hidden" },
  noMediaCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  playRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, borderColor: "rgba(168,85,247,0.4)",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.08)",
  },
  authorRow: {
    position: "absolute", left: 12, right: 72,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  authorName: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  authorSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  followChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(168,85,247,0.6)",
    backgroundColor: "rgba(168,85,247,0.12)",
  },
  followTxt: { color: "#c4b5fd", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  rightBar: {
    position: "absolute", right: 10,
    alignItems: "center", gap: 20, justifyContent: "center",
  },
  rBtn: { alignItems: "center", gap: 4 },
  rCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  rLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: "Inter_500Medium" },
  bottomPanel: {
    position: "absolute", bottom: 0, left: 14, right: 70,
    gap: 6,
  },
  caption: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  audioTxt: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular" },
  viewsChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewsTxt: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyOrb: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
});
