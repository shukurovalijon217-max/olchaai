import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Email va parol kiriting"); return; }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Aurora background */}
      <LinearGradient
        colors={["#070b15", "#0d0a20", "#070b15"]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top glow */}
      <View style={[styles.glowTop, { pointerEvents: "none" } as any]} />
      {/* Bottom glow */}
      <View style={[styles.glowBottom, { pointerEvents: "none" } as any]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            {/* Outer glow ring */}
            <View style={styles.outerGlow}>
              <LinearGradient
                colors={["#7c3aed", "#a855f7", "#ec4899", "#f59e0b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradRing}
              >
                <View style={styles.innerRingBg}>
                  <LinearGradient
                    colors={["#1a0a3d", "#0d1040"]}
                    style={styles.innerRingFill}
                  >
                    <LinearGradient
                      colors={["#7c3aed", "#a855f7"]}
                      style={styles.orbCore}
                    />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.logoText}>OlCha</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Yagona super ijtimoiy platforma
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.4)" }]}>
                <Feather name="alert-circle" size={14} color="#a78bfa" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Parol"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPass((v) => !v)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#7c3aed", "#6d28d9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Kirish</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.switchBtn} onPress={() => router.push("/(auth)/register")}>
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                Akkauntingiz yo'qmi?{" "}
                <Text style={styles.switchLink}>Ro'yxatdan o'ting</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },
  glowTop: {
    position: "absolute",
    top: -60,
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(124,58,237,0.18)",
    transform: [{ scaleX: 1.8 }],
    ...Platform.select({ web: { filter: "blur(60px)" } }),
  },
  glowBottom: {
    position: "absolute",
    bottom: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(168,85,247,0.12)",
    ...Platform.select({ web: { filter: "blur(60px)" } }),
  },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },
  logoArea: { alignItems: "center", marginBottom: 48 },
  outerGlow: {
    marginBottom: 20,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 12,
  },
  gradRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRingBg: {
    flex: 1,
    width: "100%",
    borderRadius: 44,
    overflow: "hidden",
  },
  innerRingFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orbCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  logoText: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    marginBottom: 8,
    color: "#a78bfa",
  },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 14 },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#a78bfa", flex: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  switchBtn: { alignItems: "center", paddingTop: 4 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
});
