import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export function GlassView({
  children,
  intensity = 18,
  style,
  borderColor = "rgba(255,255,255,0.08)",
  borderWidth = 1,
  borderRadius = 16,
}: Props) {
  const containerStyle: ViewStyle = {
    borderRadius,
    borderWidth,
    borderColor,
    overflow: "hidden",
  };

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[containerStyle, style]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,16,32,0.6)" }]} />
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: "rgba(13,20,36,0.92)" },
        style,
      ]}
    >
      {children}
    </View>
  );
}
