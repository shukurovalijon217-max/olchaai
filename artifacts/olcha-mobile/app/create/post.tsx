import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useCreatePost, useRequestUploadUrl } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createPost = useCreatePost();
  const requestUpload = useRequestUploadUrl();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const handleCreate = async () => {
    if (!content.trim() && !media) {
      setError("Post mazmuni yoki rasm bo'lishi shart");
      return;
    }

    if (!user) return;

    setLoading(true);
    setError("");

    try {
      let mediaUrl: string | undefined;

      if (media) {
        const fileRes = await fetch(media.uri);
        const blob = await fileRes.blob();
        
        const { uploadURL, objectPath } = await requestUpload.mutateAsync({
          data: {
            name: media.fileName || `post_${Date.now()}.jpg`,
            size: blob.size,
            contentType: blob.type || "image/jpeg",
          },
        });

        await fetch(uploadURL, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": blob.type || "image/jpeg" },
        });

        mediaUrl = `${API_BASE}/api/storage${objectPath}`;
      }

      await createPost.mutateAsync({
        data: {
          authorId: user.id,
          content: content.trim(),
          type: mediaUrl ? "photo" : "text",
          mediaUrl,
        },
      });

      router.replace("/(tabs)/feed");
    } catch (e: any) {
      setError(e.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Yangi Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Nima yangiliklar?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              value={content}
              onChangeText={setContent}
            />

            {media && (
              <View style={s.mediaPreview}>
                <Image source={{ uri: media.uri }} style={s.image} />
                <Pressable onPress={() => setMedia(null)} style={s.removeMedia}>
                  <Feather name="x" size={16} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>

          <View style={s.actions}>
            <Pressable onPress={pickImage} style={[s.actionBtn, { backgroundColor: colors.border }]}>
              <Feather name="image" size={20} color={colors.primary} />
              <Text style={[s.actionTxt, { color: colors.text }]}>Rasm qo'shish</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }]}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.submitGrad}>
            <Pressable style={s.submitBtn} onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={s.submitTxt}>Ulashish</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { padding: 16, gap: 20 },
  inputCard: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 150 },
  input: { fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  mediaPreview: { marginTop: 16, borderRadius: 12, overflow: "hidden", position: "relative" },
  image: { width: "100%", height: 250, resizeMode: "cover" },
  removeMedia: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionTxt: { fontSize: 14, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorTxt: { color: "#ef4444", fontSize: 14, flex: 1 },
  submitGrad: { borderRadius: 14, marginTop: 10 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  submitTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});