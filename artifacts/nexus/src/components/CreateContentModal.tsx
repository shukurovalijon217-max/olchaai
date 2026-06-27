import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImagePlus, Video, Music, FileText, Upload, Loader2,
  CheckCircle2, Play, Film, Camera,
  Maximize2, Square, RectangleVertical,
  MessageCircle, Share2, Users, Globe, Ban, Plus, Trash2,
  Sparkles, BarChart2, ChevronDown, ChevronUp,
  Target, Clock, Tag, UserPlus, Heart, Shield, Repeat2, MapPin,
} from "lucide-react";
import MediaEditor, { type TextOverlay, TRENDING_CHALLENGES } from "@/components/MediaEditor";
import DragMediaCanvas, { type CanvasLayer } from "@/components/DragMediaCanvas";
import {
  useCreatePost, useCreateReel, useCreateStory,
  getListPostsQueryKey, getListReelsQueryKey, getListStoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type TabType = "post" | "reel" | "story";
type Permission = "everyone" | "followers" | "friends" | "none";
type Visibility = "everyone" | "followers" | "friends" | "only_me";
type DisplayFormat = "cover" | "contain" | "square";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: TabType;
}

const ACCEPT = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  video: "video/mp4,video/webm,video/mov,video/avi",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac",
};

/* ─── Permission Picker ─── */
const PERM_OPTIONS: { value: Permission; icon: React.ElementType; label: string; desc: string; color: string }[] = [
  { value: "everyone",  icon: Globe,          label: "Hamma",         desc: "Barcha foydalanuvchilar",  color: "#34d399" },
  { value: "followers", icon: Users,          label: "Obunachilarga", desc: "Faqat obunachilaring",     color: "#60a5fa" },
  { value: "friends",   icon: Users,          label: "Do'stlar",      desc: "Faqat o'zaro obunalar",    color: "#f59e0b" },
  { value: "none",      icon: Ban,            label: "O'chirilgan",   desc: "Hech kim",                 color: "#f87171" },
];

const VIS_OPTIONS: { value: Visibility; emoji: string; label: string; desc: string }[] = [
  { value: "everyone",  emoji: "🌍", label: "Hamma",          desc: "Butun dunyo ko'radi" },
  { value: "followers", emoji: "👥", label: "Kuzatuvchilar",  desc: "Faqat obunachilaring" },
  { value: "friends",   emoji: "🤝", label: "Do'stlar",       desc: "O'zaro obunalar" },
  { value: "only_me",   emoji: "🔒", label: "Faqat men",      desc: "Xususiy arxiv" },
];

const CONTENT_LABELS = [
  { id:"entertainment", emoji:"🎭", label:"Ko'ngil ochar" },
  { id:"education",     emoji:"📚", label:"Ta'limiy" },
  { id:"comedy",        emoji:"😂", label:"Kulgili" },
  { id:"dance",         emoji:"💃", label:"Raqs" },
  { id:"music",         emoji:"🎵", label:"Musiqa" },
  { id:"sports",        emoji:"⚽", label:"Sport" },
  { id:"food",          emoji:"🍔", label:"Ovqat" },
  { id:"travel",        emoji:"✈️", label:"Sayohat" },
  { id:"fashion",       emoji:"👗", label:"Moda" },
  { id:"tech",          emoji:"💻", label:"Texnologiya" },
  { id:"art",           emoji:"🎨", label:"San'at" },
  { id:"gaming",        emoji:"🎮", label:"O'yin" },
];

function PermPicker({
  label, icon: Icon, value, onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: Permission;
  onChange: (v: Permission) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="flex gap-1.5">
        {PERM_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
            style={{
              background: value === opt.value ? `${opt.color}14` : "transparent",
              borderColor: value === opt.value ? `${opt.color}66` : "rgba(255,255,255,0.08)",
              boxShadow: value === opt.value ? `0 0 10px ${opt.color}22` : "none",
            }}
          >
            <opt.icon className="w-3.5 h-3.5" style={{ color: value === opt.value ? opt.color : "rgba(255,255,255,0.4)" }} />
            <span className="text-[10px] font-bold leading-none" style={{ color: value === opt.value ? opt.color : "rgba(255,255,255,0.4)" }}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Display Format Picker ─── */
const FORMAT_OPTIONS: { value: DisplayFormat; icon: React.ElementType; label: string; aspect: string }[] = [
  { value: "cover",   icon: Maximize2,           label: "To'liq",   aspect: "9:16" },
  { value: "square",  icon: Square,              label: "Kvadrat",  aspect: "1:1"  },
  { value: "contain", icon: RectangleVertical,   label: "Original", aspect: "auto" },
];

function FormatPicker({ value, onChange }: { value: DisplayFormat; onChange: (v: DisplayFormat) => void }) {
  return (
    <div>
      <span className="text-xs font-semibold text-muted-foreground block mb-2">Ko'rinish formati</span>
      <div className="flex gap-2">
        {FORMAT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
            style={{
              background: value === opt.value ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: value === opt.value ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)",
              boxShadow: value === opt.value ? "0 0 12px rgba(124,58,237,0.2)" : "none",
            }}
          >
            <opt.icon className="w-4 h-4" style={{ color: value === opt.value ? "#a78bfa" : "rgba(255,255,255,0.4)" }} />
            <span className="text-[10px] font-bold" style={{ color: value === opt.value ? "#a78bfa" : "rgba(255,255,255,0.4)" }}>
              {opt.label}
            </span>
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{opt.aspect}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Upload Zone ─── */
function UploadZone({
  accept, label, icon: Icon, onFile, file, isUploading, progress, preview,
}: {
  accept: string; label: string; icon: React.ElementType;
  onFile: (f: File) => void; file: File | null;
  isUploading: boolean; progress: number; preview?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
      style={{ minHeight: 160 }}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

      {preview && !isUploading && (
        <div className="absolute inset-0">
          {file?.type?.startsWith("audio") ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-3">
              <Music className="w-10 h-10 text-primary" />
              <p className="text-sm font-medium text-foreground truncate px-4">{file.name}</p>
              <audio controls src={preview} className="w-48" />
            </div>
          ) : file?.type?.startsWith("video") ? (
            <video src={preview} className="w-full h-full object-cover" muted playsInline controls />
          ) : (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Upload className="w-6 h-6 text-white" />
            <span className="text-white text-sm ml-2">O'zgartirish</span>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="w-32 bg-border rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}

      {!preview && !isUploading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bosing yoki tashlang</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN MODAL ─── */
export default function CreateContentModal({ open, onClose, defaultTab = "post" }: Props) {
  const { user }     = useAuth();
  const qc           = useQueryClient();
  const createPost   = useCreatePost();
  const createReel   = useCreateReel();
  const createStory  = useCreateStory();

  const [tab,  setTab]  = useState<TabType>(defaultTab);
  const [done, setDone] = useState(false);

  /* post state — multi-file queue */
  type MediaItem = { id: string; file: File; preview: string; status: "idle"|"uploading"|"done"|"error"; progress: number; serveUrl?: string };
  const [mediaQueue,    setMediaQueue]    = useState<MediaItem[]>([]);
  const [postContent,   setPostContent]  = useState("");
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>("cover");
  const [commentPerm,   setCommentPerm]  = useState<Permission>("everyone");
  const [sharePerm,     setSharePerm]    = useState<Permission>("everyone");
  const uploadingRef = useRef(false);

  /* Sequential upload runner — mirrors useMediaUpload two-step flow */
  useEffect(() => {
    const pending = mediaQueue.find(m => m.status === "idle");
    if (!pending || uploadingRef.current) return;
    uploadingRef.current = true;
    setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "uploading", progress: 5 } : m));

    (async () => {
      try {
        /* Step 1 — request presigned PUT URL */
        const urlRes = await fetch(`${API}/api/storage/uploads/request-url`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pending.file.name,
            size: pending.file.size,
            contentType: pending.file.type || "application/octet-stream",
          }),
        });
        if (!urlRes.ok) throw new Error("URL xatosi");
        const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, progress: 30 } : m));

        /* Step 2 — PUT file with XHR for progress */
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadURL);
          xhr.setRequestHeader("Content-Type", pending.file.type || "application/octet-stream");
          xhr.upload.onprogress = e => {
            if (e.lengthComputable)
              setMediaQueue(q => q.map(m => m.id === pending.id
                ? { ...m, progress: 30 + Math.round((e.loaded / e.total) * 65) }
                : m));
          };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`PUT xatosi ${xhr.status}`));
          xhr.onerror = () => reject(new Error("Tarmoq xatosi"));
          xhr.send(pending.file);
        });

        const serveUrl = `${API}/api/storage${objectPath}`;
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "done", progress: 100, serveUrl } : m));
      } catch {
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "error" } : m));
      } finally {
        uploadingRef.current = false;
      }
    })();
  }, [mediaQueue]);

  /* ── media editor state ── */
  const [editorOpen,  setEditorOpen]  = useState(false);
  const [editorFiles, setEditorFiles] = useState<File[]>([]);
  const [editorPreviews, setEditorPreviews] = useState<string[]>([]);
  const [postOverlays, setPostOverlays] = useState<TextOverlay[]>([]);
  const [postAudioName, setPostAudioName] = useState("");
  const [postAudioUrl, setPostAudioUrl] = useState("");
  const [postFilterName, setPostFilterName] = useState("none");

  /* ── mood state ── */
  const [mood, setMood] = useState("");

  /* ── poll state ── */
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  /* ── AI caption state ── */
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const [aiCaptions, setAiCaptions] = useState<string[]>([]);
  const [aiCaptionOpen, setAiCaptionOpen] = useState(false);

  /* ── Hot Take state ── */
  const [hotTake, setHotTake] = useState(false);

  /* ── Time Capsule state ── */
  const [timeCapsule, setTimeCapsule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  /* ── AI Predict state ── */
  const [predictLoading, setPredictLoading] = useState(false);
  const [prediction, setPrediction] = useState<{likes:number;comments:number;shares:number;reach:number;score:number}|null>(null);
  const [predictOpen, setPredictOpen] = useState(false);

  /* ── Rich privacy state ── */
  const [visibility, setVisibility] = useState<Visibility>("everyone");
  const [duetAllowed, setDuetAllowed] = useState(true);
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [hideLikes, setHideLikes] = useState(false);
  const [hideViews, setHideViews] = useState(false);
  const [sensitiveContent, setSensitiveContent] = useState(false);
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [brandPartnership, setBrandPartnership] = useState(false);
  const [contentLabel, setContentLabel] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);

  /* ── Advanced creator state ── */
  const [challengeTag, setChallengeTag] = useState("");
  const [collabUser, setCollabUser] = useState("");
  const [allowedReactions, setAllowedReactions] = useState<string[]>(["❤️","🔥","😂","😮","😢","👏","💎","🫶"]);
  const [blockedKeywords, setBlockedKeywords] = useState("");
  const [creatorGoal, setCreatorGoal] = useState("");
  const [crossPost, setCrossPost] = useState<string[]>([]);
  const [creatorNotes, setCreatorNotes] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bestTimeOpen, setBestTimeOpen] = useState(false);
  const [bestTimeLoading, setBestTimeLoading] = useState(false);
  const [bestTime, setBestTime] = useState<{time:string;reason:string}|null>(null);

  /* ── NEXUS POWER ZONE state ── */
  const [powerZoneOpen,     setPowerZoneOpen]     = useState(false);
  const [multiLangEnabled,  setMultiLangEnabled]  = useState(false);
  const [selectedLangs,     setSelectedLangs]     = useState<string[]>([]);
  const [translating,       setTranslating]       = useState(false);
  const [translations,      setTranslations]      = useState<Record<string,string>>({});
  const [abTestEnabled,     setAbTestEnabled]     = useState(false);
  const [captionB,          setCaptionB]          = useState("");
  const [secretGate,        setSecretGate]        = useState(false);
  const [secretCode,        setSecretCode]        = useState("");
  const [crowdUnlock,       setCrowdUnlock]       = useState(false);
  const [crowdThreshold,    setCrowdThreshold]    = useState(50);
  const [remixDna,          setRemixDna]          = useState<"full"|"style"|"sound"|"none">("none");
  const [chainEnabled,      setChainEnabled]      = useState(false);
  const [chainTrigger,      setChainTrigger]      = useState("100likes");
  const [chainAction,       setChainAction]       = useState("story");
  const [monetizeEnabled,   setMonetizeEnabled]   = useState(false);
  const [monetizeType,      setMonetizeType]      = useState<"tip"|"paytosee">("tip");
  const [payToSeePrice,     setPayToSeePrice]     = useState("500");
  const [sentimentMeter,    setSentimentMeter]    = useState(false);
  const [aiDirectorOpen,    setAiDirectorOpen]    = useState(false);
  const [aiDirectorLoading, setAiDirectorLoading] = useState(false);
  const [aiDirectorTips,    setAiDirectorTips]    = useState<string[]>([]);
  /* ── Reel Power state ── */
  const [reelSpeed,         setReelSpeed]         = useState("1x");
  const [reelGreenScreen,   setReelGreenScreen]   = useState(false);
  const [reelAutoCaption,   setReelAutoCaption]   = useState(false);
  /* ── Story Power state ── */
  const [storySticker,      setStorySticker]      = useState<string|null>(null);
  const [storyRing,         setStoryRing]         = useState(false);
  const [storyDuration,     setStoryDuration]     = useState("24h");
  const [storyLink,         setStoryLink]         = useState("");
  const [storyReplyMode,    setStoryReplyMode]    = useState("all");
  /* ── Hashtag Storm state ── */
  const [hashtagStormOpen,     setHashtagStormOpen]     = useState(false);
  const [hashtagStormLoading,  setHashtagStormLoading]  = useState(false);
  const [hashtagSuggestions,   setHashtagSuggestions]   = useState<{tag:string;reach:string}[]>([]);
  const [selectedHashtags,     setSelectedHashtags]     = useState<string[]>([]);
  /* ── Self-Destruct state ── */
  const [selfDestruct,         setSelfDestruct]         = useState(false);
  const [selfDestructTime,     setSelfDestructTime]     = useState("24h");
  /* ── Content Series state ── */
  const [seriesEnabled,        setSeriesEnabled]        = useState(false);
  const [seriesTitle,          setSeriesTitle]          = useState("");
  const [seriesEpisode,        setSeriesEpisode]        = useState(1);
  /* ── Geo-Bloom state ── */
  const [geoBloomEnabled,      setGeoBloomEnabled]      = useState(false);
  const [geoBloomRadius,       setGeoBloomRadius]       = useState(50);
  /* ── Voice Caption state ── */
  const [voiceCapRecording,    setVoiceCapRecording]    = useState(false);
  const [voiceCapTranscribing, setVoiceCapTranscribing] = useState(false);
  /* ── Reel extras state ── */
  const [reelFilter,           setReelFilter]           = useState("none");
  const [reelLoop,             setReelLoop]             = useState("normal");
  const [reelHookOpen,         setReelHookOpen]         = useState(false);
  const [reelHookLoading,      setReelHookLoading]      = useState(false);
  const [reelHooks,            setReelHooks]            = useState<string[]>([]);
  /* ── Collab Canvas state ── */
  const [collabCanvas,         setCollabCanvas]         = useState(false);
  const [collabCanvasInvites,  setCollabCanvasInvites]  = useState<string[]>([]);
  const [collabInviteInput,    setCollabInviteInput]    = useState("");

  /* ── Drag Media Canvas state ── */
  const [canvasLayers,    setCanvasLayers]    = useState<CanvasLayer[]>([]);
  const [canvasOpen,      setCanvasOpen]      = useState(false);

  /* ══ REEL MEGA FEATURES (50+) ══ */
  const [reelVoiceChanger,    setReelVoiceChanger]    = useState("normal");
  const [reelDuetMode,        setReelDuetMode]        = useState(false);
  const [reelReactVideo,      setReelReactVideo]      = useState(false);
  const [reelBoomerang,       setReelBoomerang]       = useState(false);
  const [reelReverse,         setReelReverse]         = useState(false);
  const [reelSlowMo,          setReelSlowMo]          = useState(false);
  const [reelTimelapse,       setReelTimelapse]       = useState(false);
  const [reelBlurBg,          setReelBlurBg]          = useState(false);
  const [reelStabilize,       setReelStabilize]       = useState(false);
  const [reelAutoEnhance,     setReelAutoEnhance]     = useState(false);
  const [reelArFilter,        setReelArFilter]        = useState("none");
  const [reelVignette,        setReelVignette]        = useState(0);
  const [reelGrain,           setReelGrain]           = useState(0);
  const [reelBrightness,      setReelBrightness]      = useState(100);
  const [reelContrast,        setReelContrast]        = useState(100);
  const [reelSaturation,      setReelSaturation]      = useState(100);
  const [reelSharpness,       setReelSharpness]       = useState(0);
  const [reelTransition,      setReelTransition]      = useState("cut");
  const [reelTextAnim,        setReelTextAnim]        = useState("none");
  const [reelCountdown,       setReelCountdown]       = useState(false);
  const [reelProgressBar,     setReelProgressBar]     = useState("none");
  const [reelWatermark,       setReelWatermark]       = useState("none");
  const [reelSplitScreen,     setReelSplitScreen]     = useState("none");
  const [reelPip,             setReelPip]             = useState(false);
  const [reelCcLang,          setReelCcLang]          = useState("uz");
  const [reelBgMusicVol,      setReelBgMusicVol]      = useState(80);
  const [reelOrigVol,         setReelOrigVol]         = useState(100);
  const [reelTrAudio,         setReelTrAudio]         = useState("");
  const [reelBeatSync,        setReelBeatSync]        = useState(false);
  const [reelPoll,            setReelPoll]            = useState(false);
  const [reelPollQ,           setReelPollQ]           = useState("");
  const [reelPollA,           setReelPollA]           = useState(["","","",""]);
  const [reelChapters,        setReelChapters]        = useState<{time:string;title:string}[]>([]);
  const [reelEndCard,         setReelEndCard]         = useState(false);
  const [reelPinComment,      setReelPinComment]      = useState("");
  const [reelFirstComment,    setReelFirstComment]    = useState("");
  const [reel4k,              setReel4k]              = useState(false);
  const [reelShareDiscover,   setReelShareDiscover]   = useState(true);
  const [reelAgeGate,         setReelAgeGate]         = useState(false);
  const [reelKenBurns,        setReelKenBurns]        = useState(false);
  const [reelZoomAnim,        setReelZoomAnim]        = useState("none");
  const [reelColorGrade,      setReelColorGrade]      = useState("none");
  const [reelLyricsStyle,     setReelLyricsStyle]     = useState("none");
  const [reelSoundwave,       setReelSoundwave]       = useState(false);
  const [reelEditOpen,        setReelEditOpen]        = useState(false);
  const [reelAudioEditOpen,   setReelAudioEditOpen]   = useState(false);
  const [reelArOpen,          setReelArOpen]          = useState(false);

  /* ══ STORY MEGA FEATURES (50+) ══ */
  const [storyBg,             setStoryBg]             = useState("none");
  const [storyBgColor,        setStoryBgColor]        = useState("#1a1a2e");
  const [storyFont,           setStoryFont]           = useState("Inter");
  const [storyFontSize,       setStoryFontSize]       = useState(24);
  const [storyTextColor,      setStoryTextColor]      = useState("#ffffff");
  const [storyTextShadow,     setStoryTextShadow]     = useState(false);
  const [storyTextBold,       setStoryTextBold]       = useState(false);
  const [storyTextItalic,     setStoryTextItalic]     = useState(false);
  const [storyTextAlign,      setStoryTextAlign]      = useState("center");
  const [storyTextBg,         setStoryTextBg]         = useState(false);
  const [storyMention,        setStoryMention]        = useState("");
  const [storyLocationTag,    setStoryLocationTag]    = useState("");
  const [storyProduct,        setStoryProduct]        = useState("");
  const [storyPoll,           setStoryPoll]           = useState(false);
  const [storyPollQ,          setStoryPollQ]          = useState("");
  const [storyPollA,          setStoryPollA]          = useState(["Ha","Yo'q"]);
  const [storyQa,             setStoryQa]             = useState(false);
  const [storyQaQ,            setStoryQaQ]            = useState("");
  const [storyQuiz,           setStoryQuiz]           = useState(false);
  const [storyQuizQ,          setStoryQuizQ]          = useState("");
  const [storyQuizOpts,       setStoryQuizOpts]       = useState(["","","",""]);
  const [storyQuizAns,        setStoryQuizAns]        = useState(0);
  const [storyCountdown,      setStoryCountdown]      = useState(false);
  const [storyCountdownDate,  setStoryCountdownDate]  = useState("");
  const [storyEmojiSlider,    setStoryEmojiSlider]    = useState(false);
  const [storyEmojiQ,         setStoryEmojiQ]         = useState("");
  const [storyMusic,          setStoryMusic]          = useState("");
  const [storyMusicVol,       setStoryMusicVol]       = useState(80);
  const [storyGif,            setStoryGif]            = useState("");
  const [storyArFilter,       setStoryArFilter]       = useState("none");
  const [storyDraw,           setStoryDraw]           = useState(false);
  const [storyBrushSize,      setStoryBrushSize]      = useState(4);
  const [storyBrushColor,     setStoryBrushColor]     = useState("#ff4444");
  const [storyCloseFriends,   setStoryCloseFriends]   = useState(false);
  const [storyVanish,         setStoryVanish]         = useState(false);
  const [storyAddYours,       setStoryAddYours]       = useState(false);
  const [storyHighlight,      setStoryHighlight]      = useState(false);
  const [storyHighlightName,  setStoryHighlightName]  = useState("");
  const [storyBorder,         setStoryBorder]         = useState("none");
  const [storyLayout,         setStoryLayout]         = useState("single");
  const [storyWeather,        setStoryWeather]        = useState(false);
  const [storyAltText,        setStoryAltText]        = useState("");
  const [storyAutoTranslate,  setStoryAutoTranslate]  = useState(false);
  const [storySchedule,       setStorySchedule]       = useState(false);
  const [storyScheduleTime,   setStoryScheduleTime]   = useState("");
  const [storyStickerOpen,    setStoryStickerOpen]    = useState(false);
  const [storyDesignOpen,     setStoryDesignOpen]     = useState(false);
  const [storyFontOpen,       setStoryFontOpen]       = useState(false);
  const [storyCanvasLayers,   setStoryCanvasLayers]   = useState<CanvasLayer[]>([]);
  const [storyCanvasOpen,     setStoryCanvasOpen]     = useState(false);

  const fetchBestTime = async () => {
    setBestTimeLoading(true); setBestTimeOpen(true);
    await new Promise(r => setTimeout(r, 1200));
    const times = [
      { time:"07:00–09:00", reason:"Ertalab kuzatuvchilar eng aktiv" },
      { time:"12:00–13:00", reason:"Tushlik vaqtida trafik yuqori" },
      { time:"19:00–21:00", reason:"Kechki cho'qqi vaqt — 3x ko'proq ko'rish" },
      { time:"22:00–23:00", reason:"Kech kechki vaqt — yoshlar aktiv" },
    ];
    setBestTime(times[Math.floor(Math.random() * times.length)]);
    setBestTimeLoading(false);
  };

  /* ── AI Director ── */
  const runAiDirector = async () => {
    setAiDirectorLoading(true); setAiDirectorOpen(true);
    await new Promise(r => setTimeout(r, 1500));
    const pool = [
      "📐 Rule of Thirds: asosiy ob'ektni kadrning 1/3 chizig'iga qo'ying — professional effekt",
      "💡 Chap tomondan tabiiy yorug'lik ishlating — yuz soyasi yumshoqroq va chiroyliroq ko'rinadi",
      "🎨 Dominant rang 60% + ikkinchi rang 30% + aksent 10% — dizayn muvonaztligi qoidasi",
      "⚡ Dastlabki 3 soniyada harakatni ko'rsating — scrolldan to'xtatib qoladi, retention 60% oshadi",
      "📱 9:16 vertikal format — mobil tomoshabinlar 78% ko'proq tomosha qiladi",
      "👁 To'g'ridan-to'g'ri kameraga qarang — ishonch va shaxsiy aloqa yaratadi",
      "🔥 Slow-motion yoki jump-cut montaj qo'llang — engagement tadqiqotlarda 2.4x oshgan",
      "🎵 Kontent kayfiyatiga mos musiqa tanlang — emotsional bog'liqlikni 3x kuchaytiradi",
      "✂️ 7–15 soniya optimal reel uzunligi — completion rate eng yuqori shu oraliqda",
      "🌅 Oltin soat (sunrise/sunset) yorug'ligi — natural estetika va renk issiqroq",
    ];
    setAiDirectorTips(pool.sort(() => Math.random() - 0.5).slice(0, 3));
    setAiDirectorLoading(false);
  };

  /* ── Multi-Language Blast ── */
  const runTranslate = async () => {
    if (!selectedLangs.length || !postContent.trim()) return;
    setTranslating(true);
    await new Promise(r => setTimeout(r, 1200));
    const labels: Record<string,string> = { en:"EN 🇬🇧", ru:"RU 🇷🇺", ko:"KO 🇰🇷", zh:"ZH 🇨🇳", ar:"AR 🇸🇦", tr:"TR 🇹🇷", de:"DE 🇩🇪", fr:"FR 🇫🇷" };
    const result: Record<string,string> = {};
    selectedLangs.forEach(l => { result[l] = `[${labels[l] ?? l.toUpperCase()}] ${postContent}`; });
    setTranslations(result);
    setTranslating(false);
  };

  /* ── Hashtag Storm ── */
  const runHashtagStorm = async () => {
    setHashtagStormLoading(true); setHashtagStormOpen(true);
    await new Promise(r => setTimeout(r, 1400));
    const pool: {tag:string;reach:string}[] = [
      {tag:"#viral",reach:"12.4M"},{tag:"#trending",reach:"8.1M"},{tag:"#nexus",reach:"450K"},
      {tag:"#olcha",reach:"220K"},{tag:"#content",reach:"5.2M"},{tag:"#creator",reach:"3.8M"},
      {tag:"#reels",reach:"11.6M"},{tag:"#fyp",reach:"18.4M"},{tag:"#explore",reach:"6.1M"},
      {tag:"#daily",reach:"4.8M"},{tag:"#lifestyle",reach:"3.5M"},{tag:"#growth",reach:"2.2M"},
      {tag:"#motivation",reach:"5.3M"},{tag:"#success",reach:"4.9M"},{tag:"#fun",reach:"9.7M"},
      {tag:"#original",reach:"1.4M"},{tag:"#exclusive",reach:"820K"},{tag:"#new",reach:"14.9M"},
      {tag:"#art",reach:"7.4M"},{tag:"#community",reach:"2.9M"},
    ];
    setHashtagSuggestions(pool.sort(() => Math.random() - 0.5).slice(0, 16));
    setHashtagStormLoading(false);
  };

  /* ── Reel AI Hook Generator ── */
  const runReelHooks = async () => {
    setReelHookLoading(true); setReelHookOpen(true);
    await new Promise(r => setTimeout(r, 1300));
    const pool = [
      "\"Hech kim sizga aytmagan sir bor...\"",
      "\"Buni ko'rgandan keyin hayotingiz o'zgaradi\"",
      "\"3 soniyada diqqatingizni tortadigan narsani ko'rsataman\"",
      "\"Nima? Bu mumkin emas deb o'ylardim, lekin...\"",
      "\"Hammangiz bu xatoni qilyapsiz — tomosha qiling\"",
      "\"Bu faqat 10 soniya oladi, lekin natijasi 10 yilga yetadi\"",
      "\"Kim bu narsani bilardi? Men bilmagan ekanman!\"",
      "\"Stop scrolling — buning oxirida hammasi tushuntiriladi\"",
    ];
    setReelHooks(pool.sort(() => Math.random() - 0.5).slice(0, 3));
    setReelHookLoading(false);
  };

  /* ── Voice Caption (mock) ── */
  const runVoiceCaption = async () => {
    setVoiceCapRecording(true);
    await new Promise(r => setTimeout(r, 2000));
    setVoiceCapRecording(false);
    setVoiceCapTranscribing(true);
    await new Promise(r => setTimeout(r, 1200));
    setVoiceCapTranscribing(false);
    const samples = [
      "Bu post haqida ko'p narsalar aytmoqchi edim, eng muhimi — izchillik!",
      "Har kuni yangi narsa o'rganing. Bugun ham bir kashfiyot qildim.",
      "Siz ham bu holatda bo'lgansiz deyman — mana mening yechimim.",
    ];
    setPostContent(samples[Math.floor(Math.random() * samples.length)]);
  };

  const addFiles = (files: FileList) => {
    const arr = Array.from(files).slice(0, 10 - mediaQueue.length);
    if (arr.length === 0) return;
    const newItems: MediaItem[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random()}`, file: f,
      preview: URL.createObjectURL(f),
      status: "idle", progress: 0,
    }));
    setMediaQueue(q => [...q, ...newItems]);
    /* Open editor immediately after file selection */
    setEditorFiles(arr);
    setEditorPreviews(arr.map(f => URL.createObjectURL(f)));
    setEditorOpen(true);
  };

  const handleEditorDone = (overlays: TextOverlay[], audioName: string, filterName: string, audioUrl?: string) => {
    setPostOverlays(overlays);
    setPostAudioName(audioName);
    setPostAudioUrl(audioUrl && !audioUrl.startsWith("blob:") ? audioUrl : "");
    setPostFilterName(filterName);
    setEditorOpen(false);
  };

  const generateAiCaption = async () => {
    setAiCaptionLoading(true);
    setAiCaptionOpen(true);
    try {
      const firstFile = mediaQueue[0]?.file;
      const mediaType = firstFile
        ? firstFile.type.startsWith("video") ? "video" : "photo"
        : "text";
      const res = await fetch(`${API}/api/posts/ai-caption`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, mediaType, description: postContent }),
      });
      const data = await res.json() as { captions: string[] };
      setAiCaptions(data.captions ?? []);
    } catch {
      setAiCaptions([]);
    } finally {
      setAiCaptionLoading(false);
    }
  };

  const generatePredict = async () => {
    setPredictLoading(true);
    setPredictOpen(true);
    try {
      const firstFile = mediaQueue[0]?.file;
      const mediaType = firstFile ? (firstFile.type.startsWith("video") ? "video" : "photo") : "text";
      const res = await fetch(`${API}/api/posts/ai-predict`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, mediaType, hasPoll: pollEnabled, hotTake, followerCount: 800 }),
      });
      const data = await res.json();
      setPrediction(data);
    } catch { setPrediction(null); } finally { setPredictLoading(false); }
  };

  const removeMedia = (id: string) => {
    setMediaQueue(q => q.filter(m => m.id !== id));
  };

  /* reel state */
  const [reelFile,              setReelFile]              = useState<File | null>(null);
  const [reelPreview,           setReelPreview]           = useState("");
  const [reelCaption,           setReelCaption]           = useState("");
  const [reelAudio,             setReelAudio]             = useState("");
  const [reelAudioFile,         setReelAudioFile]         = useState<File | null>(null);
  const [reelAudioPreview,      setReelAudioPreview]      = useState("");
  const [reelUploadResult,      setReelUploadResult]      = useState<{ serveUrl: string } | null>(null);
  const [reelAudioUploadResult, setReelAudioUploadResult] = useState<{ serveUrl: string } | null>(null);
  const [reelCommentPerm,       setReelCommentPerm]       = useState<Permission>("everyone");
  const [reelSharePerm,         setReelSharePerm]         = useState<Permission>("everyone");

  /* story state */
  const [storyFile,         setStoryFile]         = useState<File | null>(null);
  const [storyPreview,      setStoryPreview]       = useState("");
  const [storyCaption,      setStoryCaption]       = useState("");
  const [storyUploadResult, setStoryUploadResult] = useState<{ serveUrl: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const { uploadFile: upReel,      isUploading: upReelBusy,      progress: upReelProg }      = useMediaUpload({ onSuccess: r => setReelUploadResult(r) });
  const { uploadFile: upReelAudio, isUploading: upReelAudioBusy, progress: upReelAudioProg } = useMediaUpload({ onSuccess: r => setReelAudioUploadResult(r) });
  const { uploadFile: upStory,     isUploading: upStoryBusy,     progress: upStoryProg }     = useMediaUpload({ onSuccess: r => setStoryUploadResult(r) });

  const handleFile = (
    file: File,
    setter: (f: File) => void,
    previewSetter: (s: string) => void,
    uploader: (f: File) => Promise<any>,
  ) => {
    setter(file);
    previewSetter(URL.createObjectURL(file));
    uploader(file);
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      if (tab === "post") {
        const doneItems = mediaQueue.filter(m => m.status === "done" && m.serveUrl);
        const firstFile = mediaQueue[0]?.file;
        const type = firstFile
          ? firstFile.type.startsWith("video") ? "video" : "photo"
          : "text";
        const metaTags = [`_fmt:${displayFormat}`, `_cmt:${commentPerm}`, `_shr:${sharePerm}`];
        const urls = doneItems.map(m => m.serveUrl!);
        await fetch(`${API}/api/posts`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorId: user.id,
            content: postContent || " ",
            type,
            mediaUrl: urls[0],
            mediaUrls: urls.length > 1 ? urls : undefined,
            overlays: postOverlays.length > 0 ? JSON.stringify(postOverlays) : undefined,
            audioName: postAudioName || undefined,
            audioUrl: postAudioUrl || undefined,
            filterName: postFilterName !== "none" ? postFilterName : undefined,
            mood: mood || undefined,
            pollQuestion: pollEnabled && pollQuestion.trim() ? pollQuestion.trim() : undefined,
            pollOptions: pollEnabled && pollOptions.filter(o => o.trim()).length >= 2
              ? JSON.stringify(pollOptions.filter(o => o.trim()))
              : undefined,
            hotTake: hotTake || undefined,
            scheduledAt: timeCapsule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            tags: metaTags,
          }),
        });
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      } else if (tab === "reel") {
        if (!reelUploadResult) return;
        await createReel.mutateAsync({
          data: {
            authorId: user.id,
            videoUrl: reelUploadResult.serveUrl,
            caption: reelCaption,
            audioTrack: reelAudioUploadResult?.serveUrl || reelAudio || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
      } else if (tab === "story") {
        if (!storyUploadResult) return;
        const mediaType = storyFile?.type.startsWith("video") ? "video" : "photo";
        await createStory.mutateAsync({
          data: {
            authorId: user.id,
            mediaUrl: storyUploadResult.serveUrl,
            mediaType,
            caption: storyCaption || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      }
      setDone(true);
      setTimeout(() => handleClose(), 1500);
    } catch { /* handled by mutation */ } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMediaQueue([]); uploadingRef.current = false;
    setPostContent(""); setDisplayFormat("cover"); setCommentPerm("everyone"); setSharePerm("everyone");
    setMood(""); setPollEnabled(false); setPollQuestion(""); setPollOptions(["", ""]);
    setAiCaptions([]); setAiCaptionOpen(false); setPostFilterName("none");
    setHotTake(false); setTimeCapsule(false); setScheduledAt(""); setPrediction(null); setPredictOpen(false);
    setVisibility("everyone"); setDuetAllowed(true); setDownloadAllowed(true); setHideLikes(false); setHideViews(false);
    setSensitiveContent(false); setAgeRestricted(false); setBrandPartnership(false); setContentLabel(""); setLocationTag(""); setPrivacyOpen(false);
    setChallengeTag(""); setCollabUser(""); setAllowedReactions(["❤️","🔥","😂","😮","😢","👏","💎","🫶"]);
    setBlockedKeywords(""); setCreatorGoal(""); setCrossPost([]); setCreatorNotes(""); setAdvancedOpen(false); setBestTimeOpen(false); setBestTime(null);
    setReelFile(null); setReelPreview(""); setReelCaption(""); setReelAudio("");
    setReelAudioFile(null); setReelAudioPreview(""); setReelUploadResult(null); setReelAudioUploadResult(null);
    setReelCommentPerm("everyone"); setReelSharePerm("everyone");
    setStoryFile(null); setStoryPreview(""); setStoryCaption(""); setStoryUploadResult(null);
    setDone(false); setSubmitting(false);
    onClose();
  };

  const queueUploading = mediaQueue.some(m => m.status === "uploading" || m.status === "idle");
  const queueAllDone   = mediaQueue.length === 0 || mediaQueue.every(m => m.status === "done");

  const canSubmit = !submitting && !upReelBusy && !upStoryBusy && !upReelAudioBusy && (
    (tab === "post" && queueAllDone && (postContent.trim() || mediaQueue.some(m => m.status === "done"))) ||
    (tab === "reel" && !!reelUploadResult && reelCaption.trim()) ||
    (tab === "story" && !!storyUploadResult)
  );

  const TABS: { id: TabType; icon: React.ElementType; label: string; grad: string; glow: string; accent: string }[] = [
    { id: "post",  icon: ImagePlus, label: "Post",  grad: "linear-gradient(135deg,#7c3aed,#a78bfa)", glow: "rgba(124,58,237,0.45)", accent: "#a78bfa" },
    { id: "reel",  icon: Film,      label: "Reel",  grad: "linear-gradient(135deg,#dc2626,#f87171)", glow: "rgba(239,68,68,0.45)",  accent: "#f87171" },
    { id: "story", icon: Camera,    label: "Story", grad: "linear-gradient(135deg,#d97706,#fbbf24)", glow: "rgba(251,191,36,0.45)", accent: "#fbbf24" },
  ];

  return (
    <>
    {/* ── Media Editor (full-screen, shown on top when editing) ── */}
    <AnimatePresence>
      {editorOpen && (
        <MediaEditor
          files={editorFiles}
          previews={editorPreviews}
          initialOverlays={postOverlays}
          initialAudioName={postAudioName}
          onDone={handleEditorDone}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(8,8,22,0.98)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
            }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <div className="w-8 h-1 rounded-full bg-white/15" />
            </div>

            {/* Header with animated gradient accent line */}
            <div className="relative flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: TABS.find(t => t.id === tab)?.grad ?? "rgba(124,58,237,0.8)" }}
                >
                  {(() => { const T = TABS.find(t => t.id === tab); return T ? <T.icon className="w-3.5 h-3.5 text-white" /> : null; })()}
                </motion.div>
                <h2 className="font-bold text-base text-white">Kontent yaratish</h2>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <X className="w-4 h-4 text-white/70" />
              </button>
              {/* Animated bottom gradient line */}
              <motion.div
                key={`accent-${tab}`}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                  background: TABS.find(t => t.id === tab)?.grad ?? "linear-gradient(90deg,#7c3aed,#a78bfa)",
                  transformOrigin: "left",
                }}
              />
            </div>

            {/* ── Dramatic Tab Bar ── */}
            <div className="flex gap-2 px-4 pt-3.5 pb-0.5">
              {TABS.map(t => {
                const active = tab === t.id;
                return (
                  <motion.button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    layout
                    className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black tracking-wide overflow-hidden transition-colors"
                    style={{
                      color: active ? "white" : "rgba(255,255,255,0.38)",
                      background: active ? "transparent" : "rgba(255,255,255,0.04)",
                      border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
                    }}
                    whileHover={{ scale: active ? 1 : 1.03 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Gradient fill for active tab */}
                    {active && (
                      <motion.div
                        layoutId="tab-active-bg"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: t.grad,
                          boxShadow: `0 4px 18px ${t.glow}`,
                        }}
                        transition={{ type: "spring", stiffness: 460, damping: 30 }}
                      />
                    )}
                    {/* Inner glow shimmer on active */}
                    {active && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.14) 0%,transparent 60%)" }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">

              {/* ─── SUCCESS ─── */}
              {done && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-10">
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.4 }}>
                    <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                  </motion.div>
                  <p className="text-base font-bold text-white">Muvaffaqiyatli yuklandi!</p>
                </motion.div>
              )}

              {!done && (
                <>
                  {/* ═══ POST TAB ═══ */}
                  {tab === "post" && (
                    <div className="space-y-4">

                      {/* ── 🎨 Drag & Drop Media Canvas ── */}
                      <div>
                        <button onClick={() => setCanvasOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:canvasOpen?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.04)", border:canvasOpen?"1px solid rgba(167,139,250,0.4)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:20}}>🎨</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Vizual Kanvas Muharrir</p>
                              <p className="text-[10px] text-white/35">Rasm/Video/Matn/Emoji — xohlagan joyga surib qo'ying</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canvasLayers.length > 0 && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-violet-300" style={{ background:"rgba(167,139,250,0.15)" }}>
                                {canvasLayers.length} ta qatlam
                              </span>
                            )}
                            <span className="text-white/40 text-xs">{canvasOpen ? "▲" : "▼"}</span>
                          </div>
                        </button>
                        <AnimatePresence>
                          {canvasOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 overflow-hidden">
                              <DragMediaCanvas layers={canvasLayers} onChange={setCanvasLayers} canvasW={248} canvasH={380}/>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ─── Multi-file drop zone ─── */}
                      {mediaQueue.length < 10 && (
                        <motion.label
                          htmlFor="post-multi-input"
                          whileTap={{ scale: 0.98 }}
                          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                          style={{
                            borderColor: mediaQueue.length > 0 ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.12)",
                            background: mediaQueue.length > 0 ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                              style={{ background: "rgba(124,58,237,0.15)" }}>
                              <Plus className="w-5 h-5 text-violet-400" />
                            </div>
                            {mediaQueue.length > 0 && (
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(6,182,212,0.12)" }}>
                                <Video className="w-5 h-5 text-cyan-400" />
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-white/70">
                              {mediaQueue.length === 0 ? "Rasm yoki video qo'shing" : `Yana qo'shish (${mediaQueue.length}/10)`}
                            </p>
                            <p className="text-xs text-white/35 mt-0.5">Bir nechta fayl tanlash mumkin</p>
                          </div>
                          <input
                            id="post-multi-input"
                            type="file"
                            multiple
                            accept={`${ACCEPT.image},${ACCEPT.video}`}
                            className="hidden"
                            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                          />
                        </motion.label>
                      )}

                      {/* ─── Thumbnail strip ─── */}
                      {mediaQueue.length > 0 && (
                        <AnimatePresence>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
                            style={{ scrollbarWidth: "none" }}
                          >
                            {mediaQueue.map((item, idx) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ delay: idx * 0.04 }}
                                className="relative flex-shrink-0 rounded-xl overflow-hidden"
                                style={{ width: 96, height: 96, background: "rgba(255,255,255,0.06)" }}
                              >
                                {/* Thumbnail */}
                                {item.file.type.startsWith("video") ? (
                                  <video src={item.preview} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                                )}

                                {/* Video badge */}
                                {item.file.type.startsWith("video") && (
                                  <div className="absolute bottom-1 left-1">
                                    <Play className="w-3 h-3 text-white drop-shadow" fill="white" />
                                  </div>
                                )}

                                {/* Progress overlay */}
                                {(item.status === "uploading" || item.status === "idle") && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                                    style={{ background: "rgba(0,0,0,0.62)" }}>
                                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                    <span className="text-[10px] font-bold text-white/80">
                                      {item.status === "uploading" ? `${item.progress}%` : "…"}
                                    </span>
                                    {item.status === "uploading" && (
                                      <div className="w-14 h-0.5 rounded-full overflow-hidden"
                                        style={{ background: "rgba(255,255,255,0.15)" }}>
                                        <div className="h-full rounded-full transition-all"
                                          style={{ width: `${item.progress}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Done badge */}
                                {item.status === "done" && (
                                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(52,211,153,0.9)" }}>
                                    <CheckCircle2 className="w-2.5 h-2.5 text-black" />
                                  </div>
                                )}

                                {/* Error badge */}
                                {item.status === "error" && (
                                  <div className="absolute inset-0 flex items-center justify-center"
                                    style={{ background: "rgba(239,68,68,0.5)" }}>
                                    <span className="text-[10px] font-bold text-white">Xato</span>
                                  </div>
                                )}

                                {/* Remove button (shown when not uploading) */}
                                {item.status !== "uploading" && (
                                  <button
                                    onClick={() => removeMedia(item.id)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(0,0,0,0.7)" }}
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                )}

                                {/* Order badge */}
                                <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                                  style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)" }}>
                                  {idx + 1}
                                </div>
                              </motion.div>
                            ))}

                            {/* Upload status summary */}
                            {queueUploading && (
                              <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-xl"
                                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
                                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                <span className="text-[10px] text-violet-300 font-bold text-center leading-tight px-1">
                                  {mediaQueue.filter(m => m.status === "done").length}/{mediaQueue.length} yuklandi
                                </span>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      )}

                      {/* Display format (shown when has images) */}
                      {mediaQueue.some(m => m.file.type.startsWith("image")) && queueAllDone && (
                        <FormatPicker value={displayFormat} onChange={setDisplayFormat} />
                      )}

                      {/* Caption + AI */}
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            placeholder={mediaQueue.length > 0 ? "Izoh qo'shing…" : "Nima haqida yozyapsiz?"}
                            rows={3}
                            value={postContent}
                            onChange={e => setPostContent(e.target.value)}
                            className="w-full resize-none rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                          />
                          <button
                            onClick={generateAiCaption}
                            disabled={aiCaptionLoading}
                            title="AI caption yaratish"
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                            style={{ background: "rgba(124,58,237,0.8)" }}
                          >
                            {aiCaptionLoading
                              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                              : <Sparkles className="w-3.5 h-3.5 text-white" />}
                          </button>
                        </div>

                        {/* AI Caption suggestions */}
                        <AnimatePresence>
                          {aiCaptionOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="rounded-2xl overflow-hidden"
                              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
                            >
                              <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-xs font-bold text-violet-300">✦ AI Caption takliflari</span>
                                <button onClick={() => setAiCaptionOpen(false)}>
                                  <X className="w-3.5 h-3.5 text-white/40" />
                                </button>
                              </div>
                              {aiCaptionLoading ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                </div>
                              ) : aiCaptions.map((cap, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setPostContent(cap); setAiCaptionOpen(false); }}
                                  className="w-full text-left px-3 py-2.5 text-sm text-white/85 hover:bg-white/5 transition-colors border-t border-white/5"
                                >
                                  {cap}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── Mood / Vibe Picker ── */}
                      <div className="rounded-2xl p-3.5 space-y-2.5"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold text-white/50">Kayfiyat (ixtiyoriy)</p>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { emoji: "🔥", label: "Zo'r",     color: "#f97316" },
                            { emoji: "😂", label: "Kulgili",  color: "#facc15" },
                            { emoji: "😍", label: "Ajoyib",   color: "#f472b6" },
                            { emoji: "💭", label: "Fikr",     color: "#818cf8" },
                            { emoji: "💪", label: "Kuch",     color: "#22d3ee" },
                            { emoji: "😢", label: "Sad",      color: "#60a5fa" },
                            { emoji: "🤩", label: "Wow",      color: "#fbbf24" },
                            { emoji: "🌙", label: "Tungi",    color: "#a78bfa" },
                            { emoji: "😤", label: "Jahl",     color: "#f87171" },
                            { emoji: "🫶", label: "Sevgi",    color: "#fb7185" },
                          ].map(m => (
                            <button
                              key={m.emoji}
                              onClick={() => setMood(mood === m.emoji ? "" : m.emoji)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
                              style={{
                                background: mood === m.emoji ? `${m.color}28` : "rgba(255,255,255,0.06)",
                                border: mood === m.emoji ? `1px solid ${m.color}88` : "1px solid rgba(255,255,255,0.08)",
                                color: mood === m.emoji ? m.color : "rgba(255,255,255,0.55)",
                                transform: mood === m.emoji ? "scale(1.05)" : "scale(1)",
                              }}
                            >
                              <span>{m.emoji}</span>
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Poll Widget ── */}
                      <div className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <button
                          onClick={() => setPollEnabled(p => !p)}
                          className="w-full flex items-center justify-between px-3.5 py-3 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-white/70">So'rovnoma qo'shish</span>
                          </div>
                          {pollEnabled
                            ? <ChevronUp className="w-4 h-4 text-white/40" />
                            : <ChevronDown className="w-4 h-4 text-white/40" />}
                        </button>

                        <AnimatePresence>
                          {pollEnabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3.5 pb-3.5 space-y-2 border-t border-white/5">
                                <input
                                  placeholder="Savol matni…"
                                  value={pollQuestion}
                                  onChange={e => setPollQuestion(e.target.value)}
                                  className="w-full mt-3 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                />
                                {pollOptions.map((opt, i) => (
                                  <div key={i} className="flex gap-2 items-center">
                                    <input
                                      placeholder={`Variant ${i + 1}`}
                                      value={opt}
                                      onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                      className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    />
                                    {pollOptions.length > 2 && (
                                      <button onClick={() => setPollOptions(p => p.filter((_, j) => j !== i))}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                                        style={{ background: "rgba(239,68,68,0.15)" }}>
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {pollOptions.length < 4 && (
                                  <button
                                    onClick={() => setPollOptions(p => [...p, ""])}
                                    className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 px-1 py-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Variant qo'shish
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── Hot Take ── */}
                      <div
                        className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all"
                        style={{
                          background: hotTake ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)",
                          border: hotTake ? "1px solid rgba(249,115,22,0.5)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                        onClick={() => setHotTake(p => !p)}
                      >
                        <span style={{ fontSize: 22 }}>🔥</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white/80">Hot Take — "Issiq fikr"</p>
                          <p className="text-[10px] text-white/40 mt-0.5">Jamoat 🔥/❄️ ovoz beradi. Instagramda yoki TikTokda yo'q!</p>
                        </div>
                        <div className="w-9 h-5 rounded-full flex items-center transition-all"
                          style={{
                            background: hotTake ? "rgba(249,115,22,0.8)" : "rgba(255,255,255,0.12)",
                            justifyContent: hotTake ? "flex-end" : "flex-start",
                            padding: "2px",
                          }}>
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* ── Time Capsule ── */}
                      <div className="rounded-2xl overflow-hidden"
                        style={{
                          background: timeCapsule ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.04)",
                          border: timeCapsule ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        }}>
                        <div className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
                          onClick={() => setTimeCapsule(p => !p)}>
                          <span style={{ fontSize: 22 }}>⏳</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-white/80">Vaqt Kapsulasi</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Post kelajakda ko'rinadi. Yangi kashfiyot!</p>
                          </div>
                          <div className="w-9 h-5 rounded-full flex items-center transition-all"
                            style={{
                              background: timeCapsule ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.12)",
                              justifyContent: timeCapsule ? "flex-end" : "flex-start",
                              padding: "2px",
                            }}>
                            <div className="w-4 h-4 rounded-full bg-white" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {timeCapsule && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-3.5 pb-3 border-t border-white/5">
                                <input
                                  type="datetime-local"
                                  value={scheduledAt}
                                  onChange={e => setScheduledAt(e.target.value)}
                                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                                  className="w-full mt-3 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", colorScheme: "dark" }}
                                />
                                {scheduledAt && (
                                  <p className="text-[11px] text-cyan-400 mt-1.5 font-semibold">
                                    ⏳ {new Date(scheduledAt).toLocaleString("uz-UZ", { dateStyle:"medium", timeStyle:"short" })} da ko'rinadi
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── AI Predict ── */}
                      <AnimatePresence>
                        {predictOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden rounded-2xl"
                            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.35)" }}
                          >
                            <div className="flex items-center justify-between px-3.5 py-2.5">
                              <span className="text-xs font-bold text-indigo-300">✦ AI Bashorat</span>
                              <button onClick={() => setPredictOpen(false)}><X className="w-3.5 h-3.5 text-white/40" /></button>
                            </div>
                            {predictLoading ? (
                              <div className="flex justify-center pb-4"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                            ) : prediction && (
                              <div className="px-3.5 pb-3.5 grid grid-cols-4 gap-2">
                                {[
                                  { icon:"❤️", label:"Layk", val: prediction.likes >= 1000 ? `${(prediction.likes/1000).toFixed(1)}K` : prediction.likes },
                                  { icon:"💬", label:"Izoh", val: prediction.comments },
                                  { icon:"🔁", label:"Ulash", val: prediction.shares },
                                  { icon:"👁", label:"Ko'rish", val: prediction.reach >= 1000 ? `${(prediction.reach/1000).toFixed(1)}K` : prediction.reach },
                                ].map(s => (
                                  <div key={s.label} className="flex flex-col items-center gap-0.5 py-2 rounded-xl"
                                    style={{ background: "rgba(255,255,255,0.06)" }}>
                                    <span className="text-base">{s.icon}</span>
                                    <span className="text-sm font-black text-white">{s.val}</span>
                                    <span className="text-[9px] text-white/40">{s.label}</span>
                                  </div>
                                ))}
                                <div className="col-span-4 flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                                    <div className="h-full rounded-full transition-all"
                                      style={{ width: `${prediction.score}%`, background: prediction.score >= 80 ? "#22c55e" : prediction.score >= 60 ? "#f59e0b" : "#f87171" }} />
                                  </div>
                                  <span className="text-xs font-black" style={{ color: prediction.score >= 80 ? "#22c55e" : prediction.score >= 60 ? "#f59e0b" : "#f87171" }}>
                                    {prediction.score}/100
                                  </span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Rich Privacy Panel ── */}
                      <div className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <button className="w-full flex items-center justify-between px-3.5 py-3"
                          onClick={() => setPrivacyOpen(p => !p)}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">🔐</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/80">Maxfiylik & Ruxsatlar</p>
                              <p className="text-[10px] text-white/40">{VIS_OPTIONS.find(v=>v.value===visibility)?.emoji} {VIS_OPTIONS.find(v=>v.value===visibility)?.label} · TikTok/Instagramdan ustun</p>
                            </div>
                          </div>
                          {privacyOpen ? <ChevronUp className="w-4 h-4 text-white/40"/> : <ChevronDown className="w-4 h-4 text-white/40"/>}
                        </button>
                        <AnimatePresence>
                          {privacyOpen && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                              <div className="px-3.5 pb-4 space-y-4 border-t border-white/5">
                                {/* Visibility */}
                                <div className="mt-3">
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">👁 Kim ko'ra oladi</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {VIS_OPTIONS.map(v => (
                                      <button key={v.value} onClick={() => setVisibility(v.value)}
                                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                                        style={{
                                          background: visibility===v.value ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                                          border: visibility===v.value ? "1.5px solid rgba(124,58,237,0.7)" : "1.5px solid rgba(255,255,255,0.07)",
                                        }}>
                                        <span className="text-base leading-none">{v.emoji}</span>
                                        <div>
                                          <p className="text-[11px] font-bold text-white/85">{v.label}</p>
                                          <p className="text-[9px] text-white/35">{v.desc}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Content label */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">🏷 Kontent turi</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {CONTENT_LABELS.map(cl => (
                                      <button key={cl.id} onClick={() => setContentLabel(contentLabel===cl.id ? "" : cl.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                        style={{
                                          background: contentLabel===cl.id ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.06)",
                                          border: contentLabel===cl.id ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                                          color: contentLabel===cl.id ? "#d8b4fe" : "rgba(255,255,255,0.5)",
                                        }}>
                                        {cl.emoji} {cl.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Location */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">📍 Joylashuv (ixtiyoriy)</p>
                                  <input placeholder="Masalan: Toshkent, O'zbekiston"
                                    value={locationTag} onChange={e => setLocationTag(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                                {/* Comment & Share pickers */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">💬 Interaktivlik</p>
                                  <PermPicker label="Kim izoh yoza oladi" icon={MessageCircle} value={commentPerm} onChange={setCommentPerm} />
                                  <PermPicker label="Kim ulasha oladi" icon={Share2} value={sharePerm} onChange={setSharePerm} />
                                </div>

                                {/* Toggle switches */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">⚙️ Qo'shimcha sozlamalar</p>
                                  {[
                                    { label:"Duet / Kollaboratsiya",  desc:"Boshqalar duet qila oladi",    val:duetAllowed,       set:setDuetAllowed,       icon:"🎭", color:"#818cf8" },
                                    { label:"Ko'chirib olish",        desc:"Video yuklab olish ruxsati",   val:downloadAllowed,   set:setDownloadAllowed,   icon:"⬇️", color:"#34d399" },
                                    { label:"Like sonini yashirish",  desc:"Faqat siz ko'rasiz",          val:hideLikes,         set:setHideLikes,         icon:"❤️", color:"#f472b6" },
                                    { label:"Ko'rishlar sonini yashirish", desc:"Maxfiy statistika",      val:hideViews,         set:setHideViews,         icon:"👁", color:"#a78bfa" },
                                    { label:"Sezgir kontent",         desc:"Content warning ko'rsatish",  val:sensitiveContent,  set:setSensitiveContent,  icon:"⚠️", color:"#f97316" },
                                    { label:"18+ Yosh cheklovi",      desc:"Faqat kattalar uchun",        val:ageRestricted,     set:setAgeRestricted,     icon:"🔞", color:"#ef4444" },
                                    { label:"Brand hamkorlik",        desc:"Reklama matni qo'shiladi",    val:brandPartnership,  set:setBrandPartnership,  icon:"🤝", color:"#fbbf24" },
                                  ].map(t => (
                                    <div key={t.label} className="flex items-center justify-between py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{t.icon}</span>
                                        <div>
                                          <p className="text-[11px] font-bold text-white/75">{t.label}</p>
                                          <p className="text-[9px] text-white/35">{t.desc}</p>
                                        </div>
                                      </div>
                                      <button onClick={() => t.set((p: boolean) => !p)}
                                        className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0"
                                        style={{
                                          background: t.val ? t.color : "rgba(255,255,255,0.12)",
                                          justifyContent: t.val ? "flex-end" : "flex-start",
                                          height: 22, width: 40,
                                        }}>
                                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── Advanced Creator Panel ── */}
                      <div className="rounded-2xl overflow-hidden"
                        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                        <button className="w-full flex items-center justify-between px-3.5 py-3"
                          onClick={() => setAdvancedOpen(p=>!p)}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">🚀</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/80">Kengaytirilgan sozlamalar</p>
                              <p className="text-[10px] text-white/40">Challenge, Collab, Reaksiyalar, Maqsad va ko'proq</p>
                            </div>
                          </div>
                          {advancedOpen ? <ChevronUp className="w-4 h-4 text-white/40"/> : <ChevronDown className="w-4 h-4 text-white/40"/>}
                        </button>
                        <AnimatePresence>
                          {advancedOpen && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                              <div className="px-3.5 pb-4 space-y-4 border-t border-white/5">

                                {/* Challenge Tag */}
                                <div className="mt-3">
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="w-3 h-3"/> Trend Challenge
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {TRENDING_CHALLENGES.map(ch => (
                                      <button key={ch} onClick={() => setChallengeTag(challengeTag===ch ? "" : ch)}
                                        className="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                        style={{
                                          background: challengeTag===ch ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)",
                                          border: challengeTag===ch ? "1px solid rgba(251,191,36,0.6)" : "1px solid rgba(255,255,255,0.08)",
                                          color: challengeTag===ch ? "#fbbf24" : "rgba(255,255,255,0.45)",
                                        }}>
                                        {ch}
                                      </button>
                                    ))}
                                  </div>
                                  <input placeholder="O'z challengingizni kiriting (#NomingizChallenge)"
                                    value={challengeTag.startsWith("#") && !TRENDING_CHALLENGES.includes(challengeTag) ? challengeTag : ""}
                                    onChange={e => setChallengeTag(e.target.value || "")}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                                {/* Collab */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserPlus className="w-3 h-3"/> Kollab — Hamkorlik
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <input placeholder="@foydalanuvchi (do'stingizni taklif qiling)"
                                      value={collabUser} onChange={e => setCollabUser(e.target.value)}
                                      className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                    {collabUser && (
                                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl flex-shrink-0"
                                        style={{ background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.4)" }}>
                                        <span className="text-[10px] text-emerald-400 font-bold">✓ Taklif</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Reactions control */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Heart className="w-3 h-3"/> Reaksiyalar boshqaruvi
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {["❤️","🔥","😂","😮","😢","👏","💎","🫶","🤩","🙏","😡","💯"].map(r => {
                                      const isOn = allowedReactions.includes(r);
                                      return (
                                        <button key={r} onClick={() => setAllowedReactions(p => isOn ? p.filter(x=>x!==r) : [...p, r])}
                                          className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                                          style={{
                                            background: isOn ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                                            border: isOn ? "1.5px solid rgba(255,255,255,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                                            opacity: isOn ? 1 : 0.35,
                                          }}>
                                          {r}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <p className="text-[9px] text-white/30 mt-1">{allowedReactions.length} ta reaksiya yoqilgan</p>
                                </div>

                                {/* Creator Goal */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Target className="w-3 h-3"/> Post maqsadi
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { id:"entertain", emoji:"🎭", label:"Ko'ngil ochar",   desc:"Zavq berish" },
                                      { id:"educate",   emoji:"📚", label:"O'rgatish",       desc:"Bilim ulashish" },
                                      { id:"inspire",   emoji:"✨", label:"Ilhom berish",    desc:"Motivatsiya" },
                                      { id:"promote",   emoji:"📢", label:"Targ'ibot",       desc:"Brend/mahsulot" },
                                      { id:"challenge", emoji:"🏆", label:"Challenge",       desc:"Musobaqa" },
                                      { id:"connect",   emoji:"🤝", label:"Ulanish",         desc:"Hamjamiyat" },
                                    ].map(g => (
                                      <button key={g.id} onClick={() => setCreatorGoal(creatorGoal===g.id ? "" : g.id)}
                                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                                        style={{
                                          background: creatorGoal===g.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                                          border: creatorGoal===g.id ? "1.5px solid rgba(99,102,241,0.7)" : "1.5px solid rgba(255,255,255,0.07)",
                                        }}>
                                        <span>{g.emoji}</span>
                                        <div>
                                          <p className="text-[11px] font-bold" style={{ color: creatorGoal===g.id ? "#a5b4fc" : "rgba(255,255,255,0.7)" }}>{g.label}</p>
                                          <p className="text-[9px] text-white/30">{g.desc}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Cross-post */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Repeat2 className="w-3 h-3"/> Boshqa platformalarga ulashish
                                  </p>
                                  <div className="flex gap-2 flex-wrap">
                                    {[
                                      { id:"telegram",  emoji:"✈️", label:"Telegram",  color:"#2ca5e0" },
                                      { id:"whatsapp",  emoji:"💬", label:"WhatsApp",  color:"#25d366" },
                                      { id:"twitter",   emoji:"🐦", label:"Twitter/X", color:"#1da1f2" },
                                      { id:"facebook",  emoji:"👥", label:"Facebook",  color:"#1877f2" },
                                      { id:"instagram", emoji:"📸", label:"Instagram", color:"#e1306c" },
                                      { id:"youtube",   emoji:"▶️", label:"YouTube",   color:"#ff0000" },
                                    ].map(p => {
                                      const isOn = crossPost.includes(p.id);
                                      return (
                                        <button key={p.id} onClick={() => setCrossPost(prev => isOn ? prev.filter(x=>x!==p.id) : [...prev, p.id])}
                                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all"
                                          style={{
                                            background: isOn ? `${p.color}22` : "rgba(255,255,255,0.05)",
                                            border: isOn ? `1.5px solid ${p.color}80` : "1.5px solid rgba(255,255,255,0.08)",
                                            color: isOn ? p.color : "rgba(255,255,255,0.4)",
                                          }}>
                                          {p.emoji} {p.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Keyword filter */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield className="w-3 h-3"/> Kalit so'z filtri (Anti-harassment)
                                  </p>
                                  <input placeholder="Bloklash kerak so'zlar (vergul bilan: spam, reklama, ...)"
                                    value={blockedKeywords} onChange={e => setBlockedKeywords(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                                {/* AI Best Time */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3 h-3"/> AI — Eng yaxshi post vaqti
                                  </p>
                                  <button onClick={fetchBestTime}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                                    style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.35)", color:"#c4b5fd" }}>
                                    {bestTimeLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    {bestTimeLoading ? "Aniqlanmoqda..." : "AI tahlil qilsin"}
                                  </button>
                                  <AnimatePresence>
                                    {bestTimeOpen && !bestTimeLoading && bestTime && (
                                      <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                                        className="mt-2 px-3 py-2.5 rounded-xl"
                                        style={{ background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.35)" }}>
                                        <p className="text-xs font-black text-purple-300">⏰ {bestTime.time}</p>
                                        <p className="text-[10px] text-white/50 mt-0.5">{bestTime.reason}</p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Creator notes */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">📝 Kreator eslatmalari (shaxsiy)</p>
                                  <textarea placeholder="Bu post haqida o'zingizga eslatma (hech kim ko'rmaydi)…"
                                    rows={2} value={creatorNotes} onChange={e => setCreatorNotes(e.target.value)}
                                    className="w-full resize-none rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ════════════════════════════════════════
                          ⚡ NEXUS POWER ZONE — 10 unique features
                      ════════════════════════════════════════ */}
                      <div className="rounded-2xl overflow-hidden"
                        style={{ background:"rgba(124,58,237,0.04)", border:"1px solid rgba(124,58,237,0.18)" }}>

                        {/* Header */}
                        <button className="w-full flex items-center justify-between px-3.5 py-3"
                          onClick={() => setPowerZoneOpen(p=>!p)}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                              style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899,#f97316)" }}>
                              ⚡
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black text-white tracking-wide">NEXUS POWER ZONE</p>
                              <p className="text-[10px] text-white/40">10 ta super funksiya — hech qayerda yo'q</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                              YANGI
                            </span>
                            {powerZoneOpen ? <ChevronUp className="w-4 h-4 text-white/40"/> : <ChevronDown className="w-4 h-4 text-white/40"/>}
                          </div>
                        </button>

                        <AnimatePresence>
                          {powerZoneOpen && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                              <div className="px-3.5 pb-4 space-y-4 border-t border-white/5 pt-3">

                                {/* ── 1. AI Director ── */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">🎬 AI Rejissyor — professionallar maslahat beradi</p>
                                  <button onClick={runAiDirector} disabled={aiDirectorLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                                    style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.35)", color:"#c4b5fd" }}>
                                    {aiDirectorLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Tahlil qilinmoqda…</> : <><Sparkles className="w-3.5 h-3.5"/> AI maslahat olish</>}
                                  </button>
                                  <AnimatePresence>
                                    {aiDirectorOpen && !aiDirectorLoading && (
                                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-1.5 overflow-hidden">
                                        {aiDirectorTips.map((tip, i) => (
                                          <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
                                            className="px-3 py-2 rounded-xl text-[11px] text-white/75 leading-relaxed"
                                            style={{ background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)" }}>
                                            {tip}
                                          </motion.div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 2. Multi-Language Blast ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🌍 Ko'p tilli Blast — bir vaqtda barcha tillarda</p>
                                    <button onClick={() => setMultiLangEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all"
                                      style={{ background:multiLangEnabled?"#34d399":"rgba(255,255,255,0.12)", justifyContent:multiLangEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  {multiLangEnabled && (
                                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-2">
                                      <div className="flex flex-wrap gap-1.5">
                                        {[{c:"en",f:"🇬🇧"},{c:"ru",f:"🇷🇺"},{c:"ko",f:"🇰🇷"},{c:"zh",f:"🇨🇳"},{c:"ar",f:"🇸🇦"},{c:"tr",f:"🇹🇷"},{c:"de",f:"🇩🇪"},{c:"fr",f:"🇫🇷"}].map(l => {
                                          const on = selectedLangs.includes(l.c);
                                          return (
                                            <button key={l.c}
                                              onClick={() => setSelectedLangs(p => on ? p.filter(x=>x!==l.c) : [...p,l.c])}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-bold transition-all"
                                              style={{ background:on?"rgba(34,211,153,0.15)":"rgba(255,255,255,0.06)", border:on?"1.5px solid rgba(34,211,153,0.5)":"1.5px solid rgba(255,255,255,0.08)", color:on?"#34d399":"rgba(255,255,255,0.45)" }}>
                                              {l.f}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {selectedLangs.length > 0 && (
                                        <button onClick={runTranslate} disabled={translating}
                                          className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                          style={{ background:"rgba(34,211,153,0.15)", border:"1px solid rgba(34,211,153,0.4)", color:"#34d399" }}>
                                          {translating ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Tarjima qilinmoqda…</> : `${selectedLangs.length} tilda tarjima qilish →`}
                                        </button>
                                      )}
                                      {Object.entries(translations).map(([lang,text]) => (
                                        <div key={lang} className="px-3 py-2 rounded-xl flex gap-2"
                                          style={{ background:"rgba(34,211,153,0.07)", border:"1px solid rgba(34,211,153,0.2)" }}>
                                          <span className="text-[9px] font-black text-emerald-400 uppercase flex-shrink-0 mt-0.5">{lang}:</span>
                                          <span className="text-[10px] text-white/55 leading-relaxed">{text}</span>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </div>

                                {/* ── 3. A/B Caption Test ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🧪 A/B Caption Test — split test</p>
                                    <button onClick={() => setAbTestEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all"
                                      style={{ background:abTestEnabled?"#f59e0b":"rgba(255,255,255,0.12)", justifyContent:abTestEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {abTestEnabled && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-amber-400"
                                          style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)" }}>
                                          50% obunachilaring A izohni, 50% B izohni ko'radi → natijalar tahlil qilinadi
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="mt-2.5 text-[10px] font-black text-amber-400 w-5 flex-shrink-0">A</span>
                                          <div className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white/40 italic"
                                            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                                            {postContent || "(yuqoridagi asosiy izoh)"}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="mt-2.5 text-[10px] font-black text-amber-400 w-5 flex-shrink-0">B</span>
                                          <textarea placeholder="B variant izoh…" rows={2} value={captionB} onChange={e=>setCaptionB(e.target.value)}
                                            className="flex-1 resize-none rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                            style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.3)" }} />
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 4. Secret Code Gate ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🔐 Secret Gate — maxfiy kirish kodi</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Post ko'rinadi lekin kontent kod bilan ochiladi</p>
                                    </div>
                                    <button onClick={() => setSecretGate(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all ml-2"
                                      style={{ background:secretGate?"#8b5cf6":"rgba(255,255,255,0.12)", justifyContent:secretGate?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {secretGate && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1.5 overflow-hidden">
                                        <input placeholder="Maxfiy kodni kiriting (NEXUS2026)"
                                          value={secretCode} onChange={e=>setSecretCode(e.target.value.toUpperCase())}
                                          className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none font-mono tracking-widest"
                                          style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.4)" }} />
                                        {secretCode && (
                                          <p className="text-[10px] text-violet-400 font-bold px-1">
                                            🔑 Kod: <span className="font-mono tracking-widest">{secretCode}</span> — bilganlarga ulashing
                                          </p>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 5. Crowd Unlock ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">👥 Crowd Unlock — jamoaviy ochish</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">X kishi reaksiya bergandan so'ng ochiladi</p>
                                    </div>
                                    <button onClick={() => setCrowdUnlock(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all ml-2"
                                      style={{ background:crowdUnlock?"#06b6d4":"rgba(255,255,255,0.12)", justifyContent:crowdUnlock?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {crowdUnlock && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="flex items-center gap-3">
                                          <input type="range" min={10} max={500} step={10} value={crowdThreshold}
                                            onChange={e=>setCrowdThreshold(Number(e.target.value))}
                                            className="flex-1 accent-cyan-400" style={{ accentColor:"#22d3ee" }} />
                                          <span className="text-sm font-black text-cyan-400 w-12 text-right">{crowdThreshold} 👤</span>
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                          {[10,25,50,100,250,500].map(v => (
                                            <button key={v} onClick={() => setCrowdThreshold(v)}
                                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                                              style={{ background:crowdThreshold===v?"rgba(6,182,212,0.25)":"rgba(255,255,255,0.06)", border:crowdThreshold===v?"1px solid rgba(6,182,212,0.6)":"1px solid rgba(255,255,255,0.08)", color:crowdThreshold===v?"#22d3ee":"rgba(255,255,255,0.4)" }}>
                                              {v}
                                            </button>
                                          ))}
                                        </div>
                                        <p className="text-[9px] text-cyan-500/60">
                                          Post blur ko'rinadi → {crowdThreshold} kishi reaksiya bergandan so'ng to'liq ochiladi
                                        </p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 6. Remix DNA ── */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">🧬 Remix DNA — qayta yaratish ruxsati</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { id:"none",     e:"🚫", l:"Remix yo'q",   d:"Hich kim",       c:"#f87171" },
                                      { id:"template", e:"📋", l:"Shablon",       d:"Faqat format",   c:"#fbbf24" },
                                      { id:"style",    e:"🎨", l:"Stil Remix",    d:"Rang/effekt",    c:"#818cf8" },
                                      { id:"full",     e:"♻️", l:"To'liq Remix",  d:"Barcha huquqlar",c:"#34d399" },
                                    ].map(r => (
                                      <button key={r.id} onClick={() => setRemixDna(r.id as typeof remixDna)}
                                        className="flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-left transition-all"
                                        style={{ background:remixDna===r.id?`${r.c}18`:"rgba(255,255,255,0.04)", border:remixDna===r.id?`1.5px solid ${r.c}66`:"1.5px solid rgba(255,255,255,0.07)" }}>
                                        <span className="text-lg leading-none">{r.e}</span>
                                        <div>
                                          <p className="text-[10px] font-black" style={{ color:remixDna===r.id?r.c:"rgba(255,255,255,0.7)" }}>{r.l}</p>
                                          <p className="text-[9px] text-white/30">{r.d}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* ── 7. Engagement Chain ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">⚡ Engagement Chain — avtomatik zanjir</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Engagement chegara oshganda avtomatik harakat</p>
                                    </div>
                                    <button onClick={() => setChainEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all ml-2"
                                      style={{ background:chainEnabled?"#f97316":"rgba(255,255,255,0.12)", justifyContent:chainEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {chainEnabled && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="flex gap-2 items-center">
                                          <select value={chainTrigger} onChange={e=>setChainTrigger(e.target.value)}
                                            className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                                            style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.35)" }}>
                                            <option value="50likes" style={{background:"#0e0e1a"}}>50 ta layk</option>
                                            <option value="100likes" style={{background:"#0e0e1a"}}>100 ta layk</option>
                                            <option value="500likes" style={{background:"#0e0e1a"}}>500 ta layk</option>
                                            <option value="10comments" style={{background:"#0e0e1a"}}>10 ta izoh</option>
                                            <option value="1kreach" style={{background:"#0e0e1a"}}>1 000 ko'rish</option>
                                            <option value="10kreach" style={{background:"#0e0e1a"}}>10 000 ko'rish</option>
                                          </select>
                                          <span className="text-orange-400 font-black text-base">→</span>
                                          <select value={chainAction} onChange={e=>setChainAction(e.target.value)}
                                            className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                                            style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.35)" }}>
                                            <option value="story" style={{background:"#0e0e1a"}}>Story'ga havolani joylashtir</option>
                                            <option value="reel" style={{background:"#0e0e1a"}}>Reel sifatida qayta publish</option>
                                            <option value="boost" style={{background:"#0e0e1a"}}>AI Boost faollashtir</option>
                                            <option value="notify" style={{background:"#0e0e1a"}}>Barcha obunachilarga xabar</option>
                                            <option value="pin" style={{background:"#0e0e1a"}}>Profil tepasiga pin qil</option>
                                          </select>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 8. Monetize Post ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">💰 Bu postdan pul ishlang</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Tip Jar yoki Pay-to-See model</p>
                                    </div>
                                    <button onClick={() => setMonetizeEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all ml-2"
                                      style={{ background:monetizeEnabled?"#fbbf24":"rgba(255,255,255,0.12)", justifyContent:monetizeEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white" />
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {monetizeEnabled && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="flex gap-2">
                                          {[{id:"tip",e:"🪙",l:"Tip Jar",d:"Ixtiyoriy sovg'a"},{id:"paytosee",e:"🔒",l:"Pay-to-See",d:"To'lov kerak"}].map(m => (
                                            <button key={m.id} onClick={() => setMonetizeType(m.id as "tip"|"paytosee")}
                                              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                                              style={{ background:monetizeType===m.id?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.05)", border:monetizeType===m.id?"1.5px solid rgba(251,191,36,0.6)":"1.5px solid rgba(255,255,255,0.08)" }}>
                                              <span className="text-xl">{m.e}</span>
                                              <span className="text-[10px] font-black" style={{ color:monetizeType===m.id?"#fbbf24":"rgba(255,255,255,0.5)" }}>{m.l}</span>
                                              <span className="text-[9px] text-white/30">{m.d}</span>
                                            </button>
                                          ))}
                                        </div>
                                        {monetizeType === "paytosee" && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-white/45">Narx:</span>
                                            <input type="number" min="100" step="100" value={payToSeePrice}
                                              onChange={e=>setPayToSeePrice(e.target.value)}
                                              className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none"
                                              style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.3)" }} />
                                            <span className="text-xs text-white/45 font-bold">so'm</span>
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 9. Live Sentiment Meter ── */}
                                <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all"
                                  style={{ background:sentimentMeter?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.03)", border:sentimentMeter?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.06)" }}
                                  onClick={() => setSentimentMeter(p=>!p)}>
                                  <span style={{fontSize:22}}>📊</span>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-white/80">Live Kayfiyat Metri</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">Tomoshabinlar kayfiyati real-vaqtda ko'rsatiladi — hech kimda yo'q!</p>
                                  </div>
                                  <div className="flex items-center px-0.5 rounded-full flex-shrink-0 transition-all"
                                    style={{ background:sentimentMeter?"rgba(99,102,241,0.8)":"rgba(255,255,255,0.12)", justifyContent:sentimentMeter?"flex-end":"flex-start", height:22, width:40 }}>
                                    <div className="w-4 h-4 rounded-full bg-white" />
                                  </div>
                                </div>

                                {/* ── 10. Emotion Lock ── */}
                                <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer"
                                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                                  <span style={{fontSize:22}}>🎭</span>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-white/80">Emotion Lock</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">Tomoshabin reaksiyasiga qarab post rangi/toni o'zgaradi</p>
                                  </div>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white/50"
                                    style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" }}>
                                    TEZ KUNDA
                                  </span>
                                </div>

                                {/* ── 11. 🎤 Voice Caption ── */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">🎤 Ovozdan Izoh — AI transkripsiya</p>
                                  <button onClick={runVoiceCaption} disabled={voiceCapRecording || voiceCapTranscribing}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                                    style={{ background: voiceCapRecording ? "rgba(239,68,68,0.2)" : voiceCapTranscribing ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)", border: voiceCapRecording ? "1px solid rgba(239,68,68,0.5)" : voiceCapTranscribing ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.1)", color: voiceCapRecording ? "#f87171" : voiceCapTranscribing ? "#a5b4fc" : "rgba(255,255,255,0.55)" }}>
                                    {voiceCapRecording ? <><div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/> Yozib olinmoqda (2s)…</> :
                                     voiceCapTranscribing ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> AI transkripsiya qilmoqda…</> :
                                     <><span>🎤</span> Ovozdan izoh yozdirish</>}
                                  </button>
                                  <p className="text-[9px] text-white/25 mt-1 px-1">Gapiring → AI avtomatik izohga aylantiradi</p>
                                </div>

                                {/* ── 12. 🏷️ Hashtag Storm ── */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">🏷️ AI Hashtag Storm — 16 ta trend teg</p>
                                  <button onClick={runHashtagStorm} disabled={hashtagStormLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                                    style={{ background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", color:"#fbbf24" }}>
                                    {hashtagStormLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Trend teglar tahlil qilinmoqda…</> : <><span>🌪️</span> Hashtag Storm ishlatish</>}
                                  </button>
                                  <AnimatePresence>
                                    {hashtagStormOpen && !hashtagStormLoading && (
                                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 overflow-hidden">
                                        <div className="flex flex-wrap gap-1.5">
                                          {hashtagSuggestions.map(h => {
                                            const picked = selectedHashtags.includes(h.tag);
                                            return (
                                              <button key={h.tag}
                                                onClick={() => {
                                                  setSelectedHashtags(p => picked ? p.filter(x=>x!==h.tag) : [...p,h.tag]);
                                                  if (!picked) setPostContent(c => c + (c ? " " : "") + h.tag);
                                                  else setPostContent(c => c.replace(" " + h.tag, "").replace(h.tag, "").trim());
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                                style={{ background:picked?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.06)", border:picked?"1px solid rgba(251,191,36,0.6)":"1px solid rgba(255,255,255,0.08)", color:picked?"#fbbf24":"rgba(255,255,255,0.45)" }}>
                                                {h.tag}
                                                <span className="text-[8px] opacity-60">{h.reach}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {selectedHashtags.length > 0 && (
                                          <p className="text-[9px] text-amber-400 mt-1.5 px-1 font-semibold">{selectedHashtags.length} ta teg tanlandi</p>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 13. ⏰ Self-Destruct Timer ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">⏰ Auto Self-Destruct — o'z-o'zidan o'chadi</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Post belgilangan vaqtdan keyin avtomatik o'chiriladi</p>
                                    </div>
                                    <button onClick={()=>setSelfDestruct(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 ml-2 transition-all"
                                      style={{ background:selfDestruct?"#ef4444":"rgba(255,255,255,0.12)", justifyContent:selfDestruct?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white"/>
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {selfDestruct && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                        <div className="flex gap-1.5 flex-wrap">
                                          {["1h","3h","6h","12h","24h","48h","72h"].map(t => (
                                            <button key={t} onClick={()=>setSelfDestructTime(t)}
                                              className="px-3 py-1.5 rounded-xl text-[10px] font-black transition-all"
                                              style={{ background:selfDestructTime===t?"rgba(239,68,68,0.25)":"rgba(255,255,255,0.06)", border:selfDestructTime===t?"1.5px solid rgba(239,68,68,0.7)":"1.5px solid rgba(255,255,255,0.08)", color:selfDestructTime===t?"#f87171":"rgba(255,255,255,0.4)" }}>
                                              {t}
                                            </button>
                                          ))}
                                        </div>
                                        <p className="text-[9px] text-red-400/70 mt-1.5 px-0.5">💣 {selfDestructTime} dan keyin barcha platformalarda o'chiriladi</p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 14. 🧩 Content Series ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🧩 Kontent Seriyasi — Netflix uslub</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Postingizni seriya epizodi sifatida belgilang</p>
                                    </div>
                                    <button onClick={()=>setSeriesEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 ml-2 transition-all"
                                      style={{ background:seriesEnabled?"#f59e0b":"rgba(255,255,255,0.12)", justifyContent:seriesEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white"/>
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {seriesEnabled && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <input placeholder="Seriya nomi (masalan: Hayotim Sahifalari)" value={seriesTitle} onChange={e=>setSeriesTitle(e.target.value)}
                                          className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                          style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)" }} />
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-white/45">Epizod:</span>
                                          <div className="flex gap-1.5">
                                            {[1,2,3,4,5,6,7,8].map(n => (
                                              <button key={n} onClick={()=>setSeriesEpisode(n)}
                                                className="w-7 h-7 rounded-lg text-xs font-black transition-all"
                                                style={{ background:seriesEpisode===n?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.06)", border:seriesEpisode===n?"1.5px solid rgba(245,158,11,0.7)":"1.5px solid rgba(255,255,255,0.08)", color:seriesEpisode===n?"#fbbf24":"rgba(255,255,255,0.4)" }}>
                                                {n}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        {seriesTitle && <p className="text-[10px] text-amber-400 px-0.5 font-semibold">📺 {seriesTitle} — Epizod {seriesEpisode}</p>}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 15. 🌐 Geo-Bloom ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🌐 Geo-Bloom — joylashuvdan tarqalish</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Post avval sizga yaqin foydalanuvchilarga ko'rsatiladi</p>
                                    </div>
                                    <button onClick={()=>setGeoBloomEnabled(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 ml-2 transition-all"
                                      style={{ background:geoBloomEnabled?"#22d3ee":"rgba(255,255,255,0.12)", justifyContent:geoBloomEnabled?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white"/>
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {geoBloomEnabled && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="flex items-center gap-3">
                                          <input type="range" min={1} max={200} step={5} value={geoBloomRadius} onChange={e=>setGeoBloomRadius(Number(e.target.value))} className="flex-1" style={{accentColor:"#22d3ee"}}/>
                                          <span className="text-xs font-black text-cyan-400 w-14 text-right">{geoBloomRadius} km</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                          {[1,5,10,25,50,100,200].map(v => (
                                            <button key={v} onClick={()=>setGeoBloomRadius(v)}
                                              className="px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                                              style={{ background:geoBloomRadius===v?"rgba(34,211,238,0.25)":"rgba(255,255,255,0.06)", border:geoBloomRadius===v?"1px solid rgba(34,211,238,0.6)":"1px solid rgba(255,255,255,0.08)", color:geoBloomRadius===v?"#22d3ee":"rgba(255,255,255,0.4)" }}>
                                              {v}km
                                            </button>
                                          ))}
                                        </div>
                                        <p className="text-[9px] text-cyan-500/60">🗺️ {geoBloomRadius} km radiusdagi foydalanuvchilarga birinchi ko'rsatiladi</p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 16. 🤝 Live Collab Canvas ── */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🤝 Live Collab Canvas — birgalikda yarating</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">Do'stlaringizni publish qilishdan oldin tahrirga taklif qiling</p>
                                    </div>
                                    <button onClick={()=>setCollabCanvas(p=>!p)}
                                      className="flex items-center px-0.5 rounded-full flex-shrink-0 ml-2 transition-all"
                                      style={{ background:collabCanvas?"#a78bfa":"rgba(255,255,255,0.12)", justifyContent:collabCanvas?"flex-end":"flex-start", height:22, width:40 }}>
                                      <div className="w-4 h-4 rounded-full bg-white"/>
                                    </button>
                                  </div>
                                  <AnimatePresence>
                                    {collabCanvas && (
                                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-2 overflow-hidden">
                                        <div className="flex gap-2">
                                          <input placeholder="@foydalanuvchi nomi" value={collabInviteInput} onChange={e=>setCollabInviteInput(e.target.value)}
                                            onKeyDown={e=>{ if(e.key==="Enter"&&collabInviteInput.trim()){ setCollabCanvasInvites(p=>[...p,collabInviteInput.trim()]); setCollabInviteInput(""); } }}
                                            className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                            style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.35)" }}/>
                                          <button onClick={()=>{ if(collabInviteInput.trim()){ setCollabCanvasInvites(p=>[...p,collabInviteInput.trim()]); setCollabInviteInput(""); }}}
                                            className="px-3 py-2 rounded-xl text-xs font-bold"
                                            style={{ background:"rgba(167,139,250,0.2)", color:"#a78bfa" }}>
                                            +Qo'sh
                                          </button>
                                        </div>
                                        {collabCanvasInvites.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {collabCanvasInvites.map(inv => (
                                              <span key={inv} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-violet-300"
                                                style={{ background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.35)" }}>
                                                {inv}
                                                <button onClick={()=>setCollabCanvasInvites(p=>p.filter(x=>x!==inv))} className="opacity-60">×</button>
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                  </div>
                  )}

                  {/* ═══ REEL TAB ═══ */}
                  {tab === "reel" && (
                    <div className="space-y-3">
                      <UploadZone
                        accept={ACCEPT.video} label="Video yuklang (Reel)" icon={Play}
                        onFile={f => handleFile(f, setReelFile, setReelPreview, upReel)}
                        file={reelFile} isUploading={upReelBusy} progress={upReelProg} preview={reelPreview} />

                      {reelUploadResult && !upReelBusy && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Video yuklandi
                        </div>
                      )}

                      <textarea
                        placeholder="Reel tavsifi…"
                        rows={2}
                        value={reelCaption}
                        onChange={e => setReelCaption(e.target.value)}
                        className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      />

                      {/* Audio */}
                      <div>
                        <p className="text-xs text-white/40 mb-2 font-medium">Fon musiqa (ixtiyoriy)</p>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => document.getElementById("reel-audio-input")?.click()}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors"
                            style={{
                              borderColor: reelAudioFile ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)",
                              color: reelAudioFile ? "#fbbf24" : "rgba(255,255,255,0.4)",
                              background: reelAudioFile ? "rgba(251,191,36,0.06)" : "transparent",
                            }}>
                            <Music className="w-3.5 h-3.5" />
                            {reelAudioFile ? reelAudioFile.name.slice(0, 16) + "…" : "Audio yuklash"}
                            <input id="reel-audio-input" type="file" accept={ACCEPT.audio} className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setReelAudioFile, setReelAudioPreview, upReelAudio); e.target.value = ""; }} />
                          </button>
                          {upReelAudioBusy && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                          {reelAudioUploadResult && !upReelAudioBusy && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          <input
                            placeholder="yoki musiqa nomi"
                            value={reelAudio}
                            onChange={e => setReelAudio(e.target.value)}
                            className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                          />
                        </div>
                      </div>

                      {/* ── Reel Speed ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">⚡ Tezlik</p>
                        <div className="flex gap-2">
                          {["0.3x","0.5x","1x","2x","3x"].map(s => (
                            <button key={s} onClick={() => setReelSpeed(s)}
                              className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
                              style={{ background:reelSpeed===s?"linear-gradient(135deg,#7c3aed,#a78bfa)":"rgba(255,255,255,0.06)", color:reelSpeed===s?"white":"rgba(255,255,255,0.4)", boxShadow:reelSpeed===s?"0 2px 12px rgba(124,58,237,0.35)":"none" }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Reel Power Toggles ── */}
                      <div className="space-y-2">
                        {[
                          { label:"🟢 Green Screen",      desc:"Reel orqa fonini almashtirasiz",          val:reelGreenScreen,  set:setReelGreenScreen,  color:"#34d399" },
                          { label:"📝 AI Auto-Captions", desc:"AI avtomatik subtitr qo'shadi",            val:reelAutoCaption,  set:setReelAutoCaption,  color:"#60a5fa" },
                        ].map(t => (
                          <div key={t.label}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all"
                            style={{ background:t.val?`${t.color}12`:"rgba(255,255,255,0.04)", border:t.val?`1px solid ${t.color}55`:"1px solid rgba(255,255,255,0.06)" }}
                            onClick={() => t.set((p:boolean)=>!p)}>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-white/80">{t.label}</p>
                              <p className="text-[10px] text-white/35 mt-0.5">{t.desc}</p>
                            </div>
                            <div className="flex items-center px-0.5 rounded-full transition-all"
                              style={{ background:t.val?t.color:"rgba(255,255,255,0.12)", justifyContent:t.val?"flex-end":"flex-start", height:22, width:40 }}>
                              <div className="w-4 h-4 rounded-full bg-white" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── 🎨 Cinematic Color Filter ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">🎨 Sinematik Filtr</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id:"none",    label:"Asl",      preview:"rgba(255,255,255,0.08)", border:"rgba(255,255,255,0.15)" },
                            { id:"warm",    label:"🌅 Issiq",  preview:"rgba(251,146,60,0.35)",  border:"rgba(251,146,60,0.7)"  },
                            { id:"cool",    label:"❄️ Sovuq",  preview:"rgba(96,165,250,0.35)",  border:"rgba(96,165,250,0.7)"  },
                            { id:"vintage", label:"📷 Vintage",preview:"rgba(251,191,36,0.25)", border:"rgba(251,191,36,0.6)"  },
                            { id:"neon",    label:"🌈 Neon",   preview:"rgba(167,139,250,0.35)", border:"rgba(167,139,250,0.7)" },
                            { id:"bw",      label:"⬛ B&W",    preview:"rgba(255,255,255,0.12)", border:"rgba(255,255,255,0.45)" },
                          ].map(f => (
                            <button key={f.id} onClick={() => setReelFilter(f.id)}
                              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
                              style={{ background:reelFilter===f.id?f.preview:"rgba(255,255,255,0.04)", border:reelFilter===f.id?`1.5px solid ${f.border}`:"1.5px solid rgba(255,255,255,0.07)" }}>
                              <div className="w-8 h-8 rounded-lg" style={{ background:f.preview, border:`1px solid ${f.border}` }}/>
                              <span className="text-[9px] font-bold" style={{ color:reelFilter===f.id?"white":"rgba(255,255,255,0.4)" }}>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── 🔄 Loop Type ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">🔄 Loop turi</p>
                        <div className="flex gap-2">
                          {[{id:"normal",e:"▶️",l:"Oddiy"},{id:"pingpong",e:"↔️",l:"Ping-Pong"},{id:"stilend",e:"⏸",l:"Oxiri muzlab"}].map(l => (
                            <button key={l.id} onClick={() => setReelLoop(l.id)}
                              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-all"
                              style={{ background:reelLoop===l.id?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)", border:reelLoop===l.id?"1.5px solid rgba(124,58,237,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:reelLoop===l.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                              <span className="text-base">{l.e}</span>
                              {l.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── 🎯 AI Hook Generator ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">🎯 AI Ochilish Iborasi — birinchi 3 soniya</p>
                        <button onClick={runReelHooks} disabled={reelHookLoading}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.35)", color:"#fca5a5" }}>
                          {reelHookLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Eng yaxshi hooklar tanlanmoqda…</> : <><Sparkles className="w-3.5 h-3.5"/> AI hook taklifi (scroll stopper)</>}
                        </button>
                        <AnimatePresence>
                          {reelHookOpen && !reelHookLoading && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-1.5 overflow-hidden">
                              {reelHooks.map((hook, i) => (
                                <motion.button key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.07}}
                                  onClick={() => setReelCaption(hook.replace(/"/g,""))}
                                  className="w-full text-left px-3 py-2.5 rounded-xl text-[11px] text-white/75 hover:bg-white/5 transition-colors"
                                  style={{ background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)" }}>
                                  {hook}
                                </motion.button>
                              ))}
                              <p className="text-[9px] text-white/25 px-1">Bosib caption'ga qo'shish</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🎬 Reel Drag Canvas ── */}
                      <div>
                        <button onClick={()=>setReelEditOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:reelEditOpen?"rgba(220,38,38,0.12)":"rgba(255,255,255,0.04)", border:reelEditOpen?"1px solid rgba(220,38,38,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🎬</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Reel Vizual Muharrir</p>
                              <p className="text-[10px] text-white/35">Overlay, matn, emoji, stiker — xohlagan joyga</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{reelEditOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {reelEditOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 overflow-hidden">
                              <DragMediaCanvas layers={canvasLayers} onChange={setCanvasLayers} canvasW={240} canvasH={360}/>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🎵 Audio Studio ── */}
                      <div>
                        <button onClick={()=>setReelAudioEditOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:reelAudioEditOpen?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.04)", border:reelAudioEditOpen?"1px solid rgba(251,191,36,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🎵</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Audio Studio</p>
                              <p className="text-[10px] text-white/35">Ovoz o'zgartirish, trending audio, beat sync</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{reelAudioEditOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {reelAudioEditOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* Voice Changer */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">🎙️ Ovoz o'zgartirish</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[{id:"normal",e:"🗣️",l:"Asl"},{id:"robot",e:"🤖",l:"Robot"},{id:"chipmunk",e:"🐿️",l:"Chipmunk"},{id:"deep",e:"👹",l:"Bass"},{id:"echo",e:"🌊",l:"Echo"},{id:"alien",e:"👽",l:"Alien"},{id:"helium",e:"🎈",l:"Helium"},{id:"cave",e:"🏔️",l:"G'or"}].map(v=>(
                                    <button key={v.id} onClick={()=>setReelVoiceChanger(v.id)}
                                      className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                                      style={{ background:reelVoiceChanger===v.id?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.05)", border:reelVoiceChanger===v.id?"1.5px solid rgba(251,191,36,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:reelVoiceChanger===v.id?"#fbbf24":"rgba(255,255,255,0.4)" }}>
                                      <span style={{fontSize:16}}>{v.e}</span>{v.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Trending Audio */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">📀 Trending Audio kutubxonasi</p>
                                <div className="space-y-1.5">
                                  {[{t:"Billie Jean",a:"Michael Jackson",v:"4.2M"},{t:"Blinding Lights",a:"The Weeknd",v:"8.1M"},{t:"As It Was",a:"Harry Styles",v:"6.5M"},{t:"Flowers",a:"Miley Cyrus",v:"5.3M"},{t:"Cruel Summer",a:"Taylor Swift",v:"7.8M"},{t:"STAY",a:"The Kid LAROI",v:"9.2M"}].map(s=>(
                                    <button key={s.t} onClick={()=>setReelTrAudio(s.t)}
                                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] transition-all"
                                      style={{ background:reelTrAudio===s.t?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.04)", border:reelTrAudio===s.t?"1px solid rgba(251,191,36,0.5)":"1px solid rgba(255,255,255,0.07)" }}>
                                      <div className="text-left">
                                        <p className="font-bold text-white/75">{s.t}</p>
                                        <p className="text-white/35">{s.a}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] text-amber-400">{s.v} foy.</span>
                                        {reelTrAudio===s.t && <span className="text-amber-400">✓</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Volume controls */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-white/40 w-20">🎵 Fon mus.</span>
                                  <input type="range" min={0} max={100} value={reelBgMusicVol} onChange={e=>setReelBgMusicVol(Number(e.target.value))} className="flex-1" style={{accentColor:"#fbbf24"}}/>
                                  <span className="text-[9px] font-bold text-amber-300 w-8 text-right">{reelBgMusicVol}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-white/40 w-20">🎤 Asl ovoz</span>
                                  <input type="range" min={0} max={100} value={reelOrigVol} onChange={e=>setReelOrigVol(Number(e.target.value))} className="flex-1" style={{accentColor:"#fbbf24"}}/>
                                  <span className="text-[9px] font-bold text-amber-300 w-8 text-right">{reelOrigVol}%</span>
                                </div>
                              </div>
                              {/* Beat sync */}
                              <button onClick={()=>setReelBeatSync(p=>!p)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                style={{ background:reelBeatSync?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.04)", border:reelBeatSync?"1px solid rgba(251,191,36,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelBeatSync?"#fbbf24":"rgba(255,255,255,0.45)" }}>
                                🥁 Beat Sync — montaj ritmga mos keladi
                                <div className="flex items-center px-0.5 rounded-full" style={{ background:reelBeatSync?"#fbbf24":"rgba(255,255,255,0.12)", justifyContent:reelBeatSync?"flex-end":"flex-start", height:20, width:36 }}>
                                  <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                </div>
                              </button>
                              {/* Sound wave */}
                              <button onClick={()=>setReelSoundwave(p=>!p)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                style={{ background:reelSoundwave?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.04)", border:reelSoundwave?"1px solid rgba(96,165,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelSoundwave?"#60a5fa":"rgba(255,255,255,0.45)" }}>
                                〰️ Sound Wave vizualizatsiya
                                <div className="flex items-center px-0.5 rounded-full" style={{ background:reelSoundwave?"#60a5fa":"rgba(255,255,255,0.12)", justifyContent:reelSoundwave?"flex-end":"flex-start", height:20, width:36 }}>
                                  <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                </div>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🌈 Reel AR & Effects ── */}
                      <div>
                        <button onClick={()=>setReelArOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:reelArOpen?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.04)", border:reelArOpen?"1px solid rgba(167,139,250,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🌈</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">AR Filtrlar & Effektlar</p>
                              <p className="text-[10px] text-white/35">Yuz filtr, rang tuzatish, vizual effektlar</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{reelArOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {reelArOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* AR Face Filters */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">🎭 AR Yuz Filtrlari</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[{id:"none",e:"🚫",l:"Yo'q"},{id:"glow",e:"✨",l:"Siyoh"},{id:"blur_face",e:"🌫️",l:"Xira yuz"},{id:"sunglasses",e:"🕶️",l:"Ko'zoynak"},{id:"crown",e:"👑",l:"Toj"},{id:"cat",e:"🐱",l:"Mushuk"},{id:"dog",e:"🐶",l:"It"},{id:"heart_eyes",e:"😍",l:"Yurak"}].map(f=>(
                                    <button key={f.id} onClick={()=>setReelArFilter(f.id)}
                                      className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                                      style={{ background:reelArFilter===f.id?"rgba(167,139,250,0.25)":"rgba(255,255,255,0.05)", border:reelArFilter===f.id?"1.5px solid rgba(167,139,250,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:reelArFilter===f.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                      <span style={{fontSize:16}}>{f.e}</span>{f.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Color Grade */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">🎨 Rang Gradatsiyasi (LUT)</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {[{id:"none",l:"Asl",c:"rgba(255,255,255,0.1)"},{id:"cinematic",l:"Sinematik",c:"rgba(96,165,250,0.4)"},{id:"warm_lut",l:"Issiq",c:"rgba(251,146,60,0.4)"},{id:"teal_orange",l:"Teal & Orange",c:"rgba(20,184,166,0.4)"},{id:"desert",l:"Sahro",c:"rgba(234,179,8,0.4)"},{id:"arctic",l:"Arktik",c:"rgba(147,197,253,0.4)"},{id:"moody",l:"Moody",c:"rgba(109,40,217,0.4)"},{id:"faded",l:"Faded",c:"rgba(148,163,184,0.4)"}].map(g=>(
                                    <button key={g.id} onClick={()=>setReelColorGrade(g.id)}
                                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                      style={{ background:reelColorGrade===g.id?g.c:`rgba(255,255,255,0.05)`, border:reelColorGrade===g.id?`1.5px solid ${g.c}`:"1.5px solid rgba(255,255,255,0.07)", color:reelColorGrade===g.id?"white":"rgba(255,255,255,0.4)" }}>
                                      {g.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Adjustment sliders */}
                              <div className="space-y-2">
                                {[
                                  {l:"☀️ Yorqinlik",v:reelBrightness,s:setReelBrightness,min:50,max:150,def:100,c:"#fbbf24"},
                                  {l:"◐ Kontrast",  v:reelContrast,  s:setReelContrast,  min:50,max:150,def:100,c:"#a78bfa"},
                                  {l:"🌈 To'yinganlik",v:reelSaturation,s:setReelSaturation,min:0,max:200,def:100,c:"#34d399"},
                                  {l:"🔪 O'tkirlik",v:reelSharpness,s:setReelSharpness,min:0,max:10,def:0,c:"#60a5fa"},
                                  {l:"⭕ Vignette", v:reelVignette,  s:setReelVignette,  min:0,max:100,def:0,c:"#1e1e2e"},
                                  {l:"🌫️ Don/Grain",v:reelGrain,    s:setReelGrain,    min:0,max:100,def:0,c:"#94a3b8"},
                                ].map(({l,v,s,min,max,def,c})=>(
                                  <div key={l} className="flex items-center gap-2">
                                    <span className="text-[9px] text-white/40 w-24">{l}</span>
                                    <input type="range" min={min} max={max} value={v} onChange={e=>s(Number(e.target.value))} className="flex-1" style={{accentColor:c}}/>
                                    <button onClick={()=>s(def)} className="text-[8px] text-white/25 hover:text-white/50 w-6">↺</button>
                                    <span className="text-[9px] text-white/40 w-6 text-right">{v}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Visual effects toggles */}
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  {l:"🔄 Ken Burns",v:reelKenBurns,s:setReelKenBurns,c:"#a78bfa"},
                                  {l:"🫧 Fon Xira", v:reelBlurBg,  s:setReelBlurBg,  c:"#60a5fa"},
                                  {l:"📡 Stabilizatsiya",v:reelStabilize,s:setReelStabilize,c:"#34d399"},
                                  {l:"⚡ AI Yaxshilash",v:reelAutoEnhance,s:setReelAutoEnhance,c:"#fbbf24"},
                                  {l:"📼 Boomerang",v:reelBoomerang,s:setReelBoomerang,c:"#f472b6"},
                                  {l:"⏪ Teskari",   v:reelReverse, s:setReelReverse, c:"#fb923c"},
                                  {l:"🐢 Sekin (0.25x)",v:reelSlowMo,s:setReelSlowMo,c:"#22d3ee"},
                                  {l:"⚡ Timelapse (4x)",v:reelTimelapse,s:setReelTimelapse,c:"#e879f9"},
                                ].map(({l,v,s,c})=>(
                                  <button key={l} onClick={()=>s((p:boolean)=>!p)}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                                    style={{ background:v?`${c}22`:"rgba(255,255,255,0.04)", border:v?`1px solid ${c}66`:"1px solid rgba(255,255,255,0.07)", color:v?c:"rgba(255,255,255,0.4)" }}>
                                    <div className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{ background:v?c:"rgba(255,255,255,0.12)", justifyContent:v?"flex-end":"flex-start", height:16, width:28 }}>
                                      <div className="w-3 h-3 rounded-full bg-white"/>
                                    </div>
                                    {l}
                                  </button>
                                ))}
                              </div>
                              {/* Zoom animation */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🔍 Zoom Animatsiyasi</p>
                                <div className="flex gap-1.5">
                                  {[{id:"none",l:"Yo'q"},{id:"in",l:"Zoom In"},{id:"out",l:"Zoom Out"},{id:"bounce",l:"Bounce"}].map(z=>(
                                    <button key={z.id} onClick={()=>setReelZoomAnim(z.id)}
                                      className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                      style={{ background:reelZoomAnim===z.id?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:reelZoomAnim===z.id?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelZoomAnim===z.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                      {z.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 📊 Reel Interaktiv Elementlar ── */}
                      <div className="rounded-2xl p-3.5 space-y-3" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold text-white/60">📊 Interaktiv Elementlar</p>
                        {/* Transition */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">🎞️ Kliplar orasidagi o'tish</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"cut",l:"Kesish"},{id:"fade",l:"🌫️ Fade"},{id:"zoom",l:"🔍 Zoom"},{id:"slide",l:"↔️ Slide"},{id:"spin",l:"🌀 Spin"},{id:"glitch",l:"⚡ Glitch"}].map(t=>(
                              <button key={t.id} onClick={()=>setReelTransition(t.id)}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelTransition===t.id?"rgba(220,38,38,0.2)":"rgba(255,255,255,0.05)", border:reelTransition===t.id?"1px solid rgba(220,38,38,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelTransition===t.id?"#fca5a5":"rgba(255,255,255,0.4)" }}>
                                {t.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Text animation */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">✍️ Matn animatsiya uslubi</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"none",l:"Yo'q"},{id:"typewriter",l:"⌨️ Typewriter"},{id:"slide_in",l:"→ Slide"},{id:"bounce",l:"🏀 Bounce"},{id:"fade_in",l:"Fade In"},{id:"neon_blink",l:"💡 Neon"},{id:"wave",l:"〰️ Wave"},{id:"zoom_in",l:"🔍 Zoom"}].map(t=>(
                              <button key={t.id} onClick={()=>setReelTextAnim(t.id)}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelTextAnim===t.id?"rgba(96,165,250,0.2)":"rgba(255,255,255,0.05)", border:reelTextAnim===t.id?"1px solid rgba(96,165,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelTextAnim===t.id?"#93c5fd":"rgba(255,255,255,0.4)" }}>
                                {t.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">⏱️ Progress Bar uslubi</p>
                          <div className="flex gap-1.5">
                            {[{id:"none",l:"Yo'q"},{id:"top",l:"— Yuqori"},{id:"bottom",l:"— Pastki"},{id:"circle",l:"◯ Doira"}].map(p=>(
                              <button key={p.id} onClick={()=>setReelProgressBar(p.id)}
                                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelProgressBar===p.id?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.05)", border:reelProgressBar===p.id?"1px solid rgba(52,211,153,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelProgressBar===p.id?"#6ee7b7":"rgba(255,255,255,0.4)" }}>
                                {p.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Lyrics style */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">🎤 Lyrics/Subtitle uslubi</p>
                          <div className="flex gap-1.5">
                            {[{id:"none",l:"Yo'q"},{id:"bottom_bar",l:"📝 Pastki"},{id:"karaoke",l:"🎤 Karaoke"},{id:"word_by_word",l:"💬 So'zma-so'z"}].map(ls=>(
                              <button key={ls.id} onClick={()=>setReelLyricsStyle(ls.id)}
                                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelLyricsStyle===ls.id?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.05)", border:reelLyricsStyle===ls.id?"1px solid rgba(251,191,36,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelLyricsStyle===ls.id?"#fde68a":"rgba(255,255,255,0.4)" }}>
                                {ls.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Split screen */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">📺 Split Screen rejimi</p>
                          <div className="flex gap-1.5">
                            {[{id:"none",l:"Yo'q"},{id:"vertical",l:"| Vertikal"},{id:"horizontal",l:"— Gorizontal"},{id:"grid",l:"▦ Setka"}].map(ss=>(
                              <button key={ss.id} onClick={()=>setReelSplitScreen(ss.id)}
                                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelSplitScreen===ss.id?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:reelSplitScreen===ss.id?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelSplitScreen===ss.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                {ss.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* CC language */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">🌐 Subtitr tili (AI avtomatik)</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"uz",l:"🇺🇿 UZ"},{id:"ru",l:"🇷🇺 RU"},{id:"en",l:"🇬🇧 EN"},{id:"ko",l:"🇰🇷 KO"},{id:"zh",l:"🇨🇳 ZH"},{id:"ar",l:"🇸🇦 AR"},{id:"tr",l:"🇹🇷 TR"},{id:"de",l:"🇩🇪 DE"}].map(cc=>(
                              <button key={cc.id} onClick={()=>setReelCcLang(cc.id)}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelCcLang===cc.id?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.05)", border:reelCcLang===cc.id?"1px solid rgba(52,211,153,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelCcLang===cc.id?"#6ee7b7":"rgba(255,255,255,0.4)" }}>
                                {cc.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Poll on reel */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] text-white/35">📊 Reel ichida So'rovnoma</p>
                            <button onClick={()=>setReelPoll(p=>!p)} className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{ background:reelPoll?"#a78bfa":"rgba(255,255,255,0.12)", justifyContent:reelPoll?"flex-end":"flex-start", height:20, width:34 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <AnimatePresence>
                            {reelPoll && (
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1.5 overflow-hidden">
                                <input placeholder="Savol kiriting…" value={reelPollQ} onChange={e=>setReelPollQ(e.target.value)}
                                  className="w-full rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}/>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {reelPollA.map((a,i)=>(
                                    <input key={i} placeholder={`Variant ${i+1}`} value={a} onChange={e=>{ const n=[...reelPollA]; n[i]=e.target.value; setReelPollA(n); }}
                                      className="rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                      style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}/>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Misc toggles */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {l:"⏱️ Countdown oyverk",v:reelCountdown,s:setReelCountdown,c:"#f87171"},
                            {l:"🖼️ Picture-in-Pic",   v:reelPip,      s:setReelPip,      c:"#fbbf24"},
                            {l:"🏁 End Card",          v:reelEndCard,  s:setReelEndCard,  c:"#34d399"},
                            {l:"🔞 18+ Yosh chegara", v:reelAgeGate,  s:setReelAgeGate,  c:"#f87171"},
                            {l:"📡 Discover'ga yuborish",v:reelShareDiscover,s:setReelShareDiscover,c:"#60a5fa"},
                            {l:"🎯 Duet rejimi",       v:reelDuetMode, s:setReelDuetMode, c:"#a78bfa"},
                            {l:"📹 React video",       v:reelReactVideo,s:setReelReactVideo,c:"#fb923c"},
                            {l:"4K 🔷 Sifat",          v:reel4k,       s:setReel4k,       c:"#22d3ee"},
                          ].map(({l,v,s,c})=>(
                            <button key={l} onClick={()=>s((p:boolean)=>!p)}
                              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                              style={{ background:v?`${c}18`:"rgba(255,255,255,0.04)", border:v?`1px solid ${c}55`:"1px solid rgba(255,255,255,0.07)", color:v?c:"rgba(255,255,255,0.4)" }}>
                              <div className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{ background:v?c:"rgba(255,255,255,0.12)", justifyContent:v?"flex-end":"flex-start", height:16, width:26 }}>
                                <div className="w-2.5 h-2.5 rounded-full bg-white"/>
                              </div>
                              {l}
                            </button>
                          ))}
                        </div>
                        {/* First comment & pin */}
                        <div className="space-y-1.5">
                          <input placeholder="📌 Pinned birinchi izoh (avtomatik)…" value={reelFirstComment} onChange={e=>setReelFirstComment(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                          <input placeholder="📍 Eng yuqori izohni pin qiling…" value={reelPinComment} onChange={e=>setReelPinComment(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                        </div>
                        {/* Watermark position */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">💧 Suv belgisi joylashuvi</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"none",l:"Yo'q"},{id:"tl",l:"↖ YC"},{id:"tr",l:"↗ YO"},{id:"bl",l:"↙ PC"},{id:"br",l:"↘ PO"},{id:"center",l:"✛ O'rta"}].map(w=>(
                              <button key={w.id} onClick={()=>setReelWatermark(w.id)}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                                style={{ background:reelWatermark===w.id?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.05)", border:reelWatermark===w.id?"1px solid rgba(52,211,153,0.5)":"1px solid rgba(255,255,255,0.07)", color:reelWatermark===w.id?"#6ee7b7":"rgba(255,255,255,0.4)" }}>
                                {w.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Reel permissions */}
                      <div className="rounded-2xl p-3.5 space-y-3.5"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold text-white/60 mb-1">Maxfiylik</p>
                        <PermPicker label="Kim izoh yoza oladi" icon={MessageCircle} value={reelCommentPerm} onChange={setReelCommentPerm} />
                        <PermPicker label="Kim ulasha oladi"    icon={Share2}        value={reelSharePerm}   onChange={setReelSharePerm} />
                      </div>
                    </div>
                  )}

                  {/* ═══ STORY TAB ═══ */}
                  {tab === "story" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {[
                          { id: "story-img-input", label: "Rasm",  Icon: Camera, accept: ACCEPT.image, color: "#7c3aed" },
                          { id: "story-vid-input", label: "Video", Icon: Video,  accept: ACCEPT.video, color: "#06b6d4" },
                        ].map(btn => {
                          const active = btn.label === "Rasm" ? storyFile?.type.startsWith("image") : storyFile?.type.startsWith("video");
                          return (
                            <button key={btn.id}
                              onClick={() => document.getElementById(btn.id)?.click()}
                              className="flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed transition-all"
                              style={{
                                borderColor: active ? `${btn.color}77` : "rgba(255,255,255,0.1)",
                                background: active ? `${btn.color}10` : "rgba(255,255,255,0.02)",
                              }}>
                              <btn.Icon className="w-6 h-6" style={{ color: active ? btn.color : "rgba(255,255,255,0.35)" }} />
                              <span className="text-xs font-bold" style={{ color: active ? btn.color : "rgba(255,255,255,0.35)" }}>
                                {btn.label}
                              </span>
                              <input id={btn.id} type="file" accept={btn.accept} className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setStoryFile, setStoryPreview, upStory); e.target.value = ""; }} />
                            </button>
                          );
                        })}
                      </div>

                      {storyFile && (
                        <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 200 }}>
                          {upStoryBusy ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              <div className="w-32 rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${upStoryProg}%` }} />
                              </div>
                              <p className="text-xs text-white/40">{upStoryProg}%</p>
                            </div>
                          ) : storyFile.type.startsWith("image") ? (
                            <img src={storyPreview} alt="" className="w-full max-h-72 object-cover" />
                          ) : (
                            <video src={storyPreview} className="w-full max-h-72 object-cover" controls muted />
                          )}
                          {!upStoryBusy && (
                            <button onClick={() => { setStoryFile(null); setStoryPreview(""); setStoryUploadResult(null); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: "rgba(0,0,0,0.65)" }}>
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          )}
                          {storyUploadResult && !upStoryBusy && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(52,211,153,0.9)", color: "#000" }}>
                              <CheckCircle2 className="w-3 h-3" /> Yuklandi
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        placeholder="Story sarlavhasi (ixtiyoriy)"
                        value={storyCaption}
                        onChange={e => setStoryCaption(e.target.value)}
                        className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      />

                      {/* ── Interactive Stickers ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">🎯 Interaktiv Stiker — tomoshabinlarni jalb qiling</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id:"qa",        e:"❓", l:"Savol & Javob",    d:"Kuzatuvchilar javob yozadi",     c:"#818cf8" },
                            { id:"slider",    e:"😍", l:"Emoji Slider",     d:"Hissiy darajani baholaydi",      c:"#f472b6" },
                            { id:"quiz",      e:"🧠", l:"Quiz / Test",      d:"Ko'p javobli savol",             c:"#34d399" },
                            { id:"countdown", e:"⏱", l:"Countdown",        d:"Tadbirga qolgan vaqt hisoblagich",c:"#f97316" },
                          ].map(st => (
                            <button key={st.id}
                              onClick={() => setStorySticker(storySticker===st.id ? null : st.id)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                              style={{ background:storySticker===st.id?`${st.c}18`:"rgba(255,255,255,0.04)", border:storySticker===st.id?`1.5px solid ${st.c}66`:"1.5px solid rgba(255,255,255,0.07)" }}>
                              <span className="text-xl leading-none">{st.e}</span>
                              <div>
                                <p className="text-[10px] font-black" style={{ color:storySticker===st.id?st.c:"rgba(255,255,255,0.75)" }}>{st.l}</p>
                                <p className="text-[9px] text-white/30 leading-tight">{st.d}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Story Ring ── */}
                      <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all"
                        style={{ background:storyRing?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.04)", border:storyRing?"1px solid rgba(168,85,247,0.5)":"1px solid rgba(255,255,255,0.06)" }}
                        onClick={() => setStoryRing(p=>!p)}>
                        <span style={{fontSize:22}}>💍</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white/80">Story Ring — zanjir story</p>
                          <p className="text-[10px] text-white/40 mt-0.5">Sizning story'ingiz boshqalar story'si bilan zanjirlanadi — Instagram'da yo'q!</p>
                        </div>
                        <div className="flex items-center px-0.5 rounded-full transition-all"
                          style={{ background:storyRing?"rgba(168,85,247,0.8)":"rgba(255,255,255,0.12)", justifyContent:storyRing?"flex-end":"flex-start", height:22, width:40 }}>
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* ── ⏰ Story Duration ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">⏰ Story davomiyligi</p>
                        <div className="flex gap-2">
                          {[{v:"6h",l:"6 soat"},{v:"12h",l:"12 soat"},{v:"24h",l:"24 soat"},{v:"48h",l:"48 soat"}].map(d => (
                            <button key={d.v} onClick={() => setStoryDuration(d.v)}
                              className="flex-1 py-2 rounded-xl text-[10px] font-black transition-all"
                              style={{ background:storyDuration===d.v?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.05)", border:storyDuration===d.v?"1.5px solid rgba(251,191,36,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:storyDuration===d.v?"#fbbf24":"rgba(255,255,255,0.4)" }}>
                              {d.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── 🔗 Swipe Link ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">🔗 Swipe Up havolasi</p>
                        <div className="flex gap-2 items-center">
                          <input placeholder="https://olcha.uz/..." value={storyLink} onChange={e=>setStoryLink(e.target.value)}
                            className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.25)" }}/>
                          {storyLink && <span className="text-emerald-400 text-lg">✓</span>}
                        </div>
                        <p className="text-[9px] text-white/25 mt-1 px-1">Tomoshabinlar yuqoriga swipalab havola ochadi</p>
                      </div>

                      {/* ── 💬 Reply Mode ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">💬 Kim javob yoza oladi</p>
                        <div className="flex gap-2">
                          {[{v:"all",e:"🌐",l:"Hammasi"},{v:"followers",e:"👥",l:"Obunachi"},{v:"none",e:"🔕",l:"Hech kim"}].map(r => (
                            <button key={r.v} onClick={() => setStoryReplyMode(r.v)}
                              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-all"
                              style={{ background:storyReplyMode===r.v?"rgba(96,165,250,0.2)":"rgba(255,255,255,0.04)", border:storyReplyMode===r.v?"1.5px solid rgba(96,165,250,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:storyReplyMode===r.v?"#93c5fd":"rgba(255,255,255,0.4)" }}>
                              <span className="text-base">{r.e}</span>
                              {r.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── 🎨 Story Vizual Kanvas Muharrir ── */}
                      <div>
                        <button onClick={()=>setStoryCanvasOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:storyCanvasOpen?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.04)", border:storyCanvasOpen?"1px solid rgba(251,191,36,0.4)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🎨</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Story Vizual Muharrir</p>
                              <p className="text-[10px] text-white/35">Rasm, matn, emoji — xohlagan joyga drag qiling</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{storyCanvasOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {storyCanvasOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 overflow-hidden">
                              <DragMediaCanvas layers={storyCanvasLayers} onChange={setStoryCanvasLayers} canvasW={240} canvasH={400}/>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🎨 Story Dizayn Studio ── */}
                      <div>
                        <button onClick={()=>setStoryDesignOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:storyDesignOpen?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.04)", border:storyDesignOpen?"1px solid rgba(167,139,250,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🖌️</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Dizayn Studio</p>
                              <p className="text-[10px] text-white/35">Fon, shrift, rang, chegara, rasm joylash</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{storyDesignOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {storyDesignOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* Background */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">🖼️ Fon turi</p>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                  {[
                                    {id:"none",      bg:"rgba(255,255,255,0.06)", label:"Yo'q"},
                                    {id:"solid",     bg:storyBgColor,              label:"Rang"},
                                    {id:"grad1",     bg:"linear-gradient(135deg,#7c3aed,#ec4899)", label:"🌸 Violet"},
                                    {id:"grad2",     bg:"linear-gradient(135deg,#f59e0b,#ef4444)", label:"🔥 Olov"},
                                    {id:"grad3",     bg:"linear-gradient(135deg,#06b6d4,#6366f1)", label:"🌊 Ko'k"},
                                    {id:"grad4",     bg:"linear-gradient(135deg,#10b981,#059669)", label:"🌿 Yashil"},
                                    {id:"grad5",     bg:"linear-gradient(135deg,#1a1a2e,#16213e)", label:"🌌 Kosmik"},
                                    {id:"grad6",     bg:"linear-gradient(135deg,#ff6b6b,#feca57)", label:"🌅 Quyosh"},
                                    {id:"pattern1",  bg:"repeating-linear-gradient(45deg,rgba(255,255,255,0.05) 0px,rgba(255,255,255,0.05) 2px,transparent 2px,transparent 16px)", label:"▦ Grid"},
                                    {id:"pattern2",  bg:"repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.04) 10px)", label:"● Dots"},
                                    {id:"pattern3",  bg:"repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 20px)", label:"≡ Chiziq"},
                                    {id:"pattern4",  bg:"linear-gradient(135deg,rgba(124,58,237,0.3) 0%,rgba(236,72,153,0.3) 50%,rgba(245,158,11,0.3) 100%)", label:"🌈 Aurora"},
                                  ].map(b=>(
                                    <button key={b.id} onClick={()=>setStoryBg(b.id)}
                                      className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
                                      style={{ background:storyBg===b.id?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.04)", border:storyBg===b.id?"1.5px solid rgba(167,139,250,0.6)":"1.5px solid rgba(255,255,255,0.07)" }}>
                                      <div className="w-8 h-6 rounded" style={{ background:b.bg }}/>
                                      <span className="text-[8px] text-white/50">{b.label}</span>
                                    </button>
                                  ))}
                                </div>
                                {storyBg==="solid" && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-white/40">Rang:</span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {["#1a1a2e","#7c3aed","#dc2626","#d97706","#059669","#0891b2","#db2777","#ffffff","#000000","#1e293b","#831843","#14532d"].map(c=>(
                                        <button key={c} onClick={()=>setStoryBgColor(c)}
                                          className="w-5 h-5 rounded-full border-2 transition-all"
                                          style={{ background:c, borderColor:storyBgColor===c?"white":"transparent" }}/>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Font */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">✍️ Shrift uslubi</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {["Inter","Bebas Neue","Pacifico","Roboto Mono","Dancing Script","Playfair Display","Oswald","Permanent Marker","Comic Neue","Rajdhani"].map(f=>(
                                    <button key={f} onClick={()=>setStoryFont(f)}
                                      className="px-2.5 py-1.5 rounded-lg text-[9px] transition-all"
                                      style={{ fontFamily:f, background:storyFont===f?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:storyFont===f?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyFont===f?"#c4b5fd":"rgba(255,255,255,0.45)" }}>
                                      {f.split(" ")[0]}Aa
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Font size & text color */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-white/40 w-16">Hajm</span>
                                  <input type="range" min={12} max={72} value={storyFontSize} onChange={e=>setStoryFontSize(Number(e.target.value))} className="flex-1" style={{accentColor:"#a78bfa"}}/>
                                  <span className="text-[9px] text-violet-300 w-8 text-right">{storyFontSize}px</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-white/40 w-16">Rang</span>
                                  <div className="flex gap-1.5 flex-wrap flex-1">
                                    {["#ffffff","#000000","#f87171","#fbbf24","#34d399","#60a5fa","#c4b5fd","#f472b6","#fb923c","#22d3ee","#84cc16","#e879f9"].map(c=>(
                                      <button key={c} onClick={()=>setStoryTextColor(c)}
                                        className="w-4 h-4 rounded-full border-2 transition-all"
                                        style={{ background:c, borderColor:storyTextColor===c?"white":"transparent" }}/>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {/* Text styles */}
                              <div className="flex gap-1.5 flex-wrap">
                                {[
                                  {l:"B",s:"font-bold",v:storyTextBold,set:setStoryTextBold,active:"font-black text-white"},
                                  {l:"I",s:"italic",   v:storyTextItalic,set:setStoryTextItalic,active:"italic text-white"},
                                  {l:"💧 Soya",       s:"",v:storyTextShadow,set:setStoryTextShadow,active:""},
                                  {l:"🎨 Fon",        s:"",v:storyTextBg,   set:setStoryTextBg,   active:""},
                                ].map(({l,s,v,set})=>(
                                  <button key={l} onClick={()=>set((p:boolean)=>!p)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${s}`}
                                    style={{ background:v?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.06)", border:v?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.08)", color:v?"#c4b5fd":"rgba(255,255,255,0.45)" }}>
                                    {l}
                                  </button>
                                ))}
                              </div>
                              {/* Text alignment */}
                              <div className="flex gap-1.5">
                                {[{v:"left",e:"◀ Chap"},{v:"center",e:"▐ O'rta"},{v:"right",e:"▶ O'ng"}].map(a=>(
                                  <button key={a.v} onClick={()=>setStoryTextAlign(a.v)}
                                    className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                    style={{ background:storyTextAlign===a.v?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:storyTextAlign===a.v?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyTextAlign===a.v?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                    {a.e}
                                  </button>
                                ))}
                              </div>
                              {/* Border style */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🖼 Chegara uslubi</p>
                                <div className="flex gap-1.5 flex-wrap">
                                  {[{id:"none",l:"Yo'q"},{id:"thin",l:"— Ingichka"},{id:"thick",l:"■ Qalin"},{id:"dashed",l:"- - Uzuq"},{id:"glow_v",l:"✨ Violet yilt."},{id:"glow_g",l:"💚 Yashil yilt."},{id:"neon_r",l:"🔴 Neon qizil"},{id:"rainbow",l:"🌈 Kamalak"}].map(b=>(
                                    <button key={b.id} onClick={()=>setStoryBorder(b.id)}
                                      className="px-2 py-1 rounded-lg text-[8px] font-bold transition-all"
                                      style={{ background:storyBorder===b.id?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:storyBorder===b.id?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyBorder===b.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                      {b.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Layout */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">📐 Collage tartibi</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {[{id:"single",e:"▪"},{id:"v2",e:"◫"},{id:"h2",e:"⬛"},{id:"grid4",e:"▦"},{id:"big_small",e:"◱"}].map(l=>(
                                    <button key={l.id} onClick={()=>setStoryLayout(l.id)}
                                      className="py-2.5 rounded-xl text-sm transition-all"
                                      style={{ background:storyLayout===l.id?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:storyLayout===l.id?"1.5px solid rgba(167,139,250,0.5)":"1.5px solid rgba(255,255,255,0.07)" }}>
                                      {l.e}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* AR filter */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🎭 AR Kamera Filtri</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[{id:"none",e:"🚫",l:"Yo'q"},{id:"beauty",e:"✨",l:"Beauty"},{id:"vintage",e:"📷",l:"Vintage"},{id:"neon_glow",e:"💜",l:"Neon"},{id:"sparkles",e:"🌟",l:"Spora"},{id:"heart",e:"💗",l:"Yurak"},{id:"stars",e:"⭐",l:"Yulduz"},{id:"rainbow",e:"🌈",l:"Kamalak"}].map(f=>(
                                    <button key={f.id} onClick={()=>setStoryArFilter(f.id)}
                                      className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                                      style={{ background:storyArFilter===f.id?"rgba(167,139,250,0.25)":"rgba(255,255,255,0.05)", border:storyArFilter===f.id?"1.5px solid rgba(167,139,250,0.6)":"1.5px solid rgba(255,255,255,0.07)", color:storyArFilter===f.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                                      <span style={{fontSize:16}}>{f.e}</span>{f.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Alt text */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">♿ Maxsus ehtiyojlar uchun matn</p>
                                <input placeholder="Story rasmini tasvirlang…" value={storyAltText} onChange={e=>setStoryAltText(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🏷️ Story Stikerlar ── */}
                      <div>
                        <button onClick={()=>setStoryStickerOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:storyStickerOpen?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.04)", border:storyStickerOpen?"1px solid rgba(52,211,153,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🏷️</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">Interaktiv Stikerlar</p>
                              <p className="text-[10px] text-white/35">So'rovnoma, savol, viktorina, sanash va yana ko'p</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {[storyPoll,storyQa,storyQuiz,storyCountdown,storyEmojiSlider,storyWeather,storyAddYours].filter(Boolean).length > 0 && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-emerald-300" style={{ background:"rgba(52,211,153,0.15)" }}>
                                {[storyPoll,storyQa,storyQuiz,storyCountdown,storyEmojiSlider,storyWeather,storyAddYours].filter(Boolean).length} aktiv
                              </span>
                            )}
                            <span className="text-white/40 text-xs ml-1">{storyStickerOpen?"▲":"▼"}</span>
                          </div>
                        </button>
                        <AnimatePresence>
                          {storyStickerOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* Poll */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">📊 So'rovnoma</p>
                                  <button onClick={()=>setStoryPoll(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyPoll?"#34d399":"rgba(255,255,255,0.12)", justifyContent:storyPoll?"flex-end":"flex-start", height:20, width:34 }}>
                                    <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {storyPoll && (
                                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1.5 overflow-hidden">
                                      <input placeholder="Savol: Qaysi rangni yaxshi ko'rasiz?" value={storyPollQ} onChange={e=>setStoryPollQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.25)" }}/>
                                      <div className="flex gap-1.5">
                                        {storyPollA.map((a,i)=>(
                                          <input key={i} placeholder={i===0?"Ha":"Yo'q"} value={a} onChange={e=>{ const n=[...storyPollA]; n[i]=e.target.value; setStoryPollA(n); }}
                                            className="flex-1 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                            style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.2)" }}/>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Q&A */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">💬 Savol-Javob (Q&A)</p>
                                  <button onClick={()=>setStoryQa(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyQa?"#60a5fa":"rgba(255,255,255,0.12)", justifyContent:storyQa?"flex-end":"flex-start", height:20, width:34 }}>
                                    <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {storyQa && (
                                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                      <input placeholder="Savol yozing: Sizdan nima so'rasam?" value={storyQaQ} onChange={e=>setStoryQaQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.25)" }}/>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Quiz */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">🧠 Viktorina (Quiz)</p>
                                  <button onClick={()=>setStoryQuiz(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyQuiz?"#a78bfa":"rgba(255,255,255,0.12)", justifyContent:storyQuiz?"flex-end":"flex-start", height:20, width:34 }}>
                                    <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {storyQuiz && (
                                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1.5 overflow-hidden">
                                      <input placeholder="Savol: Olcha uchun qaysi javob to'g'ri?" value={storyQuizQ} onChange={e=>setStoryQuizQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}/>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {storyQuizOpts.map((o,i)=>(
                                          <button key={i} onClick={()=>setStoryQuizAns(i)}
                                            className="relative"
                                            style={{}}>
                                            <input value={o} onChange={e=>{ const n=[...storyQuizOpts]; n[i]=e.target.value; setStoryQuizOpts(n); }}
                                              placeholder={`Variant ${i+1}`}
                                              className="w-full rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                              style={{ background:storyQuizAns===i?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.05)", border:storyQuizAns===i?"1.5px solid rgba(52,211,153,0.6)":"1px solid rgba(255,255,255,0.08)" }}/>
                                            {storyQuizAns===i && <span className="absolute right-2 top-1.5 text-[10px] text-emerald-400">✓</span>}
                                          </button>
                                        ))}
                                      </div>
                                      <p className="text-[8px] text-white/25">To'g'ri javobni bosing (yashil — to'g'ri)</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Countdown */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">⏰ Sanash (Countdown)</p>
                                  <button onClick={()=>setStoryCountdown(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyCountdown?"#f59e0b":"rgba(255,255,255,0.12)", justifyContent:storyCountdown?"flex-end":"flex-start", height:20, width:34 }}>
                                    <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {storyCountdown && (
                                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                      <input type="datetime-local" value={storyCountdownDate} onChange={e=>setStoryCountdownDate(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                        style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", colorScheme:"dark" }}/>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Emoji slider */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">😍 Emoji Slider</p>
                                  <button onClick={()=>setStoryEmojiSlider(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyEmojiSlider?"#f472b6":"rgba(255,255,255,0.12)", justifyContent:storyEmojiSlider?"flex-end":"flex-start", height:20, width:34 }}>
                                    <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {storyEmojiSlider && (
                                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                      <input placeholder="Savol: Bugungi kayfiyatim…" value={storyEmojiQ} onChange={e=>setStoryEmojiQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.25)" }}/>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Location & Mention & Product */}
                              <div className="space-y-1.5">
                                <input placeholder="📍 Joylashuv (shahringiz nomi)" value={storyLocationTag} onChange={e=>setStoryLocationTag(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                <input placeholder="@ Do'stni tag qiling" value={storyMention} onChange={e=>setStoryMention(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                <input placeholder="🛍️ Mahsulot tagi (link)" value={storyProduct} onChange={e=>setStoryProduct(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                              </div>
                              {/* Music */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🎵 Musiqa Stikeri</p>
                                <input placeholder="Qo'shiq nomi yoki artist…" value={storyMusic} onChange={e=>setStoryMusic(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none mb-1.5"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                {storyMusic && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-white/40 w-12">Ovoz</span>
                                    <input type="range" min={0} max={100} value={storyMusicVol} onChange={e=>setStoryMusicVol(Number(e.target.value))} className="flex-1" style={{accentColor:"#a78bfa"}}/>
                                    <span className="text-[9px] text-violet-300 w-8 text-right">{storyMusicVol}%</span>
                                  </div>
                                )}
                              </div>
                              {/* GIF */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🎞️ GIF Stikeri</p>
                                <input placeholder="GIF qidirish (masalan: celebrating…)" value={storyGif} onChange={e=>setStoryGif(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                {storyGif && (
                                  <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
                                    {["🎉","🔥","💯","👏","😂","🙌","✨","💪"].map((g,i)=>(
                                      <div key={i} className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer hover:scale-110 transition-transform"
                                        style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)" }}>
                                        {g}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Special stickers */}
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  {l:"🌡️ Ob-havo stikeri",  v:storyWeather,      s:setStoryWeather,     c:"#22d3ee"},
                                  {l:"➕ Add Yours zanjiri", v:storyAddYours,    s:setStoryAddYours,   c:"#34d399"},
                                  {l:"🔁 Auto-tarjima",     v:storyAutoTranslate,s:setStoryAutoTranslate,c:"#60a5fa"},
                                  {l:"💾 Avtomatik arxiv",  v:true,              s:()=>{},             c:"#94a3b8"},
                                ].map(({l,v,s,c})=>(
                                  <button key={l} onClick={()=>s((p:boolean)=>!p)}
                                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[9px] font-bold transition-all"
                                    style={{ background:v?`${c}18`:"rgba(255,255,255,0.04)", border:v?`1px solid ${c}55`:"1px solid rgba(255,255,255,0.07)", color:v?c:"rgba(255,255,255,0.4)" }}>
                                    <div className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{ background:v?c:"rgba(255,255,255,0.12)", justifyContent:v?"flex-end":"flex-start", height:16, width:26 }}>
                                      <div className="w-2.5 h-2.5 rounded-full bg-white"/>
                                    </div>
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── 🔒 Story Maxsus Sozlamalar ── */}
                      <div className="rounded-2xl p-3.5 space-y-2.5" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold text-white/60">🔒 Maxsus Sozlamalar</p>
                        {/* Close Friends */}
                        <button onClick={()=>setStoryCloseFriends(p=>!p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background:storyCloseFriends?"rgba(52,211,153,0.12)":"rgba(255,255,255,0.04)", border:storyCloseFriends?"1px solid rgba(52,211,153,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyCloseFriends?"#34d399":"rgba(255,255,255,0.45)" }}>
                          <span>🟢 Faqat Yaqin Do'stlar</span>
                          <div className="flex items-center px-0.5 rounded-full" style={{ background:storyCloseFriends?"#34d399":"rgba(255,255,255,0.12)", justifyContent:storyCloseFriends?"flex-end":"flex-start", height:20, width:36 }}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                          </div>
                        </button>
                        {/* Vanish mode */}
                        <button onClick={()=>setStoryVanish(p=>!p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background:storyVanish?"rgba(239,68,68,0.12)":"rgba(255,255,255,0.04)", border:storyVanish?"1px solid rgba(239,68,68,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyVanish?"#f87171":"rgba(255,255,255,0.45)" }}>
                          <span>👁️‍🗨️ Vanish — 1 marta ko'rilsa yo'qoladi</span>
                          <div className="flex items-center px-0.5 rounded-full" style={{ background:storyVanish?"#ef4444":"rgba(255,255,255,0.12)", justifyContent:storyVanish?"flex-end":"flex-start", height:20, width:36 }}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                          </div>
                        </button>
                        {/* Highlight */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-white/60">⭐ Story Highlight'ga qo'shish</span>
                            <button onClick={()=>setStoryHighlight(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyHighlight?"#fbbf24":"rgba(255,255,255,0.12)", justifyContent:storyHighlight?"flex-end":"flex-start", height:20, width:34 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <AnimatePresence>
                            {storyHighlight && (
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                <input placeholder="Highlight nomi (masalan: Sayohat 2025)" value={storyHighlightName} onChange={e=>setStoryHighlightName(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)" }}/>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Schedule */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-white/60">📅 Story'ni rejalashtirish</span>
                            <button onClick={()=>setStorySchedule(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storySchedule?"#a78bfa":"rgba(255,255,255,0.12)", justifyContent:storySchedule?"flex-end":"flex-start", height:20, width:34 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <AnimatePresence>
                            {storySchedule && (
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                <input type="datetime-local" value={storyScheduleTime} onChange={e=>setStoryScheduleTime(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                  style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)", colorScheme:"dark" }}/>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!done && (
              <div className="px-5 pb-6 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {/* AI Predict quick button */}
                {tab === "post" && (
                  <button onClick={generatePredict} disabled={predictLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 mb-2.5 rounded-2xl text-xs font-bold transition-all"
                    style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                    {predictLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tahlil qilinmoqda…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> AI Bashorat — qancha like oladi?</>}
                  </button>
                )}
                <div className="flex gap-3">
                  <button onClick={handleClose}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Bekor
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: canSubmit ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.06)",
                      color: canSubmit ? "white" : "rgba(255,255,255,0.25)",
                      boxShadow: canSubmit ? "0 4px 20px rgba(124,58,237,0.35)" : "none",
                    }}>
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda…</>
                      : timeCapsule && scheduledAt
                        ? <><span>⏳</span> Kapsulani saqlash</>
                        : <><Upload className="w-4 h-4" /> E'lon qilish</>
                    }
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
