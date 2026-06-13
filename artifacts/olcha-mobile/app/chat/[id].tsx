import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmojiKeyboard from "rn-emoji-keyboard";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPost, type ChatMessage } from "@/lib/api";

export default function ChatThreadScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const convId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["messages", convId],
    queryFn: () => apiGet<ChatMessage[]>(`/messages/conversations/${convId}/messages`),
    refetchInterval: 4000,
    enabled: !!convId,
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiPost<ChatMessage>(`/messages/conversations/${convId}/messages`, {
        senderId: user?.id,
        content,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
      setText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (msgId: number) =>
      apiDelete(`/messages/conversations/${convId}/messages/${msgId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
    },
  });

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
    setShowEmoji(false);
  }, [text, sendMutation]);

  const renderDelete = useCallback(
    (msgId: number) => (
      <Pressable
        style={[styles.deleteAction, { backgroundColor: "#ef4444" }]}
        onPress={() => deleteMutation.mutate(msgId)}
      >
        <Feather name="trash-2" size={20} color="#fff" />
        <Text style={styles.deleteLabel}>O'chirish</Text>
      </Pressable>
    ),
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMe = item.senderId === user?.id;
      return (
        <Swipeable
          renderRightActions={() => (isMe ? renderDelete(item.id) : null)}
          renderLeftActions={() => (!isMe ? renderDelete(item.id) : null)}
          friction={2}
          overshootRight={false}
          overshootLeft={false}
        >
          <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
            <View
              style={[
                styles.bubble,
                isMe
                  ? [styles.bubbleMe, { shadowColor: "#7c3aed" }]
                  : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }],
              ]}
            >
              <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
                {item.content}
              </Text>
              <View style={[styles.bubbleMeta, isMe ? { justifyContent: "flex-end" } : {}]}>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                {isMe && <Feather name="check-circle" size={10} color="rgba(147,197,253,0.7)" />}
              </View>
            </View>
          </View>
        </Swipeable>
      );
    },
    [user?.id, colors, renderDelete]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
          {name ?? "Suhbat"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => `msg-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.emptyWrap}>
                <Feather name="message-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Xabarlar yo'q
                </Text>
              </View>
            )
          }
        />

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={text}
              onChangeText={setText}
              placeholder="Xabar…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
            />
            <Pressable
              style={[styles.iconBtn, showEmoji && { opacity: 1 }]}
              onPress={() => setShowEmoji((v) => !v)}
            >
              <Feather
                name="smile"
                size={20}
                color={showEmoji ? "#f59e0b" : colors.mutedForeground}
              />
            </Pressable>
            <Pressable
              style={[
                styles.sendBtn,
                {
                  backgroundColor: text.trim() ? "#7c3aed" : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
            >
              <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Keyboard */}
      <EmojiKeyboard
        onEmojiSelected={(emoji) => setText((t) => t + emoji.emoji)}
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        theme={{
          backdrop: "rgba(0,0,0,0.7)",
          knob: "#7c3aed",
          container: colors.card,
          header: colors.foreground,
          skinTonesContainer: colors.card,
          category: {
            icon: colors.mutedForeground,
            iconActive: "#7c3aed",
            container: colors.card,
            containerActive: colors.card,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerName: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerRight: { width: 30 },
  msgRow: { marginBottom: 4 },
  msgRowMe: { alignItems: "flex-end" },
  msgRowThem: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMe: {
    borderBottomRightRadius: 5,
    backgroundColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleThem: {
    borderBottomLeftRadius: 5,
    borderWidth: 0.5,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
  },
  inputBar: {
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    paddingVertical: 4,
  },
  iconBtn: { opacity: 0.55, paddingBottom: 4 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  deleteAction: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
    marginVertical: 2,
    marginRight: 4,
  },
  deleteLabel: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
