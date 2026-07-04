import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AuroraBorder } from "@/components/AuroraBorder";

const { width: W } = Dimensions.get("window");
const IMG = (W - 4) / 3;

const MEDIA = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400",
  "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400",
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400",
  "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=400",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400",
  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400",
  "https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=400",
];

type PTab = "posts" | "reels" | "tagged";

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  const colors = useColors();
  return (
    <AuroraBorder colors={[color+"88", color, color+"88"]} radius={12} innerBg={colors.card}>
      <View style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 }}>
        <Text style={{ color: color, fontSize: 20, fontWeight: "800" }}>{value}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{label}</Text>
      </View>
    </AuroraBorder>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [pTab, setPTab] = useState<PTab>("posts");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const displayName = user?.displayName ?? "OlchaAI User";
  const username = user?.username ?? "olcha_user";
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={[p.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 90 + botPad }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1a0050", "#0d1424", colors.background]}
        style={[p.banner, { paddingTop: topPad }]}
      >
        <View style={[p.orb1, { backgroundColor: "rgba(120,87,255,0.25)" }]} />
        <View style={[p.orb2, { backgroundColor: "rgba(34,211,238,0.15)" }]} />
      </LinearGradient>

      <View style={[p.topActions, { top: topPad + 10 }]}>
        <Pressable style={[p.actionBtn, { backgroundColor: "rgba(13,20,36,0.7)" }]}>
          <Feather name="share-2" size={17} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={[p.actionBtn, { backgroundColor: "rgba(13,20,36,0.7)" }]} onPress={() => router.push("/settings" as never)}>
            <Feather name="settings" size={17} color={colors.text} />
          </Pressable>
          <Pressable style={[p.actionBtn, { backgroundColor: "rgba(13,20,36,0.7)" }]} onPress={logout}>
            <Feather name="log-out" size={17} color={colors.red ?? "#ef4444"} />
          </Pressable>
        </View>
      </View>

      <View style={[p.avatarSection, { marginTop: -(topPad + 40) }]}>
        <LinearGradient
          colors={["#7857ff", "#9d19ff", "#22d3ee"]}
          style={p.avatarRing}
        >
          <View style={[p.avatarInner, { backgroundColor: colors.background }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={p.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#7857ff", "#9d19ff"]} style={p.avatar}>
                <Text style={p.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
        {user?.isPremium && (
          <LinearGradient colors={["#f59e0b", "#ef4444"]} style={p.premBadge}>
            <Feather name="star" size={11} color="#fff" />
            <Text style={p.premTxt}>Premium</Text>
          </LinearGradient>
        )}
      </View>

      <View style={p.info}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[p.displayName, { color: colors.text }]}>{displayName}</Text>
          <View style={[p.verBadge, { backgroundColor: "rgba(120,87,255,0.25)" }]}>
            <Feather name="check" size={11} color={colors.primary} />
          </View>
        </View>
        <Text style={[p.username, { color: colors.mutedForeground }]}>@{username}</Text>

        {user?.bio ? (
          <Text style={[p.bio, { color: colors.textSecondary ?? colors.text }]}>{user.bio}</Text>
        ) : (
          <Text style={[p.bio, { color: colors.mutedForeground }]}>Bio qo'shish uchun profil tahrirlang ✨</Text>
        )}

        <View style={p.statsRow}>
          <StatCard value="42" label="Posts" color={colors.cyan} />
          <StatCard value={user?.followersCount?.toString() ?? "1.2K"} label="Followers" color={colors.primary} />
          <StatCard value={user?.followingCount?.toString() ?? "340"} label="Following" color={colors.rose} />
        </View>

        <View style={p.btnRow}>
          <AuroraBorder
            colors={["#7857ff", "#9d19ff", "#22d3ee"]}
            radius={12}
            innerBg={colors.card}
            style={{ flex: 1 }}
            innerStyle={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Pressable onPress={() => router.push("/edit-profile" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="edit-2" size={14} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>Profilni tahrirlash</Text>
            </Pressable>
          </AuroraBorder>

          <Pressable style={[p.smallBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: colors.border }]}>
            <Feather name="user-plus" size={18} color={colors.text} />
          </Pressable>
          <Pressable style={[p.smallBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: colors.border }]}>
            <Feather name="share" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={[p.tabBar, { borderColor: colors.border }]}>
        {([
          { key: "posts" as PTab, icon: "grid" as const },
          { key: "reels" as PTab, icon: "film" as const },
          { key: "tagged" as PTab, icon: "tag" as const },
        ]).map(({ key, icon }) => (
          <Pressable key={key} style={p.tabItem} onPress={() => setPTab(key)}>
            <Feather
              name={icon}
              size={22}
              color={pTab === key ? colors.primary : colors.mutedForeground}
            />
            {pTab === key && (
              <LinearGradient
                colors={["#7857ff", "#22d3ee"]}
                start={{ x:0,y:0 }} end={{ x:1,y:0 }}
                style={p.tabIndicator}
              />
            )}
          </Pressable>
        ))}
      </View>

      <View style={p.grid}>
        {MEDIA.map((url, i) => (
          <Pressable key={i} style={{ width: IMG, height: IMG, margin: 1 }}>
            <Image source={{ uri: url }} style={{ width: IMG, height: IMG }} contentFit="cover" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const p = StyleSheet.create({
  container: { flex: 1 },
  banner: { height: 200, position: "relative", overflow: "hidden" },
  orb1: { position: "absolute", width: 180, height: 180, borderRadius: 90, top: -30, left: -40 },
  orb2: { position: "absolute", width: 140, height: 140, borderRadius: 70, top: 10, right: -30 },
  topActions: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  avatarSection: { paddingHorizontal: 20, paddingBottom: 4 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, padding: 3 },
  avatarInner: { width: 86, height: 86, borderRadius: 43, overflow: "hidden" },
  avatar: { width: 86, height: 86, borderRadius: 43, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 28, fontWeight: "800" },
  premBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    marginTop: 6, alignSelf: "flex-start",
  },
  premTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  info: { paddingHorizontal: 20, gap: 6 },
  displayName: { fontSize: 22, fontWeight: "800" },
  verBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 14 },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  tabIndicator: { position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
