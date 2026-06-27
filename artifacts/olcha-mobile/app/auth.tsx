import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError("Display name is required");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), displayName.trim(), password);
      }
      router.replace("/" as never);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#1a0038", "#0a001a", colors.background]}
        style={[StyleSheet.absoluteFill, { height: "60%" }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 40, paddingBottom: botPad + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Text style={[styles.logoText, { color: colors.cyan }]}>OlCha</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              The AI-powered super social platform
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modeTabs, { backgroundColor: colors.surface ?? colors.background }]}>
              {(["login", "register"] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.modeTab,
                    mode === m && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => { setMode(m); setError(""); }}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      { color: mode === m ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {m === "login" ? "Sign In" : "Sign Up"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.fields}>
              {mode === "register" && (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Display Name</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground ?? colors.background, borderColor: colors.border }]}>
                    <Feather name="user" size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Your name"
                      placeholderTextColor={colors.placeholder ?? colors.mutedForeground}
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Username</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground ?? colors.background, borderColor: colors.border }]}>
                  <Feather name="at-sign" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="username"
                    placeholderTextColor={colors.placeholder ?? colors.mutedForeground}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground ?? colors.background, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.placeholder ?? colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                  />
                  <Pressable onPress={() => setShowPass((v) => !v)}>
                    <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.red + "22", borderColor: colors.red + "44" }]}>
                <Feather name="alert-circle" size={14} color={colors.red} />
                <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.terms, { color: colors.mutedForeground }]}>
            By continuing, you agree to OlCha's Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logoWrap: { alignItems: "center", marginBottom: 36, gap: 6 },
  logoText: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    fontFamily: "Inter_700Bold",
  },
  tagline: { fontSize: 14, textAlign: "center" },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modeTabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modeTabText: { fontSize: 14, fontWeight: "600" },
  fields: { gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  terms: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
