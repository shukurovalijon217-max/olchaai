import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function SkeletonCard() {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  const bg = { backgroundColor: colors.border };

  return (
    <Animated.View style={[styles.card, { borderColor: colors.border, opacity }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, bg]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.line, { width: "50%", height: 12 }, bg]} />
          <View style={[styles.line, { width: "35%", height: 10 }, bg]} />
        </View>
      </View>
      <View style={[styles.line, { width: "95%", height: 13, marginBottom: 6 }, bg]} />
      <View style={[styles.line, { width: "80%", height: 13, marginBottom: 12 }, bg]} />
      <View style={[styles.mediaBlock, bg]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  line: {
    borderRadius: 4,
  },
  mediaBlock: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
});
