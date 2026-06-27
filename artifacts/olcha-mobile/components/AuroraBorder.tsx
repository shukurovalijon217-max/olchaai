import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  colors?: [string, string, ...string[]];
  radius?: number;
  borderWidth?: number;
  style?: ViewStyle;
  innerStyle?: ViewStyle;
  innerBg?: string;
}

export function AuroraBorder({
  children,
  colors: gradColors = ["#7857ff", "#9d19ff", "#22d3ee"],
  radius = 16,
  borderWidth = 1,
  style,
  innerStyle,
  innerBg = "#0d1424",
}: Props) {
  return (
    <LinearGradient
      colors={gradColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius + borderWidth, padding: borderWidth }, style]}
    >
      <View style={[{ backgroundColor: innerBg, borderRadius: radius, overflow: "hidden" }, innerStyle]}>
        {children}
      </View>
    </LinearGradient>
  );
}
