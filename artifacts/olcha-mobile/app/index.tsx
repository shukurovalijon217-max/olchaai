import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const NEXUS_URL = DOMAIN ? `https://${DOMAIN}/` : "http://localhost:18245/";

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
          <Text style={s.loadingTxt}>OlchaAI yuklanmoqda...</Text>
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
          title="OlchaAI"
        />
      )}
    </View>
  );
}

function NativeShell() {
  const insets = useSafeAreaInsets();
  const wvRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && wvRef.current) {
        wvRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    wvRef.current?.reload();
  }, []);

  return (
    <View style={[s.container, { paddingTop: 0, backgroundColor: "#060d1a" }]}>
      {loading && !error && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#7857ff" />
          <Text style={s.loadingTxt}>OlchaAI yuklanmoqda...</Text>
        </View>
      )}
      {error && (
        <View style={s.errorWrap}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTxt}>Ulanishda xatolik yuz berdi</Text>
          <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
            <Text style={s.retryTxt}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* @ts-ignore WebView type overload conflict with react-native-webview */}
      <WebView
        ref={wvRef}
        source={{ uri: NEXUS_URL }}
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

export default function OlchaAIApp() {
  if (Platform.OS === "web") return <IframeShell />;
  return <NativeShell />;
}

const s = StyleSheet.create({
  container: { flex: 1 },
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
