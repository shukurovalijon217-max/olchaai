import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMediaPlayer } from "@/context/MediaPlayerContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PLAYER_W = W - 32;
const MINI_SIZE = 58;

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function WaveformBars({ playing, color }: { playing: boolean; color: string }) {
  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!playing) {
      anims.forEach(a => Animated.spring(a, { toValue: 0.3, useNativeDriver: false }).start());
      return;
    }
    const loops: Animated.CompositeAnimation[] = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.spring(a, { toValue: 1, speed: 6, useNativeDriver: false }),
          Animated.spring(a, { toValue: 0.3, speed: 6, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [playing, anims]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: 20 }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: a.interpolate({ inputRange: [0, 1], outputRange: [5, 18] }),
          }}
        />
      ))}
    </View>
  );
}

export function FloatingMiniPlayer() {
  const {
    track, isPlaying, position, duration, speed,
    isMini, isExpanded,
    pause, resume, stop, seekTo, setSpeed,
    setMini, setExpanded, dismiss,
  } = useMediaPlayer();

  const pan = useRef(new Animated.ValueXY({ x: W - MINI_SIZE - 20, y: H * 0.6 })).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [orbPulse] = useState(new Animated.Value(1));

  useEffect(() => {
    if (track) {
      Animated.spring(scaleAnim, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }).start();
    } else {
      Animated.spring(scaleAnim, { toValue: 0, speed: 14, useNativeDriver: true }).start();
    }
  }, [track, scaleAnim]);

  useEffect(() => {
    if (!isPlaying) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isPlaying, orbPulse]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        const px = (pan.x as unknown as { _value: number })._value;
        const py = (pan.y as unknown as { _value: number })._value;
        const snapX = px < W / 2 ? 16 : W - MINI_SIZE - 16;
        Animated.spring(pan, { toValue: { x: snapX, y: Math.max(60, Math.min(H - 120, py)) }, useNativeDriver: false }).start();
        if (Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8) {
          setExpanded(true);
          setMini(false);
        }
      },
    })
  ).current;

  const progress = duration > 0 ? position / duration : 0;

  if (!track) return null;

  if (isExpanded) {
    return (
      <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setExpanded(false); setMini(true); }}>
        <View style={[styles.expandedOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(124,58,237,0.18)", "rgba(8,6,20,0.98)", "rgba(8,6,20,1)"]}
            style={StyleSheet.absoluteFill}
          />
        <View style={styles.expandedContent}>
          {/* Artwork / Orb */}
          <Animated.View style={[styles.expandedOrb, { transform: [{ scale: orbPulse }] }]}>
            <LinearGradient colors={["#7c3aed", "#3b82f6", "#06b6d4"]} style={styles.orbGradient}>
              {track.artworkUrl ? null : (
                <Feather name="music" size={48} color="rgba(255,255,255,0.9)" />
              )}
            </LinearGradient>
            {isPlaying && (
              <View style={styles.orbPulseRing} />
            )}
          </Animated.View>

          {/* Track info */}
          <Text style={styles.expandedTitle} numberOfLines={2}>{track.title}</Text>
          {track.artist && <Text style={styles.expandedArtist}>{track.artist}</Text>}

          {/* Waveform */}
          <View style={{ marginVertical: 8 }}>
            <WaveformBars playing={isPlaying} color="#a78bfa" />
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` as `${number}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlRow}>
            <Pressable onPress={() => seekTo(Math.max(0, position - 10000))} style={styles.ctrlBtn}>
              <Feather name="rewind" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Pressable
              onPress={() => isPlaying ? pause() : resume()}
              style={styles.playBtn}>
              <LinearGradient colors={["#7c3aed", "#3b82f6"]} style={styles.playBtnGrad}>
                <Feather name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => seekTo(Math.min(duration, position + 10000))} style={styles.ctrlBtn}>
              <Feather name="fast-forward" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* Speed + Dismiss row */}
          <View style={styles.bottomRow}>
            <Pressable
              onPress={() => setShowSpeedPicker(v => !v)}
              style={[styles.speedChip, speed !== 1 && styles.speedChipActive]}>
              <Feather name="zap" size={12} color={speed !== 1 ? "#e9d5ff" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.speedText, speed !== 1 && { color: "#e9d5ff" }]}>{speed}×</Text>
            </Pressable>
            <Pressable onPress={() => { setExpanded(false); setMini(true); }} style={styles.minimizeBtn}>
              <Feather name="minimize-2" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable onPress={dismiss} style={styles.dismissBtn}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          {/* Speed picker */}
          {showSpeedPicker && (
            <View style={styles.speedPicker}>
              {SPEEDS.map(s => (
                <Pressable
                  key={s}
                  onPress={() => { setSpeed(s); setShowSpeedPicker(false); }}
                  style={[styles.speedOption, speed === s && styles.speedOptionActive]}>
                  <Text style={[styles.speedOptionText, speed === s && { color: "#e9d5ff" }]}>{s}×</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      </Modal>
    );
  }

  return (
    <Animated.View
      style={[styles.miniContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }] }]}
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={["rgba(124,58,237,0.85)", "rgba(59,130,246,0.85)"]}
        style={styles.miniGradient}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Pulsing ring */}
        {isPlaying && (
          <Animated.View style={[styles.miniPulseRing, { transform: [{ scale: orbPulse }] }]} />
        )}

        <View style={styles.miniInner}>
          <WaveformBars playing={isPlaying} color="#fff" />
        </View>

        {/* Tiny control buttons */}
        <View style={styles.miniControls}>
          <Pressable
            onPress={() => { isPlaying ? pause() : resume(); }}
            style={styles.miniBtn}>
            <Feather name={isPlaying ? "pause" : "play"} size={13} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => dismiss()}
            style={styles.miniClose}>
            <Feather name="x" size={10} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  miniContainer: {
    position: "absolute",
    width: MINI_SIZE,
    height: MINI_SIZE,
    zIndex: 9999,
    borderRadius: MINI_SIZE / 2,
    overflow: "hidden",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 20,
  },
  miniGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MINI_SIZE / 2,
    overflow: "hidden",
  },
  miniPulseRing: {
    position: "absolute",
    width: MINI_SIZE + 12,
    height: MINI_SIZE + 12,
    borderRadius: (MINI_SIZE + 12) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.5)",
  },
  miniInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  miniControls: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "column",
    gap: 2,
  },
  miniBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniClose: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  expandedOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  expandedContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingTop: 32,
    alignItems: "center",
  },
  expandedOrb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 20,
  },
  orbGradient: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  orbPulseRing: {
    position: "absolute",
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 2,
    borderColor: "rgba(167,139,250,0.35)",
    top: -12,
    left: -12,
  },
  expandedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  expandedArtist: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  progressContainer: {
    width: "100%",
    marginTop: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#7c3aed",
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    marginLeft: -7,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontVariant: ["tabular-nums"],
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 24,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  playBtnGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  speedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  speedChipActive: {
    backgroundColor: "rgba(124,58,237,0.35)",
    borderColor: "rgba(167,139,250,0.4)",
  },
  speedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  speedPicker: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  speedOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  speedOptionActive: {
    backgroundColor: "rgba(124,58,237,0.45)",
    borderColor: "rgba(167,139,250,0.5)",
  },
  speedOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
  },
});
