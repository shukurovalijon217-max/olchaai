import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { AuroraBorder } from "@/components/AuroraBorder";

const { width: W } = Dimensions.get("window");
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

  const submit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) { setError("Barcha maydonlarni to'ldiring"); return; }
    if (mode === "register" && !displayName.trim()) { setError("Ism kiritilishi shart"); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), displayName.trim(), password);
      router.replace("/" as never);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[a.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#1a0050", "#0d0030", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "55%" }]}
      />
      <View style={[a.orb1, { backgroundColor: "rgba(120,87,255,0.2)" }]} />
      <View style={[a.orb2, { backgroundColor: "rgba(34,211,238,0.1)" }]} />
      <View style={[a.orb3, { backgroundColor: "rgba(236,72,153,0.1)" }]} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[a.scroll, { paddingTop: topPad + 32, paddingBottom: botPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={a.logoWrap}>
            <LinearGradient
              colors={["#7857ff", "#22d3ee", "#ec4899"]}
              start={{ x:0,y:0 }} end={{ x:1,y:1 }}
              style={a.logoCircle}
            >
              <Text style={a.logoIcon}>✦</Text>
            </LinearGradient>
            <LinearGradient colors={["#7857ff", "#22d3ee"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }}>
              <Text style={a.logoTxt}>OlchaAI</Text>
            </LinearGradient>
            <Text style={[a.tagline, { color: colors.mutedForeground }]}>
              Kelajak ijtimoiy platformasi
            </Text>
          </View>

          <AuroraBorder
            colors={["#7857ff", "#9d19ff", "#22d3ee"]}
            radius={20}
            innerBg={colors.card}
            style={{ marginTop: 28 }}
          >
            <View style={a.cardInner}>
              <View style={[a.modeTabs, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                {(["login", "register"] as Mode[]).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => { setMode(m); setError(""); }}
                    style={{ flex: 1 }}
                  >
                    {m === mode ? (
                      <LinearGradient colors={["#7857ff", "#9d19ff"]} style={a.modeActive}>
                        <Text style={[a.modeTxt, { color: "#fff" }]}>
                          {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={a.modeInactive}>
                        <Text style={[a.modeTxt, { color: colors.mutedForeground }]}>
                          {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={a.fields}>
                {mode === "register" && (
                  <View style={a.field}>
                    <Text style={[a.label, { color: colors.mutedForeground }]}>Ism</Text>
                    <View style={[a.input, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border }]}>
                      <Feather name="user" size={15} color={colors.mutedForeground} />
                      <TextInput
                        style={[a.inputTxt, { color: colors.text }]}
                        placeholder="To'liq ismingiz"
                        placeholderTextColor={colors.mutedForeground}
                        value={displayName} onChangeText={setDisplayName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={a.field}>
                  <Text style={[a.label, { color: colors.mutedForeground }]}>Username</Text>
                  <View style={[a.input, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border }]}>
                    <Feather name="at-sign" size={15} color={colors.mutedForeground} />
                    <TextInput
                      style={[a.inputTxt, { color: colors.text }]}
                      placeholder="username"
                      placeholderTextColor={colors.mutedForeground}
                      value={username} onChangeText={setUsername}
                      autoCapitalize="none" autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={a.field}>
                  <Text style={[a.label, { color: colors.mutedForeground }]}>Parol</Text>
                  <View style={[a.input, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border }]}>
                    <Feather name="lock" size={15} color={colors.mutedForeground} />
                    <TextInput
                      style={[a.inputTxt, { color: colors.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.mutedForeground}
                      value={password} onChangeText={setPassword}
                      secureTextEntry={!showPass}
                    />
                    <Pressable onPress={() => setShowPass(v=>!v)}>
                      <Feather name={showPass ? "eye-off" : "eye"} size={15} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {error ? (
                <View style={[a.errorBox, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)" }]}>
                  <Feather name="alert-circle" size={14} color={colors.red ?? "#ef4444"} />
                  <Text style={[a.errorTxt, { color: colors.red ?? "#ef4444" }]}>{error}</Text>
                </View>
              ) : null}

              <LinearGradient colors={["#7857ff", "#9d19ff"]} style={a.submitGrad}>
                <Pressable style={a.submitBtn} onPress={submit} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name={mode==="login" ? "log-in" : "user-plus"} size={17} color="#fff" />
                      <Text style={a.submitTxt}>
                        {mode === "login" ? "Kirish" : "Hisob yaratish"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </LinearGradient>
            </View>
          </AuroraBorder>

          <Text style={[a.terms, { color: colors.mutedForeground }]}>
            Davom etish orqali siz OlchaAI foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const a = StyleSheet.create({
  container: { flex: 1 },
  orb1: { position: "absolute", width: 250, height: 250, borderRadius: 125, top: -80, left: -80 },
  orb2: { position: "absolute", width: 180, height: 180, borderRadius: 90, top: 60, right: -60 },
  orb3: { position: "absolute", width: 200, height: 200, borderRadius: 100, top: 200, left: W*0.3 },
  scroll: { paddingHorizontal: 20, alignItems: "center" },
  logoWrap: { alignItems: "center", gap: 6 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logoIcon: { fontSize: 32, color: "#fff" },
  logoTxt: { fontSize: 42, fontWeight: "800", letterSpacing: -1, color: "transparent" },
  tagline: { fontSize: 14, marginTop: 2 },
  cardInner: { padding: 20, gap: 16 },
  modeTabs: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 3 },
  modeActive: { borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  modeInactive: { paddingVertical: 9, alignItems: "center" },
  modeTxt: { fontSize: 14, fontWeight: "700" },
  fields: { gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  inputTxt: { flex: 1, fontSize: 15, padding: 0 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  errorTxt: { fontSize: 13, flex: 1 },
  submitGrad: { borderRadius: 14 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  submitTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  terms: { fontSize: 11, textAlign: "center", marginTop: 20, paddingHorizontal: 20, lineHeight: 16 },
});
