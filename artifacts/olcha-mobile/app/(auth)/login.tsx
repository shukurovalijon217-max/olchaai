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
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

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
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Background glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoOuter}>
            <LinearGradient
              colors={["rgba(192,57,43,0.3)", "rgba(184,134,11,0.2)"]}
              style={styles.logoGradRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.logoBallWrap, { backgroundColor: colors.background }]}>
                <LinearGradient
                  colors={["#C0392B", "#B8860B"]}
                  style={styles.logoBall}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.logoText}>OlCha</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Yagona AI super ijtimoiy platforma
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabSwitcher, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tabBtn, activeTab === "login" && { backgroundColor: colors.primary }]}
            onPress={() => { setActiveTab("login"); setError(""); }}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === "login" ? "#fff" : colors.mutedForeground }]}>Kirish</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === "register" && { backgroundColor: colors.primary }]}
            onPress={() => { setActiveTab("register"); router.push("/(auth)/register"); }}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === "register" ? "#fff" : colors.mutedForeground }]}>Ro'yxat</Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "rgba(192,57,43,0.1)", borderColor: colors.primary }]}>
              <Feather name="alert-circle" size={14} color={colors.primary} />
              <Text style={[styles.errorText, { color: colors.primary }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldLabel}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>EMAIL</Text>
          </View>
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="siz@olcha.uz"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={[styles.fieldLabel, { marginTop: 14 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PAROL</Text>
          </View>
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPass((v) => !v)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={["#C0392B", "#a93226"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>OlCha'ga kirish</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.switchBtn} onPress={() => router.push("/(auth)/register")}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            Akkauntingiz yo'qmi?{" "}
            <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold" }}>Ro'yxatdan o'ting</Text>
          </Text>
        </Pressable>

        {/* Bottom features */}
        <View style={styles.featureRow}>
          {[
            { icon: "zap", label: "AI Lenta" },
            { icon: "shield", label: "Xavfsiz" },
            { icon: "globe", label: "Ko'p til" },
          ].map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: "rgba(192,57,43,0.12)", borderColor: "rgba(192,57,43,0.2)" }]}>
                <Feather name={f.icon as "zap"} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGlow1: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(192,57,43,0.06)",
  },
  bgGlow2: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(184,134,11,0.05)",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 32 },
  logoOuter: { marginBottom: 16 },
  logoGradRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBallWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBall: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  logoText: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    color: "#B8860B",
    marginBottom: 6,
  },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  tabSwitcher: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  form: {
    borderRadius: 20,
    borderWidth: 0.5,
    padding: 20,
    gap: 0,
    marginBottom: 16,
  },
  fieldLabel: { marginBottom: 6 },
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    overflow: "hidden",
    shadowColor: "#C0392B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchBtn: { alignItems: "center", paddingVertical: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  featureRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 16 },
  featureItem: { alignItems: "center", gap: 6 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
