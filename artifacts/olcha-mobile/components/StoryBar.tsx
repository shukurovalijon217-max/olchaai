import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <FlatList
        data={displayStories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyExtractor={(item) => `story-${item.id}`}
        ListHeaderComponent={
          <Pressable style={styles.item} onPress={onAddStory}>
            <View style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={["rgba(192,57,43,0.15)", "rgba(184,134,11,0.1)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Feather name="plus" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>Sizning</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.item}>
            <LinearGradient
              colors={["#C0392B", "#B8860B"]}
              style={styles.storyRingGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.storyInner, { backgroundColor: colors.background }]}>
                <UserAvatar
                  uri={item.user?.avatarUrl}
                  name={item.user?.displayName}
                  size={50}
                />
              </View>
            </LinearGradient>
            <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
              {item.user?.displayName?.split(" ")[0] ?? "User"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 0.5 },
  container: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  item: { alignItems: "center", gap: 5, width: 70 },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storyRingGrad: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
