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

        /* snap to nearest horizontal edge */
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
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  pulse: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: (ORB + 12) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.3)",
  },
});
