import React from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Story } from "@/lib/api";

interface Props {
  stories: Story[];
  onAddStory?: () => void;
}

const AVATAR_GRADS: [string, string][] = [
  ["#7c3aed", "#a855f7"],
  ["#ec4899", "#f43f5e"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
];

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
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <FlatList
        data={displayStories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyExtractor={(item) => `story-${item.id}`}
        ListHeaderComponent={
          <Pressable style={styles.item} onPress={onAddStory}>
            <View style={[styles.addOuter, { backgroundColor: colors.muted, borderColor: colors.border, borderStyle: "dashed" }]}>
              <Feather name="plus" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>Sizning</Text>
          </Pressable>
        }
        renderItem={({ item, index }) => {
          const grad = AVATAR_GRADS[index % AVATAR_GRADS.length];
          return (
            <Pressable style={styles.item}>
              {/* Gradient story ring */}
              <LinearGradient
                colors={["#7c3aed", "#ec4899", "#f59e0b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyRing}
              >
                <View style={[styles.storyInner, { backgroundColor: colors.background }]}>
                  {item.user?.avatarUrl ? (
                    <Image
                      source={{ uri: item.user.avatarUrl }}
                      style={styles.storyAvatar}
                    />
                  ) : (
                    <LinearGradient
                      colors={grad}
                      style={styles.storyAvatar}
                    >
                      <Text style={styles.storyInitial}>
                        {(item.user?.displayName ?? "U")[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </LinearGradient>
              <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
                {item.user?.displayName?.split(" ")[0] ?? "User"}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  container: { paddingHorizontal: 12, paddingVertical: 14, gap: 4 },
  item: { alignItems: "center", gap: 6, width: 68 },
  addOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInner: {
    width: 57,
    height: 57,
    borderRadius: 28.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInitial: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
