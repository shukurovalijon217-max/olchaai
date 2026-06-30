import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TYPE_INFO: Record<string, { label: string; icon: string; gradient: [string, string]; desc: string }> = {
  post:      { label: "Post",      icon: "edit-3",       gradient: ["#7857ff", "#9d19ff"], desc: "Fikr va rasmlarni ulashing" },
  story:     { label: "Story",     icon: "book-open",    gradient: ["#22d3ee", "#7857ff"], desc: "24 soatlik lahza" },
  reel:      { label: "Reel",      icon: "film",         gradient: ["#ec4899", "#f97316"], desc: "Qisqa video" },
  otube:     { label: "OTube",     icon: "play-circle",  gradient: ["#f59e0b", "#ef4444"], desc: "Uzun formatli video" },
  challenge: { label: "Challenge", icon: "zap",          gradient: ["#10b981", "#22d3ee"], desc: "Trend boshlang" },
  shop:      { label: "Bozor",     icon: "shopping-bag", gradient: ["#f97316", "#f59e0b"], desc: "Mahsulot soting" },
  live:      { label: "Live",      icon: "radio",        gradient: ["#ef4444", "#ec4899"], desc: "Jonli efir" },
  spaces:    { label: "Spaces",    icon: "mic",          gradient: ["#6366f1", "#7857ff"], desc: "Audio suhbat" },
};

export default function CreateTypeScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const info = TYPE_INFO[type ?? "post"] ?? TYPE_INFO.post;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[info.gradient[0] + "22", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "50%" }]}
      />

      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{info.label} yaratish</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.body}>
        <LinearGradient
          colors={info.gradient}
          style={s.iconCircle}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Feather name={info.icon as any} size={52} color="#fff" />
        </LinearGradient>
        <Text style={[s.typeTitle, { color: colors.text }]}>{info.label}</Text>
        <Text style={[s.typeDesc, { color: colors.mutedForeground }]}>{info.desc}</Text>

        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="tool" size={20} color={colors.primary} />
          <Text style={[s.cardTxt, { color: colors.text }]}>
            Bu funksiya tez orada qo'shiladi!{"\n"}
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Hozircha web versiyasida mavjud
            </Text>
          </Text>
        </View>

        <LinearGradient colors={info.gradient} style={s.btnGrad}>
          <Pressable style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnTxt}>Orqaga qaytish</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  typeTitle: { fontSize: 28, fontWeight: "800" },
  typeDesc: { fontSize: 16, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  cardTxt: { flex: 1, fontSize: 15, lineHeight: 22 },
  btnGrad: { borderRadius: 16, width: "100%", marginTop: 8 },
  btn: { paddingVertical: 16, alignItems: "center" },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
