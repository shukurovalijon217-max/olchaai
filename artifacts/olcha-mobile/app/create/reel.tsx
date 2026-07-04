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
import { useCreateReel, useRequestUploadUrl } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CreateReelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [caption, setCaption] = useState("");
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createReel = useCreateReel();
  const requestUpload = useRequestUploadUrl();

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setVideo(result.assets[0]);
    }
  };

  const handleCreate = async () => {
    if (!video) {
      setError("Reel uchun video tanlang");
      return;
    }

    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const fileRes = await fetch(video.uri);
      const blob = await fileRes.blob();
      
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: {
          name: video.fileName || `reel_${Date.now()}.mp4`,
          size: blob.size,
          contentType: blob.type || "video/mp4",
        },
      });

      await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type || "video/mp4" },
      });

      const videoUrl = `${API_BASE}/api/storage${objectPath}`;

      await createReel.mutateAsync({
        data: {
          authorId: user.id,
          videoUrl,
          caption: caption.trim(),
        },
      });

      router.replace("/(tabs)/reels");
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Yangi Reel</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pickVideo} style={[s.mediaBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {video ? (
              <View style={s.previewWrap}>
                <Image source={{ uri: video.uri }} style={s.mediaPreview} />
                <View style={s.videoIcon}>
                  <Feather name="play" size={40} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={s.placeholder}>
                <Feather name="film" size={48} color={colors.primary} />
                <Text style={[s.placeholderTxt, { color: colors.mutedForeground }]}>Video tanlang</Text>
              </View>
            )}
          </Pressable>

          <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Video haqida yozing..."
              placeholderTextColor={colors.mutedForeground}
              multiline
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

          <LinearGradient colors={["#ec4899", "#f97316"]} style={s.submitGrad}>
            <Pressable style={s.submitBtn} onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="video" size={18} color="#fff" />
                  <Text style={s.submitTxt}>Reelni ulashish</Text>
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
  mediaBox: { width: "100%", height: 400, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  previewWrap: { flex: 1, position: "relative" },
  mediaPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  videoIcon: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderTxt: { fontSize: 14, fontWeight: "600" },
  inputCard: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 100 },
  input: { fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorTxt: { color: "#ef4444", fontSize: 14, flex: 1 },
  submitGrad: { borderRadius: 14, marginTop: 10 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  submitTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});