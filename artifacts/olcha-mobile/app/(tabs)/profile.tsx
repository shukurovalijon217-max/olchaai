import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES, changeLanguage, type LangCode } from "@/lib/i18n";

const DEMO_STATS_KEYS = ["Postlar", "Kuzatuvchilar", "Kuzatilayotgan"];
const DEMO_STATS_VALS = ["48", "1.2K", "340"];

const POPULAR: LangCode[] = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [langOpen, setLangOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState(false);

  const currentCode = i18n.language.split("-")[0] as LangCode;
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.includes(q)
    );
  }, [search]);

  const popularFiltered = filtered.filter(l => POPULAR.includes(l.code));
  const othersFiltered = filtered.filter(l => !POPULAR.includes(l.code));

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const handleLangSelect = async (code: LangCode) => {
    await changeLanguage(code);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      setLangOpen(false);
      setSearch("");
    }, 1200);
  };

  const displayUser = user ?? {
    displayName: "OlCha Foydalanuvchi",
    username: "olcha_user",
    bio: "OlCha platformasini kashf eting!",
    avatarUrl: null,
    isVerified: false,
  };

  const DEMO_POSTS = Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }));

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + webTopPadding, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>@{displayUser.username}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setLangOpen(true)} style={[styles.langBtn, { borderColor: colors.border }]}>
              <Text style={styles.langFlag}>{currentLang.flag}</Text>
              <Feather name="globe" size={14} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={handleLogout} style={{ marginLeft: 12 }}>
              <Feather name="log-out" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <UserAvatar uri={displayUser.avatarUrl} name={displayUser.displayName} size={80} isVerified={displayUser.isVerified} />
            <View style={styles.statsRow}>
              {DEMO_STATS_KEYS.map((label, i) => (
                <View key={label} style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{DEMO_STATS_VALS[i]}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{displayUser.displayName}</Text>
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>
              {displayUser.bio || "OlCha foydalanuvchisi 🌟"}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.editText, { color: colors.foreground }]}>Profilni tahrirlash</Text>
            </Pressable>
            <Pressable style={[styles.shareBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="share-2" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.gridHeader, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Pressable style={styles.gridTab}><Feather name="grid" size={22} color={colors.primary} /></Pressable>
          <Pressable style={styles.gridTab}><Feather name="bookmark" size={22} color={colors.mutedForeground} /></Pressable>
          <Pressable style={styles.gridTab}><Feather name="tag" size={22} color={colors.mutedForeground} /></Pressable>
        </View>

        <View style={styles.grid}>
          {DEMO_POSTS.map((post) => (
            <View key={post.id} style={[styles.gridItem, { backgroundColor: colors.card }]}>
              <View style={styles.gridPlaceholder}>
                <Feather name="image" size={24} color={colors.mutedForeground} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={langOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLangOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("lang.title")}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{t("lang.subtitle")}</Text>
            </View>
            <Pressable onPress={() => { setLangOpen(false); setSearch(""); }} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Current language */}
          <View style={[styles.currentLang, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.currentFlag}>{currentLang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.currentLabel, { color: colors.mutedForeground }]}>{t("lang.current")}</Text>
              <Text style={[styles.currentName, { color: colors.foreground }]}>{currentLang.native}</Text>
            </View>
            {applied && (
              <View style={[styles.appliedBadge, { backgroundColor: "#22c55e20" }]}>
                <Feather name="check" size={14} color="#22c55e" />
                <Text style={[styles.appliedText, { color: "#22c55e" }]}>{t("lang.applied")}</Text>
              </View>
            )}
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("lang.search")}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Language list */}
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
                return (
                  <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{item.label}</Text>
                );
              }
              const isSelected = item.code === currentCode;
              return (
                <Pressable
                  onPress={() => handleLangSelect(item.code as LangCode)}
                  style={[
                    styles.langRow,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  langFlag: { fontSize: 16 },
  profileSection: { padding: 16, gap: 12 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bioSection: { gap: 4 },
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  editText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shareBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  gridHeader: { flexDirection: "row", borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  gridTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%", aspectRatio: 1, borderWidth: 0.5, borderColor: "#000", alignItems: "center", justifyContent: "center" },
  gridPlaceholder: { alignItems: "center", justifyContent: "center" },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  currentLang: { flexDirection: "row", alignItems: "center", gap: 12, margin: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  currentFlag: { fontSize: 28 },
  currentLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 1 },
  currentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  appliedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  appliedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  langRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  rowFlag: { fontSize: 24, width: 32, textAlign: "center" },
  rowNative: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rtlBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 },
});
