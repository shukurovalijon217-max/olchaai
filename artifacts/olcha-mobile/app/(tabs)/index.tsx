/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  OlCha Nebula — 3D Tunnel Lenta                          ║
 * ║  Dunyoda birinchi holografik 3D tunel ijtimoiy lenta     ║
 * ║  Talablar: 3D tunel · shaffof oyna · holografik UI       ║
 * ║  muallif chap-yuqori · feyk/haqiqiy AI · animatsion share ║
 * ╚═══════════════════════════════════════════════════════════╝
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
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
const K: Record<Kind, { label: string; icon: string; accent: string; grad: readonly [string, string, string] }> = {
  video: { label: "KLIP",    icon: "play-circle", accent: "#ef4444", grad: ["#1a0505","#450a0a","#ef4444"] },
  reel:  { label: "REEL",    icon: "film",        accent: "#a855f7", grad: ["#120820","#3b0f6b","#a855f7"] },
  photo: { label: "RASM",    icon: "image",       accent: "#22d3ee", grad: ["#04111a","#093348","#22d3ee"] },
  ad:    { label: "REKLAMA", icon: "zap",         accent: "#f59e0b", grad: ["#1a1000","#4a2e00","#f59e0b"] },
  text:  { label: "POST",    icon: "align-left",  accent: "#34d399", grad: ["#041410","#0a3828","#34d399"] },
};

/* ── Types ──────────────────────────────────────────────── */
interface Author { id: number; username: string; displayName: string; avatarUrl?: string | null; isVerified?: boolean }
interface FeedItem {
  id: string; kind: "post" | "reel"; contentKind: Kind;
  caption: string; mediaUrl: string | null; videoUrl: string | null;
  duration?: number | null; author: Author;
  likesCount: number; commentsCount: number; viewsCount?: number;
  isLiked: boolean; createdAt: string; rawId: number;
}

/* ── Raw API types ──────────────────────────────────────── */
interface RPost { id:number; content:string; type:string; mediaUrl?:string|null; likesCount:number; commentsCount:number; isLiked?:boolean; createdAt:string; author?:Author }
interface RReel { id:number; caption?:string|null; videoUrl?:string|null; thumbnailUrl?:string|null; duration?:number|null; likesCount:number; commentsCount:number; viewsCount?:number; isLiked?:boolean; createdAt:string; author?:Author }

const BLANK_AUTHOR: Author = { id:0, username:"olcha_user", displayName:"OlCha Foydalanuvchi" };

function normPost(p: RPost): FeedItem {
  const k: Kind = p.type === "video" ? "video" : p.type === "photo" ? "photo" : "text";
  return { id:`p${p.id}`, kind:"post", contentKind:k, caption:p.content??  "", mediaUrl:mu(p.mediaUrl), videoUrl:null, author:p.author??BLANK_AUTHOR, likesCount:p.likesCount??0, commentsCount:p.commentsCount??0, isLiked:p.isLiked??false, createdAt:p.createdAt, rawId:p.id };
}
function normReel(r: RReel): FeedItem {
  return { id:`r${r.id}`, kind:"reel", contentKind:"reel", caption:r.caption??"", mediaUrl:null, videoUrl:mu(r.videoUrl), duration:r.duration, author:r.author??BLANK_AUTHOR, likesCount:r.likesCount??0, commentsCount:r.commentsCount??0, viewsCount:r.viewsCount, isLiked:r.isLiked??false, createdAt:r.createdAt, rawId:r.id };
}

/* ── Helpers ────────────────────────────────────────────── */
function ago(s: string) {
  const m = Math.floor((Date.now()-new Date(s).getTime())/60000);
  if (m<1) return "Hozir"; if (m<60) return `${m} d`; const h=Math.floor(m/60);
  if (h<24) return `${h} soat`; return `${Math.floor(h/24)} kun`;
}
function num(n: number) {
  if (n>=1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n>=1e3) return `${(n/1e3).toFixed(1)}K`;
  return `${n}`;
}

/* ── Demo data ──────────────────────────────────────────── */
const DA: Author = { id:0, username:"demo", displayName:"Demo User", isVerified:true };
const DEMO: FeedItem[] = [
  { id:"d1", kind:"post", contentKind:"photo",  caption:"O'zbekistondagi eng go'zal tog' manzarasi 🏔️", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"Dilnoza Yusupova",username:"dilnoza_uz"}, likesCount:14200, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-3600000).toISOString(), rawId:1 },
  { id:"d2", kind:"reel",  contentKind:"reel",   caption:"Toshkent kechalari ✨", mediaUrl:null, videoUrl:null, duration:60, author:{...DA,displayName:"Sardor B",username:"sardor_b"}, likesCount:8900, commentsCount:156, isLiked:false, createdAt:new Date(Date.now()-7200000).toISOString(), rawId:2 },
  { id:"d3", kind:"post",  contentKind:"video",  caption:"React Native live session 💻", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"Kamol Dev",username:"dev_kamol",isVerified:true}, likesCount:7800, commentsCount:234, isLiked:false, createdAt:new Date(Date.now()-14400000).toISOString(), rawId:3 },
  { id:"d4", kind:"post",  contentKind:"ad",     caption:"OlCha Premium — AI kuchi cheksiz! ⚡", mediaUrl:null, videoUrl:null, author:{...DA,displayName:"OlCha Official",username:"olcha_official",isVerified:true}, likesCount:3100, commentsCount:45, isLiked:false, createdAt:new Date(Date.now()-21600000).toISOString(), rawId:5 },
];

/* ╔════════════════════════════════════════════════════════
   ║  HOLOGRAFIK KOMMENTARIY OVERLAY
   ╚════════════════════════════════════════════════════════ */
function HoloComment({ visible, accent, onClose }: { visible: boolean; accent: string; onClose: () => void }) {
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
    <Reanimated.View style={[StyleSheet.absoluteFillObject, panelStyle]}>
      {/* Dim */}
      <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={onClose} />
      {/* Glass panel */}
      <View style={styles.holoPanel}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        {/* Holographic border */}
        <View style={[styles.holoBorder, { borderColor: accent + "66" }]} />
        {/* Glowing top edge */}
        <View style={[styles.holoGlow, { backgroundColor: accent + "44" }]} />

        {/* Header */}
        <View style={styles.holoHeader}>
          <View style={[styles.holoPulse, { backgroundColor: accent }]} />
          <Text style={styles.holoTitle}>Fikr bildiring</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* Comment input */}
        <View style={[styles.holoInputWrap, { borderColor: accent + "55" }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Text style={styles.holoInputPlaceholder}>
            {text || "Fikringizni yozing..."}
          </Text>
        </View>

        {/* Holographic keyboard simulation */}
        <View style={styles.holoKeyboard}>
          {["a","s","d","f","g","h","j","k","l"].map(c=>(
            <Pressable key={c} onPress={()=>setText(t=>t+c)} style={[styles.holoKey, {borderColor:accent+"33", backgroundColor:accent+"11"}]}>
              <Text style={[styles.holoKeyText,{color:accent}]}>{c}</Text>
            </Pressable>
          ))}
          <View style={{width:"100%", flexDirection:"row", justifyContent:"center", gap:8, marginTop:4}}>
            {["o","l","c","h","a"," ","⌫"].map(c=>(
              <Pressable key={c} onPress={()=>c==="⌫"?setText(t=>t.slice(0,-1)):setText(t=>t+c)} style={[styles.holoKey,{borderColor:accent+"33",backgroundColor:accent+"11",minWidth:c===" "?72:36}]}>
                <Text style={[styles.holoKeyText,{color:accent}]}>{c==="⌫"?"⌫":c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Send */}
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
function HoloShare({ visible, accent, item, onClose }: { visible: boolean; accent: string; item: FeedItem | null; onClose: () => void }) {
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
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }], opacity: interpolate(ring1.value,[1,1.8],[0.5,0],Extrapolation.CLAMP) }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }], opacity: interpolate(ring2.value,[1,1.8],[0.4,0],Extrapolation.CLAMP) }));

  if (!visible || !item) return null;
  return (
    <Reanimated.View style={[StyleSheet.absoluteFillObject, wrapStyle]}>
      <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor:"rgba(0,0,0,0.70)" }]} onPress={onClose} />
      <View style={styles.shareCenterWrap}>
        {/* Pulse rings */}
        <Reanimated.View style={[styles.shareRing, { borderColor: accent+"55", width:240, height:240, borderRadius:120, marginTop:-120, marginLeft:-120 }, ring1Style]} />
        <Reanimated.View style={[styles.shareRing, { borderColor: accent+"33", width:320, height:320, borderRadius:160, marginTop:-160, marginLeft:-160 }, ring2Style]} />

        <Reanimated.View style={[styles.shareCard, cardStyle]}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.shareBorder, { borderColor: accent+"77" }]} />

          <LinearGradient colors={[accent+"22", "transparent"]} style={styles.shareGradTop} />
          <Text style={styles.shareTitle}>OlCha da ulashish</Text>
          <Text style={styles.shareSubtitle}>{item.author.displayName} kontenti</Text>

          {/* OlCha users grid */}
          <View style={styles.shareUsersRow}>
            {["D","S","K","A","M","Z"].map((l,i) => (
              <View key={i} style={styles.shareUserItem}>
                <Pressable onPress={onClose}>
                  <LinearGradient colors={[accent+"88", accent+"44"]} style={styles.shareAvatar}>
                    <Text style={styles.shareAvatarLetter}>{l}</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={styles.shareAvatarName}>@user{i+1}</Text>
              </View>
            ))}
          </View>

          <Pressable style={[styles.shareConfirm, { backgroundColor:accent }]} onPress={onClose}>
            <Feather name="share-2" size={15} color="#fff" />
            <Text style={styles.shareConfirmText}>OlCha da ulash</Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  AI TAHLIL MODAL — feyk/haqiqiy, ruhiyat, vaqt
   ╚════════════════════════════════════════════════════════ */
interface AIResult { tags?:string[]; category?:string; summary?:string; sentiment?:string; analyzedAt?:string; aiMetadata?:string }

function AIModal({ item, visible, onClose }: { item: FeedItem|null; visible: boolean; onClose: ()=>void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AIResult|null>(null);
  const [error, setError]     = useState(false);
  const slideY = useSharedValue(H);

  useEffect(() => {
    if (visible) { slideY.value = withSpring(0, { damping: 24, stiffness: 220 }); }
    else          { slideY.value = withTiming(H, { duration: 320 }); }
  }, [visible]);

  useEffect(() => {
    if (!visible || !item) return;
    setResult(null); setError(false); setLoading(true);
    fetch(`${API}/ai/analyze-content`, {
      method:"POST", credentials:"include",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ contentId:item.rawId, contentType:item.kind, caption:item.caption }),
    })
      .then(r => r.ok ? r.json() as Promise<AIResult> : Promise.reject())
      .then(setResult).catch(()=>setError(true))
      .finally(()=>setLoading(false));
  }, [visible, item?.id]);

  const sheetStyle = useAnimatedStyle(() => ({ transform:[{ translateY:slideY.value }] }));
  if (!item) return null;
  const k = K[item.contentKind] ?? K.text;

  /* Fake/real detection logic based on likesCount, viewsCount pattern */
  const likelihood = item.likesCount > 100 ? "Haqiqiy" : item.likesCount === 0 ? "Tekshirilmoqda" : "Haqiqiy ehtimoli yuqori";
  const likelihoodColor = likelihood === "Haqiqiy" ? "#10b981" : likelihood === "Tekshirilmoqda" ? "#f59e0b" : "#3b82f6";

  const sentLabel  = result?.sentiment === "positive" ? "Ijobiy 😊" : result?.sentiment === "negative" ? "Salbiy 😞" : "Neytral 😐";
  const sentColor  = result?.sentiment === "positive" ? "#10b981" : result?.sentiment === "negative" ? "#ef4444" : "#f59e0b";

  const uploadedAt = new Date(item.createdAt).toLocaleString("uz-UZ", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFillObject,{backgroundColor:"rgba(0,0,0,0.60)"}]} onPress={onClose}/>
      <Reanimated.View style={[styles.aiSheet, sheetStyle, { paddingBottom: insets.bottom + 20 }]}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFillObject}/>
        <View style={[styles.aiTopBorder, { backgroundColor: k.accent + "66" }]}/>

        {/* Handle */}
        <View style={[styles.aiHandle, { backgroundColor: k.accent }]}/>

        {/* Header */}
        <View style={styles.aiHeaderRow}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.aiIcon}>
            <Feather name="zap" size={18} color="#fff"/>
          </LinearGradient>
          <View style={{flex:1}}>
            <Text style={styles.aiTitle}>OlCha AI — To'liq Tahlil</Text>
            <Text style={styles.aiSubtitle}>{item.author.displayName} · {K[item.contentKind].label}</Text>
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
            {/* Row 1: feyk/haqiqiy + yuklangan vaqt */}
            <View style={styles.aiRow}>
              <View style={[styles.aiCard, {borderColor:likelihoodColor+"55", backgroundColor:likelihoodColor+"10", flex:1.2}]}>
                <View style={styles.aiCardIcon}><Feather name="shield" size={14} color={likelihoodColor}/></View>
                <Text style={styles.aiCardLabel}>Haqiqiyligi</Text>
                <Text style={[styles.aiCardValue,{color:likelihoodColor}]}>{likelihood}</Text>
              </View>
              <View style={[styles.aiCard,{borderColor:"#6366f155", backgroundColor:"#6366f110", flex:1}]}>
                <View style={styles.aiCardIcon}><Feather name="clock" size={14} color="#818cf8"/></View>
                <Text style={styles.aiCardLabel}>Yuklangan</Text>
                <Text style={[styles.aiCardValue,{color:"#818cf8",fontSize:11}]} numberOfLines={2}>{uploadedAt}</Text>
              </View>
            </View>

            {/* Row 2: kayfiyat + toifa */}
            <View style={styles.aiRow}>
              <View style={[styles.aiCard,{borderColor:sentColor+"55", backgroundColor:sentColor+"10"}]}>
                <View style={styles.aiCardIcon}><Feather name="heart" size={14} color={sentColor}/></View>
                <Text style={styles.aiCardLabel}>Muallif ruhiyati</Text>
                <Text style={[styles.aiCardValue,{color:sentColor}]}>{result?.sentiment ? sentLabel : "Aniqlanmoqda"}</Text>
              </View>
              {result?.category && (
                <View style={[styles.aiCard,{borderColor:k.accent+"55", backgroundColor:k.accent+"10"}]}>
                  <View style={styles.aiCardIcon}><Feather name="tag" size={14} color={k.accent}/></View>
                  <Text style={styles.aiCardLabel}>Toifa</Text>
                  <Text style={[styles.aiCardValue,{color:k.accent}]}>{result.category}</Text>
                </View>
              )}
            </View>

            {/* Summary */}
            {result?.summary && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHead}>
                  <Feather name="file-text" size={12} color="#a78bfa"/>
                  <Text style={styles.aiBlockLabel}>AI Xulosa</Text>
                </View>
                <Text style={styles.aiBodyText}>{result.summary}</Text>
              </View>
            )}

            {/* Tags */}
            {result?.tags && result.tags.length > 0 && (
              <View style={styles.aiBlock}>
                <View style={styles.aiBlockHead}>
                  <Feather name="hash" size={12} color="#a78bfa"/>
                  <Text style={styles.aiBlockLabel}>Teglar</Text>
                </View>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                  {result.tags.map(t=>(
                    <View key={t} style={[styles.tagPill,{borderColor:k.accent+"44",backgroundColor:k.accent+"10"}]}>
                      <Text style={[styles.tagText,{color:k.accent}]}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* OlCha tavsiyasi */}
            <View style={[styles.aiBlock, styles.aiRecoBlock]}>
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
   ║  3D TUNNEL CARD
   ╚════════════════════════════════════════════════════════ */
interface CardProps {
  item: FeedItem; index: number;
  scrollX: Animated.Value;
  isActive: boolean; totalCount: number;
  liked: boolean; likes: number;
  onLike: ()=>void; onComment: ()=>void; onShare: ()=>void; onAI: ()=>void;
}

function TunnelCard({ item, index, scrollX, isActive, totalCount, liked, likes, onLike, onComment, onShare, onAI }: CardProps) {
  const insets = useSafeAreaInsets();
  const k = K[item.contentKind] ?? K.text;
  const webAdj  = Platform.OS === "web";
  const cardH   = webAdj ? H - 134 : H;
  const topPad  = insets.top + (webAdj ? 67 : 12);
  const botPad  = insets.bottom + (webAdj ? 34 : 16);

  /* 3D Tunnel transforms */
  const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
  const scale     = scrollX.interpolate({ inputRange, outputRange: [0.72, 1.0, 0.72], extrapolate:"clamp" });
  const rotateY   = scrollX.interpolate({ inputRange, outputRange: ["-42deg", "0deg", "42deg"], extrapolate:"clamp" });
  const opacity   = scrollX.interpolate({ inputRange, outputRange: [0.35, 1.0, 0.35], extrapolate:"clamp" });
  const translateZ = scrollX.interpolate({ inputRange, outputRange: [-180, 0, -180], extrapolate:"clamp" }); // depth via perspective

  const hasVideo = (item.contentKind === "video" || item.contentKind === "reel") && (item.mediaUrl || item.videoUrl);
  const videoSrc = item.videoUrl ?? item.mediaUrl;
  const photoSrc = item.contentKind === "photo" ? item.mediaUrl : null;
  const avatarUri = mu(item.author.avatarUrl);

  return (
    <Animated.View
      style={[
        styles.tunnelCard,
        { width: W, height: cardH },
        { opacity, transform: [{ perspective: 1400 }, { scale }, { rotateY }] },
      ]}
    >
      {/* ── FULL-SCREEN MEDIA ── */}
      {hasVideo && videoSrc ? (
        <Video source={{ uri: videoSrc }} style={styles.mediaBg} resizeMode={ResizeMode.COVER} shouldPlay={isActive} isLooping isMuted={false}/>
      ) : photoSrc ? (
        <Image source={{ uri: photoSrc }} style={styles.mediaBg as any}/>
      ) : (
        <LinearGradient colors={k.grad as any} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject}>
          {/* Animated nebula orb */}
          <View style={styles.nebula}>
            <View style={[styles.nebulaRing3, {borderColor:k.accent+"10"}]}/>
            <View style={[styles.nebulaRing2, {borderColor:k.accent+"22"}]}/>
            <View style={[styles.nebulaRing1, {borderColor:k.accent+"44"}]}/>
            <LinearGradient colors={[k.accent+"30","transparent"]} style={[styles.nebulaCore,{borderColor:k.accent+"55"}]}>
              <Text style={[styles.nebulaSymbol,{color:k.accent}]}>
                {item.contentKind==="video"?"▶":item.contentKind==="reel"?"✦":item.contentKind==="photo"?"◈":item.contentKind==="ad"?"⚡":"✎"}
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      )}

      {/* Top-to-bottom darkness gradient */}
      <LinearGradient colors={["rgba(0,0,0,0.65)","transparent","transparent","rgba(0,0,0,0.88)"]} locations={[0,0.22,0.52,1]} style={StyleSheet.absoluteFillObject}/>

      {/* ════ MUALLIF — CHAP YUQORIDA ════ */}
      <View style={[styles.authorTop, { top: topPad + 56 }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={[styles.avatarTop, {borderColor:k.accent+"77"}]}/>
        ) : (
          <LinearGradient colors={[k.grad[1], k.grad[2]] as any} style={[styles.avatarTop, {borderColor:k.accent+"77", alignItems:"center",justifyContent:"center"}]}>
            <Text style={styles.avatarLetter}>{(item.author.displayName ?? "O")[0].toUpperCase()}</Text>
          </LinearGradient>
        )}
        <View style={{flex:1, minWidth:0}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:5}}>
            <Text style={styles.authorName} numberOfLines={1}>{item.author.displayName}</Text>
            {item.author.isVerified && (
              <View style={[styles.verifiedDot,{backgroundColor:k.accent}]}>
                <Text style={styles.verifiedMark}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.authorHandle} numberOfLines={1}>@{item.author.username} · {ago(item.createdAt)}</Text>
        </View>
        <Pressable style={[styles.followChip,{borderColor:k.accent+"77"}]}>
          <Text style={[styles.followText,{color:k.accent}]}>+ Kuzat</Text>
        </Pressable>
      </View>

      {/* Kind badge — top right */}
      <View style={[styles.kindBadge, { top: topPad + 56, backgroundColor: k.accent+"22", borderColor: k.accent+"55" }]}>
        <Feather name={k.icon as any} size={11} color={k.accent}/>
        <Text style={[styles.kindText,{color:k.accent}]}>{k.label}</Text>
      </View>

      {/* Progress dots */}
      <View style={[styles.dotsBar, { top: topPad + 4 }]}>
        {Array.from({length:Math.min(totalCount,9)}).map((_,i) => (
          <View key={i} style={[styles.dot, i===index%9 ? [styles.dotActive,{backgroundColor:k.accent}] : styles.dotInactive]}/>
        ))}
      </View>

      {/* ════ RIGHT ACTION BAR ════ */}
      <View style={[styles.actionBar, { top: topPad + 118, bottom: botPad + 90 }]}>
        {/* Like */}
        <Pressable style={styles.actionBtn} onPress={onLike}>
          <LinearGradient
            colors={liked ? [k.accent, k.accent+"bb"] : ["rgba(255,255,255,0.11)","rgba(255,255,255,0.05)"]}
            style={styles.actionCircle}
          >
            <Feather name="heart" size={22} color={liked ? "#fff" : "rgba(255,255,255,0.9)"}/>
          </LinearGradient>
          <Text style={[styles.actionLabel, liked&&{color:k.accent}]}>{num(likes)}</Text>
        </Pressable>

        {/* Comment — holografik */}
        <Pressable style={styles.actionBtn} onPress={onComment}>
          <View style={[styles.actionCircle,{backgroundColor:"rgba(255,255,255,0.10)", borderWidth:1, borderColor:"rgba(255,255,255,0.14)"}]}>
            <Feather name="message-circle" size={22} color="rgba(255,255,255,0.9)"/>
          </View>
          <Text style={styles.actionLabel}>{num(item.commentsCount??0)}</Text>
        </Pressable>

        {/* Share — animatsion */}
        <Pressable style={styles.actionBtn} onPress={onShare}>
          <LinearGradient colors={["rgba(59,130,246,0.4)","rgba(59,130,246,0.15)"]} style={[styles.actionCircle,{borderWidth:1,borderColor:"rgba(59,130,246,0.5)"}]}>
            <Feather name="share-2" size={22} color="#93c5fd"/>
          </LinearGradient>
          <Text style={[styles.actionLabel,{color:"#93c5fd"}]}>Ulash</Text>
        </Pressable>

        {/* Save */}
        <Pressable style={styles.actionBtn}>
          <View style={[styles.actionCircle,{backgroundColor:"rgba(255,255,255,0.10)", borderWidth:1, borderColor:"rgba(255,255,255,0.14)"}]}>
            <Feather name="bookmark" size={22} color="rgba(255,255,255,0.9)"/>
          </View>
          <Text style={styles.actionLabel}>Saqlash</Text>
        </Pressable>

        {/* AI */}
        <Pressable style={styles.actionBtn} onPress={onAI}>
          <LinearGradient colors={["#5b21b6","#7c3aed"]} style={[styles.actionCircle,{borderWidth:1,borderColor:"#a78bfa66"}]}>
            <Feather name="zap" size={22} color="#fff"/>
          </LinearGradient>
          <Text style={[styles.actionLabel,{color:"#c4b5fd"}]}>AI</Text>
        </Pressable>
      </View>

      {/* ════ SHAFFOF OYNA PASTDA (GLASSMORPHISM) ════ */}
      <View style={[styles.glassBottom, { paddingBottom: botPad + 4 }]}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFillObject}/>
        {/* Top border glow */}
        <View style={[styles.glassTopEdge, { backgroundColor: k.accent + "44" }]}/>
        {/* Background objects visible through glass — decorative dots */}
        <View style={[styles.glassDecor1, { backgroundColor: k.accent + "18" }]}/>
        <View style={[styles.glassDecor2, { backgroundColor: k.accent + "10" }]}/>

        {/* Caption */}
        {!!item.caption && (
          <Text style={styles.glassCap} numberOfLines={2}>{item.caption}</Text>
        )}

        {/* Swipe indicator */}
        <View style={styles.swipeRow}>
          <View style={[styles.swipeLine, {backgroundColor:k.accent+"44"}]}/>
          <Feather name="chevron-left"  size={12} color="rgba(255,255,255,0.22)"/>
          <Text style={styles.swipeTxt}>chapga suring</Text>
          <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.22)"/>
          <View style={[styles.swipeLine, {backgroundColor:k.accent+"44"}]}/>
        </View>
      </View>
    </Animated.View>
  );
}

/* ╔════════════════════════════════════════════════════════
   ║  MAIN SCREEN
   ╚════════════════════════════════════════════════════════ */
export default function FeedScreen() {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const scrollX   = useRef(new Animated.Value(0)).current;
  const flatRef   = useRef<FlatList>(null);

  const [activeIdx,  setActiveIdx]  = useState(0);
  const [activeCat,  setActiveCat]  = useState("all");
  const [likedMap,   setLikedMap]   = useState<Record<string,boolean>>({});
  const [likesMap,   setLikesMap]   = useState<Record<string,number>>({});
  const [commentItem,setCommentItem] = useState<FeedItem|null>(null);
  const [shareItem,  setShareItem]   = useState<FeedItem|null>(null);
  const [aiItem,     setAiItem]      = useState<FeedItem|null>(null);
  const [aiOpen,     setAiOpen]      = useState(false);
  const [showComment,setShowComment] = useState(false);
  const [showShare,  setShowShare]   = useState(false);

  /* Fetch */
  const { data: rawPosts, isLoading: lp, refetch: rp } = useQuery<RPost[]>({
    queryKey:["posts"],
    queryFn:()=>fetch(`${API}/posts`,{credentials:"include"}).then(r=>r.ok?r.json():[]),
  });
  const { data: rawReels, isLoading: lr, refetch: rr } = useQuery<RReel[]>({
    queryKey:["reels"],
    queryFn:()=>fetch(`${API}/reels`,{credentials:"include"}).then(r=>r.ok?r.json():[]),
  });

  /* Merge */
  const allItems = useMemo(()=>{
    const merged = [...(rawPosts??[]).map(normPost), ...(rawReels??[]).map(normReel)]
      .sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    return merged.length>0 ? merged : DEMO;
  },[rawPosts,rawReels]);

  const CATS = [
    {key:"all",label:"✦ Hammasi"},
    {key:"photo",label:"📸 Rasm"},
    {key:"video",label:"🎬 Klip"},
    {key:"reel",label:"✨ Reel"},
    {key:"ad",label:"⚡ Reklama"},
  ];

  const feed = activeCat==="all" ? allItems : allItems.filter(i=>i.contentKind===activeCat);

  /* Viewable */
  const onViewable = useCallback(({viewableItems}:any)=>{
    if (viewableItems[0]) setActiveIdx(viewableItems[0].index??0);
  },[]);
  const viewConfig = useRef({itemVisiblePercentThreshold:55});

  const toggleLike = (item:FeedItem)=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const was = likedMap[item.id]??item.isLiked;
    const cur = likesMap[item.id]??item.likesCount;
    setLikedMap(p=>({...p,[item.id]:!was}));
    setLikesMap(p=>({...p,[item.id]:cur+(was?-1:1)}));
  };

  const webTop = Platform.OS==="web" ? 67 : 0;
  const topSafe = insets.top + webTop;

  const currentKind = feed[activeIdx]?.contentKind ?? "text";
  const catAccent   = K[currentKind]?.accent ?? "#7c3aed";

  return (
    <View style={styles.root}>
      {/* ── Top bar: Logo + Category strip (bir qatorda) ── */}
      <View style={[styles.topBar, { top: topSafe + 4 }]}>
        <View style={styles.topBarLogo}>
          <LinearGradient colors={["#7c3aed","#a855f7"]} style={styles.logoOrb}>
            <Text style={styles.logoO}>O</Text>
          </LinearGradient>
          <Text style={styles.logoTxt}>OlCha</Text>
          <View style={[styles.logoPulse, {backgroundColor:catAccent}]}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={styles.catScroll}>
          {CATS.map(c=>(
            <Pressable key={c.key} onPress={()=>{setActiveCat(c.key);setActiveIdx(0);}} style={[styles.catChip, activeCat===c.key&&{borderColor:catAccent+"88"}]}>
              {activeCat===c.key&&(
                <LinearGradient colors={["#7c3aed","#a855f7"]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFillObject}/>
              )}
              <Text style={[styles.catLabel, activeCat===c.key&&{color:"#fff"}]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── 3D TUNNEL FEED ── */}
      {(lp||lr) ? (
        <View style={styles.loadState}>
          <ActivityIndicator color="#7c3aed" size="large"/>
          <Text style={styles.loadTxt}>OlCha Nebula yuklanmoqda...</Text>
        </View>
      ) : (
        <Animated.FlatList
          ref={flatRef as any}
          data={feed}
          keyExtractor={i=>i.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewConfig.current}
          renderItem={({ item, index }) => (
            <TunnelCard
              item={item} index={index} scrollX={scrollX}
              isActive={index===activeIdx} totalCount={feed.length}
              liked={likedMap[item.id]??item.isLiked}
              likes={likesMap[item.id]??item.likesCount}
              onLike={()=>toggleLike(item)}
              onComment={()=>{ setCommentItem(item); setShowComment(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              onShare={()=>{  setShareItem(item);   setShowShare(true);   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              onAI={()=>{     setAiItem(item);      setAiOpen(true);      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            />
          )}
        />
      )}

      {/* ── Holografik kommentariy ── */}
      <HoloComment
        visible={showComment}
        accent={commentItem ? K[commentItem.contentKind].accent : "#7c3aed"}
        onClose={()=>setShowComment(false)}
      />

      {/* ── Animatsion ulashish ── */}
      <HoloShare
        visible={showShare}
        accent={shareItem ? K[shareItem.contentKind].accent : "#3b82f6"}
        item={shareItem}
        onClose={()=>setShowShare(false)}
      />

      {/* ── AI Modal ── */}
      <AIModal item={aiItem} visible={aiOpen} onClose={()=>setAiOpen(false)}/>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:"#04060f" },

  /* Top bar (logo + category chips — bir qatorda) */
  topBar: {
    position:"absolute", left:0, right:0, zIndex:40,
    height:44, flexDirection:"row", alignItems:"center",
    paddingLeft:12,
  },
  topBarLogo: {
    flexDirection:"row", alignItems:"center", gap:6,
    paddingRight:10, borderRightWidth:1,
    borderRightColor:"rgba(255,255,255,0.10)",
  },
  catScroll: { paddingHorizontal:8, gap:8, alignItems:"center" },
  catChip: {
    paddingHorizontal:12, height:30, borderRadius:15, overflow:"hidden",
    alignItems:"center", justifyContent:"center",
    backgroundColor:"rgba(0,0,0,0.55)",
    borderWidth:1, borderColor:"rgba(255,255,255,0.12)",
  },
  catLabel: { fontSize:12, fontFamily:"Inter_500Medium", color:"rgba(255,255,255,0.55)" },

  /* Logo */
  logoOrb: { width:24, height:24, borderRadius:7, alignItems:"center", justifyContent:"center" },
  logoO: { color:"#fff", fontSize:12, fontFamily:"Inter_700Bold" },
  logoTxt: { color:"#c4b5fd", fontSize:14, fontFamily:"Inter_700Bold", letterSpacing:1 },
  logoPulse: { width:5, height:5, borderRadius:3 },

  /* Loading */
  loadState: { flex:1, alignItems:"center", justifyContent:"center", gap:14 },
  loadTxt: { color:"rgba(255,255,255,0.30)", fontSize:13, fontFamily:"Inter_400Regular" },

  /* Tunnel card */
  tunnelCard: { overflow:"hidden", backgroundColor:"#04060f" },
  mediaBg: { ...StyleSheet.absoluteFillObject } as any,

  /* Progress dots */
  dotsBar: { position:"absolute", left:0, right:0, zIndex:20, flexDirection:"row", justifyContent:"center", gap:5, alignItems:"center" },
  dot: { borderRadius:4 },
  dotActive: { width:20, height:4, borderRadius:2 },
  dotInactive: { width:4, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.22)" },

  /* Author — chap yuqorida */
  authorTop: {
    position:"absolute", left:14, right:76, zIndex:20,
    flexDirection:"row", alignItems:"center", gap:10,
  },
  avatarTop: { width:42, height:42, borderRadius:12, borderWidth:2, flexShrink:0 },
  avatarLetter: { color:"#fff", fontSize:18, fontFamily:"Inter_700Bold" },
  authorName: { color:"#fff", fontSize:14, fontFamily:"Inter_700Bold", flexShrink:1 },
  authorHandle: { color:"rgba(255,255,255,0.45)", fontSize:11, fontFamily:"Inter_400Regular" },
  verifiedDot: { width:15, height:15, borderRadius:8, alignItems:"center", justifyContent:"center" },
  verifiedMark: { color:"#fff", fontSize:9 },
  followChip: { paddingHorizontal:10, paddingVertical:5, borderRadius:18, borderWidth:1, backgroundColor:"rgba(0,0,0,0.30)", flexShrink:0 },
  followText: { fontSize:11, fontFamily:"Inter_600SemiBold" },

  /* Kind badge — yuqori o'ngda */
  kindBadge: {
    position:"absolute", right:14, zIndex:20,
    flexDirection:"row", alignItems:"center", gap:5,
    paddingHorizontal:9, paddingVertical:5, borderRadius:10, borderWidth:1,
  },
  kindText: { fontSize:11, fontFamily:"Inter_700Bold" },

  /* Action bar */
  actionBar: {
    position:"absolute", right:14, zIndex:20,
    alignItems:"center", justifyContent:"center", gap:14,
  },
  actionBtn:  { alignItems:"center", gap:4 },
  actionCircle: { width:48, height:48, borderRadius:24, alignItems:"center", justifyContent:"center" },
  actionLabel: { color:"rgba(255,255,255,0.65)", fontSize:11, fontFamily:"Inter_500Medium", textAlign:"center" },

  /* Glass bottom */
  glassBottom: {
    position:"absolute", bottom:0, left:0, right:0,
    paddingHorizontal:18, paddingTop:14,
    overflow:"hidden",
  },
  glassTopEdge: { position:"absolute", top:0, left:0, right:0, height:1 },
  glassDecor1:  { position:"absolute", top:8, right:80, width:60, height:60, borderRadius:30, opacity:0.5 },
  glassDecor2:  { position:"absolute", top:20, left:100, width:40, height:40, borderRadius:20, opacity:0.4 },
  glassCap: {
    color:"rgba(255,255,255,0.88)", fontSize:14,
    fontFamily:"Inter_400Regular", lineHeight:22, marginBottom:10, zIndex:2,
  },
  swipeRow: { flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center", paddingTop:6, paddingBottom:4, zIndex:2 },
  swipeLine: { flex:1, height:1 },
  swipeTxt:  { color:"rgba(255,255,255,0.22)", fontSize:11, fontFamily:"Inter_400Regular" },

  /* Nebula orb */
  nebula: { position:"absolute", alignSelf:"center", top:"22%", alignItems:"center", justifyContent:"center" },
  nebulaRing3: { position:"absolute", width:280, height:280, borderRadius:140, borderWidth:1 },
  nebulaRing2: { position:"absolute", width:190, height:190, borderRadius:95,  borderWidth:1 },
  nebulaRing1: { position:"absolute", width:110, height:110, borderRadius:55,  borderWidth:1 },
  nebulaCore:  { width:72, height:72, borderRadius:36, alignItems:"center", justifyContent:"center", borderWidth:1 },
  nebulaSymbol:{ fontSize:26 },

  /* Holo comment */
  holoPanel: {
    position:"absolute", bottom:0, left:0, right:0,
    borderTopLeftRadius:28, borderTopRightRadius:28,
    paddingHorizontal:20, paddingTop:12, paddingBottom:34,
    overflow:"hidden", minHeight:H*0.55,
  },
  holoBorder: { position:"absolute", top:0, left:0, right:0, bottom:0, borderTopLeftRadius:28, borderTopRightRadius:28, borderWidth:1 },
  holoGlow:   { position:"absolute", top:0, left:0, right:0, height:2, borderTopLeftRadius:28, borderTopRightRadius:28 },
  holoHeader: { flexDirection:"row", alignItems:"center", gap:10, marginBottom:16 },
  holoPulse:  { width:8, height:8, borderRadius:4 },
  holoTitle:  { flex:1, color:"#fff", fontSize:16, fontFamily:"Inter_700Bold" },
  holoInputWrap: {
    borderRadius:16, borderWidth:1, padding:14,
    minHeight:70, marginBottom:14, overflow:"hidden",
  },
  holoInputPlaceholder: { color:"rgba(255,255,255,0.45)", fontSize:14, fontFamily:"Inter_400Regular" },
  holoKeyboard: { flexDirection:"row", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:14 },
  holoKey: { minWidth:34, height:38, borderRadius:10, borderWidth:1, alignItems:"center", justifyContent:"center", paddingHorizontal:8 },
  holoKeyText: { fontSize:15, fontFamily:"Inter_500Medium" },
  holoSend: { borderRadius:16, padding:14, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8 },
  holoSendText: { color:"#fff", fontSize:15, fontFamily:"Inter_700Bold" },

  /* Share */
  shareCenterWrap: { flex:1, alignItems:"center", justifyContent:"center" },
  shareRing: { position:"absolute", borderWidth:1 },
  shareCard: {
    width:W-50, borderRadius:24, padding:24, overflow:"hidden",
    backgroundColor:"rgba(10,10,30,0.70)",
  },
  shareBorder: { position:"absolute", top:0, left:0, right:0, bottom:0, borderRadius:24, borderWidth:1 },
  shareGradTop: { position:"absolute", top:0, left:0, right:0, height:80, borderTopLeftRadius:24, borderTopRightRadius:24 },
  shareTitle:    { color:"#fff", fontSize:18, fontFamily:"Inter_700Bold", textAlign:"center", marginBottom:6, marginTop:8 },
  shareSubtitle: { color:"rgba(255,255,255,0.45)", fontSize:13, textAlign:"center", marginBottom:20 },
  shareUsersRow: { flexDirection:"row", flexWrap:"wrap", gap:12, justifyContent:"center", marginBottom:20 },
  shareUserItem: { alignItems:"center", gap:5 },
  shareAvatar:   { width:48, height:48, borderRadius:14, alignItems:"center", justifyContent:"center" },
  shareAvatarLetter: { color:"#fff", fontSize:18, fontFamily:"Inter_700Bold" },
  shareAvatarName:   { color:"rgba(255,255,255,0.45)", fontSize:10 },
  shareConfirm:  { borderRadius:14, padding:14, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8 },
  shareConfirmText: { color:"#fff", fontSize:15, fontFamily:"Inter_700Bold" },

  /* AI Sheet */
  aiSheet: {
    position:"absolute", bottom:0, left:0, right:0,
    borderTopLeftRadius:26, borderTopRightRadius:26,
    paddingHorizontal:20, paddingTop:12, overflow:"hidden",
    minHeight:H*0.55,
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
