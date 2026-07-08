import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const NEXUS_URL = DOMAIN
  ? `https://${DOMAIN}/`
  : typeof window !== "undefined"
  ? window.location.origin + "/"
  : "http://localhost:18245/";

function IframeShell() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#060d1a" }}>
      {!loaded && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#7857ff" />
          <Text style={s.loadingTxt}>GilosAI yuklanmoqda...</Text>
        </View>
      )}
      {loaded && (
        // @ts-ignore — iframe is valid HTML on web
        <iframe
          src={NEXUS_URL}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            flex: 1,
          }}
          allow="camera; microphone; fullscreen; geolocation; autoplay"
          title="GilosAI"
        />
      )}
    </View>
  );
}

function NativeGate() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#7857ff" />
        <Text style={s.loadingTxt}>GilosAI yuklanmoqda...</Text>
      </View>
    );
  }

  if (token) return <Redirect href="/(tabs)/feed" />;
  return <Redirect href="/auth" />;
}

export default function GilosAIApp() {
  if (Platform.OS === "web") return <IframeShell />;
  return <NativeGate />;
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#060d1a",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingTxt: { color: "#7a8fa8", fontSize: 14 },
});
