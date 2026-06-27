import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationRow, type Conversation } from "@/components/ConversationRow";
import { useColors } from "@/hooks/useColors";

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 1, participantName: "Aziz Karimov", lastMessage: "Hey, saw your latest post!", lastMessageAt: new Date(Date.now() - 300000).toISOString(), unreadCount: 2, isOnline: true },
  { id: 2, participantName: "Malika Yusupova", lastMessage: "Thanks for the follow 😊", lastMessageAt: new Date(Date.now() - 1800000).toISOString(), unreadCount: 0, isOnline: true },
  { id: 3, participantName: "Timur Rashidov", lastMessage: "Can we collab on that project?", lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 1, isOnline: false },
  { id: 4, participantName: "Nilufar Hassan", lastMessage: "Loved your reel! 🔥", lastMessageAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0, isOnline: false },
  { id: 5, participantName: "Bobur Tashkentov", lastMessage: "See you at the meetup!", lastMessageAt: new Date(Date.now() - 172800000).toISOString(), unreadCount: 0, isOnline: true },
  { id: 6, participantName: "Dilorom Saydullayeva", lastMessage: "That design is 🤌", lastMessageAt: new Date(Date.now() - 259200000).toISOString(), unreadCount: 0, isOnline: false },
];

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const filtered = MOCK_CONVERSATIONS.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <Pressable onPress={() => router.push("/new-message" as never)}>
            <Feather name="edit" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search messages..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id.toString()}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        contentContainerStyle={{ paddingBottom: 90 + botPad }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No conversations found" : "No messages yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
