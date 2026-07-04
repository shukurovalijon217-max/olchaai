import { Feather } from "@expo/vector-icons";
import { 
  useGetConversationMessages, 
  useSendMessage, 
  useListConversations,
  type Message
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = parseInt(id);
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [content, setContent] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Poll for new messages every 4s
  const { data: messages = [], isLoading } = useGetConversationMessages(conversationId, {
    query: {
      refetchInterval: 4000,
      queryKey: ['getConversationMessages', conversationId]
    }
  });

  const { data: conversations = [] } = useListConversations();
  const currentConversation = conversations.find(c => c.id === conversationId);
  const otherParticipant = currentConversation?.participants?.find(p => p.id !== user?.id);
  const name = otherParticipant?.displayName || otherParticipant?.username || "Chat";
  const avatar = otherParticipant?.avatarUrl;
  const isVerified = otherParticipant?.isVerified;

  const sendMessageMutation = useSendMessage();

  const handleSend = async () => {
    if (!content.trim() || !user) return;
    
    const text = content.trim();
    setContent("");
    
    try {
      await sendMessageMutation.mutateAsync({
        id: conversationId,
        data: {
          senderId: user.id,
          content: text,
        }
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Maybe show an error toast or something
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[s.msgWrapper, isMe ? s.msgMe : s.msgOther]}>
        {!isMe && avatar && (
          <Image source={{ uri: avatar }} style={s.msgAvatar} contentFit="cover" />
        )}
        <View style={[
          s.msgBubble, 
          isMe ? { backgroundColor: colors.primary } : { backgroundColor: colors.glass ?? "rgba(255,255,255,0.1)" }
        ]}>
          <Text style={[s.msgText, { color: "#fff" }]}>{item.content}</Text>
          <Text style={[s.msgTime, { color: isMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <View style={s.headerInfo}>
          <View style={s.avatarRing}>
             {avatar ? (
                <Image source={{ uri: avatar }} style={s.headerAvatar} contentFit="cover" />
             ) : (
                <View style={[s.headerAvatar, { backgroundColor: colors.glass ?? "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }]}>
                   <Text style={{ color: colors.primary, fontWeight: "700" }}>{name.slice(0,2).toUpperCase()}</Text>
                </View>
             )}
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[s.headerName, { color: colors.text }]}>{name}</Text>
              {isVerified && <Text style={{ fontSize: 10 }}>👑</Text>}
            </View>
            <Text style={[s.headerStatus, { color: colors.mutedForeground }]}>Online</Text>
          </View>
        </View>
        <View style={s.headerActions}>
           <Pressable style={s.actionBtn}><Feather name="phone" size={20} color={colors.text} /></Pressable>
           <Pressable style={s.actionBtn}><Feather name="video" size={20} color={colors.text} /></Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={[s.listContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={s.empty}>
              <Text style={{ color: colors.mutedForeground }}>No messages yet</Text>
            </View>
          )
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[s.inputWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[s.inputInner, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }]}>
            <Pressable style={s.attachBtn}>
              <Feather name="plus" size={20} color={colors.mutedForeground} />
            </Pressable>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Xabar yozing..."
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
            />
            {content.trim().length > 0 ? (
              <Pressable onPress={handleSend}>
                <LinearGradient colors={["#7857ff", "#9d19ff"]} style={s.sendBtn}>
                  <Feather name="send" size={16} color="#fff" />
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable style={s.attachBtn}>
                <Feather name="mic" size={20} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: { padding: 8 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarRing: { width: 36, height: 36, borderRadius: 18, padding: 1, backgroundColor: "rgba(120,87,255,0.5)" },
  headerAvatar: { width: "100%", height: "100%", borderRadius: 17 },
  headerName: { fontSize: 16, fontWeight: "700" },
  headerStatus: { fontSize: 12 },
  headerActions: { flexDirection: "row", gap: 4, paddingRight: 8 },
  actionBtn: { padding: 8 },
  listContent: { paddingHorizontal: 16 },
  msgWrapper: { flexDirection: "row", marginBottom: 12, maxWidth: "80%" },
  msgMe: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  msgOther: { alignSelf: "flex-start" },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, marginTop: 4 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", height: 200, opacity: 0.5 },
  inputWrap: { paddingHorizontal: 16, paddingTop: 8 },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  attachBtn: { padding: 8 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
