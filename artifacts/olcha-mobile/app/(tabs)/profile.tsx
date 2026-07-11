import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AuroraBorder } from "@/components/AuroraBorder";
import { useGetUser, useListPosts, useListReels } from "@workspace/api-client-react";

const { width: W } = Dimensions.get("window");
const IMG = (W - 4) / 3;

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

  const { data: profile } = useGetUser(user?.id ?? 0, {
    query: { 
      enabled: !!user?.id,
      queryKey: ['getUser', user?.id]
    }
  });

  const { data: posts, isLoading: loadingPosts } = useListPosts({ userId: user?.id }, {
    query: { 
      enabled: !!user?.id && pTab === "posts",
      queryKey: ['listPosts', { userId: user?.id }]
    }
  });

  const { data: reels, isLoading: loadingReels } = useListReels({ userId: user?.id }, {
    query: { 
      enabled: !!user?.id && pTab === "reels",
      queryKey: ['listReels', { userId: user?.id }]
    }
  });

  const activeUser = profile ?? user;
  const displayName = activeUser?.displayName ?? "OlchaAI User";
  const username = activeUser?.username ?? "olcha_user";
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
            {activeUser?.avatarUrl ? (
              <Image source={{ uri: activeUser.avatarUrl }} style={p.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#7857ff", "#9d19ff"]} style={p.avatar}>
                <Text style={p.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
        {(activeUser as any)?.isVerified && (
          <LinearGradient colors={["#f59e0b", "#ef4444"]} style={p.premBadge}>
            <Feather name="star" size={11} color="#fff" />
            <Text style={p.premTxt}>Verified</Text>
          </LinearGradient>
        )}
      </View>

      <View style={p.info}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[p.displayName, { color: colors.text }]}>{displayName}</Text>
          {(activeUser as any)?.isVerified && (
            <View style={[p.verBadge, { backgroundColor: "rgba(120,87,255,0.25)" }]}>
              <Feather name="check" size={11} color={colors.primary} />
            </View>
          )}
        </View>
        <Text style={[p.username, { color: colors.mutedForeground }]}>@{username}</Text>

        {activeUser?.bio ? (
          <Text style={[p.bio, { color: colors.textSecondary ?? colors.text }]}>{activeUser.bio}</Text>
        ) : (
          <Text style={[p.bio, { color: colors.mutedForeground }]}>Bio qo'shish uchun profil tahrirlang ✨</Text>
        )}

        <View style={p.statsRow}>
          <StatCard value={(activeUser?.postsCount ?? 0).toString()} label="Posts" color={colors.cyan} />
          <StatCard value={(activeUser?.followersCount ?? 0).toString()} label="Followers" color={colors.primary} />
          <StatCard value={(activeUser?.followingCount ?? 0).toString()} label="Following" color={colors.rose} />
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
        {pTab === "posts" && (
          loadingPosts ? (
            <ActivityIndicator style={{ marginTop: 40, width: '100%' }} color={colors.primary} />
          ) : (
            posts?.map((post) => (
              <Pressable key={post.id} style={{ width: IMG, height: IMG, margin: 1 }}>
                {post.mediaUrl ? (
                  <Image source={{ uri: post.mediaUrl }} style={{ width: IMG, height: IMG }} contentFit="cover" />
                ) : (
                  <View style={{ width: IMG, height: IMG, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', padding: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 10, textAlign: 'center' }} numberOfLines={5}>{post.content}</Text>
                  </View>
                )}
              </Pressable>
            ))
          )
        )}
        {pTab === "reels" && (
          loadingReels ? (
            <ActivityIndicator style={{ marginTop: 40, width: '100%' }} color={colors.primary} />
          ) : (
            reels?.map((reel) => (
              <Pressable key={reel.id} style={{ width: IMG, height: IMG, margin: 1 }}>
                <Image source={{ uri: reel.thumbnailUrl || reel.videoUrl }} style={{ width: IMG, height: IMG }} contentFit="cover" />
                <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
                   <Feather name="play" size={12} color="white" />
                </View>
              </Pressable>
            ))
          )
        )}
        {pTab === "tagged" && (
          <View style={{ width: '100%', padding: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground }}>Belgilangan postlar yo'q</Text>
          </View>
        )}
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
