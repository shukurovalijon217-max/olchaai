import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { AuroraBorder } from "@/components/AuroraBorder";

interface CreateOption {
  icon: string;
  label: string;
  sub: string;
  gradient: [string, string];
  badge?: string;
  route: string;
  params?: any;
}

const OPTIONS: CreateOption[] = [
  { icon: "edit-3", label: "Post", sub: "Fikr va rasmlarni ulashing", gradient: ["#7857ff", "#9d19ff"], badge: "Popular", route: "/create/post" },
  { icon: "book-open", label: "Story", sub: "24 soatlik lahza", gradient: ["#22d3ee", "#7857ff"], route: "/create/story" },
  { icon: "film", label: "Reel", sub: "Qisqa video", gradient: ["#ec4899", "#f97316"], badge: "Trending", route: "/create/reel" },
  { icon: "play-circle", label: "OTube", sub: "Uzun formatli video", gradient: ["#f59e0b", "#ef4444"], route: "/web", params: { path: "/otube", title: "OTube" } },
  { icon: "zap", label: "Challenge", sub: "Trend boshlang", gradient: ["#10b981", "#22d3ee"], badge: "New", route: "/web", params: { path: "/quests", title: "Challenges" } },
  { icon: "shopping-bag", label: "Bozor", sub: "Mahsulot soting", gradient: ["#f97316", "#f59e0b"], route: "/web", params: { path: "/bozor/sotish", title: "Bozor" } },
  { icon: "radio", label: "Live", sub: "Jonli efir", gradient: ["#ef4444", "#ec4899"], route: "/web", params: { path: "/live-explore", title: "Live" } },
  { icon: "mic", label: "Spaces", sub: "Audio suhbat", gradient: ["#6366f1", "#7857ff"], route: "/web", params: { path: "/spaces", title: "Spaces" } },
];

const BADGE_COLORS: Record<string, [string, string]> = {
  "Popular": ["#7857ff", "#9d19ff"],
  "Trending": ["#ec4899", "#f97316"],
  "New": ["#10b981", "#22d3ee"],
};

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleOption = (opt: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (opt.route === "/web") {
      router.push({ pathname: "/web", params: opt.params } as any);
    } else {
      router.push(opt.route as any);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Aurora gradient top */}
      <LinearGradient
        colors={["rgba(120,87,255,0.12)", "transparent"]}
        style={[s.topGlow, { height: topPad + 120 }]}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad + 16, paddingBottom: 90 + botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Yaratish</Text>
            <Text style={[s.sub, { color: colors.mutedForeground }]}>Dunyoni hayratda qoldiring</Text>
          </View>
          <LinearGradient colors={["#7857ff", "#22d3ee"]} style={s.aiBtn}>
            <Feather name="cpu" size={16} color="#fff" />
            <Text style={s.aiBtnTxt}>AI Yordam</Text>
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quick} style={s.quickScroll}>
          {["Photo", "Video", "Text", "Poll"].map((q, i) => {
            const qColors: [string, string][] = [["#22d3ee", "#7857ff"], ["#ec4899", "#f97316"], ["#818cf8", "#7857ff"], ["#f59e0b", "#10b981"]];
            return (
              <LinearGradient key={q} colors={qColors[i] ?? ["#7857ff", "#9d19ff"]} style={s.quickBtn}>
                <Pressable style={s.quickInner} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <Text style={s.quickTxt}>{q}</Text>
                </Pressable>
              </LinearGradient>
            );
          })}
        </ScrollView>

        {/* Main grid */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Barcha formatlar</Text>
        <View style={s.grid}>
          {OPTIONS.map(opt => (
            <AuroraBorder
              key={opt.label}
              colors={[opt.gradient[0]+"60", opt.gradient[1]+"40", opt.gradient[0]+"20"]}
              radius={16}
              innerBg={colors.card}
              style={{ flex: 1, minWidth: "47%" }}
            >
              <Pressable
                style={s.card}
                onPress={() => handleOption(opt)}
                android_ripple={{ color: "rgba(120,87,255,0.2)" }}
              >
                <LinearGradient
                  colors={opt.gradient}
                  style={s.iconBox}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Feather name={opt.icon as any} size={24} color="#fff" />
                </LinearGradient>
                {opt.badge && (
                  <LinearGradient
                    colors={BADGE_COLORS[opt.badge] ?? ["#7857ff", "#9d19ff"]}
                    style={s.badge}
                  >
                    <Text style={s.badgeTxt}>{opt.badge}</Text>
                  </LinearGradient>
                )}
                <Text style={[s.cardLabel, { color: colors.text }]}>{opt.label}</Text>
                <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{opt.sub}</Text>
              </Pressable>
            </AuroraBorder>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" },
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 2 },
  aiBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  aiBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  quickScroll: { marginHorizontal: -16, marginBottom: 16 },
  quick: { paddingHorizontal: 16, gap: 8 },
  quickBtn: { borderRadius: 20 },
  quickInner: { paddingHorizontal: 16, paddingVertical: 8 },
  quickTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { padding: 14, gap: 8, minHeight: 120 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 10, right: 10, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardLabel: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  cardSub: { fontSize: 12, lineHeight: 16 },
});
