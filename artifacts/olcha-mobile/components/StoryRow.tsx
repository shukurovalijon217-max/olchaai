import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Story {
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  viewed: boolean;
}

interface Props {
  stories: Story[];
  currentUserId?: number;
  onAddStory?: () => void;
  onViewStory?: (id: number) => void;
}

const NAMES = ["Alex", "Mia", "Sam", "Zara", "Leo", "Noor", "Kai", "Jess"];

const MOCK_STORIES: Story[] = NAMES.map((n, i) => ({
  id: i + 1,
  userId: i + 10,
  username: n.toLowerCase(),
  viewed: i > 3,
}));

export function StoryRow({ stories = MOCK_STORIES, currentUserId, onAddStory, onViewStory }: Props) {
  const colors = useColors();
  const [viewed, setViewed] = useState<Set<number>>(new Set());

  const handleView = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewed((prev) => new Set([...prev, id]));
    onViewStory?.(id);
  };

  return (
    <FlatList
      horizontal
      data={stories}
      keyExtractor={(s) => s.id.toString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <Pressable onPress={onAddStory} style={styles.item}>
          <LinearGradient
            colors={["#7c5cfc", "#9d00ff"]}
            style={styles.ring}
          >
            <View style={[styles.avatarWrap, { backgroundColor: colors.card }]}>
              <View style={[styles.addCircle, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.plus, { color: colors.primary }]}>+</Text>
              </View>
            </View>
          </LinearGradient>
          <Text style={[styles.name, { color: colors.textSecondary ?? colors.mutedForeground }]} numberOfLines={1}>
            Your Story
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => {
        const isViewed = viewed.has(item.id) || item.viewed;
        const initials = item.username.slice(0, 2).toUpperCase();
        return (
          <Pressable onPress={() => handleView(item.id)} style={styles.item}>
            <LinearGradient
              colors={isViewed ? [colors.border, colors.border] : ["#00e5ff", "#7c5cfc", "#ff2d9b"]}
              style={styles.ring}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={[styles.avatarWrap, { backgroundColor: colors.background }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.primary + "33", alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>{initials}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
            <Text style={[styles.name, { color: colors.textSecondary ?? colors.mutedForeground }]} numberOfLines={1}>
              {item.username}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  item: {
    alignItems: "center",
    width: 66,
    gap: 5,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 59,
    height: 59,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 59,
    height: 59,
    borderRadius: 30,
  },
  addCircle: {
    width: 59,
    height: 59,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
  name: {
    fontSize: 11,
    textAlign: "center",
    width: 64,
  },
});
