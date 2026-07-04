import { Feather } from "@expo/vector-icons";
import { useCreateConversation, useListUsers, type User } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Image } from "expo-image";

export default function NewMessageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users = [], isLoading } = useListUsers(
    debouncedSearch ? { search: debouncedSearch } : undefined
  );

  const createConvMutation = useCreateConversation();

  const handleUserSelect = async (otherUser: User) => {
    if (!user) return;
    try {
      const res = await createConvMutation.mutateAsync({
        data: {
          participantIds: [user.id, otherUser.id],
        },
      });
      router.replace(`/chat/${res.id}` as never);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    if (item.id === user?.id) return null;
    return (
      <Pressable
        style={[s.userRow, { borderBottomColor: colors.border }]}
        onPress={() => handleUserSelect(item)}
      >
        <View style={s.avatarWrap}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatar, { backgroundColor: colors.glass ?? "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{item.displayName?.slice(0,2).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={s.userInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[s.userName, { color: colors.text }]}>{item.displayName}</Text>
            {item.isVerified && <Text style={{ fontSize: 10 }}>👑</Text>}
          </View>
          <Text style={[s.userHandle, { color: colors.mutedForeground }]}>@{item.username}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={s.headerTop}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>Yangi xabar</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={[s.searchWrap, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Foydalanuvchini qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ color: colors.mutedForeground }}>Foydalanuvchilar topilmadi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { paddingHorizontal: 16 },
  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", marginRight: 12 },
  avatar: { width: "100%", height: "100%" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600" },
  userHandle: { fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
});
