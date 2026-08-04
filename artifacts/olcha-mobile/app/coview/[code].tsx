/**
 * CoView Screen — Mobile
 * Matches the web CoViewPage.tsx behavior:
 *  - Host: play/pause/seek controls, heartbeat sync every 5 s
 *  - Viewer: auto-corrects drift > 2 s on coview_sync
 *  - All members: real-time chat via the same WebSocket room
 *
 * Video is rendered inside a WebView (no expo-av dependency) with
 * postMessage ↔ window.ReactNativeWebView.postMessage bridge.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}
interface ContentInfo {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  title?: string | null;
}
interface Room {
  id: number;
  hostId: number;
  contentType: string;
  contentId: number;
  status: string;
  inviteCode: string;
  memberCount: number;
  members: Member[];
  content?: ContentInfo | null;
}
interface ChatMsg {
  fromId: number;
  text: string;
  ts: number;
  displayName?: string;
}

// ─── Inline HTML video player ─────────────────────────────────────────────────
// Receives postMessage: { cmd: 'play'|'pause'|'seek', time?: number }
// Sends    postMessage: { event: 'timeupdate'|'playing'|'paused', time: number }

function buildVideoHtml(videoUrl: string, thumbnailUrl?: string | null): string {
  const poster = thumbnailUrl ? `poster="${thumbnailUrl}"` : "";
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden; }
  video { width:100%; max-height:100vh; object-fit:contain; display:block; }
</style>
</head>
<body>
<video id="v" ${poster} playsinline webkit-playsinline preload="metadata">
  <source src="${videoUrl}">
</video>
<script>
  var v = document.getElementById('v');
  function post(obj) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
  }
  v.addEventListener('timeupdate', function() {
    post({ event: 'timeupdate', time: v.currentTime });
  });
  v.addEventListener('play',  function() { post({ event: 'playing', time: v.currentTime }); });
  v.addEventListener('pause', function() { post({ event: 'paused',  time: v.currentTime }); });
  v.addEventListener('seeked', function() { post({ event: 'seeked', time: v.currentTime }); });
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.cmd === 'play')  { v.play(); }
      if (msg.cmd === 'pause') { v.pause(); }
      if (msg.cmd === 'seek')  { v.currentTime = msg.time; }
      if (msg.cmd === 'playAt') { v.currentTime = msg.time; v.play(); }
    } catch(err) {}
  });
  // iOS Safari needs explicit load call
  v.load();
</script>
</body>
</html>`;
}

// ─── CoView Screen ────────────────────────────────────────────────────────────

export default function CoViewScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, token } = useAuth();

  const roomCode = (code ?? "").toUpperCase();
  const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  const WS_URL  = `wss://${process.env.EXPO_PUBLIC_DOMAIN}/go/ws`;

  const [room, setRoom]             = useState<Room | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [syncTime, setSyncTime]     = useState(0);
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [msgInput, setMsgInput]     = useState("");
  const [copied, setCopied]         = useState(false);

  // Join-screen state (when code === "new" or missing)
  const [joinCode, setJoinCode]     = useState("");
  const [joining, setJoining]       = useState(false);
  const [showJoin, setShowJoin]     = useState(false);

  const wsRef      = useRef<WebSocket | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const flatRef    = useRef<FlatList | null>(null);
  const isHost     = room?.hostId === user?.id;

  // ── WebView bridge ──────────────────────────────────────────────────────────

  const sendToVideo = useCallback((cmd: object) => {
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(cmd))}}));true;`
    );
  }, []);

  const handleVideoMsg = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as {
          event: string; time: number;
        };
        if (msg.event === "timeupdate") {
          setSyncTime(Math.floor(msg.time));
        }
        // Host: on play/pause events from the video element, send sync to viewers
        if (isHost && wsRef.current?.readyState === 1) {
          if (msg.event === "playing") {
            setIsPlaying(true);
            wsRef.current.send(JSON.stringify({
              type: "coview_sync", roomId: roomCode,
              payload: { playing: true, time: msg.time },
            }));
          }
          if (msg.event === "paused") {
            setIsPlaying(false);
            wsRef.current.send(JSON.stringify({
              type: "coview_sync", roomId: roomCode,
              payload: { playing: false, time: msg.time },
            }));
          }
          if (msg.event === "seeked") {
            wsRef.current.send(JSON.stringify({
              type: "coview_sync", roomId: roomCode,
              payload: { playing: isPlaying, time: msg.time },
            }));
          }
        }
      } catch { /* ignore */ }
    },
    [isHost, roomCode, isPlaying]
  );

  // ── WebSocket ───────────────────────────────────────────────────────────────

  const connect = useCallback(
    (rc: string, roomData: Room) => {
      if (!user?.id) return;
      const amHost = roomData.hostId === user.id;
      const url = `${WS_URL}?userId=${user.id}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({
          type: "coview_join", roomId: rc,
          payload: { isHost: amHost, hostId: roomData.hostId },
        }));
      };
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);

          if (msg.type === "coview_chat") {
            const cm: ChatMsg = {
              fromId: msg.fromId,
              text: msg.payload?.text ?? "",
              ts: msg.ts,
              displayName: msg.payload?.displayName,
            };
            setMessages((prev) => [...prev, cm]);
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
          }

          // Server sends current sync state when a member joins
          if (msg.type === "coview_joined") {
            const playing = msg.isPlaying ?? false;
            const t = msg.syncTime ?? 0;
            setSyncTime(t);
            setIsPlaying(playing);
            if (!amHost) {
              if (playing) sendToVideo({ cmd: "playAt", time: t });
              else         sendToVideo({ cmd: "seek",   time: t });
            }
          }

          // Ongoing sync broadcast from host
          if (msg.type === "coview_sync") {
            const t = msg.payload?.time ?? 0;
            const playing = msg.payload?.playing ?? false;
            setSyncTime(Math.floor(t));
            setIsPlaying(playing);
            // Viewers only: apply drift correction
            if (!amHost) {
              // We don't know the exact current time without tracking it;
              // always apply since mobile can't query the WebView synchronously.
              if (playing) sendToVideo({ cmd: "playAt", time: t });
              else {
                sendToVideo({ cmd: "seek",  time: t });
                sendToVideo({ cmd: "pause" });
              }
            }
          }
        } catch { /* ignore */ }
      };
      wsRef.current = ws;
    },
    [user, token, WS_URL, sendToVideo]
  );

  // ── Host heartbeat ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isHost || !wsConnected || !isPlaying) return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: "coview_sync",
          roomId: roomCode,
          payload: { playing: true, time: syncTime },
        }));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, wsConnected, isPlaying, roomCode, syncTime]);

  // ── Room fetch ──────────────────────────────────────────────────────────────

  const fetchRoom = useCallback(async (rc: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/coview/rooms/${rc}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setError("Room not found"); return; }
      const data: Room = await res.json();
      setRoom(data);
      connect(rc, data);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, connect]);

  useEffect(() => {
    if (!roomCode || roomCode === "NEW") {
      setLoading(false);
      setShowJoin(true);
    } else {
      fetchRoom(roomCode);
    }
    return () => { wsRef.current?.close(); };
  }, [roomCode]);

  // ── Join ────────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/api/coview/rooms/${joinCode.trim()}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        router.replace(`/coview/${joinCode.trim().toUpperCase()}` as any);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Room not found");
      }
    } catch {
      setError("Connection error");
    } finally {
      setJoining(false);
    }
  };

  // ── Chat ────────────────────────────────────────────────────────────────────

  const sendMsg = () => {
    if (!msgInput.trim() || wsRef.current?.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({
      type: "coview_chat",
      roomId: roomCode,
      payload: {
        text: msgInput.trim(),
        displayName: user?.displayName ?? user?.username,
      },
    }));
    setMessages((prev) => [
      ...prev,
      {
        fromId: user?.id ?? 0,
        text: msgInput.trim(),
        ts: Date.now(),
        displayName: user?.displayName ?? user?.username,
      },
    ]);
    setMsgInput("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // ── Host controls ───────────────────────────────────────────────────────────

  const togglePlayPause = () => {
    if (!isHost) return;
    if (isPlaying) {
      sendToVideo({ cmd: "pause" });
      // The paused event from the video will fire handleVideoMsg, which sends WS sync
    } else {
      sendToVideo({ cmd: "play" });
    }
  };

  const seekBy = (delta: number) => {
    if (!isHost) return;
    const newTime = Math.max(0, syncTime + delta);
    sendToVideo({ cmd: "seek", time: newTime });
    setSyncTime(newTime);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: "coview_sync", roomId: roomCode,
        payload: { playing: isPlaying, time: newTime },
      }));
    }
  };

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderMsg = ({ item, index }: { item: ChatMsg; index: number }) => {
    const isMe = item.fromId === user?.id;
    return (
      <View key={index} style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.avatar, { backgroundColor: isMe ? colors.primary : colors.glass }]}>
          <Text style={s.avatarText}>
            {((item.displayName ?? "?")[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View style={[s.bubble, isMe ? { backgroundColor: colors.primary } : { backgroundColor: colors.card }]}>
          {!isMe && (
            <Text style={[s.bubbleName, { color: colors.mutedForeground }]}>
              {item.displayName}
            </Text>
          )}
          <Text style={[s.bubbleText, { color: "#fff" }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  // ─── Join screen ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showJoin && !room) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[s.joinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#7857ff22", "#060d1a00"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.joinIcon}>
            <Feather name="tv" size={22} color={colors.primary} />
          </View>
          <Text style={[s.joinTitle, { color: colors.text }]}>Join CoView</Text>
          <Text style={[s.joinSub, { color: colors.mutedForeground }]}>
            Enter a room code to watch together
          </Text>
          {error && (
            <Text style={[s.errorText, { color: colors.red }]}>{error}</Text>
          )}
          <TextInput
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            onSubmitEditing={handleJoin}
            placeholder="ROOM CODE"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            maxLength={8}
            style={[s.joinInput, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }]}
          />
          <Pressable
            onPress={handleJoin}
            disabled={!joinCode.trim() || joining}
            style={[s.joinBtn, { opacity: !joinCode.trim() || joining ? 0.5 : 1 }]}
          >
            <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.joinBtnGrad}>
              {joining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.joinBtnText}>Join Session</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
        <Text style={[s.errorBig, { color: colors.mutedForeground }]}>
          {error ?? "Room not found"}
        </Text>
        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={[s.backLinkText, { color: colors.primary }]}>← Go back</Text>
        </Pressable>
      </View>
    );
  }

  const videoHtml = room.content?.videoUrl
    ? buildVideoHtml(room.content.videoUrl, room.content.thumbnailUrl)
    : null;

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Feather name="tv" size={16} color={colors.primary} />
          <Text style={[s.headerTitle, { color: colors.text }]}>CoView</Text>
          <View style={[s.dot, { backgroundColor: wsConnected ? colors.green : colors.red }]} />
        </View>
        <View style={s.headerRight}>
          <Text style={[s.inviteCode, { color: colors.primary }]}>{room.inviteCode}</Text>
          <Text style={[s.memberCount, { color: colors.mutedForeground }]}>
            {room.memberCount} watching
          </Text>
        </View>
      </View>

      {/* Video area */}
      <View style={s.videoWrap}>
        {videoHtml ? (
          <WebView
            ref={webViewRef}
            source={{ html: videoHtml }}
            style={s.webview}
            onMessage={handleVideoMsg}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            javaScriptEnabled
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
          />
        ) : (
          <View style={[s.noVideo, { backgroundColor: "#0f0820" }]}>
            <LinearGradient colors={["#7857ff33", "#060d1a"]} style={StyleSheet.absoluteFill} />
            <Feather name="tv" size={36} color={colors.primary} />
            <Text style={[s.noVideoText, { color: colors.mutedForeground }]}>
              {room.contentType} #{room.contentId}
            </Text>
          </View>
        )}

        {/* Overlay: time + members */}
        <View style={s.overlay}>
          <View style={s.overlayLeft}>
            <Feather name="wifi" size={11} color={wsConnected ? colors.green : colors.red} />
            <Text style={s.overlayText}>{room.memberCount}</Text>
          </View>
          <Text style={s.overlayTime}>{fmtTime(syncTime)}</Text>
        </View>
      </View>

      {/* Playback controls — host only */}
      {isHost ? (
        <View style={[s.controls, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[s.hostLabel, { color: colors.primary }]}>HOST</Text>
          <Pressable onPress={() => seekBy(-10)} style={s.ctrlBtn}>
            <Feather name="rotate-ccw" size={18} color={colors.text} />
            <Text style={[s.ctrlLabel, { color: colors.mutedForeground }]}>10s</Text>
          </Pressable>
          <Pressable onPress={togglePlayPause} style={s.playBtn}>
            <LinearGradient
              colors={isPlaying ? ["#ef4444", "#dc2626"] : ["#7857ff", "#9d19ff"]}
              style={s.playBtnGrad}
            >
              <Feather name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => seekBy(10)} style={s.ctrlBtn}>
            <Feather name="rotate-cw" size={18} color={colors.text} />
            <Text style={[s.ctrlLabel, { color: colors.mutedForeground }]}>10s</Text>
          </Pressable>
          <Text style={[s.syncStatus, { color: colors.mutedForeground }]}>
            {isPlaying ? "▶ Playing" : "⏸ Paused"}
          </Text>
        </View>
      ) : (
        <View style={[s.viewerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Feather
            name={isPlaying ? "volume-2" : "pause"}
            size={14}
            color={isPlaying ? colors.green : colors.mutedForeground}
          />
          <Text style={[s.viewerText, { color: colors.mutedForeground }]}>
            {isPlaying ? "Synced — playing" : "Synced — paused"}
          </Text>
        </View>
      )}

      {/* Chat */}
      <View style={[s.chatWrap, { borderColor: colors.border }]}>
        <View style={[s.chatHeader, { borderBottomColor: colors.border }]}>
          <Feather name="message-circle" size={14} color={colors.mutedForeground} />
          <Text style={[s.chatHeaderText, { color: colors.mutedForeground }]}>Live Chat</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMsg}
          contentContainerStyle={s.chatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[s.chatEmpty, { color: colors.mutedForeground }]}>
              No messages yet — say something!
            </Text>
          }
        />

        <View style={[s.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            value={msgInput}
            onChangeText={setMsgInput}
            onSubmitEditing={sendMsg}
            placeholder="Say something…"
            placeholderTextColor={colors.placeholder}
            returnKeyType="send"
            style={[s.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }]}
          />
          <Pressable onPress={sendMsg} style={s.sendBtn}>
            <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.sendBtnGrad}>
              <Feather name="send" size={16} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={{ height: insets.bottom }} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },

  // Header
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter:{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  headerRight: { alignItems: "flex-end" },
  inviteCode:  { fontSize: 12, fontWeight: "800", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  memberCount: { fontSize: 10 },

  // Video
  videoWrap:   { aspectRatio: 16 / 9, width: "100%", backgroundColor: "#000", position: "relative" },
  webview:     { flex: 1, backgroundColor: "#000" },
  noVideo:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  noVideoText: { fontSize: 12 },
  overlay:     {
    position: "absolute", bottom: 6, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  overlayLeft: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  overlayText: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  overlayTime: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontVariant: ["tabular-nums"], backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },

  // Controls
  controls:    { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  hostLabel:   { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  ctrlBtn:     { alignItems: "center", gap: 2 },
  ctrlLabel:   { fontSize: 9 },
  playBtn:     { marginHorizontal: 8 },
  playBtnGrad: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  syncStatus:  { fontSize: 11, flex: 1, textAlign: "right" },

  viewerBar:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  viewerText:  { fontSize: 12 },

  // Chat
  chatWrap:    { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  chatHeader:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  chatHeaderText: { fontSize: 12, fontWeight: "600" },
  chatList:    { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chatEmpty:   { textAlign: "center", fontSize: 12, paddingTop: 20 },

  msgRow:      { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  msgRowMe:    { flexDirection: "row-reverse" },
  avatar:      { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText:  { fontSize: 10, color: "#fff", fontWeight: "700" },
  bubble:      { maxWidth: "76%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleName:  { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  bubbleText:  { fontSize: 13 },

  inputRow:    { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input:       { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  sendBtn:     {},
  sendBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  // Join screen
  joinCard:    { width: "100%", maxWidth: 340, borderRadius: 24, padding: 24, borderWidth: 1, alignItems: "center", gap: 12, overflow: "hidden" },
  joinIcon:    { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(120,87,255,0.15)", alignItems: "center", justifyContent: "center" },
  joinTitle:   { fontSize: 20, fontWeight: "800" },
  joinSub:     { fontSize: 13, textAlign: "center" },
  joinInput:   { width: "100%", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  joinBtn:     { width: "100%", borderRadius: 14, overflow: "hidden" },
  joinBtnGrad: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  errorText:   { fontSize: 13 },
  errorBig:    { fontSize: 15, marginTop: 12 },
  backLink:    { marginTop: 8 },
  backLinkText:{ fontSize: 14, fontWeight: "600" },
});
