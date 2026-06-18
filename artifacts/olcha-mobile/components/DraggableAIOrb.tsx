import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const ORB = 52;
const EDGE = 16;
const TAB_BAR_H = 90;
const TOP_SAFE = 80;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function DraggableAIOrb() {
  const { width: W, height: H } = Dimensions.get("window");

  const posX = useRef(W - ORB - EDGE);
  const posY = useRef(H - ORB - TAB_BAR_H - 20);

  const pan = useRef(new Animated.ValueXY({ x: posX.current, y: posY.current })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,

      onPanResponderGrant: () => {
        pan.setOffset({ x: posX.current, y: posY.current });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gs) => {
        const { width: w, height: h } = Dimensions.get("window");
        const nx = clamp(posX.current + gs.dx, EDGE, w - ORB - EDGE);
        const ny = clamp(posY.current + gs.dy, TOP_SAFE, h - ORB - TAB_BAR_H);
        pan.setValue({ x: nx - posX.current, y: ny - posY.current });
      },

      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        const { width: w, height: h } = Dimensions.get("window");
        const nx = clamp(posX.current + gs.dx, EDGE, w - ORB - EDGE);
        const ny = clamp(posY.current + gs.dy, TOP_SAFE, h - ORB - TAB_BAR_H);

        const snapX = nx + ORB / 2 < w / 2 ? EDGE : w - ORB - EDGE;

        posX.current = snapX;
        posY.current = ny;

        Animated.spring(pan, {
          toValue: { x: snapX, y: ny },
          useNativeDriver: false,
          bounciness: 6,
          speed: 16,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.orb, { left: pan.x, top: pan.y }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.inner}>
        <Feather name="zap" size={22} color="#fff" />
        <View style={styles.pulse} />
        <View style={styles.pulse2} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: ORB,
    height: ORB,
    zIndex: 9999,
    elevation: 12,
  },
  inner: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: "#C0392B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  pulse: {
    position: "absolute",
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: (ORB + 10) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(192,57,43,0.4)",
  },
  pulse2: {
    position: "absolute",
    top: -11,
    left: -11,
    right: -11,
    bottom: -11,
    borderRadius: (ORB + 22) / 2,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.2)",
  },
});
