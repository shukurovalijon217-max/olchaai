import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";
import type { Story } from "@/lib/api";

interface Props {
  stories: Story[];
  onAddStory?: () => void;
}

export function StoryBar({ stories, onAddStory }: Props) {
  const colors = useColors();

  const DEMO_STORIES: Story[] = [
    { id: 1, userId: 1, mediaUrl: "", type: "image", expiresAt: new Date().toISOString(), user: { id: 1, username: "dilnoza_uz", displayName: "Dilnoza", avatarUrl: null, isVerified: true, bio: null } },
    { id: 2, userId: 2, mediaUrl: "", type: "image", expiresAt: new Date().toISOString(), user: { id: 2, username: "sardor_b", displayName: "Sardor", avatarUrl: null, isVerified: false, bio: null } },
    { id: 3, userId: 3, mediaUrl: "", type: "image", expiresAt: new Date().toISOString(), user: { id: 3, username: "malika_m", displayName: "Malika", avatarUrl: null, isVerified: true, bio: null } },
    { id: 4, userId: 4, mediaUrl: "", type: "image", expiresAt: new Date().toISOString(), user: { id: 4, username: "jasur_art", displayName: "Jasur", avatarUrl: null, isVerified: false, bio: null } },
    { id: 5, userId: 5, mediaUrl: "", type: "image", expiresAt: new Date().toISOString(), user: { id: 5, username: "nilufar_n", displayName: "Nilufar", avatarUrl: null, isVerified: true, bio: null } },
  ];

  const displayStories = stories.length > 0 ? stories : DEMO_STORIES;

  return (
    <FlatList
      data={displayStories}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyExtractor={(item) => `story-${item.id}`}
      ListHeaderComponent={
        <Pressable style={styles.item} onPress={onAddStory}>
          <View style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="plus" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>Sizning</Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.item}>
          <View style={[styles.storyRing, { borderColor: colors.primary }]}>
            <UserAvatar
              uri={item.user?.avatarUrl}
              name={item.user?.displayName}
              size={52}
            />
          </View>
          <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
            {item.user?.displayName?.split(" ")[0] ?? "User"}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  item: { alignItems: "center", gap: 6, width: 68 },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
