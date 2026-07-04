import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLikeReel, Reel } from "@workspace/api-client-react";
import { useRouter } from "expo-router";

const { width: W, height: H } = Dimensions.get("window");
const BAR_COUNT = 12;

interface Props {
  reel: Reel;
  isActive: boolean;
  tabBarHeight?: number;
}

function fmtNum(n: number) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(1)+"K";
  return n.toString();
}

function Waveform({ playing }: { playing: boolean }) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3 + Math.random() * 0.4))
  ).current;

  useEffect(() => {
    if (!playing) return;
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 300 + Math.random() * 300,
            delay: i * 30,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.1 + Math.random() * 0.5,
            duration: 300 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    );
    Animated.parallel(anims).start();
    return () => anims.forEach(a => a.stop());
  }, [playing]);

  return (
    <View style={wf.row}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            wf.bar,
            {
              height: bar.interpolate({ inputRange: [0, 1], outputRange: [4, 20] }),
              backgroundColor: i < BAR_COUNT * 0.7 ? "#7857ff" : "rgba(255,255,255,0.2)",
            },
          ]}
        />
      ))}
    </View>
  );
}

const wf = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 22 },
  bar: { width: 3, borderRadius: 2 },
});

function TypewriterCaption({ text, active }: { text: string; active: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const colors = useColors();

  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [active, text]);

  if (!displayed) return null;
  return (
    <Text style={[tw.txt, { color: "rgba(255,255,255,0.92)" }]} numberOfLines={3}>
      {displayed}
    </Text>
  );
}
const tw = StyleSheet.create({ txt: { fontSize: 14, lineHeight: 20 } });

export function ReelCard({ reel, isActive, tabBarHeight = 58 }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { mutate: likeReel } = useLikeReel();
  const [liked, setLiked] = useState(reel.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(reel.likesCount);
  const [bookmarked, setBookmarked] = useState(false);

  // Double-tap like ripple
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const heartFloat = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      triggerLike();
    }
    lastTap.current = now;
  };

  const triggerLike = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(v => v + 1);
      likeReel({ id: reel.id });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.4);
    heartFloat.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(rippleScale, { toValue: 3, duration: 600, useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(heartFloat, { toValue: -80, duration: 700, useNativeDriver: true }),
        Animated.timing(heartFloat, { toValue: -120, duration: 300, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(heartOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(v => newLiked ? v + 1 : v - 1);
    likeReel({ id: reel.id });
    if (newLiked) triggerLike();
  };

  const handleComments = () => {
    router.push({
      pathname: "/web",
      params: { path: `/reel/${reel.id}`, title: "Izohlar" }
    } as any);
  };

  const author = reel.author;
  const initials = (author?.displayName || author?.username || "U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View style={[rs.container, { width: W, height: H }]}>
        {/* Background */}
        {reel.thumbnailUrl ? (
          <Image source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#0a0018", "#0d1424", "#060d1a"]} style={StyleSheet.absoluteFill} />
        )}

        {/* Gradient vignette */}
        <LinearGradient
          colors={["rgba(6,13,26,0.3)", "transparent", "transparent", "rgba(6,13,26,0.95)"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Double-tap ripple */}
        <Animated.View
          style={[rs.ripple, {
            transform: [{ scale: rippleScale }],
            opacity: rippleOpacity,
          }]}
          pointerEvents="none"
        />
        {/* Floating heart */}
        <Animated.View
          style={[rs.floatHeart, {
            transform: [{ translateY: heartFloat }],
            opacity: heartOpacity,
          }]}
          pointerEvents="none"
        >
          <Text style={{ fontSize: 52 }}>❤️</Text>
        </Animated.View>

        {/* Right sidebar */}
        <View style={[rs.sidebar, { bottom: tabBarHeight + 80 }]}>
          {/* Author avatar */}
          <View style={rs.authorWrap}>
            <LinearGradient colors={["#7857ff", "#22d3ee"]} style={rs.authorRing}>
              <View style={[rs.authorInner, { backgroundColor: colors.background }]}>
                {author?.avatarUrl ? (
                  <Image source={{ uri: author.avatarUrl }} style={rs.authorImg} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#7857ff", "#9d19ff"]} style={rs.authorImg}>
                    <Text style={rs.authorInitials}>{initials}</Text>
                  </LinearGradient>
                )}
              </View>
            </LinearGradient>
            <View style={[rs.followBtn, { backgroundColor: "#7857ff" }]}>
              <Feather name="plus" size={12} color="#fff" />
            </View>
          </View>

          <Pressable style={rs.sideBtn} onPress={handleLike}>
            <Feather name="heart" size={28} color={liked ? "#ec4899" : "#fff"} />
            <Text style={rs.sideTxt}>{fmtNum(likeCount)}</Text>
          </Pressable>

          <Pressable style={rs.sideBtn} onPress={handleComments}>
            <Feather name="message-circle" size={26} color="#fff" />
            <Text style={rs.sideTxt}>{fmtNum(reel.commentsCount || 0)}</Text>
          </Pressable>

          <Pressable style={rs.sideBtn}>
            <Feather name="share-2" size={24} color="#fff" />
            <Text style={rs.sideTxt}>Share</Text>
          </Pressable>

          <Pressable style={rs.sideBtn} onPress={() => setBookmarked(v=>!v)}>
            <Feather name="bookmark" size={24} color={bookmarked ? colors.amber : "#fff"} />
          </Pressable>

          <Pressable style={rs.sideBtn}>
            <Feather name="more-vertical" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Bottom info */}
        <View style={[rs.bottom, { paddingBottom: tabBarHeight + 16 }]}>
          {/* Author row */}
          <View style={rs.authorRow}>
            <Text style={rs.authorName}>@{author?.username}</Text>
            {author?.isVerified && (
              <View style={[rs.verBadge, { backgroundColor: "rgba(120,87,255,0.3)" }]}>
                <Feather name="check" size={10} color="#7857ff" />
              </View>
            )}
            <Pressable style={[rs.followPill, { borderColor: "rgba(255,255,255,0.5)" }]}>
              <Text style={rs.followTxt}>Follow</Text>
            </Pressable>
          </View>

          {/* Typewriter caption */}
          {reel.caption ? (
            <TypewriterCaption text={reel.caption} active={isActive} />
          ) : null}

          {/* Tags */}
          {reel.tags && reel.tags.length > 0 && (
            <View style={rs.tagsRow}>
              {reel.tags.slice(0, 3).map(t => (
                <View key={t} style={[rs.tag, { backgroundColor: "rgba(120,87,255,0.25)" }]}>
                  <Text style={[rs.tagTxt, { color: "#a78bfa" }]}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Audio + waveform */}
          <View style={rs.audioRow}>
            <Feather name="music" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={rs.audioTxt}>Original Audio</Text>
            <Waveform playing={isActive} />
          </View>

          {/* Views */}
          {reel.viewsCount != null && (
            <View style={rs.viewsRow}>
              <Feather name="eye" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={rs.viewsTxt}>{fmtNum(reel.viewsCount)} views</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const rs = StyleSheet.create({
  container: { position: "relative", backgroundColor: "#000" },
  ripple: {
    position: "absolute",
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.25)",
    top: "50%", left: "50%",
    marginTop: -60, marginLeft: -60,
  },
  floatHeart: {
    position: "absolute",
    bottom: "35%",
    left: "50%",
    marginLeft: -26,
  },
  sidebar: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: 18,
  },
  authorWrap: { position: "relative", marginBottom: 6 },
  authorRing: { width: 52, height: 52, borderRadius: 26, padding: 2 },
  authorInner: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  authorImg: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  authorInitials: { color: "#fff", fontWeight: "700", fontSize: 14 },
  followBtn: {
    position: "absolute", bottom: -4, left: "50%", marginLeft: -10,
    width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  sideBtn: { alignItems: "center", gap: 4 },
  sideTxt: { color: "#fff", fontSize: 12, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },
  bottom: { position: "absolute", left: 14, right: 72, bottom: 0, gap: 6 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 },
  verBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  followPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  followTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagTxt: { fontSize: 12, fontWeight: "600" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  audioTxt: { color: "rgba(255,255,255,0.7)", fontSize: 12, flex: 1 },
  viewsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewsTxt: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
});
