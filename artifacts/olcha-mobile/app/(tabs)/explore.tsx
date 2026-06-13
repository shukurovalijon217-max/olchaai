import React, { useState, useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";
import { apiGet, apiPost, type UserItem, type TrendingTopic, type Group } from "@/lib/api";

/* ── colour palette for category labels ─────────────────── */
const CAT_COLORS: Record<string, string> = {
  Technology: "#7c3aed",
  Finance:    "#2563eb",
  Health:     "#059669",
  Lifestyle:  "#d97706",
  Entertainment: "#db2777",
  Art:        "#0891b2",
  Business:   "#65a30d",
  Music:      "#9333ea",
  Travel:     "#0284c7",
  Fashion:    "#e11d48",
  Community:  "#f59e0b",
};
const catColor = (c?: string | null) => CAT_COLORS[c ?? ""] ?? "#7c3aed";

/* ── pretty number formatter ─────────────────────────────── */
function fmtN(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} K`;
  return String(n);
}

/* ══════════════════════════════════════════════════════════
   TRENDING TOPIC CARD  (2-column grid)
══════════════════════════════════════════════════════════ */
function TopicCard({ item, colors }: { item: TrendingTopic; colors: ReturnType<typeof useColors> }) {
  const cc = catColor(item.category);
  return (
    <Pressable style={[styles.topicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.topicCategory, { color: colors.mutedForeground }]}>{item.category}</Text>
      <Text style={[styles.topicTag, { color: colors.foreground }]}>#{item.tag}</Text>
      <Text style={[styles.topicCount, { color: colors.mutedForeground }]}>
        {fmtN(item.postCount)} ta post
      </Text>
      <Text style={[styles.topicGrowth, { color: "#22c55e" }]}>+{item.growth}%</Text>
    </Pressable>
  );
}

/* ══════════════════════════════════════════════════════════
   PERSON CARD  (2-column grid)
══════════════════════════════════════════════════════════ */
function PersonCard({
  item, colors, followed, onFollow,
}: {
  item: UserItem;
  colors: ReturnType<typeof useColors>;
  followed: boolean;
  onFollow: () => void;
}) {
  return (
    <View style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <UserAvatar uri={item.avatarUrl} name={item.displayName} size={72} isVerified={item.isVerified} />
      <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
        {item.displayName}
      </Text>
      <Text style={[styles.personUsername, { color: colors.mutedForeground }]} numberOfLines={1}>
        @{item.username}
      </Text>
      <Pressable
        onPress={onFollow}
        style={[
          styles.followBtn,
          {
            backgroundColor: followed ? colors.card : "#7c3aed",
            borderColor: followed ? colors.border : "#7c3aed",
          },
        ]}
      >
        <Text style={[styles.followBtnText, { color: followed ? colors.mutedForeground : "#fff" }]}>
          {followed ? "Kuzatilmoqda" : "Kuzatish"}
        </Text>
      </Pressable>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   GROUP ROW  (full-width list)
══════════════════════════════════════════════════════════ */
function GroupRow({
  item, colors, joined, onJoin,
}: {
  item: Group;
  colors: ReturnType<typeof useColors>;
  joined: boolean;
  onJoin: () => void;
}) {
  const cc = catColor(item.category);
  const letter = (item.name ?? "G").charAt(0).toUpperCase();
  return (
    <View style={[styles.groupRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.groupIcon, { backgroundColor: `${cc}22` }]}>
        <Text style={[styles.groupLetter, { color: cc }]}>{letter}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
          {fmtN(item.membersCount)} a&apos;zo · {item.category}
        </Text>
      </View>
      <Pressable
        onPress={onJoin}
        style={[
          styles.joinBtn,
          {
            backgroundColor: joined ? `${cc}18` : `${cc}18`,
            borderColor: cc,
          },
        ]}
      >
        <Text style={[styles.joinBtnText, { color: cc }]}>
          {joined ? "Kirildi" : "Kirish"}
        </Text>
      </Pressable>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════ */
export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [followed, setFollowed] = useState<Record<number, boolean>>({});
  const [joined, setJoined]   = useState<Record<number, boolean>>({});

  /* ── API queries ─────────────────────────────────────── */
  const { data: topics = [], isLoading: loadTopics } = useQuery<TrendingTopic[]>({
    queryKey: ["trending-topics"],
    queryFn: () => apiGet<TrendingTopic[]>("/ai/trending-topics"),
    staleTime: 60_000,
  });

  const { data: users = [], isLoading: loadUsers } = useQuery<UserItem[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<UserItem[]>("/users"),
    staleTime: 30_000,
  });

  const { data: groups = [], isLoading: loadGroups } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => apiGet<Group[]>("/groups"),
    staleTime: 30_000,
  });

  /* ── mutations ───────────────────────────────────────── */
  const followMut = useMutation({
    mutationFn: (id: number) => apiPost<{ following: boolean }>(`/users/${id}/follow`, {}),
    onSuccess: (data, id) => {
      setFollowed(f => ({ ...f, [id]: data.following }));
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const joinMut = useMutation({
    mutationFn: (id: number) => apiPost<{ isMember: boolean }>(`/groups/${id}/join`, {}),
    onSuccess: (data, id) => {
      setJoined(j => ({ ...j, [id]: data.isMember }));
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  /* ── filtering ───────────────────────────────────────── */
  const q = search.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.bio ?? "").toLowerCase().includes(q)
      )
    : users;

  const filteredGroups = q
    ? groups.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
        (g.category ?? "").toLowerCase().includes(q)
      )
    : groups;

  const filteredTopics = q
    ? topics.filter(t =>
        t.tag.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    : topics;

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const isLoading = loadTopics || loadUsers || loadGroups;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={[styles.header, {
        paddingTop: insets.top + webTopPadding,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Kashf qilish</Text>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Odamlar, postlar, guruhlarni qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading && !topics.length && !users.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 96,
          }}
        >
          {/* ── Trend mavzular ──────────────────────────────── */}
          {filteredTopics.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="trending-up" size={16} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trend mavzular</Text>
              </View>
              <View style={styles.grid2}>
                {filteredTopics.map(t => (
                  <TopicCard key={t.tag} item={t} colors={colors} />
                ))}
              </View>
            </View>
          )}

          {/* ── Kuzatish uchun odamlar ───────────────────────── */}
          {filteredUsers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="users" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Kuzatish uchun odamlar
                </Text>
              </View>
              <View style={styles.grid2}>
                {filteredUsers.map(u => (
                  <PersonCard
                    key={u.id}
                    item={u}
                    colors={colors}
                    followed={followed[u.id] ?? false}
                    onFollow={() => followMut.mutate(u.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Mashhur jamoalar ────────────────────────────── */}
          {filteredGroups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="grid" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Mashhur jamoalar
                </Text>
              </View>
              <View style={styles.groupList}>
                {filteredGroups.map(g => (
                  <GroupRow
                    key={g.id}
                    item={g}
                    colors={colors}
                    joined={joined[g.id] ?? g.isMember}
                    onJoin={() => joinMut.mutate(g.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {q && !filteredTopics.length && !filteredUsers.length && !filteredGroups.length && (
            <View style={styles.center}>
              <Feather name="search" size={40} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                "{search}" bo'yicha hech narsa topilmadi
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", paddingTop: 4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  /* section */
  section: { paddingHorizontal: 14, paddingTop: 20, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  /* 2-col grid */
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  /* topic card */
  topicCard: {
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 3,
  },
  topicCategory: { fontSize: 11, fontFamily: "Inter_400Regular" },
  topicTag: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  topicCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  topicGrowth: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 1 },

  /* person card */
  personCard: {
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  personName: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  personUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  followBtn: {
    marginTop: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 7,
    alignItems: "center",
    width: "100%",
  },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* group row */
  groupList: { gap: 8 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  groupLetter: { fontSize: 18, fontFamily: "Inter_700Bold" },
  groupInfo: { flex: 1, gap: 3 },
  groupName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  joinBtn: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  joinBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
