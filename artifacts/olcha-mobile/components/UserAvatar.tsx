import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  hasStory?: boolean;
  isVerified?: boolean;
}

export function UserAvatar({ uri, name, size = 40, hasStory, isVerified }: Props) {
  const colors = useColors();
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";

  return (
    <View style={[styles.wrapper, { width: size + (hasStory ? 4 : 0), height: size + (hasStory ? 4 : 0) }]}>
      {hasStory && (
        <View
          style={[
            styles.storyRing,
            {
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              borderColor: colors.primary,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.card,
            borderWidth: hasStory ? 2 : 0,
            borderColor: colors.background,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.35, color: colors.mutedForeground }]}>
            {initials}
          </Text>
        )}
      </View>
      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            { backgroundColor: colors.primary, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 },
          ]}
        >
          <Text style={{ fontSize: size * 0.16, color: "#fff" }}>✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  storyRing: { position: "absolute", borderWidth: 2 },
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { fontFamily: "Inter_600SemiBold" },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
