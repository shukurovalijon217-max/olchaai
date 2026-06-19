import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES, changeLanguage, type LangCode } from "@/lib/i18n";

const { width: W } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API = `https://${DOMAIN}/api`;
const COVER_H = 140;
const AVATAR_SIZE = 84;
const AVATAR_OFFSET = AVATAR_SIZE / 2;

function mu(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${DOMAIN}${raw}`;
}
function num(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const POPULAR: LangCode[] = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

interface UserProfile {
  id: number; username: string; displayName: string;
  bio?: string | null; avatarUrl?: string | null; coverUrl?: string | null;
  isVerified?: boolean; isPremium?: boolean;
  followersCount?: number; followingCount?: number; postsCount?: number;
}
interface PostItem {
  id: number; mediaUrl?: string | null; type: string;
  content: string; likesCount: number; commentsCount: number; createdAt: string;
}

type TabKey = "posts" | "reels" | "analytics";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "posts",     label: "Postlar",  icon: "grid" },
  { key: "reels",     label: "Reels",    icon: "play" },
  { key: "analytics", label: "Tahlil",   icon: "bar-chart-2" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const [langOpen,   setLangOpen]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [applied,    setApplied]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<TabKey>("posts");

  const currentCode = i18n.language.split("-")[0] as LangCode;
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l =>
      l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q)
    );
  }, [search]);
  const popularFiltered = filtered.filter(l => POPULAR.includes(l.code));
  const othersFiltered  = filtered.filter(l => !POPULAR.includes(l.code));

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile", user?.id],
    queryFn: () => fetch(`${API}/users/${user!.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    enabled: !!user?.id,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<PostItem[]>({
    queryKey: ["user-posts", user?.id],
    queryFn: () =>
      fetch(`${API}/users/${user!.id}/posts`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []).catch(() => []),
    enabled: !!user?.id,
  });

  const displayUser = profile ?? user ?? {
    displayName: "OlCha Foydalanuvchi", username: "olcha_user",
    bio: null, avatarUrl: null, isVerified: false,
  };

  const stats = [
    { label: "Postlar",    value: num(profile?.postsCount ?? posts.length) },
    { label: "Obunachi",   value: num(profile?.followersCount ?? 0) },
    { label: "Kuzatilmoqda", value: num(profile?.followingCount ?? 0) },
  ];

  const handleLogout = async () => { await logout(); router.replace("/(auth)/login"); };

  const handleLangSelect = async (code: LangCode) => {
    await changeLanguage(code);
    setApplied(true);
    setTimeout(() => { setApplied(false); setLangOpen(false); setSearch(""); }, 1200);
  };

  const coverUri = mu(profile?.coverUrl);
  const GRID_ITEM = (W / 3) - 0.7;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── COVER BANNER ── */}
        <View style={[styles.coverWrap, { height: COVER_H + insets.top + webTopPad }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#1a0540", "#3b0f6b", "#7c3aed", "#a855f7"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            >
              {/* Decorative orbs inside cover */}
              <View style={styles.coverOrb1} />
              <View style={styles.coverOrb2} />
              <View style={styles.coverStar1}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>✦</Text></View>
              <View style={styles.coverStar2}><Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 7 }}>✦</Text></View>
            </LinearGradient>
          )}
          {/* Dark overlay bottom for readability */}
          <LinearGradient
            colors={["transparent", "rgba(7,11,21,0.85)"]}
            style={[StyleSheet.absoluteFillObject, { top: "40%" }]}
          />

          {/* Top right actions */}
          <View style={[styles.coverActions, { top: insets.top + webTopPad + 10 }]}>
            <Pressable onPress={() => setLangOpen(true)} style={styles.coverIconBtn}>
              <Text style={{ fontSize: 15 }}>{currentLang.flag}</Text>
            </Pressable>
            <Pressable onPress={handleLogout} style={styles.coverIconBtn}>
              <Feather name="log-out" size={16} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>
        </View>

        {/* ── AVATAR OVERLAPPING COVER ── */}
        <View style={[styles.avatarSection, { marginTop: -(AVATAR_OFFSET) }]}>
          <View style={styles.avatarGlow}>
            <LinearGradient
              colors={["#7c3aed", "#a855f7", "#ec4899"]}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                <UserAvatar
                  uri={displayUser.avatarUrl}
                  name={displayUser.displayName}
                  size={AVATAR_SIZE - 8}
                  isVerified={displayUser.isVerified}
                />
              </View>
            </LinearGradient>
            {displayUser.isVerified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={9} color="#fff" />
              </View>
            )}
          </View>

          {/* Action buttons top-right of avatar row */}
          <View style={styles.avatarRowActions}>
            <Pressable style={styles.editBtn}>
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.editBtnTxt, { color: colors.foreground }]}>Tahrirlash</Text>
            </Pressable>
            <Pressable style={[styles.shareBtn, { borderColor: colors.border }]}>
              <Feather name="share-2" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* ── NAME + BIO ── */}
        <View style={styles.nameSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{displayUser.displayName}</Text>
            {displayUser.isVerified && (
              <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.verifiedPill}>
                <Feather name="check" size={9} color="#fff" />
              </LinearGradient>
            )}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>@{displayUser.username}</Text>
          {displayUser.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{displayUser.bio}</Text>
          ) : null}
        </View>

        {/* ── STATS ── */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
              {i < stats.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── TAB SELECTOR ── */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={styles.tabItem} onPress={() => setActiveTab(tab.key)}>
                {isActive ? (
                  <LinearGradient
                    colors={["#7c3aed", "#a855f7"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.tabActivePill}
                  >
                    <Feather name={tab.icon as any} size={13} color="#fff" />
                    <Text style={styles.tabActiveTxt}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Feather name={tab.icon as any} size={13} color={colors.mutedForeground} />
                    <Text style={[styles.tabInactiveTxt, { color: colors.mutedForeground }]}>{tab.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── CONTENT AREA ── */}
        {activeTab === "posts" && (
          postsLoading ? (
            <View style={styles.emptyCenter}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyCenter}>
              <LinearGradient colors={["#3b0f6b", "#7c3aed"]} style={styles.emptyOrb}>
                <Feather name="image" size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Hali post yo'q</Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                Birinchi postingizni ulashing
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map(post => {
                const src = mu(post.mediaUrl);
                return (
                  <Pressable key={post.id} style={[styles.gridCell, { width: GRID_ITEM, height: GRID_ITEM, backgroundColor: colors.card }]}>
                    {src ? (
                      <Image source={{ uri: src }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={["#120820", "#3b0f6b"]} style={StyleSheet.absoluteFillObject as any}>
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <Feather name="align-left" size={18} color="rgba(168,85,247,0.55)" />
                        </View>
                      </LinearGradient>
                    )}
                    {post.type === "video" && (
                      <View style={styles.videoTag}>
                        <Feather name="play" size={9} color="#fff" />
                      </View>
                    )}
                    <View style={styles.gridOverlay}>
                      <Feather name="heart" size={11} color="#fff" />
                      <Text style={styles.gridCount}>{num(post.likesCount)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
        )}

        {activeTab === "reels" && (
          <View style={styles.emptyCenter}>
            <LinearGradient colors={["#1a0540", "#7c3aed"]} style={styles.emptyOrb}>
              <Feather name="film" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Hali reel yo'q</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Birinchi reelni yuklang</Text>
          </View>
        )}

        {activeTab === "analytics" && (
          <View style={styles.analyticsWrap}>
            {[
              { label: "Ko'rishlar",  value: "—", icon: "eye",        color: "#7c3aed" },
              { label: "Like'lar",    value: "—", icon: "heart",      color: "#ec4899" },
              { label: "Sharhlar",    value: "—", icon: "message-circle", color: "#3b82f6" },
              { label: "Ulashishlar", value: "—", icon: "share-2",    color: "#10b981" },
            ].map(m => (
              <View key={m.label} style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: m.color + "22" }]}>
                  <Feather name={m.icon as any} size={18} color={m.color} />
                </View>
                <Text style={[styles.analyticsVal, { color: colors.foreground }]}>{m.value}</Text>
                <Text style={[styles.analyticsLbl, { color: colors.mutedForeground }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── LANGUAGE MODAL ── */}
      <Modal visible={langOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLangOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("lang.title")}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{t("lang.subtitle")}</Text>
            </View>
            <Pressable onPress={() => { setLangOpen(false); setSearch(""); }}
              style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.currentLang, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.currentFlag}>{currentLang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 1 }, { color: colors.mutedForeground }]}>{t("lang.current")}</Text>
              <Text style={[{ fontSize: 15, fontFamily: "Inter_600SemiBold" }, { color: colors.foreground }]}>{currentLang.native}</Text>
            </View>
            {applied && (
              <View style={[styles.appliedBadge, { backgroundColor: "#22c55e20" }]}>
                <Feather name="check" size={14} color="#22c55e" />
                <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "Inter_500Medium" }}>{t("lang.applied")}</Text>
              </View>
            )}
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder={t("lang.search")} placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={[
              ...(!search ? [{ type: "header" as const, label: t("lang.popular") }] : []),
              ...popularFiltered.map(l => ({ type: "lang" as const, ...l })),
              ...(!search ? [{ type: "header" as const, label: t("lang.all") }] : []),
              ...othersFiltered.map(l => ({ type: "lang" as const, ...l })),
            ]}
            keyExtractor={(item, i) => (item.type === "header" ? `h-${i}` : item.code)}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => {
              if (item.type === "header") {
                return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{item.label}</Text>;
              }
              const isSelected = item.code === currentCode;
              return (
                <Pressable onPress={() => handleLangSelect(item.code as LangCode)}
                  style={[styles.langRow, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.primary + "18" }]}>
                  <Text style={{ fontSize: 24, width: 32, textAlign: "center" }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowNative, { color: colors.foreground }]}>{item.native}</Text>
                    <Text style={[styles.rowName, { color: colors.mutedForeground }]}>{item.name}</Text>
                  </View>
                  {item.rtl && (
                    <View style={[styles.rtlBadge, { backgroundColor: "#a855f720" }]}>
                      <Text style={{ color: "#a855f7", fontSize: 10, fontFamily: "Inter_500Medium" }}>RTL</Text>
                    </View>
                  )}
                  {isSelected && <Feather name="check" size={18} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Cover */
  coverWrap: { width: "100%", overflow: "hidden" },
  coverOrb1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)", top: -40, right: -30,
  },
  coverOrb2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: 10, left: 20,
  },
  coverStar1: { position: "absolute", top: 30, left: "40%" },
  coverStar2: { position: "absolute", bottom: 16, right: "25%" },
  coverActions: {
    position: "absolute", right: 14,
    flexDirection: "row", gap: 8,
  },
  coverIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  /* Avatar */
  avatarSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  avatarGlow: {
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
    position: "relative",
  },
  avatarRing: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "#070b15",
    padding: 1,
  },
  verifiedBadge: {
    position: "absolute", bottom: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#7c3aed",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#070b15",
  },
  avatarRowActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.35)",
  },
  editBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  /* Name / bio */
  nameSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 3 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  verifiedPill: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },

  /* Stats */
  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, borderRadius: 14, borderWidth: 1,
    backgroundColor: "rgba(15,22,40,0.9)",
    marginBottom: 16, paddingVertical: 14, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32 },

  /* Tabs */
  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    gap: 8, borderBottomWidth: 1, paddingBottom: 12,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabActivePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
  },
  tabActiveTxt: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabInactive: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7 },
  tabInactiveTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },

  /* Grid */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1, paddingHorizontal: 1 },
  gridCell: { overflow: "hidden", position: "relative" },
  videoTag: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4, padding: 3,
  },
  gridOverlay: {
    position: "absolute", bottom: 4, left: 4,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },
  gridCount: { color: "#fff", fontSize: 10, fontFamily: "Inter_500Medium" },

  /* Empty state */
  emptyCenter: { paddingVertical: 48, alignItems: "center", gap: 12 },
  emptyOrb: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular" },

  /* Analytics */
  analyticsWrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, paddingTop: 4 },
  analyticsCard: {
    width: "46%", borderRadius: 14, borderWidth: 1,
    padding: 16, alignItems: "center", gap: 8,
  },
  analyticsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  analyticsVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  analyticsLbl: { fontSize: 12, fontFamily: "Inter_400Regular" },

  /* Language Modal */
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    padding: 20, paddingTop: 24, borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  currentLang: { flexDirection: "row", alignItems: "center", gap: 12, margin: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  currentFlag: { fontSize: 28 },
  appliedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  langRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  rowNative: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rtlBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 },
});
