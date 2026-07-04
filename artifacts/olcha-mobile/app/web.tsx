import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const NEXUS_ORIGIN = DOMAIN ? `https://${DOMAIN}` : "http://localhost:18245";

export default function WebScreen() {
  const params = useLocalSearchParams<{ path?: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const wvRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const path = params.path ?? "/";
  const url = `${NEXUS_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && wvRef.current) {
        wvRef.current.goBack();
        return true;
      }
      router.back();
      return true;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    wvRef.current?.reload();
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top, backgroundColor: "#060d1a" }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color="#eef2f8" />
        </Pressable>
        <Text style={s.headerTxt} numberOfLines={1}>
          {params.title ?? "OlchaAI"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading && !error && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#7857ff" />
          <Text style={s.loadingTxt}>Yuklanmoqda...</Text>
        </View>
      )}
      {error && (
        <View style={s.errorWrap}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTxt}>Ulanishda xatolik yuz berdi</Text>
          <Pressable style={s.retryBtn} onPress={handleRetry}>
            <Text style={s.retryTxt}>Qayta urinish</Text>
          </Pressable>
        </View>
      )}
      {/* @ts-ignore WebView type overload conflict with react-native-webview */}
      <WebView
        ref={wvRef}
        source={{ uri: url }}
        style={[s.webview, (loading || error) && { opacity: 0, position: "absolute" }]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={false}
        bounces={false}
        allowsFullscreenVideo
        userAgent={`OlchaAI/1.0 Mobile/${Platform.OS} (${Platform.Version})`}
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onNavigationStateChange={(nav: { canGoBack: boolean }) => setCanGoBack(nav.canGoBack)}
        onContentProcessDidTerminate={() => wvRef.current?.reload()}
        injectedJavaScriptBeforeContentLoaded={`
          window.__OLCHA_NATIVE__ = true;
          window.__OLCHA_PLATFORM__ = '${Platform.OS}';
          true;
        `}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTxt: { flex: 1, textAlign: "center", color: "#eef2f8", fontSize: 15, fontWeight: "700" },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#060d1a",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 10,
  },
  loadingTxt: { color: "#7a8fa8", fontSize: 14 },
  errorWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#060d1a",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
    zIndex: 10,
  },
  errorIcon: { fontSize: 40 },
  errorTxt: { color: "#eef2f8", fontSize: 16, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#7857ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
