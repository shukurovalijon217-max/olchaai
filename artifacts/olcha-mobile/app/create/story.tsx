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
import { useCreateStory, useRequestUploadUrl } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CreateStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createStory = useCreateStory();
  const requestUpload = useRequestUploadUrl();

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const handleCreate = async () => {
    if (!media) {
      setError("Story uchun rasm yoki video tanlang");
      return;
    }

    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const fileRes = await fetch(media.uri);
      const blob = await fileRes.blob();
      
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: {
          name: media.fileName || `story_${Date.now()}.${media.type === 'video' ? 'mp4' : 'jpg'}`,
          size: blob.size,
          contentType: blob.type || (media.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        },
      });

      await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type || (media.type === 'video' ? 'video/mp4' : 'image/jpeg') },
      });

      const mediaUrl = `${API_BASE}/api/storage${objectPath}`;

      await createStory.mutateAsync({
        data: {
          authorId: user.id,
          mediaUrl,
          mediaType: media.type === 'video' ? 'video' : 'photo',
          caption: caption.trim() || undefined,
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Yangi Story</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pickMedia} style={[s.mediaBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {media ? (
              <Image source={{ uri: media.uri }} style={s.mediaPreview} />
            ) : (
              <View style={s.placeholder}>
                <Feather name="plus-circle" size={48} color={colors.primary} />
                <Text style={[s.placeholderTxt, { color: colors.mutedForeground }]}>Rasm yoki Video tanlang</Text>
              </View>
            )}
          </Pressable>

          <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Sarlavha qo'shish..."
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
            />
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }]}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <LinearGradient colors={["#22d3ee", "#7857ff"]} style={s.submitGrad}>
            <Pressable style={s.submitBtn} onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={s.submitTxt}>Storyni ulashish</Text>
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
  mediaBox: { width: "100%", height: 450, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  mediaPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderTxt: { fontSize: 14, fontWeight: "600" },
  inputWrap: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  input: { fontSize: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorTxt: { color: "#ef4444", fontSize: 14, flex: 1 },
  submitGrad: { borderRadius: 14, marginTop: 10 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  submitTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});