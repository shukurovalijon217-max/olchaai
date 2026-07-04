import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useRequestUploadUrl, useUpdateUser } from "@workspace/api-client-react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();
  const { mutateAsync: updateProfile } = useUpdateUser();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    setLoading(true);
    try {
      const fileName = asset.uri.split("/").pop() || "avatar.jpg";
      const contentType = "image/jpeg"; // Simplified for now
      
      const { uploadURL, objectPath } = await requestUploadUrl({
        data: {
          name: fileName,
          size: asset.fileSize || 1000,
          contentType,
        }
      });

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      if (!putRes.ok) throw new Error("Fayl yuklanmadi");

      const finalUrl = `${API_BASE}/api/storage${objectPath}`;
      setAvatarUrl(finalUrl);
    } catch (e) {
      console.error(e);
      Alert.alert("Xato", "Rasmni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await updateProfile({
        id: user.id,
        data: {
          displayName,
          bio,
          avatarUrl,
        }
      });
      updateUser({ displayName, bio, avatarUrl });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Xato", "Profilni yangilashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#1a0050", "#0d0030", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "40%" }]}
      />
      
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Profilni tahrirlash</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[s.scroll, { paddingBottom: botPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.avatarSection}>
            <Pressable onPress={pickImage} style={s.avatarWrap}>
              <LinearGradient
                colors={["#7857ff", "#9d19ff", "#22d3ee"]}
                style={s.avatarRing}
              >
                <View style={[s.avatarInner, { backgroundColor: colors.background }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }]}>
                       <Feather name="user" size={40} color={colors.mutedForeground} />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <View style={[s.editBadge, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={14} color="#fff" />
              </View>
            </Pressable>
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Ko'rinadigan ism</Text>
              <AuroraBorder radius={12} innerBg={colors.card}>
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ismingizni kiriting"
                  placeholderTextColor={colors.mutedForeground}
                />
              </AuroraBorder>
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Biografiya</Text>
              <AuroraBorder radius={12} innerBg={colors.card}>
                <TextInput
                  style={[s.input, { color: colors.text, minHeight: 100, textAlignVertical: 'top' }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="O'zingiz haqingizda yozing..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={4}
                />
              </AuroraBorder>
            </View>
          </View>

          <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.saveBtnWrap}>
            <Pressable style={s.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={s.saveBtnTxt}>Saqlash</Text>
                </>
              )}
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarWrap: { position: "relative" },
  avatarRing: { width: 120, height: 120, borderRadius: 60, padding: 3 },
  avatarInner: { width: 114, height: 114, borderRadius: 57, overflow: "hidden" },
  avatar: { width: 114, height: 114 },
  editBadge: { 
    position: "absolute", 
    bottom: 0, 
    right: 0, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    borderWidth: 3, 
    borderColor: "#0d0030",
    alignItems: "center", 
    justifyContent: "center",
  },
  form: { gap: 20, marginBottom: 32 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginLeft: 4 },
  input: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  saveBtnWrap: { borderRadius: 16 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
