import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

const WEB_URL = "https://olchaai.com/";

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
          src={WEB_URL}
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

function NativeWebView() {
  // @ts-ignore — dynamic import for native only
  const WebView = require("react-native-webview").WebView;
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: "#060d1a" }}>
      {loading && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#7857ff" />
          <Text style={s.loadingTxt}>GilosAI yuklanmoqda...</Text>
        </View>
      )}
      <WebView
        source={{ uri: WEB_URL }}
        style={{ flex: 1, opacity: loading ? 0 : 1 }}
        onLoadEnd={() => setLoading(false)}
        // Media
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        // JS & Storage
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        // Geolocation
        geolocationEnabled
        // Android performance
        androidHardwareAccelerationDisabled={false}
        renderToHardwareTextureAndroid
        overScrollMode="never"
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        setSupportMultipleWindows={false}
        startInLoadingState={false}
        // Scroll
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        decelerationRate="normal"
      />
    </View>
  );
}

export default function GilosAIApp() {
  if (Platform.OS === "web") return <IframeShell />;
  return <NativeWebView />;
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#060d1a",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingTxt: { color: "#7a8fa8", fontSize: 14 },
});
