import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Story {
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  viewed?: boolean;
}

const DEMO: Story[] = [
  { id: 1, userId: 10, username: "aziz_k", viewed: false },
  { id: 2, userId: 11, username: "malika", viewed: false },
  { id: 3, userId: 12, username: "timur", viewed: false },
  { id: 4, userId: 13, username: "nilu", viewed: true },
  { id: 5, userId: 14, username: "bobur", viewed: true },
  { id: 6, userId: 15, username: "dilo", viewed: true },
];

interface Props {
  stories?: Story[];
  onAddStory?: () => void;
  onView?: (id: number) => void;
}

function StoryItem({ story, onView }: { story: Story; onView?: (id: number) => void }) {
  const colors = useColors();
  const [viewed, setViewed] = useState(story.viewed ?? false);
  const initials = story.username.slice(0, 2).toUpperCase();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewed(true);
    onView?.(story.id);
  };

  return (
    <Pressable onPress={handlePress} style={si.wrap}>
      {/* Story ring — gradient if new, muted if viewed */}
      {viewed ? (
        <View style={[si.ringViewed, { borderColor: colors.border }]}>
          <View style={[si.innerBg, { backgroundColor: colors.background }]}>
            {story.avatarUrl ? (
              <Image source={{ uri: story.avatarUrl }} style={si.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#1d2d40", "#2a3f58"]} style={si.avatar}>
                <Text style={[si.initials, { color: colors.mutedForeground }]}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={["#7857ff", "#ec4899", "#f59e0b"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={si.ring}
        >
          <View style={[si.innerBg, { backgroundColor: colors.background }]}>
            {story.avatarUrl ? (
              <Image source={{ uri: story.avatarUrl }} style={si.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#7857ff", "#9d19ff"]} style={si.avatar}>
                <Text style={si.initials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
      )}
      <Text style={[si.name, { color: colors.textSecondary ?? colors.mutedForeground }]} numberOfLines={1}>
        {story.username}
      </Text>
    </Pressable>
  );
}

export function StoryRow({ stories = DEMO, onAddStory, onView }: Props) {
  const colors = useColors();

  return (
    <FlatList
      horizontal
      data={stories}
      keyExtractor={s => s.id.toString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={si.list}
      ListHeaderComponent={
        <Pressable onPress={onAddStory} style={si.wrap}>
          <LinearGradient
            colors={["#7857ff", "#9d19ff"]}
            style={si.ring}
          >
            <View style={[si.innerBg, { backgroundColor: colors.background }]}>
              <LinearGradient colors={["rgba(120,87,255,0.2)", "rgba(157,25,255,0.2)"]} style={si.avatar}>
                <Text style={{ fontSize: 26, color: colors.primary, fontWeight: "300", lineHeight: 30 }}>+</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
          <Text style={[si.name, { color: colors.mutedForeground }]}>Your Story</Text>
        </Pressable>
      }
      renderItem={({ item }) => <StoryItem story={item} onView={onView} />}
    />
  );
}

const si = StyleSheet.create({
  list: { paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
  wrap: { alignItems: "center", width: 68, gap: 5 },
  ring: { width: 66, height: 66, borderRadius: 33, padding: 2.5, alignItems: "center", justifyContent: "center" },
  ringViewed: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  innerBg: { width: 61, height: 61, borderRadius: 31, overflow: "hidden" },
  avatar: { width: 61, height: 61, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontWeight: "700", fontSize: 15 },
  name: { fontSize: 11, textAlign: "center", width: 68 },
});
