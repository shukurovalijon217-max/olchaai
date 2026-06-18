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

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!username || !displayName || !email || !password) {
      setError("Barcha maydonlarni to'ldiring"); return;
    }
    setLoading(true);
    setError("");
    try {
      await register(username.trim(), displayName.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { icon: "user" as const, placeholder: "Ism familiya", value: displayName, onChange: setDisplayName, type: "default" as const, label: "ISM FAMILIYA" },
    { icon: "at-sign" as const, placeholder: "username", value: username, onChange: setUsername, type: "default" as const, label: "USERNAME" },
    { icon: "mail" as const, placeholder: "siz@olcha.uz", value: email, onChange: setEmail, type: "email-address" as const, label: "EMAIL" },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>

        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>Akkaunt yaratish</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            OlCha super platformaga qo'shiling
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "rgba(192,57,43,0.1)", borderColor: colors.primary }]}>
              <Feather name="alert-circle" size={14} color={colors.primary} />
              <Text style={[styles.errorText, { color: colors.primary }]}>{error}</Text>
            </View>
          ) : null}

          {fields.map((field, idx) => (
            <View key={field.label} style={idx > 0 ? { marginTop: 14 } : {}}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name={field.icon} size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.value}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  keyboardType={field.type}
                />
              </View>
            </View>
          ))}

          <View style={{ marginTop: 14 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PAROL</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="••••••••  (min 6 belgi)"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass((v) => !v)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={handleRegister}
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
              <Text style={styles.btnText}>Ro'yxatdan o'tish</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.switchBtn} onPress={() => router.back()}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            Akkauntingiz bormi?{" "}
            <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold" }}>Kirish</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGlow1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(184,134,11,0.05)",
  },
  bgGlow2: {
    position: "absolute",
    bottom: 80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(192,57,43,0.05)",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerArea: { marginBottom: 24 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  form: {
    borderRadius: 20,
    borderWidth: 0.5,
    padding: 20,
    marginBottom: 16,
  },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
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
});
