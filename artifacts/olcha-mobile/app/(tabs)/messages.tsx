import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";

const DEMO_CONVERSATIONS = [
  { id: 1, user: { username: "dilnoza_uz", displayName: "Dilnoza Yusupova", avatarUrl: null, isVerified: true }, lastMessage: "Rahmat! Yaxshi bo'ldi 😊", time: "2d", unread: 2 },
  { id: 2, user: { username: "sardor_b", displayName: "Sardor Baxtiyorov", avatarUrl: null, isVerified: false }, lastMessage: "Ertaga uchrashamizmi?", time: "3s", unread: 0 },
  { id: 3, user: { username: "malika_m", displayName: "Malika Mirzayeva", avatarUrl: null, isVerified: true }, lastMessage: "Yangi maqolani ko'rdingizmi?", time: "1k", unread: 5 },
  { id: 4, user: { username: "jasur_art", displayName: "Jasur Artistov", avatarUrl: null, isVerified: true }, lastMessage: "Albomni yuboring!", time: "2k", unread: 0 },
  { id: 5, user: { username: "nilufar_n", displayName: "Nilufar Nazarova", avatarUrl: null, isVerified: false }, lastMessage: "Suratlarni ko'rdim, ajoyib!", time: "3k", unread: 1 },
  { id: 6, user: { username: "rustam_coding", displayName: "Rustam Toshmatov", avatarUrl: null, isVerified: false }, lastMessage: "GitHub link nima?", time: "1h", unread: 0 },
];

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopPadding, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Xabarlar</Text>
        <Pressable>
          <Feather name="edit" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <FlatList
        data={DEMO_CONVERSATIONS}
        keyExtractor={(item) => `conv-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.convRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View>
              <UserAvatar uri={item.user.avatarUrl} name={item.user.displayName} size={50} isVerified={item.user.isVerified} />
              {item.unread > 0 && (
                <View style={[styles.onlineDot, { backgroundColor: "#22C55E", borderColor: colors.background }]} />
              )}
            </View>
            <View style={styles.convInfo}>
              <View style={styles.convTop}>
                <Text style={[styles.convName, { color: colors.foreground }]}>{item.user.displayName}</Text>
                <Text style={[styles.convTime, { color: colors.mutedForeground }]}>{item.time}</Text>
              </View>
              <View style={styles.convBottom}>
                <Text style={[styles.convMsg, { color: item.unread > 0 ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    paddingTop: 8,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  convInfo: { flex: 1, gap: 4 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  convTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  convBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  convMsg: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  unreadText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
});
