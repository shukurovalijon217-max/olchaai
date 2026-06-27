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

interface CreateOption {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  gradient: [string, string];
  route: string;
}

const OPTIONS: CreateOption[] = [
  { icon: "edit-3", label: "Post", sub: "Share thoughts & photos", gradient: ["#7c5cfc", "#9d00ff"], route: "/create/post" },
  { icon: "book-open", label: "Story", sub: "24-hour moment", gradient: ["#00e5ff", "#7c5cfc"], route: "/create/story" },
  { icon: "film", label: "Reel", sub: "Short-form video", gradient: ["#ff2d9b", "#ff6b00"], route: "/create/reel" },
  { icon: "youtube" as keyof typeof Feather.glyphMap, label: "OTube", sub: "Long-form video", gradient: ["#ffc400", "#ff6b00"], route: "/create/otube" },
  { icon: "zap", label: "Challenge", sub: "Start a trend", gradient: ["#00e676", "#00e5ff"], route: "/create/challenge" },
  { icon: "shopping-bag", label: "Shop", sub: "Sell products", gradient: ["#ff6b00", "#ffc400"], route: "/create/shop" },
];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleOption = (opt: CreateOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(opt.route as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Create</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Share something with the world
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: 90 + botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleOption(opt)}
          >
            <LinearGradient
              colors={opt.gradient}
              style={styles.iconWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={opt.icon} size={26} color="#fff" />
            </LinearGradient>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: colors.text }]}>{opt.label}</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{opt.sub}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  cardSub: { fontSize: 13 },
});
