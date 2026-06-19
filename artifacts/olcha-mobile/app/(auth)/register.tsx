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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [username, setUsername]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleRegister = async () => {
    if (!username || !displayName || !email || !password) {
      setError("Barcha maydonlarni to'ldiring"); return;
    }
    setLoading(true); setError("");
    try {
      await register(username.trim(), displayName.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally { setLoading(false); }
  };

  const fields = [
    { icon: "user",     placeholder: "Ism familiya", value: displayName, onChange: setDisplayName, type: "default"       as const },
    { icon: "at-sign",  placeholder: "Username",     value: username,    onChange: setUsername,    type: "default"       as const },
    { icon: "mail",     placeholder: "Email",        value: email,       onChange: setEmail,       type: "email-address" as const },
  ];

  return (
    <View style={styles.root}>
      {/* Aurora background */}
      <LinearGradient colors={["#070b15", "#0d0a20", "#070b15"]} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.glowTop,    { pointerEvents: "none" } as any]} />
      <View style={[styles.glowRight,  { pointerEvents: "none" } as any]} />
      <View style={[styles.glowBottom, { pointerEvents: "none" } as any]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <View style={styles.backCircle}>
              <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </Pressable>

          {/* Header */}
          <View style={styles.headerArea}>
            {/* Mini logo */}
            <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.miniOrb}>
              <Text style={styles.miniOrbTxt}>O</Text>
            </LinearGradient>

            <Text style={styles.title}>Akkaunt yaratish</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>OlCha ga qo'shiling</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#a78bfa" style={{ marginRight: 8 }} />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {fields.map((f) => (
              <View key={f.placeholder} style={styles.inputWrap}>
                <Feather name={f.icon as "user"} size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={f.value}
                  onChangeText={f.onChange}
                  autoCapitalize="none"
                  keyboardType={f.type}
                />
              </View>
            ))}

            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Parol (min 6 ta belgi)"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(v => !v)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Terms hint */}
            <Text style={styles.terms}>
              Davom etish orqali{" "}
              <Text style={{ color: "#a78bfa" }}>Foydalanish shartlari</Text>
              {" "}va{" "}
              <Text style={{ color: "#a78bfa" }}>Maxfiylik siyosatiga</Text>
              {" "}rozilik bildirasiz
            </Text>

            {/* Submit button */}
            <Pressable onPress={handleRegister} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient
                colors={["#7c3aed", "#a855f7"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnTxt}>Ro'yxatdan o'tish</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Switch to login */}
          <Pressable style={styles.switchRow} onPress={() => router.back()}>
            <Text style={[styles.switchTxt, { color: colors.mutedForeground }]}>
              Akkauntingiz bormi?{"  "}
              <Text style={styles.switchLink}>Kirish</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070b15" },
  glowTop: {
    position: "absolute", top: -80, left: "30%", marginLeft: -140,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(124,58,237,0.22)",
    ...Platform.select({ web: { filter: "blur(70px)" } }),
  },
  glowRight: {
    position: "absolute", top: "30%", right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(168,85,247,0.14)",
    ...Platform.select({ web: { filter: "blur(50px)" } }),
  },
  glowBottom: {
    position: "absolute", bottom: -60, left: -40,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(59,130,246,0.08)",
    ...Platform.select({ web: { filter: "blur(60px)" } }),
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 8 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  headerArea: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  miniOrb: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  miniOrbTxt: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#e8eaf0", marginBottom: 6, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "rgba(15,22,40,0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 20,
    gap: 12,
    ...Platform.select({ web: { backdropFilter: "blur(20px)" } }),
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  errorBox: {
    backgroundColor: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.4)",
    borderWidth: 1, borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "center",
  },
  errorTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#a78bfa", flex: 1 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(30,42,61,0.8)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16, height: 52, gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  terms: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: "rgba(100,116,139,0.8)", textAlign: "center", lineHeight: 16,
  },
  btn: {
    height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  btnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  switchRow: { alignItems: "center", paddingTop: 20 },
  switchTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
});
