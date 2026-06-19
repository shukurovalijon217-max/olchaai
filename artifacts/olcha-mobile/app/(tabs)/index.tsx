/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  OlCha — Vertikal Full-Screen Lenta                    ║
 * ║  Video · Rasm · Klip · Reel + Yuklash funksiyasi       ║
 * ║  Muallif: CHAP YUQORI  ·  Tugmalar: O'NG YONI         ║
 * ╚══════════════════════════════════════════════════════════╝
 */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  FlatList, Image, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Reanimated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, withDelay,
  interpolate, Extrapolation,
} from "react-native-reanimated";
import { useAuth } from "@/context/AuthContext";

/* ── Dimensions ─────────────────────────────────────────── */
const { width: W, height: H } = Dimensions.get("window");
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API = `https://${DOMAIN}/api`;

/* ── Media URL ──────────────────────────────────────────── */
function mu(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${DOMAIN}${raw}`;
}

/* ── Content kind config ────────────────────────────────── */
type Kind = "video" | "photo" | "reel" | "ad" | "text";
const K: Record<Kind, {
  label: string; icon: string; accent: string;
  grad: readonly [string, string, string]
}> = {
  video: { label: "KLIP",    icon: "play-circle", accent: "#ef4444", grad: ["#1a0505","#450a0a","#ef4444"] },
  reel:  { label: "REEL",    icon: "film",        accent: "#a855f7", grad: ["#120820","#3b0f6b","#a855f7"] },
  photo: { label: "RASM",    icon: "image",       accent: "#22d3ee", grad: ["#04111a","#093348","#22d3ee"] },
  ad:    { label: "REKLAMA", icon: "zap",         accent: "#f59e0b", grad: ["#1a1000","#4a2e00","#f59e0b"] },
  text:  { label: "POST",    icon: "align-left",  accent: "#34d399", grad: ["#041410","#0a3828","#34d399"] },
};

/* ── Types ──────────────────────────────────────────────── */
interface Author {
  id: number; username: string; displayName: string;
  avatarUrl?: string | null; isVerified?: boolean;
}
interface FeedItem {
  id: string; kind: "post" | "reel"; contentKind: Kind;
  caption: string; mediaUrl: string | null; videoUrl: string | null;
  duration?: number | null; author: Author;
  likesCount: number; commentsCount: number; viewsCount?: number;
  isLiked: boolean; createdAt: string; rawId: number;
}
interface RPost {
  id: number; content: string; type: string;
  mediaUrl?: string | null; likesCount: number;
  commentsCount: number; isLiked?: boolean;
  createdAt: string; author?: Author;
}
interface RReel {
  id: number; caption?: string | null; videoUrl?: string | null;
  thumbnailUrl?: string | null; duration?: number | null;
  likesCount: number; commentsCount: number;
  viewsCount?: number; isLiked?: boolean;
  createdAt: string; author?: Author;
}

const BLANK: Author = { id: 0, username: "olcha_user", displayName: "OlCha Foydalanuvchi" };

function normPost(p: RPost): FeedItem {
  const k: Kind = p.type === "video" ? "video" : p.type === "photo" ? "photo" : "text";
  return {
    id: `p${p.id}`, kind: "post", contentKind: k,
    caption: p.content ?? "", mediaUrl: mu(p.mediaUrl), videoUrl: null,
    author: p.author ?? BLANK, likesCount: p.likesCount ?? 0,
    commentsCount: p.commentsCount ?? 0, isLiked: p.isLiked ?? false,
    createdAt: p.createdAt, rawId: p.id,
  };
}
function normReel(r: RReel): FeedItem {
  return {
    id: `r${r.id}`, kind: "reel", contentKind: "reel",
    caption: r.caption ?? "", mediaUrl: null, videoUrl: mu(r.videoUrl),
    duration: r.duration, author: r.author ?? BLANK,
    likesCount: r.likesCount ?? 0, commentsCount: r.commentsCount ?? 0,
    viewsCount: r.viewsCount, isLiked: r.isLiked ?? false,
    createdAt: r.createdAt, rawId: r.id,
  };
}

/* ── Helpers ────────────────────────────────────────────── */
function ago(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "Hozir";
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)} kun`;
}
function num(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

/* ── Demo data ──────────────────────────────────────────── */
const DA: Author = { id: 0, username: "demo", displayName: "Demo User", isVerified: true };
const DEMO: FeedItem[] = [
  { id:"d1", kind:"post", contentKind:"photo", caption:"O'zbekistondagi eng go'zal tog' manzarasi 🏔️", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"Dilnoza Yusupova",username:"dilnoza_uz"}, likesCount:14200, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-3600000).toISOString(), rawId:1 },
  { id:"d2", kind:"reel",  contentKind:"reel",  caption:"Toshkent kechalari ✨", mediaUrl:null, videoUrl:null, duration:60, author:{...DA,displayName:"Sardor B",username:"sardor_b"}, likesCount:8900, commentsCount:156, isLiked:false, createdAt:new Date(Date.now()-7200000).toISOString(), rawId:2 },
  { id:"d3", kind:"post",  contentKind:"video", caption:"React Native live session 💻", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"Kamol Dev",username:"dev_kamol",isVerified:true}, likesCount:7800, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-14400000).toISOString(), rawId:3 },
  { id:"d4", kind:"post",  contentKind:"ad",    caption:"OlCha Premium — AI kuchi cheksiz! ⚡", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"OlCha Official",username:"olcha_official",isVerified:true}, likesCount:3100, commentsCount:45, isLiked:false, createdAt:new Date(Date.now()-21600000).toISOString(), rawId:5 },
  { id:"d5", kind:"post",  contentKind:"text",  caption:"Bugun ajoyib yangilik: OlCha 1 million foydalanuvchiga yetdi! 🎉", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"OlCha News",username:"olcha_news"}, likesCount:22000, commentsCount:890, isLiked:false, createdAt:new Date(Date.now()-1800000).toISOString(), rawId:6 },
];

/* ╔════════════════════════════════════════════════════════
   ║  HOLOGRAFIK KOMMENTARIY OVERLAY
   ╚════════════════════════════════════════════════════════ */
function HoloComment({ visible, accent, onClose }: {
  visible: boolean; accent: string; onClose: () => void;
}) {
  const translateY = useSharedValue(H);
  const opacity    = useSharedValue(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0,   { damping: 22, stiffness: 200 });
      opacity.value    = withTiming(1, { duration: 280 });
    } else {
      translateY.value = withTiming(H,  { duration: 300 });
      opacity.value    = withTiming(0,  { duration: 250 });
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;
  return (
    <Reanimated.View style={[StyleSheet.absoluteFillObject, { zIndex: 90 }, panelStyle]}>
      <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={onClose} />
      <View style={styles.holoPanel}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={[styles.holoBorder, { borderColor: accent + "66" }]} />
        <View style={[styles.holoGlow, { backgroundColor: accent + "44" }]} />
        <View style={styles.holoHeader}>
          <View style={[styles.holoPulse, { backgroundColor: accent }]} />
          <Text style={styles.holoTitle}>Fikr bildiring</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
        <View style={[styles.holoInputWrap, { borderColor: accent + "55" }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Text style={styles.holoInputPlaceholder}>{text || "Fikringizni yozing..."}</Text>
        </View>
        <View style={styles.holoKeyboard}>
          {["a","s","d","f","g","h","j","k","l"].map(c => (
            <Pressable key={c} onPress={() => setText(t => t + c)}
              style={[styles.holoKey, { borderColor: accent+"33", backgroundColor: accent+"11" }]}>
              <Text style={[styles.holoKeyText, { color: accent }]}>{c}</Text>
            </Pressable>
          ))}
          <View style={{ width:"100%", flexDirection:"row", justifyContent:"center", gap:8, marginTop:4 }}>
            {["o","l","c","h","a"," ","⌫"].map(c => (
              <Pressable key={c}
                onPress={() => c === "⌫" ? setText(t => t.slice(0,-1)) : setText(t => t + c)}
                style={[styles.holoKey, { borderColor:accent+"33", backgroundColor:accent+"11", minWidth:c===" "?72:36 }]}>
                <Text style={[styles.holoKeyText,{color:accent}]}>{c === "⌫" ? "⌫" : c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable style={[styles.holoSend, { backgroundColor: accent }]} onPress={onClose}>
          <Feather name="send" size={16} color="#fff" />
          <Text style={styles.holoSendText}>Yuborish</Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  HOLOGRAFIK ULASHISH OVERLAY
   ╚════════════════════════════════════════════════════════ */
function HoloShare({ visible, accent, item, onClose }: {
  visible: boolean; accent: string; item: FeedItem | null; onClose: () => void;
}) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);
  const ring1   = useSharedValue(1);
  const ring2   = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      scale.value   = withSpring(1, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 250 });
      ring1.value   = withSequence(withTiming(1.8,{duration:800}), withTiming(1,{duration:0}));
      ring2.value   = withDelay(300, withSequence(withTiming(1.8,{duration:800}), withTiming(1,{duration:0})));
    } else {
      scale.value   = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const wrapStyle  = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: interpolate(ring1.value,[1,1.8],[0.5,0],Extrapolation.CLAMP),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: interpolate(ring2.value,[1,1.8],[0.4,0],Extrapolation.CLAMP),
  }));

  if (!visible || !item) return null;
  return (
    <Reanimated.View style={[StyleSheet.absoluteFillObject, { zIndex: 90 }, wrapStyle]}>
      <Pressable style={[StyleSheet.absoluteFillObject,{backgroundColor:"rgba(0,0,0,0.70)"}]} onPress={onClose}/>
      <View style={styles.shareCenterWrap}>
        <Reanimated.View style={[styles.shareRing,{borderColor:accent+"55",width:240,height:240,borderRadius:120,marginTop:-120,marginLeft:-120},ring1Style]}/>
        <Reanimated.View style={[styles.shareRing,{borderColor:accent+"33",width:320,height:320,borderRadius:160,marginTop:-160,marginLeft:-160},ring2Style]}/>
        <Reanimated.View style={[styles.shareCard, cardStyle]}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject}/>
          <View style={[styles.shareBorder,{borderColor:accent+"77"}]}/>
          <LinearGradient colors={[accent+"22","transparent"]} style={styles.shareGradTop}/>
          <Text style={styles.shareTitle}>OlCha da ulashish</Text>
          <Text style={styles.shareSubtitle}>{item.author.displayName} kontenti</Text>
          <View style={styles.shareUsersRow}>
            {["D","S","K","A","M","Z"].map((l,i) => (
              <View key={i} style={styles.shareUserItem}>
                <Pressable onPress={onClose}>
                  <LinearGradient colors={[accent+"88",accent+"44"]} style={styles.shareAvatar}>
                    <Text style={styles.shareAvatarLetter}>{l}</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={styles.shareAvatarName}>@user{i+1}</Text>
              </View>
            ))}
          </View>
          <Pressable style={[styles.shareConfirm,{backgroundColor:accent}]} onPress={onClose}>
            <Feather name="share-2" size={15} color="#fff"/>
            <Text style={styles.shareConfirmText}>OlCha da ulash</Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  AI TAHLIL MODAL
   ╚════════════════════════════════════════════════════════ */
interface AIResult {
  tags?: string[]; category?: string; summary?: string;
  sentiment?: string; analyzedAt?: string;
}

function AIModal({ item, visible, onClose }: {
  item: FeedItem | null; visible: boolean; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AIResult | null>(null);
  const [error, setError]     = useState(false);
  const slideY = useSharedValue(H);

  useEffect(() => {
    if (visible) { slideY.value = withSpring(0, { damping: 24, stiffness: 220 }); }
    else         { slideY.value = withTiming(H, { duration: 320 }); }
  }, [visible]);

  useEffect(() => {
    if (!visible || !item) return;
    setResult(null); setError(false); setLoading(true);
    fetch(`${API}/ai/analyze-content`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: item.rawId, contentType: item.kind, caption: item.caption }),
    })
      .then(r => r.ok ? r.json() as Promise<AIResult> : Promise.reject())
      .then(setResult).catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [visible, item?.id]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));
  if (!item) return null;
  const k = K[item.contentKind] ?? K.text;
  const likelihood = item.likesCount > 100 ? "Haqiqiy" : item.likesCount === 0 ? "Tekshirilmoqda" : "Haqiqiy ehtimoli yuqori";
  const likC = likelihood === "Haqiqiy" ? "#10b981" : likelihood === "Tekshirilmoqda" ? "#f59e0b" : "#3b82f6";
  const sentLabel = result?.sentiment === "positive" ? "Ijobiy 😊" : result?.sentiment === "negative" ? "Salbiy 😞" : "Neytral 😐";
  const sentC = result?.sentiment === "positive" ? "#10b981" : result?.sentiment === "negative" ? "#ef4444" : "#f59e0b";
  const uploadedAt = new Date(item.createdAt).toLocaleString("uz-UZ", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFillObject,{backgroundColor:"rgba(0,0,0,0.60)"}]} onPress={onClose}/>
      <Reanimated.View style={[styles.aiSheet, sheetStyle, { paddingBottom: insets.bottom + 20 }]}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFillObject}/>
        <View style={[styles.aiTopBorder,{backgroundColor:k.accent+"66"}]}/>
        <View style={[styles.aiHandle,{backgroundColor:k.accent}]}/>
        <View style={styles.aiHeaderRow}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.aiIcon}>
            <Feather name="zap" size={18} color="#fff"/>
          </LinearGradient>
          <View style={{flex:1}}>
            <Text style={styles.aiTitle}>OlCha AI — To'liq Tahlil</Text>
            <Text style={styles.aiSubtitle}>{item.author.displayName} · {k.label}</Text>
          </View>
          <Pressable style={styles.aiClose} onPress={onClose}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.4)"/>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.aiCenter}>
            <ActivityIndicator color={k.accent} size="large"/>
            <Text style={styles.aiHint}>OlCha AI tahlil qilmoqda...</Text>
          </View>
        ) : error ? (
          <View style={styles.aiCenter}>
            <Feather name="wifi-off" size={36} color="rgba(255,255,255,0.2)"/>
            <Text style={styles.aiHint}>Tahlil ololmadi</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.aiRow}>
              <View style={[styles.aiCard,{borderColor:likC+"55",backgroundColor:likC+"10",flex:1.2}]}>
                <View style={styles.aiCardIcon}><Feather name="shield" size={14} color={likC}/></View>
                <Text style={styles.aiCardLabel}>Haqiqiyligi</Text>
                <Text style={[styles.aiCardValue,{color:likC}]}>{likelihood}</Text>
              </View>
              <View style={[styles.aiCard,{borderColor:"#6366f155",backgroundColor:"#6366f110",flex:1}]}>
                <View style={styles.aiCardIcon}><Feather name="clock" size={14} color="#818cf8"/></View>
                <Text style={styles.aiCardLabel}>Yuklangan</Text>
                <Text style={[styles.aiCardValue,{color:"#818cf8",fontSize:11}]} numberOfLines={2}>{uploadedAt}</Text>
              </View>
            </View>
            <View style={styles.aiRow}>
              <View style={[styles.aiCard,{borderColor:sentC+"55",backgroundColor:sentC+"10"}]}>
                <View style={styles.aiCardIcon}><Feather name="heart" size={14} color={sentC}/></View>
                <Text style={styles.aiCardLabel}>Muallif ruhiyati</Text>
                <Text style={[styles.aiCardValue,{color:sentC}]}>{result?.sentiment ? sentLabel : "Aniqlanmoqda"}</Text>
              </View>
              {result?.category && (
                <View style={[styles.aiCard,{borderColor:k.accent+"55",backgroundColor:k.accent+"10"}]}>
                  <View style={styles.aiCardIcon}><Feather name="tag" size={14} color={k.accent}/></View>
                  <Text style={styles.aiCardLabel}>Toifa</Text>
                  <Text style={[styles.aiCardValue,{color:k.accent}]}>{result.category}</Text>
                </View>
              )}
            </View>
            {result?.summary && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHead}>
                  <Feather name="file-text" size={12} color="#a78bfa"/>
                  <Text style={styles.aiBlockLabel}>AI Xulosa</Text>
                </View>
                <Text style={styles.aiBodyText}>{result.summary}</Text>
              </View>
            )}
            {!!result?.tags?.length && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHead}>
                  <Feather name="hash" size={12} color="#a78bfa"/>
                  <Text style={styles.aiBlockLabel}>Teglar</Text>
                </View>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                  {result.tags!.map(t => (
                    <View key={t} style={[styles.tagPill,{borderColor:k.accent+"44",backgroundColor:k.accent+"10"}]}>
                      <Text style={[styles.tagText,{color:k.accent}]}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={[styles.aiBlock,styles.aiRecoBlock]}>
              <View style={styles.aiBlockHead}>
                <Feather name="trending-up" size={12} color="#7c3aed"/>
                <Text style={styles.aiBlockLabel}>OlCha tavsiyasi</Text>
              </View>
              <Text style={styles.aiBodyText}>
                Bu kontent {item.author.displayName} tomonidan {ago(item.createdAt)} yuklangan.{" "}
                {likelihood === "Haqiqiy" ? "Kontent haqiqiy va sifatli deb baholanadi." : "Kontent tekshirilmoqda."}{" "}
                {result?.sentiment === "positive" ? "Ijobiy kayfiyatga ega, auditoriya bilan yaxshi rezonans qiladi." : ""}
              </Text>
            </View>
          </ScrollView>
        )}
      </Reanimated.View>
    </Modal>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  MEDIA YUKLASH SHEET
   ╚════════════════════════════════════════════════════════ */
type UploadType = "photo" | "video" | "reel";
interface PickedMedia {
  uri: string; type: string; name: string;
  width?: number; height?: number; duration?: number;
}

function UploadSheet({ visible, onClose, onDone }: {
  visible: boolean; onClose: () => void; onDone: () => void;
}) {
  const insets    = useSafeAreaInsets();
  const slideY    = useSharedValue(H);
  const [stage, setStage]     = useState<"pick"|"form"|"uploading"|"done">("pick");
  const [utype, setUtype]     = useState<UploadType>("photo");
  const [media, setMedia]     = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (visible) {
      setStage("pick"); setMedia(null); setCaption(""); setProgress(0);
      slideY.value = withSpring(0, { damping: 22, stiffness: 200 });
    } else {
      slideY.value = withTiming(H, { duration: 300 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  const pickMedia = async (type: UploadType) => {
    setUtype(type);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: type === "photo"
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.85,
      videoMaxDuration: type === "reel" ? 60 : 300,
    };
    const res = await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setMedia({
        uri: a.uri,
        type: a.type === "video" ? "video/mp4" : "image/jpeg",
        name: a.fileName ?? `olcha_${Date.now()}`,
        width: a.width, height: a.height,
        duration: a.duration ?? undefined,
      });
      setStage("form");
    }
  };

  const upload = async () => {
    if (!media || !user) return;
    setStage("uploading"); setProgress(10);
    try {
      const urlRes = await fetch(`${API}/storage/uploads/request-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: media.name, size: 0, contentType: media.type }),
      });
      if (!urlRes.ok) throw new Error("URL olishda xato");
      const { uploadURL, objectPath } = await urlRes.json();
      setProgress(30);

      const blob = await fetch(media.uri).then(r => r.blob());
      await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": media.type } });
      setProgress(70);

      const fullUrl = `https://${DOMAIN}${objectPath}`;
      if (utype === "reel") {
        await fetch(`${API}/reels`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption, videoUrl: fullUrl,
            duration: Math.round((media.duration ?? 0) / 1000),
          }),
        });
      } else {
        await fetch(`${API}/posts`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: caption, type: utype, mediaUrl: fullUrl }),
        });
      }
      setProgress(100);
      setStage("done");
      setTimeout(() => { onDone(); onClose(); }, 1200);
    } catch {
      Alert.alert("Xato", "Yuklashda muammo yuz berdi. Qayta urinib ko'ring.");
      setStage("form");
    }
  };

  const TYPES: { type: UploadType; icon: string; label: string; color: string }[] = [
    { type:"photo", icon:"image",      label:"Rasm",  color:"#22d3ee" },
    { type:"video", icon:"play-circle",label:"Klip",  color:"#ef4444" },
    { type:"reel",  icon:"film",       label:"Reel",  color:"#a855f7" },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFillObject,{backgroundColor:"rgba(0,0,0,0.65)"}]} onPress={onClose}/>
      <Reanimated.View style={[styles.uploadSheet, sheetStyle, { paddingBottom: insets.bottom + 24 }]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject}/>
        <View style={[styles.uploadTopBorder,{backgroundColor:"#7c3aed88"}]}/>
        <View style={[styles.uploadHandle,{backgroundColor:"#a78bfa"}]}/>

        {/* Header */}
        <View style={styles.uploadHeader}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.uploadIcon}>
            <Feather name="upload" size={18} color="#fff"/>
          </LinearGradient>
          <Text style={styles.uploadTitle}>Kontent yuklash</Text>
          <Pressable style={styles.uploadClose} onPress={onClose}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.4)"/>
          </Pressable>
        </View>

        {/* STAGE: pick type */}
        {stage === "pick" && (
          <View style={styles.uploadPickArea}>
            <Text style={styles.uploadSub}>Kontent turini tanlang</Text>
            <View style={styles.uploadTypeRow}>
              {TYPES.map(t => (
                <Pressable key={t.type} style={styles.uploadTypeBtn} onPress={() => pickMedia(t.type)}>
                  <LinearGradient
                    colors={[t.color+"33", t.color+"11"]}
                    style={[styles.uploadTypeCircle,{borderColor:t.color+"66"}]}>
                    <Feather name={t.icon as any} size={28} color={t.color}/>
                  </LinearGradient>
                  <Text style={[styles.uploadTypeLabel,{color:t.color}]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.uploadHint}>
              Galereyangizdan rasm, video yoki reel tanlang
            </Text>
          </View>
        )}

        {/* STAGE: form */}
        {stage === "form" && media && (
          <View style={styles.uploadFormArea}>
            {/* Preview */}
            <View style={styles.uploadPreview}>
              {utype === "photo" ? (
                <Image source={{uri: media.uri}} style={styles.uploadPreviewImg}/>
              ) : (
                <View style={[styles.uploadPreviewImg,{alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,0.05)"}]}>
                  <Feather name="play-circle" size={48} color={K[utype].accent}/>
                  {!!media.duration && (
                    <Text style={{color:"rgba(255,255,255,0.55)",fontSize:12,marginTop:6}}>
                      {Math.round(media.duration/1000)}s
                    </Text>
                  )}
                </View>
              )}
              <View style={[styles.uploadPreviewBadge,{backgroundColor:K[utype].accent+"33",borderColor:K[utype].accent+"66"}]}>
                <Feather name={K[utype].icon as any} size={11} color={K[utype].accent}/>
                <Text style={[styles.uploadPreviewBadgeTxt,{color:K[utype].accent}]}>{K[utype].label}</Text>
              </View>
            </View>
            {/* Caption */}
            <Text style={styles.uploadFormLabel}>Tavsif (ixtiyoriy)</Text>
            <View style={[styles.uploadCaptionWrap,{borderColor:K[utype].accent+"44"}]}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject}/>
              <TextInput
                style={styles.uploadCaptionInput}
                placeholder="Kontent haqida yozing..."
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={500}
              />
            </View>
            {/* Buttons */}
            <View style={styles.uploadBtnRow}>
              <Pressable style={styles.uploadBtnBack} onPress={() => setStage("pick")}>
                <Text style={styles.uploadBtnBackTxt}>← Orqaga</Text>
              </Pressable>
              <Pressable style={[styles.uploadBtnGo,{backgroundColor:K[utype].accent}]} onPress={upload}>
                <Feather name="upload-cloud" size={16} color="#fff"/>
                <Text style={styles.uploadBtnGoTxt}>Yuklash</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STAGE: uploading */}
        {stage === "uploading" && (
          <View style={styles.uploadProgress}>
            <ActivityIndicator size="large" color="#a855f7"/>
            <Text style={styles.uploadProgressTxt}>Yuklanmoqda... {progress}%</Text>
            <View style={styles.uploadBar}>
              <View style={[styles.uploadBarFill,{width:`${progress}%` as any,backgroundColor:"#a855f7"}]}/>
            </View>
          </View>
        )}

        {/* STAGE: done */}
        {stage === "done" && (
          <View style={styles.uploadProgress}>
            <LinearGradient colors={["#10b981","#34d399"]} style={styles.uploadDoneCircle}>
              <Feather name="check" size={28} color="#fff"/>
            </LinearGradient>
            <Text style={[styles.uploadProgressTxt,{color:"#34d399"}]}>Muvaffaqiyatli yuklandi!</Text>
          </View>
        )}
      </Reanimated.View>
    </Modal>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  VERTIKAL FULL-SCREEN KARTA
   ╚════════════════════════════════════════════════════════ */
interface CardProps {
  item: FeedItem; isActive: boolean;
  liked: boolean; likes: number;
  onLike: () => void; onComment: () => void;
  onShare: () => void; onAI: () => void;
}

function VerticalCard({ item, isActive, liked, likes, onLike, onComment, onShare, onAI }: CardProps) {
  const insets  = useSafeAreaInsets();
  const webAdj  = Platform.OS === "web";
  const cardH   = webAdj ? H - 134 : H;
  const topPad  = insets.top  + (webAdj ? 67 : 0);
  const botPad  = insets.bottom + (webAdj ? 34 : 0);
  const k       = K[item.contentKind] ?? K.text;
  const avatarUri = mu(item.author.avatarUrl);
  const hasVideo  = (item.contentKind === "video" || item.contentKind === "reel") && (item.mediaUrl || item.videoUrl);
  const videoSrc  = item.videoUrl ?? item.mediaUrl;
  const photoSrc  = item.contentKind === "photo" ? item.mediaUrl : null;

  return (
    <View style={{ width: W, height: cardH, overflow: "hidden", backgroundColor: "#04060f" }}>

      {/* ── BACKGROUND MEDIA ── */}
      {hasVideo && videoSrc ? (
        <Video
          source={{ uri: videoSrc }}
          style={StyleSheet.absoluteFillObject as any}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : photoSrc ? (
        <Image source={{ uri: photoSrc }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover"/>
      ) : (
        <LinearGradient
          colors={k.grad as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}>
          {/* Nebula center */}
          <View style={styles.nebula}>
            <View style={[styles.nebulaRing3, { borderColor: k.accent+"10" }]}/>
            <View style={[styles.nebulaRing2, { borderColor: k.accent+"22" }]}/>
            <View style={[styles.nebulaRing1, { borderColor: k.accent+"44" }]}/>
            <LinearGradient colors={[k.accent+"30","transparent"]}
              style={[styles.nebulaCore, { borderColor: k.accent+"55" }]}>
              <Text style={[styles.nebulaSymbol, { color: k.accent }]}>
                {item.contentKind==="video"?"▶":item.contentKind==="reel"?"✦":item.contentKind==="photo"?"◈":item.contentKind==="ad"?"⚡":"✎"}
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      )}

      {/* Gradient overlays */}
      <LinearGradient
        colors={["rgba(0,0,0,0.72)","rgba(0,0,0,0.0)","rgba(0,0,0,0.0)","rgba(0,0,0,0.85)"]}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ════ MUALLIF — CHAP YUQORI ════ */}
      <View style={[styles.authorRow, { top: topPad + 56 }]}>
        {/* Avatar */}
        {avatarUri ? (
          <Image source={{ uri: avatarUri }}
            style={[styles.avatar, { borderColor: k.accent }]}/>
        ) : (
          <LinearGradient colors={[k.grad[1], k.grad[2]] as any}
            style={[styles.avatar, { borderColor: k.accent, alignItems:"center", justifyContent:"center" }]}>
            <Text style={styles.avatarLetter}>
              {(item.author.displayName ?? "O")[0].toUpperCase()}
            </Text>
          </LinearGradient>
        )}

        {/* Name + handle */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
            <Text style={styles.authorName} numberOfLines={1}>
              {item.author.displayName}
            </Text>
            {item.author.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: k.accent }]}>
                <Text style={styles.verifiedMark}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.authorSub} numberOfLines={1}>
            @{item.author.username} · {ago(item.createdAt)}
          </Text>
          {/* Audio row */}
          <View style={styles.audioRow}>
            <Feather name="music" size={10} color="rgba(255,255,255,0.55)"/>
            <Text style={styles.audioTxt} numberOfLines={1}>OlCha · Asl audio</Text>
          </View>
        </View>

        {/* Follow */}
        <Pressable style={[styles.followChip, { borderColor: k.accent+"99" }]}>
          <Text style={[styles.followTxt, { color: k.accent }]}>+ Kuzat</Text>
        </Pressable>
      </View>

      {/* Kind badge — top right */}
      <View style={[styles.kindBadge, {
        top: topPad + 56,
        backgroundColor: k.accent+"22",
        borderColor: k.accent+"55",
      }]}>
        <Feather name={k.icon as any} size={10} color={k.accent}/>
        <Text style={[styles.kindTxt, { color: k.accent }]}>{k.label}</Text>
      </View>

      {/* ════ O'NG TOMONDAGI TUGMALAR ════ */}
      <View style={[styles.rightBar, {
        top: topPad + 130,
        bottom: botPad + 110,
      }]}>

        {/* Like */}
        <Pressable style={styles.rBtn} onPress={onLike}>
          <View style={[styles.rCircle, liked && { backgroundColor: k.accent }]}>
            <Feather name="heart" size={22}
              color={liked ? "#fff" : "rgba(255,255,255,0.88)"}/>
          </View>
          <Text style={[styles.rLabel, liked && { color: k.accent }]}>{num(likes)}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={styles.rBtn} onPress={onComment}>
          <View style={styles.rCircle}>
            <Feather name="message-circle" size={22} color="rgba(255,255,255,0.88)"/>
          </View>
          <Text style={styles.rLabel}>{num(item.commentsCount ?? 0)}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={styles.rBtn} onPress={onShare}>
          <View style={[styles.rCircle, { borderColor: "rgba(59,130,246,0.55)", backgroundColor:"rgba(59,130,246,0.15)" }]}>
            <Feather name="share-2" size={20} color="#93c5fd"/>
          </View>
          <Text style={[styles.rLabel, { color: "#93c5fd" }]}>Ulash</Text>
        </Pressable>

        {/* Save */}
        <Pressable style={styles.rBtn}>
          <View style={styles.rCircle}>
            <Feather name="bookmark" size={20} color="rgba(255,255,255,0.88)"/>
          </View>
          <Text style={styles.rLabel}>Saqlash</Text>
        </Pressable>

        {/* AI */}
        <Pressable style={styles.rBtn} onPress={onAI}>
          <LinearGradient colors={["#5b21b6","#7c3aed"]}
            style={[styles.rCircle, { borderColor: "#a78bfa66" }]}>
            <Feather name="zap" size={20} color="#fff"/>
          </LinearGradient>
          <Text style={[styles.rLabel, { color:"#c4b5fd" }]}>AI</Text>
        </Pressable>
      </View>

      {/* ════ PASTKI SHAFFOF PANEL ════ */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 8 }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject}/>
        <View style={[styles.bottomEdge, { backgroundColor: k.accent+"33" }]}/>

        {/* Caption */}
        {!!item.caption && (
          <Text style={styles.captionTxt} numberOfLines={2}>
            {item.caption}
          </Text>
        )}

        {/* Bottom row: views + swipe hint */}
        <View style={styles.bottomMetaRow}>
          {!!item.viewsCount && (
            <View style={styles.viewsChip}>
              <Feather name="eye" size={12} color="rgba(255,255,255,0.45)"/>
              <Text style={styles.viewsTxt}>{num(item.viewsCount)} ko'rish</Text>
            </View>
          )}
          <View style={{ flex: 1 }}/>
          <View style={styles.swipeHint}>
            <Feather name="chevrons-up" size={14} color="rgba(255,255,255,0.25)"/>
            <Text style={styles.swipeTxt}>suring</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  ASOSIY EKRAN
   ╚════════════════════════════════════════════════════════ */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const { user } = useAuth();

  const flatRef = useRef<FlatList>(null);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [activeCat,   setActiveCat]   = useState("all");
  const [likedMap,    setLikedMap]    = useState<Record<string,boolean>>({});
  const [likesMap,    setLikesMap]    = useState<Record<string,number>>({});
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  const [shareItem,   setShareItem]   = useState<FeedItem | null>(null);
  const [aiItem,      setAiItem]      = useState<FeedItem | null>(null);
  const [aiOpen,      setAiOpen]      = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [showShare,   setShowShare]   = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);

  const { data: rawPosts, isLoading: lp } = useQuery<RPost[]>({
    queryKey: ["posts"],
    queryFn: () => fetch(`${API}/posts`, { credentials:"include" }).then(r => r.ok ? r.json() : []),
  });
  const { data: rawReels, isLoading: lr } = useQuery<RReel[]>({
    queryKey: ["reels"],
    queryFn: () => fetch(`${API}/reels`, { credentials:"include" }).then(r => r.ok ? r.json() : []),
  });

  const allItems = useMemo(() => {
    const merged = [
      ...(rawPosts ?? []).map(normPost),
      ...(rawReels ?? []).map(normReel),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged.length > 0 ? merged : DEMO;
  }, [rawPosts, rawReels]);

  const CATS = [
    { key:"all",   label:"✦ Hammasi" },
    { key:"photo", label:"📸 Rasm"   },
    { key:"video", label:"🎬 Klip"   },
    { key:"reel",  label:"✨ Reel"   },
    { key:"ad",    label:"⚡ Reklama" },
  ];
  const feed = activeCat === "all"
    ? allItems
    : allItems.filter(i => i.contentKind === activeCat);

  const onViewable = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);
  const viewConfig = useRef({ itemVisiblePercentThreshold: 55 });

  const toggleLike = (item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const was = likedMap[item.id] ?? item.isLiked;
    const cur = likesMap[item.id] ?? item.likesCount;
    setLikedMap(p => ({ ...p, [item.id]: !was }));
    setLikesMap(p => ({ ...p, [item.id]: cur + (was ? -1 : 1) }));
  };

  const webAdj  = Platform.OS === "web";
  const topSafe = insets.top + (webAdj ? 67 : 0);
  const currentK = feed[activeIdx]?.contentKind ?? "text";
  const catAccent = K[currentK]?.accent ?? "#7c3aed";

  return (
    <View style={styles.root}>

      {/* ── TOP BAR: Logo + Category chips ── */}
      <View style={[styles.topBar, { top: topSafe + 4 }]}>
        <View style={styles.topBarLogo}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.logoOrb}>
            <Text style={styles.logoO}>O</Text>
          </LinearGradient>
          <Text style={styles.logoTxt}>OlCha</Text>
          <View style={[styles.logoPulse, { backgroundColor: catAccent }]}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }} contentContainerStyle={styles.catScroll}>
          {CATS.map(c => (
            <Pressable key={c.key}
              onPress={() => { setActiveCat(c.key); setActiveIdx(0); }}
              style={[styles.catChip, activeCat === c.key && { borderColor: catAccent+"88" }]}>
              {activeCat === c.key && (
                <LinearGradient colors={["#7c3aed","#a855f7"]}
                  start={{ x:0,y:0 }} end={{ x:1,y:0 }}
                  style={StyleSheet.absoluteFillObject}/>
              )}
              <Text style={[styles.catLabel, activeCat === c.key && { color:"#fff" }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Upload FAB */}
        <Pressable
          style={[styles.uploadFab, { borderColor: catAccent+"77" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowUpload(true); }}>
          <Feather name="plus" size={18} color={catAccent}/>
        </Pressable>
      </View>

      {/* ── VERTIKAL LENTA ── */}
      {(lp || lr) ? (
        <View style={styles.loadState}>
          <ActivityIndicator color="#7c3aed" size="large"/>
          <Text style={styles.loadTxt}>OlCha yuklanmoqda...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={feed}
          keyExtractor={i => i.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewConfig.current}
          renderItem={({ item, index }) => (
            <VerticalCard
              item={item}
              isActive={index === activeIdx}
              liked={likedMap[item.id] ?? item.isLiked}
              likes={likesMap[item.id] ?? item.likesCount}
              onLike={() => toggleLike(item)}
              onComment={() => {
                setCommentItem(item); setShowComment(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onShare={() => {
                setShareItem(item); setShowShare(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              onAI={() => {
                setAiItem(item); setAiOpen(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          )}
        />
      )}

      {/* Overlays */}
      <HoloComment
        visible={showComment}
        accent={commentItem ? K[commentItem.contentKind].accent : "#7c3aed"}
        onClose={() => setShowComment(false)}
      />
      <HoloShare
        visible={showShare}
        accent={shareItem ? K[shareItem.contentKind].accent : "#3b82f6"}
        item={shareItem}
        onClose={() => setShowShare(false)}
      />
      <AIModal item={aiItem} visible={aiOpen} onClose={() => setAiOpen(false)}/>
      <UploadSheet
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["posts"] });
          qc.invalidateQueries({ queryKey: ["reels"] });
        }}
      />
    </View>
  );
}

/* ════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#04060f" },

  /* ── Top bar ── */
  topBar: {
    position: "absolute", left: 0, right: 0, zIndex: 50,
    height: 44, flexDirection: "row", alignItems: "center",
    paddingLeft: 12, paddingRight: 8,
  },
  topBarLogo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingRight: 10, borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.10)",
  },
  logoOrb: { width: 24, height: 24, borderRadius: 7, alignItems:"center", justifyContent:"center" },
  logoO: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  logoTxt: { color: "#c4b5fd", fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  logoPulse: { width: 5, height: 5, borderRadius: 3 },
  catScroll: { paddingHorizontal: 8, gap: 8, alignItems: "center" },
  catChip: {
    paddingHorizontal: 12, height: 30, borderRadius: 15, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  catLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },

  /* Upload FAB */
  uploadFab: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.15)", marginLeft: 6,
  },

  /* Loading */
  loadState: { flex: 1, alignItems:"center", justifyContent:"center", gap: 14 },
  loadTxt: { color: "rgba(255,255,255,0.30)", fontSize: 13, fontFamily: "Inter_400Regular" },

  /* ── Author row ── */
  authorRow: {
    position: "absolute", left: 14, right: 76, zIndex: 20,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, flexShrink: 0 },
  avatarLetter: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  authorName: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", flexShrink: 1 },
  authorSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular" },
  verifiedBadge: { width: 14, height: 14, borderRadius: 7, alignItems:"center", justifyContent:"center", flexShrink: 0 },
  verifiedMark: { color: "#fff", fontSize: 8 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  audioTxt: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Inter_400Regular", flexShrink: 1 },
  followChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18,
    borderWidth: 1, backgroundColor: "rgba(0,0,0,0.35)", flexShrink: 0,
  },
  followTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  /* Kind badge */
  kindBadge: {
    position: "absolute", right: 14, zIndex: 20,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, borderWidth: 1,
  },
  kindTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  /* ── Right action bar ── */
  rightBar: {
    position: "absolute", right: 14, zIndex: 20,
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  rBtn: { alignItems: "center", gap: 4 },
  rCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  rLabel: {
    color: "rgba(255,255,255,0.70)", fontSize: 11,
    fontFamily: "Inter_500Medium", textAlign: "center",
  },

  /* ── Bottom panel ── */
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, overflow: "hidden",
  },
  bottomEdge: { position: "absolute", top: 0, left: 0, right: 0, height: 1 },
  captionTxt: {
    color: "rgba(255,255,255,0.90)", fontSize: 14,
    fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 8, zIndex: 2,
  },
  bottomMetaRow: {
    flexDirection: "row", alignItems: "center", paddingBottom: 4, zIndex: 2,
  },
  viewsChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewsTxt: { color: "rgba(255,255,255,0.35)", fontSize: 11 },
  swipeHint: { flexDirection: "row", alignItems: "center", gap: 3 },
  swipeTxt: { color: "rgba(255,255,255,0.22)", fontSize: 11 },

  /* ── Nebula ── */
  nebula: { position:"absolute", alignSelf:"center", top:"22%", alignItems:"center", justifyContent:"center" },
  nebulaRing3: { position:"absolute", width:280, height:280, borderRadius:140, borderWidth:1 },
  nebulaRing2: { position:"absolute", width:190, height:190, borderRadius:95, borderWidth:1 },
  nebulaRing1: { position:"absolute", width:110, height:110, borderRadius:55, borderWidth:1 },
  nebulaCore: { width:72, height:72, borderRadius:36, alignItems:"center", justifyContent:"center", borderWidth:1 },
  nebulaSymbol: { fontSize:26 },

  /* ── Upload sheet ── */
  uploadSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 12, overflow: "hidden",
    minHeight: H * 0.60,
  },
  uploadTopBorder: { position:"absolute", top:0, left:0, right:0, height:2, borderTopLeftRadius:26, borderTopRightRadius:26 },
  uploadHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  uploadHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  uploadIcon: { width: 42, height: 42, borderRadius: 14, alignItems:"center", justifyContent:"center" },
  uploadTitle: { flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  uploadClose: { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.07)", alignItems:"center", justifyContent:"center" },
  uploadSub: { color: "rgba(255,255,255,0.50)", fontSize: 13, textAlign: "center", marginBottom: 28 },
  uploadPickArea: { alignItems: "center" },
  uploadTypeRow: { flexDirection: "row", gap: 20, marginBottom: 24 },
  uploadTypeBtn: { alignItems: "center", gap: 10 },
  uploadTypeCircle: {
    width: 80, height: 80, borderRadius: 22, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  uploadTypeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uploadHint: { color: "rgba(255,255,255,0.28)", fontSize: 12, textAlign: "center", paddingHorizontal: 30 },
  uploadFormArea: {},
  uploadPreview: { width: "100%", height: 140, borderRadius: 16, overflow: "hidden", marginBottom: 16, position: "relative" },
  uploadPreviewImg: { width: "100%", height: "100%" } as any,
  uploadPreviewBadge: {
    position: "absolute", top: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  uploadPreviewBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  uploadFormLabel: { color: "rgba(255,255,255,0.50)", fontSize: 12, marginBottom: 8 },
  uploadCaptionWrap: {
    borderRadius: 14, borderWidth: 1,
    minHeight: 80, overflow: "hidden", marginBottom: 20,
  },
  uploadCaptionInput: {
    color: "#fff", fontSize: 14, padding: 14,
    fontFamily: "Inter_400Regular", minHeight: 80,
  },
  uploadBtnRow: { flexDirection: "row", gap: 12 },
  uploadBtnBack: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  uploadBtnBackTxt: { color: "rgba(255,255,255,0.55)", fontSize: 14 },
  uploadBtnGo: {
    flex: 2, height: 48, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  uploadBtnGoTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  uploadProgress: { alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 40 },
  uploadProgressTxt: { color: "rgba(255,255,255,0.70)", fontSize: 15 },
  uploadBar: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  uploadBarFill: { height: 6, borderRadius: 3 },
  uploadDoneCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },

  /* ── HoloComment ── */
  holoPanel: {
    position:"absolute", bottom:0, left:0, right:0,
    borderTopLeftRadius:28, borderTopRightRadius:28,
    paddingHorizontal:20, paddingTop:12, paddingBottom:34,
    overflow:"hidden", minHeight: H * 0.55,
  },
  holoBorder: { position:"absolute", top:0, left:0, right:0, bottom:0, borderTopLeftRadius:28, borderTopRightRadius:28, borderWidth:1 },
  holoGlow: { position:"absolute", top:0, left:0, right:0, height:2, borderTopLeftRadius:28, borderTopRightRadius:28 },
  holoHeader: { flexDirection:"row", alignItems:"center", gap:10, marginBottom:16 },
  holoPulse: { width:8, height:8, borderRadius:4 },
  holoTitle: { flex:1, color:"#fff", fontSize:16, fontFamily:"Inter_700Bold" },
  holoInputWrap: { borderRadius:16, borderWidth:1, padding:14, minHeight:70, marginBottom:14, overflow:"hidden" },
  holoInputPlaceholder: { color:"rgba(255,255,255,0.45)", fontSize:14, fontFamily:"Inter_400Regular" },
  holoKeyboard: { flexDirection:"row", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:14 },
  holoKey: { minWidth:34, height:38, borderRadius:10, borderWidth:1, alignItems:"center", justifyContent:"center", paddingHorizontal:8 },
  holoKeyText: { fontSize:15, fontFamily:"Inter_500Medium" },
  holoSend: { borderRadius:16, padding:14, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8 },
  holoSendText: { color:"#fff", fontSize:15, fontFamily:"Inter_700Bold" },

  /* ── HoloShare ── */
  shareCenterWrap: { flex:1, alignItems:"center", justifyContent:"center" },
  shareRing: { position:"absolute", borderWidth:1 },
  shareCard: { width: W-50, borderRadius:24, padding:24, overflow:"hidden", backgroundColor:"rgba(10,10,30,0.70)" },
  shareBorder: { position:"absolute", top:0, left:0, right:0, bottom:0, borderRadius:24, borderWidth:1 },
  shareGradTop: { position:"absolute", top:0, left:0, right:0, height:80, borderTopLeftRadius:24, borderTopRightRadius:24 },
  shareTitle: { color:"#fff", fontSize:18, fontFamily:"Inter_700Bold", textAlign:"center", marginBottom:6, marginTop:8 },
  shareSubtitle: { color:"rgba(255,255,255,0.45)", fontSize:13, textAlign:"center", marginBottom:20 },
  shareUsersRow: { flexDirection:"row", flexWrap:"wrap", gap:12, justifyContent:"center", marginBottom:20 },
  shareUserItem: { alignItems:"center", gap:5 },
  shareAvatar: { width:48, height:48, borderRadius:14, alignItems:"center", justifyContent:"center" },
  shareAvatarLetter: { color:"#fff", fontSize:18, fontFamily:"Inter_700Bold" },
  shareAvatarName: { color:"rgba(255,255,255,0.45)", fontSize:10 },
  shareConfirm: { borderRadius:14, padding:14, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8 },
  shareConfirmText: { color:"#fff", fontSize:15, fontFamily:"Inter_700Bold" },

  /* ── AI Sheet ── */
  aiSheet: {
    position:"absolute", bottom:0, left:0, right:0,
    borderTopLeftRadius:26, borderTopRightRadius:26,
    paddingHorizontal:20, paddingTop:12, overflow:"hidden",
    minHeight: H * 0.55,
  },
  aiTopBorder: { position:"absolute", top:0, left:0, right:0, height:2, borderTopLeftRadius:26, borderTopRightRadius:26 },
  aiHandle: { width:42, height:4, borderRadius:2, alignSelf:"center", marginBottom:16 },
  aiHeaderRow: { flexDirection:"row", alignItems:"center", gap:12, marginBottom:18 },
  aiIcon: { width:42, height:42, borderRadius:14, alignItems:"center", justifyContent:"center" },
  aiTitle: { color:"#fff", fontSize:16, fontFamily:"Inter_700Bold" },
  aiSubtitle: { color:"rgba(255,255,255,0.40)", fontSize:11, marginTop:2 },
  aiClose: { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.07)", alignItems:"center", justifyContent:"center" },
  aiCenter: { alignItems:"center", justifyContent:"center", gap:14, paddingVertical:48 },
  aiHint: { color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"center" },
  aiRow: { flexDirection:"row", gap:10, marginBottom:12 },
  aiCard: { flex:1, borderRadius:14, borderWidth:1, padding:14 },
  aiCardIcon: { marginBottom:6 },
  aiCardLabel: { color:"rgba(255,255,255,0.38)", fontSize:11, marginBottom:4 },
  aiCardValue: { fontSize:13, fontFamily:"Inter_700Bold" },
  aiBlock: { marginBottom:14 },
  aiBlockHead: { flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 },
  aiBlockLabel: { color:"rgba(255,255,255,0.48)", fontSize:12, fontFamily:"Inter_600SemiBold" },
  aiBodyText: { color:"rgba(255,255,255,0.78)", fontSize:13, lineHeight:21 },
  aiRecoBlock: { backgroundColor:"rgba(124,58,237,0.10)", borderRadius:14, borderWidth:1, borderColor:"rgba(124,58,237,0.28)", padding:14 },
  tagPill: { paddingHorizontal:10, paddingVertical:4, borderRadius:8, borderWidth:1 },
  tagText: { fontSize:12 },
});
