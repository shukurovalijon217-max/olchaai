import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

// Nav item colors matching NEXUS web sidebar NAV_GLOW
const TAB_COLORS: Record<string, string> = {
  feed:     "#7857ff",
  reels:    "#ef4444",
  index:    "#22d3ee",
  messages: "#0ea5e9",
  profile:  "#8b5cf6",
};

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="feed">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reels">
        <Icon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} />
        <Label>OTube</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }} />
        <Label>Yaratish</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Xabarlar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const makeIcon = (
    name: string,
    sfName: string,
    sfSelected: string,
    color: string,
    focused: boolean,
    size = 22
  ) => {
    const iconColor = focused ? color : colors.tabInactive ?? "#3a4d62";
    return (
      <View style={ti.iconWrap}>
        {isIOS ? (
          <SymbolView name={focused ? sfSelected : sfName} tintColor={iconColor} size={size} />
        ) : (
          <Feather name={name as any} size={size} color={iconColor} />
        )}
        {focused && (
          <LinearGradient
            colors={[color + "00", color + "55"]}
            style={[ti.glow, { shadowColor: color }]}
          />
        )}
        {focused && (
          <View style={[ti.dot, { backgroundColor: color }]} />
        )}
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.tabBarBorder ?? "#0f1928",
          elevation: 0,
          height: isWeb ? 84 : 62,
          paddingBottom: isWeb ? 34 : 8,
          paddingTop: 4,
        },
        tabBarBackground: () => (
          <>
            {isIOS ? (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: isIOS ? "rgba(6,13,26,0.6)" : "rgba(5,9,15,0.98)",
            }]} />
          </>
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ color, focused }) =>
            makeIcon("home", "house", "house.fill", TAB_COLORS.feed, focused),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarIcon: ({ color, focused }) =>
            makeIcon("play-circle", "play.rectangle", "play.rectangle.fill", TAB_COLORS.reels, focused, 24),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={ti.plusWrap}>
              <LinearGradient
                colors={["#7857ff", "#22d3ee"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ti.plusBtn}
              >
                <Feather name="plus" size={22} color="#fff" />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color, focused }) =>
            makeIcon("message-circle", "message", "message.fill", TAB_COLORS.messages, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) =>
            makeIcon("user", "person.crop.circle", "person.crop.circle.fill", TAB_COLORS.profile, focused),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

const ti = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  glow: {
    position: "absolute",
    width: 40, height: 40, borderRadius: 20,
    top: -8, left: -9,
    shadowRadius: 12, shadowOpacity: 0.8,
  },
  dot: {
    position: "absolute",
    bottom: -8,
    width: 4, height: 4, borderRadius: 2,
  },
  plusWrap: { alignItems: "center", justifyContent: "center", marginBottom: 2 },
  plusBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#7857ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
});
