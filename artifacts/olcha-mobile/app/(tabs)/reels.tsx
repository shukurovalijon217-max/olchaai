import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import React, { useRef, useState } from "react";
import {
  Animated,
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

const { height: H, width: W } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API = `https://${DOMAIN}/api`;
const ACCENT = "#a855f7";

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

interface ReelItemProps {
  item: RReel;
  index: number;
  isActive: boolean;
  scrollY: Animated.Value;
}

function ReelItem({ item, index, isActive, scrollY }: ReelItemProps) {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likes, setLikes] = useState(item.likesCount);

  const webAdj = Platform.OS === "web";
  const itemH  = webAdj ? H - 134 : H;
  const topPad = insets.top + (webAdj ? 67 : 0);
  const botPad = insets.bottom + (webAdj ? 34 : 0);

  /* ── 3D TUNNEL ANIMATSIYA ── */
  const inputRange = [(index - 1) * itemH, index * itemH, (index + 1) * itemH];
  const tunnelScale = scrollY.interpolate({
    inputRange, outputRange: [0.84, 1, 1.20], extrapolate: "clamp",
  });
  const tunnelOpacity = scrollY.interpolate({
    inputRange, outputRange: [0.55, 1, 0], extrapolate: "clamp",
  });
  const tunnelTranslateY = scrollY.interpolate({
    inputRange, outputRange: [itemH * 0.04, 0, -itemH * 0.06], extrapolate: "clamp",
  });

  const videoSrc  = mu(item.videoUrl);
  const thumbSrc  = mu(item.thumbnailUrl);
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
    /* ── 3D TUNNEL OUTER WRAPPER ── */
    <Animated.View style={{
      width: W,
      height: itemH,
      opacity: tunnelOpacity,
      transform: [
        { perspective: 1200 },
        { scale: tunnelScale },
        { translateY: tunnelTranslateY },
      ],
    }}>
      <View style={{ width: W, height: itemH, overflow: "hidden", backgroundColor: "#04060f" }}>

        {/* ── Media ── */}
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
                <Feather name="film" size={32} color="rgba(168,85,247,0.8)" />
              </View>
              {/* Tunnel rings */}
              <View style={[styles.tunnelRing, { width: 200, height: 200, borderRadius: 100, borderColor: `${ACCENT}18` }]} />
              <View style={[styles.tunnelRing, { width: 280, height: 280, borderRadius: 140, borderColor: `${ACCENT}10` }]} />
              <View style={[styles.tunnelRing, { width: 360, height: 360, borderRadius: 180, borderColor: `${ACCENT}08` }]} />
            </View>
          </LinearGradient>
        )}

        {/* Gradient overlays */}
        <LinearGradient
          colors={["rgba(4,6,15,0.80)", "transparent", "transparent", "rgba(4,6,15,0.92)"]}
          locations={[0, 0.28, 0.52, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Left vignette */}
        <LinearGradient
          colors={["rgba(0,0,0,0.50)", "transparent"]}
          start={{ x: 0, y: 0.5 }} end={{ x: 0.4, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* ════ NEON MUALLIF OYNASI — CHAP YUQORI ════ */}
        <View style={[styles.authorNeonWrap, {
          top: topPad + 14,
          borderColor: ACCENT + "66",
          shadowColor: ACCENT,
        }]}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={[ACCENT + "18", "transparent"]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Neon corner accents */}
          <View style={[styles.neonCornerTL, { borderColor: ACCENT }]} />
          <View style={[styles.neonCornerBR, { borderColor: ACCENT }]} />

          <View style={styles.authorInnerRow}>
            <UserAvatar
              uri={item.author?.avatarUrl ?? null}
              name={authorName}
              size={36}
              isVerified={item.author?.isVerified}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
              <Text style={styles.authorSub}>@{authorUser} · {ago(item.createdAt)}</Text>
            </View>
          </View>

          {/* Follow + music row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 7, gap: 8, marginLeft: 44 }}>
            <Pressable style={[styles.followChip, { borderColor: ACCENT + "99", backgroundColor: ACCENT + "20" }]}>
              <Text style={[styles.followTxt, { color: ACCENT }]}>+ Kuzat</Text>
            </Pressable>
            <View style={styles.audioRow}>
              <Feather name="music" size={10} color="rgba(255,255,255,0.55)" />
              <Text style={styles.audioTxt} numberOfLines={1}>OlCha · Asl audio</Text>
            </View>
          </View>
        </View>

        {/* Reel badge — top right */}
        <View style={[styles.reelBadge, { top: topPad + 14 }]}>
          <Feather name="film" size={10} color={ACCENT} />
          <Text style={[styles.reelBadgeTxt, { color: ACCENT }]}>REEL</Text>
        </View>

        {/* ════ O'NG — EVENLY SPACED ACTION BAR ════ */}
        <View style={[styles.rightBar, {
          top: topPad + 130,
          bottom: botPad + 100,
          right: 12,
        }]}>
          {/* Like */}
          <Pressable style={styles.rBtn} onPress={toggleLike}>
            <View style={[styles.rCircle, liked && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
              <Feather name="heart" size={22} color={liked ? "#fff" : "rgba(255,255,255,0.9)"} />
            </View>
            <Text style={[styles.rLabel, liked && { color: ACCENT }]}>{num(likes)}</Text>
          </Pressable>

          {/* Comment */}
          <Pressable style={styles.rBtn}>
            <View style={styles.rCircle}>
              <Feather name="message-circle" size={22} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.rLabel}>{num(item.commentsCount)}</Text>
          </Pressable>

          {/* Share */}
          <Pressable style={styles.rBtn}>
            <View style={[styles.rCircle, { borderColor: "rgba(59,130,246,0.55)", backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Feather name="share-2" size={20} color="#93c5fd" />
            </View>
            <Text style={[styles.rLabel, { color: "#93c5fd" }]}>Ulash</Text>
          </Pressable>

          {/* Save */}
          <Pressable style={styles.rBtn}>
            <View style={styles.rCircle}>
              <Feather name="bookmark" size={20} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.rLabel}>Saqlash</Text>
          </Pressable>

          {/* AI */}
          <Pressable style={styles.rBtn}>
            <LinearGradient
              colors={["#5b21b6", "#7c3aed"]}
              style={[styles.rCircle, { borderColor: "#a78bfa66" }]}
            >
              <Feather name="zap" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.rLabel, { color: "#c4b5fd" }]}>AI</Text>
          </Pressable>
        </View>

        {/* ════ GLASSMORPHISM PASTKI PANEL ════ */}
        <View style={[styles.bottomPanel, { paddingBottom: botPad + 12, left: 14, right: 68 }]}>
          {/* Multi-layer glass */}
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(4,6,15,0.52)" }]} />
          {/* Neon accent top line */}
          <View style={[StyleSheet.absoluteFillObject, { top: 0, height: 1, backgroundColor: ACCENT, opacity: 0.85 }]} />
          <View style={[StyleSheet.absoluteFillObject, { top: 0, height: 7, backgroundColor: ACCENT + "22" }]} />

          {/* Caption */}
          {item.caption ? (
            <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
          ) : null}

          {/* Meta row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
            {!!item.viewsCount && (
              <View style={styles.viewsChip}>
                <Feather name="eye" size={11} color="rgba(255,255,255,0.45)" />
                <Text style={styles.viewsTxt}>{num(item.viewsCount)} ko'rish</Text>
              </View>
            )}
            {item.duration && (
              <View style={styles.viewsChip}>
                <Feather name="clock" size={11} color="rgba(255,255,255,0.45)" />
                <Text style={styles.viewsTxt}>{item.duration}s</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Feather name="chevrons-up" size={14} color={ACCENT + "88"} />
              <Text style={[styles.viewsTxt, { color: ACCENT + "66" }]}>suring</Text>
            </View>
          </View>
        </View>

      </View>
    </Animated.View>
  );
}

export default function ReelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: reels = [], isLoading } = useQuery<RReel[]>({
    queryKey: ["reels"],
    queryFn: () =>
      fetch(`${API}/reels`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
  });

  const webAdj  = Platform.OS === "web";
  const itemH   = webAdj ? H - 134 : H;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={["#3b0f6b", "#7c3aed"]} style={styles.emptyOrb}>
          <ActivityIndicator size="large" color="#fff" />
        </LinearGradient>
        <Text style={{ color: colors.mutedForeground, marginTop: 16, fontFamily: "Inter_400Regular", fontSize: 14 }}>
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
    <View style={[styles.root, { backgroundColor: "#04060f" }]}>
      <FlatList
        data={reels}
        keyExtractor={(item) => `reel-${item.id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        removeClippedSubviews
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        windowSize={3}
        initialNumToRender={2}
        getItemLayout={(_, index) => ({ length: itemH, offset: itemH * index, index })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            index={index}
            isActive={index === activeIndex}
            scrollY={scrollY}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  noMediaCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  playRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, borderColor: "rgba(168,85,247,0.5)",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.10)",
  },
  tunnelRing: {
    position: "absolute",
    borderWidth: 1,
    alignSelf: "center",
  },

  /* Neon author frame */
  authorNeonWrap: {
    position: "absolute", left: 12, zIndex: 20,
    borderRadius: 16, borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 10, paddingVertical: 10,
    maxWidth: W * 0.62,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 6,
  },
  authorInnerRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  neonCornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 14, height: 14,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  neonCornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 14, height: 14,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderBottomRightRadius: 6,
  },
  authorName: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  authorSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  followChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 18,
    borderWidth: 1,
  },
  followTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  audioTxt: { color: "rgba(255,255,255,0.50)", fontSize: 10, fontFamily: "Inter_400Regular" },

  /* Reel badge */
  reelBadge: {
    position: "absolute", right: 14, zIndex: 20,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9,
    backgroundColor: `${ACCENT}22`, borderWidth: 1, borderColor: `${ACCENT}55`,
  },
  reelBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  /* Right action bar */
  rightBar: {
    position: "absolute", right: 12, zIndex: 20,
    alignItems: "center", justifyContent: "space-evenly",
  },
  rBtn: { alignItems: "center", gap: 4 },
  rCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  rLabel: {
    color: "rgba(255,255,255,0.80)", fontSize: 11,
    fontFamily: "Inter_500Medium", textAlign: "center",
  },

  /* Glassmorphism bottom panel */
  bottomPanel: {
    position: "absolute", bottom: 0,
    paddingHorizontal: 14, paddingTop: 14,
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  caption: {
    color: "rgba(255,255,255,0.92)", fontSize: 13,
    fontFamily: "Inter_400Regular", lineHeight: 18, zIndex: 2,
  },
  viewsChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewsTxt: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular" },

  emptyOrb: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
});
