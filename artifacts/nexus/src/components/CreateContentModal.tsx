import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImagePlus, Video, Music, FileText, Upload, Loader2,
  CheckCircle2, Play, Film, Camera,
  Maximize2, Square, RectangleVertical,
  MessageCircle, Share2, Users, Globe, Ban, Plus, Trash2,
  Sparkles, BarChart2, ChevronDown, ChevronUp,
  Target, Clock, Tag, UserPlus, Heart, Shield, Repeat2, MapPin,
  Tv, Trophy, Scissors, LayoutTemplate, Award, Zap, Star, Flame,
} from "lucide-react";
import MediaEditor, { type TextOverlay, TRENDING_CHALLENGES } from "@/components/MediaEditor";
import DragMediaCanvas, { type CanvasLayer } from "@/components/DragMediaCanvas";
import {
  useCreatePost, useCreateReel, useCreateStory,
  getListPostsQueryKey, getListReelsQueryKey, getListStoriesQueryKey,
  useOtubeAiTitle, useOtubeAiDescription, useOtubeAiTags, useOtubeAiHashtags,
  useOtubeAiHooks, useOtubeAiDirectorTips, useOtubeAiBestTime, useOtubeAiVoiceCaption,
  useTranslateText,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { getFeaturePref } from "@/lib/sounds";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type TabType = "post" | "reel" | "story" | "otube" | "challenge";
type Permission = "everyone" | "followers" | "friends" | "none";
type Visibility = "everyone" | "followers" | "friends" | "only_me";
type DisplayFormat = "cover" | "contain" | "square";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: TabType;
  singleTab?: boolean;
}

const ACCEPT = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  video: "video/mp4,video/webm,video/mov,video/avi",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac",
};

/* ─── Permission Picker ─── */
const PERM_OPTIONS: { value: Permission; icon: React.ElementType; labelKey: string; color: string }[] = [
  { value: "everyone",  icon: Globe,          labelKey: "perm_everyone",  color: "#34d399" },
  { value: "followers", icon: Users,          labelKey: "perm_followers", color: "#60a5fa" },
  { value: "friends",   icon: Users,          labelKey: "perm_friends",   color: "#f59e0b" },
  { value: "none",      icon: Ban,            labelKey: "perm_none",      color: "#f87171" },
];

const VIS_OPTIONS: { value: Visibility; emoji: string; labelKey: string; descKey: string }[] = [
  { value: "everyone",  emoji: "🌍", labelKey: "vis_everyone",  descKey: "vis_everyone_desc" },
  { value: "followers", emoji: "👥", labelKey: "vis_followers", descKey: "vis_followers_desc" },
  { value: "friends",   emoji: "🤝", labelKey: "vis_friends",   descKey: "vis_friends_desc" },
  { value: "only_me",   emoji: "🔒", labelKey: "vis_only_me",   descKey: "vis_only_me_desc" },
];

const CONTENT_LABELS = [
  { id:"entertainment", emoji:"🎭", labelKey:"label_entertainment" },
  { id:"education",     emoji:"📚", labelKey:"label_education" },
  { id:"comedy",        emoji:"😂", labelKey:"label_comedy" },
  { id:"dance",         emoji:"💃", labelKey:"label_dance" },
  { id:"music",         emoji:"🎵", labelKey:"label_music" },
  { id:"sports",        emoji:"⚽", labelKey:"label_sports" },
  { id:"food",          emoji:"🍔", labelKey:"label_food" },
  { id:"travel",        emoji:"✈️", labelKey:"label_travel" },
  { id:"fashion",       emoji:"👗", labelKey:"label_fashion" },
  { id:"tech",          emoji:"💻", labelKey:"label_tech" },
  { id:"art",           emoji:"🎨", labelKey:"label_art" },
  { id:"gaming",        emoji:"🎮", labelKey:"label_gaming" },
];

function PermPicker({
  label, icon: Icon, value, onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: Permission;
  onChange: (v: Permission) => void;
}) {
  const { t } = useTranslation();
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
              {t(`create.${opt.labelKey}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Display Format Picker ─── */
const FORMAT_OPTIONS: { value: DisplayFormat; icon: React.ElementType; labelKey: string; aspect: string }[] = [
  { value: "cover",   icon: Maximize2,           labelKey: "format_cover",   aspect: "9:16" },
  { value: "square",  icon: Square,              labelKey: "format_square",  aspect: "1:1"  },
  { value: "contain", icon: RectangleVertical,   labelKey: "format_contain", aspect: "auto" },
];

function FormatPicker({ value, onChange }: { value: DisplayFormat; onChange: (v: DisplayFormat) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <span className="text-xs font-semibold text-muted-foreground block mb-2">{t("create.format_picker_title")}</span>
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
              {t(`create.${opt.labelKey}`)}
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
            <span className="text-white text-sm ml-2">{"O'zgartirish"}</span>
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
            <p className="text-xs text-muted-foreground mt-0.5">{"Bosing yoki tashlang"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN MODAL ─── */
export default function CreateContentModal({ open, onClose, defaultTab = "post", singleTab = false }: Props) {
  const { user }     = useAuth();
  const qc           = useQueryClient();
  const createPost   = useCreatePost();
  const createReel   = useCreateReel();
  const createStory  = useCreateStory();

  const [tab,  setTab]  = useState<TabType>(defaultTab);
  const [done, setDone] = useState(false);

  /* sync tab when modal re-opens with a different defaultTab */
  useEffect(() => {
    if (open) { setTab(defaultTab); setDone(false); }
  }, [open, defaultTab]);

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
  const [postAudioTrimStart, setPostAudioTrimStart] = useState<number|undefined>(undefined);
  const [postAudioTrimEnd,   setPostAudioTrimEnd]   = useState<number|undefined>(undefined);
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
  const [midnightOnly, setMidnightOnly] = useState(false);
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
  const toggleGeoBloom = () => {
    setGeoBloomEnabled(p => {
      if (!p && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          (window as any).__userGeoLat = pos.coords.latitude;
          (window as any).__userGeoLng = pos.coords.longitude;
        });
      }
      return !p;
    });
  };
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
  const [storyPollA,          setStoryPollA]          = useState(["Ha", "Yo'q"]);
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

  /* ══ OTUBE STATE (50+) ══ */
  const [otubeFile,           setOtubeFile]           = useState<File|null>(null);
  const [otubePreview,        setOtubePreview]        = useState("");
  const [otubeOrientation,    setOtubeOrientation]    = useState<"9:16"|"16:9"|"1:1">("9:16");
  const [otubeTitle,          setOtubeTitle]          = useState("");
  const [otubeDesc,           setOtubeDesc]           = useState("");
  const [otubeTags,           setOtubeTags]           = useState<string[]>([]);
  const [otubeTagInput,       setOtubeTagInput]       = useState("");
  const [otubeCategory,       setOtubeCategory]       = useState("");
  const [otubeVisibility,     setOtubeVisibility]     = useState("public");
  const [otubeThumbnail,      setOtubeThumbnail]      = useState("");
  const [otubeThumbnailFile,  setOtubeThumbnailFile]  = useState<File|null>(null);
  const [otubePlaylist,       setOtubePlaylist]       = useState("");
  const [otubeLanguage,       setOtubeLanguage]       = useState("uz");
  const [otubeRecordDate,     setOtubeRecordDate]     = useState("");
  const [otubeLocation,       setOtubeLocation]       = useState("");
  const [otubeLicense,        setOtubeLicense]        = useState("standard");
  const [otubeAgeGate,        setOtubeAgeGate]        = useState(false);
  const [otubeKids,           setOtubeKids]           = useState(false);
  const [otubePaidPromo,      setOtubePaidPromo]      = useState(false);
  const [otubeSynthetic,      setOtubeSynthetic]      = useState(false);
  const [otubeNotifySubs,     setOtubeNotifySubs]     = useState(true);
  const [otubePremiere,       setOtubePremiere]       = useState(false);
  const [otubePremiereTime,   setOtubePremiereTime]   = useState("");
  const [otubeScheduled,      setOtubeScheduled]      = useState(false);
  const [otubeScheduleTime,   setOtubeScheduleTime]   = useState("");
  const [otubeCommentMode,    setOtubeCommentMode]    = useState("all");
  const [otubeAllowEmbed,     setOtubeAllowEmbed]     = useState(true);
  const [otubeAllowDownload,  setOtubeAllowDownload]  = useState(false);
  const [otubeHideLikes,      setOtubeHideLikes]      = useState(false);
  const [otubeHideViews,      setOtubeHideViews]      = useState(false);
  const [otubeChapters,       setOtubeChapters]       = useState<{ts:string;title:string}[]>([]);
  const [otubeChapTs,         setOtubeChapTs]         = useState("");
  const [otubeChapTitle,      setOtubeChapTitle]      = useState("");
  const [otubeEndCard,        setOtubeEndCard]        = useState(false);
  const [otubeCards,          setOtubeCards]          = useState<{type:string;text:string}[]>([]);
  const [otubeCardType,       setOtubeCardType]       = useState("video");
  const [otubeCardText,       setOtubeCardText]       = useState("");
  const [otubeMonetize,       setOtubeMonetize]       = useState(false);
  const [otubeMonetizeType,   setOtubeMonetizeType]   = useState("ads");
  const [otubeMembersOnly,    setOtubeMembersOnly]    = useState(false);
  const [otubeSuperThanks,    setOtubeSuperThanks]    = useState(true);
  const [otubeSubtitles,      setOtubeSubtitles]      = useState<{lang:string;file?:File}[]>([]);
  const [otubeSubLang,        setOtubeSubLang]        = useState("uz");
  const [otubePinComment,     setOtubePinComment]     = useState("");
  const [otubeFirstComment,   setOtubeFirstComment]   = useState("");
  const [otubeIs360,          setOtubeIs360]          = useState(false);
  const [otubeIsHdr,          setOtubeIsHdr]          = useState(false);
  const [otubeIs4k,           setOtubeIs4k]           = useState(false);
  const [otubeStabilize,      setOtubeStabilize]      = useState(false);
  const [otubeAutoEnhance,    setOtubeAutoEnhance]    = useState(false);
  const [otubeMerchandise,    setOtubeMerchandise]    = useState(false);
  const [otubeAiTitle,        setOtubeAiTitle]        = useState<string[]>([]);
  const [otubeAiTitleLoad,    setOtubeAiTitleLoad]    = useState(false);
  const [otubeAiDesc,         setOtubeAiDesc]         = useState("");
  const [otubeAiDescLoad,     setOtubeAiDescLoad]     = useState(false);
  const [otubeAiTags,         setOtubeAiTags]         = useState<string[]>([]);
  const [otubeAiTagsLoad,     setOtubeAiTagsLoad]     = useState(false);
  const [otubeSeoScore,       setOtubeSeoScore]       = useState(0);
  const [otubeEstRevenue,     setOtubeEstRevenue]     = useState("");
  const [otubeSection,        setOtubeSection]        = useState<"basic"|"video"|"seo"|"monetize"|"advanced">("basic");
  const [otubeCanvasLayers,   setOtubeCanvasLayers]   = useState<CanvasLayer[]>([]);

  /* ══ CHALLENGE MEGA STATE (50+) ══ */
  const [chalName,            setChalName]            = useState("");
  const [chalDesc,            setChalDesc]            = useState("");
  const [chalHashtag,         setChalHashtag]         = useState("#");
  const [chalCategory,        setChalCategory]        = useState("");
  const [chalStartDate,       setChalStartDate]       = useState("");
  const [chalEndDate,         setChalEndDate]         = useState("");
  const [chalContentType,     setChalContentType]     = useState("video");
  const [chalMinLength,       setChalMinLength]       = useState(15);
  const [chalMaxLength,       setChalMaxLength]       = useState(60);
  const [chalPrize1,          setChalPrize1]          = useState("");
  const [chalPrize2,          setChalPrize2]          = useState("");
  const [chalPrize3,          setChalPrize3]          = useState("");
  const [chalPrizePool,       setChalPrizePool]       = useState("");
  const [chalEntryFee,        setChalEntryFee]        = useState("free");
  const [chalEntryPrice,      setChalEntryPrice]      = useState("0");
  const [chalMaxEntries,      setChalMaxEntries]      = useState(1);
  const [chalMinFollowers,    setChalMinFollowers]    = useState(0);
  const [chalMinLikes,        setChalMinLikes]        = useState(0);
  const [chalAgeMin,          setChalAgeMin]          = useState(0);
  const [chalVerifReq,        setChalVerifReq]        = useState(false);
  const [chalTeamAllowed,     setChalTeamAllowed]     = useState(false);
  const [chalTeamSize,        setChalTeamSize]        = useState(2);
  const [chalDuetReq,         setChalDuetReq]         = useState(false);
  const [chalCollabReq,       setChalCollabReq]       = useState(false);
  const [chalReactionReq,     setChalReactionReq]     = useState(false);
  const [chalCommentReq,      setChalCommentReq]      = useState(false);
  const [chalThemeMusic,      setChalThemeMusic]      = useState("");
  const [chalMusicRequired,   setChalMusicRequired]   = useState(false);
  const [chalVotingType,      setChalVotingType]      = useState("community");
  const [chalJudges,          setChalJudges]          = useState<string[]>([]);
  const [chalJudgeInput,      setChalJudgeInput]      = useState("");
  const [chalLeaderboard,     setChalLeaderboard]     = useState(true);
  const [chalReviewMode,      setChalReviewMode]      = useState("auto");
  const [chalGeoRestrict,     setChalGeoRestrict]     = useState<string[]>([]);
  const [chalFeatured,        setChalFeatured]        = useState(false);
  const [chalSponsor,         setChalSponsor]         = useState("");
  const [chalSponsorUrl,      setChalSponsorUrl]      = useState("");
  const [chalRules,           setChalRules]           = useState<string[]>(["","",""]);
  const [chalBadge,           setChalBadge]           = useState("gold");
  const [chalCertType,        setChalCertType]        = useState("digital");
  const [chalAnnVideo,        setChalAnnVideo]        = useState("");
  const [chalDemoVideo,       setChalDemoVideo]       = useState("");
  const [chalWelcomeMsg,      setChalWelcomeMsg]      = useState("");
  const [chalCompleteMsg,     setChalCompleteMsg]     = useState("");
  const [chalNotifReminder,   setChalNotifReminder]   = useState(true);
  const [chalReminderDays,    setChalReminderDays]    = useState(1);
  const [chalReentry,         setChalReentry]         = useState(false);
  const [chalDiscord,         setChalDiscord]         = useState("");
  const [chalShareTemplate,   setChalShareTemplate]   = useState("");
  const [chalWinnerDelay,     setChalWinnerDelay]     = useState(24);
  const [chalSection,         setChalSection]         = useState<"setup"|"rules"|"prizes"|"advanced">("setup");
  const [chalMyTag,           setChalMyTag]           = useState("");

  /* OTube AI helpers — real OpenAI-backed endpoints (otubeAi.ts) */
  const otubeAiTitleMut = useOtubeAiTitle();
  const otubeAiDescMut = useOtubeAiDescription();
  const otubeAiTagsMut = useOtubeAiTags();
  const bestTimeMut = useOtubeAiBestTime();
  const aiDirectorMut = useOtubeAiDirectorTips();
  const translateMut = useTranslateText();
  const hashtagStormMut = useOtubeAiHashtags();
  const reelHooksMut = useOtubeAiHooks();
  const voiceCaptionMut = useOtubeAiVoiceCaption();

  const runOtubeAiTitle = async () => {
    if (!otubeTitle.trim() && !otubeDesc.trim()) return;
    setOtubeAiTitleLoad(true);
    try {
      const res = await otubeAiTitleMut.mutateAsync({
        data: {
          caption: [otubeTitle, otubeDesc].filter(Boolean).join(" — "),
          category: otubeCategory || undefined,
          tags: otubeTags.length ? otubeTags : undefined,
        },
      });
      setOtubeAiTitle(res.titles.slice(0, 3));
      const score = Math.min(95, 40 + (otubeTitle.length > 5 ? 20 : 0) + (otubeTags.length > 3 ? 15 : 0) + (otubeDesc.length > 50 ? 20 : 0));
      setOtubeSeoScore(score);
    } catch {
      setOtubeAiTitle([]);
    } finally {
      setOtubeAiTitleLoad(false);
    }
  };
  const runOtubeAiDesc = async () => {
    setOtubeAiDescLoad(true);
    try {
      const res = await otubeAiDescMut.mutateAsync({
        data: { caption: otubeTitle || undefined, category: otubeCategory || undefined, tags: otubeTags.length ? otubeTags : undefined },
      });
      setOtubeAiDesc(res.description);
    } catch {
      setOtubeAiDesc("");
    } finally {
      setOtubeAiDescLoad(false);
    }
  };
  const runOtubeAiTags = async () => {
    setOtubeAiTagsLoad(true);
    try {
      const res = await otubeAiTagsMut.mutateAsync({
        data: { caption: [otubeTitle, otubeDesc].filter(Boolean).join(" — "), category: otubeCategory || undefined },
      });
      setOtubeAiTags(res.tags);
    } catch {
      setOtubeAiTags([]);
    } finally {
      setOtubeAiTagsLoad(false);
    }
  };

  const fetchBestTime = async () => {
    setBestTimeLoading(true); setBestTimeOpen(true);
    try {
      const res = await bestTimeMut.mutateAsync({ data: {} });
      setBestTime({ time: res.time, reason: res.reason });
    } catch {
      setBestTime(null);
    } finally {
      setBestTimeLoading(false);
    }
  };

  /* ── AI Director — real director-tips endpoint ── */
  const runAiDirector = async () => {
    setAiDirectorLoading(true); setAiDirectorOpen(true);
    try {
      const res = await aiDirectorMut.mutateAsync({
        data: { caption: postContent || otubeTitle || undefined, category: otubeCategory || undefined },
      });
      setAiDirectorTips(res.tips);
    } catch {
      setAiDirectorTips([]);
    } finally {
      setAiDirectorLoading(false);
    }
  };

  /* ── Multi-Language Blast — real /api/translate per language ── */
  const runTranslate = async () => {
    if (!selectedLangs.length || !postContent.trim()) return;
    setTranslating(true);
    try {
      const entries = await Promise.all(selectedLangs.map(async (lang) => {
        const res = await translateMut.mutateAsync({ data: { text: postContent, targetLang: lang } });
        return [lang, res.translation] as const;
      }));
      setTranslations(Object.fromEntries(entries));
    } catch {
      setTranslations({});
    } finally {
      setTranslating(false);
    }
  };

  /* ── Hashtag Storm — real hashtags endpoint ── */
  const runHashtagStorm = async () => {
    setHashtagStormLoading(true); setHashtagStormOpen(true);
    try {
      const res = await hashtagStormMut.mutateAsync({ data: { caption: postContent || undefined } });
      setHashtagSuggestions(res.hashtags);
    } catch {
      setHashtagSuggestions([]);
    } finally {
      setHashtagStormLoading(false);
    }
  };

  /* ── Reel AI Hook Generator — real hooks endpoint ── */
  const runReelHooks = async () => {
    setReelHookLoading(true); setReelHookOpen(true);
    try {
      const res = await reelHooksMut.mutateAsync({ data: { caption: reelCaption || undefined } });
      setReelHooks(res.hooks);
    } catch {
      setReelHooks([]);
    } finally {
      setReelHookLoading(false);
    }
  };

  /* ── Voice Caption — real mic recording (MediaRecorder) + Whisper transcription ── */
  const runVoiceCaption = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
      setVoiceCapRecording(true);
      recorder.start();
      await new Promise(r => setTimeout(r, 4000));
      recorder.stop();
      await stopped;
      setVoiceCapRecording(false);
      setVoiceCapTranscribing(true);
      const blob = new Blob(chunks, { type: "audio/webm" });
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await voiceCaptionMut.mutateAsync({ data: { audioBase64 } });
      if (res.text) setPostContent(prev => prev ? `${prev} ${res.text}` : res.text);
    } catch {
      /* mic permission denied or transcription failed — leave content untouched */
    } finally {
      stream?.getTracks().forEach(t => t.stop());
      setVoiceCapRecording(false);
      setVoiceCapTranscribing(false);
    }
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

  const handleEditorDone = (overlays: TextOverlay[], audioName: string, filterName: string, audioUrl?: string, trimStart?: number, trimEnd?: number) => {
    setPostOverlays(overlays);
    setPostAudioName(audioName);
    setPostAudioUrl(audioUrl && !audioUrl.startsWith("blob:") ? audioUrl : "");
    setPostAudioTrimStart(trimStart);
    setPostAudioTrimEnd(trimEnd);
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
        body: JSON.stringify({ mood, mediaType, hasPoll: pollEnabled, hotTake }),
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
  const [emotionCheck, setEmotionCheck] = useState<{ postId: number } | null>(null);
  const [emotionBusy, setEmotionBusy] = useState(false);

  const { uploadFile: upReel,      isUploading: upReelBusy,      progress: upReelProg }      = useMediaUpload({ onSuccess: r => setReelUploadResult(r) });
  const { uploadFile: upReelAudio, isUploading: upReelAudioBusy, progress: upReelAudioProg } = useMediaUpload({ onSuccess: r => setReelAudioUploadResult(r) });
  const { uploadFile: upStory,     isUploading: upStoryBusy,     progress: upStoryProg }     = useMediaUpload({ onSuccess: r => setStoryUploadResult(r) });
  const [otubeUploadResult, setOtubeUploadResult] = useState<{ serveUrl: string } | null>(null);
  const [otubeUploadProg,   setOtubeUploadProg]   = useState(0);
  const { uploadFile: upOtube, isUploading: upOtubeBusy, progress: upOtubeProg } = useMediaUpload({ onSuccess: r => { setOtubeUploadResult(r); setOtubeUploadProg(100); } });

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
        const postRes = await fetch(`${API}/api/posts`, {
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
            audioTrimStart: postAudioTrimStart,
            audioTrimEnd: postAudioTrimEnd,
            filterName: postFilterName !== "none" ? postFilterName : undefined,
            mood: mood || undefined,
            pollQuestion: pollEnabled && pollQuestion.trim() ? pollQuestion.trim() : undefined,
            pollOptions: pollEnabled && pollOptions.filter(o => o.trim()).length >= 2
              ? JSON.stringify(pollOptions.filter(o => o.trim()))
              : undefined,
            hotTake: hotTake || undefined,
            scheduledAt: timeCapsule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            midnightOnly: getFeaturePref("midnight_confess", false) && midnightOnly ? true : undefined,
            tags: metaTags,
            // ── 6 haqiqiy funksiyalar ──
            destructAt: selfDestruct ? (() => {
              const map: Record<string, number> = { "1h": 1, "6h": 6, "24h": 24, "48h": 48, "72h": 72, "7d": 168, "30d": 720 };
              const h = map[selfDestructTime] ?? 24;
              return new Date(Date.now() + h * 3600 * 1000).toISOString();
            })() : undefined,
            geoLat: geoBloomEnabled ? (window as any).__userGeoLat ?? undefined : undefined,
            geoLng: geoBloomEnabled ? (window as any).__userGeoLng ?? undefined : undefined,
            geoRadiusKm: geoBloomEnabled ? geoBloomRadius : undefined,
            liveMoodEnabled: sentimentMeter || undefined,
            seriesName: seriesEnabled && seriesTitle.trim() ? seriesTitle.trim() : undefined,
            seriesOrder: seriesEnabled ? seriesEpisode : undefined,
            collabCanvasEnabled: collabCanvas || undefined,
            collabCanvasId: collabCanvas ? (Math.random().toString(36).slice(2) + Date.now().toString(36)) : undefined,
          }),
        });
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });

        const createdPost = await postRes.json().catch(() => null);
        if (getFeaturePref("emotion_radar", true) && createdPost?.id && postContent.trim().length > 3) {
          setEmotionBusy(true);
          try {
            const analysisRes = await fetch(`${API}/api/ai/analyze-content`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contentId: createdPost.id, contentType: "post", caption: postContent }),
            });
            const analysis = await analysisRes.json().catch(() => null);
            if (analysis?.sentiment === "negative") {
              setEmotionBusy(false);
              setSubmitting(false);
              setEmotionCheck({ postId: createdPost.id });
              return;
            }
          } catch { /* AI check optional, fall through to normal success */ }
          setEmotionBusy(false);
        }
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
      } else if (tab === "otube") {
        if (!otubeUploadResult) return;
        await createReel.mutateAsync({
          data: {
            authorId: user.id,
            videoUrl: otubeUploadResult.serveUrl,
            caption: [otubeTitle, otubeDesc].filter(Boolean).join("\n\n"),
          },
        });
        qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      } else if (tab === "challenge") {
        const challengeMeta = JSON.stringify({
          hashtag: chalHashtag,
          category: chalCategory,
          startDate: chalStartDate,
          endDate: chalEndDate,
          prize1: chalPrize1,
          prize2: chalPrize2,
          prize3: chalPrize3,
        });
        await fetch(`${API}/api/posts`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorId: user.id,
            content: `${chalName}\n\n${chalDesc || ""}\n\n${chalHashtag}`,
            type: "text",
            tags: ["_type:challenge", `_meta:${challengeMeta}`],
          }),
        });
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      }
      setDone(true);
      setTimeout(() => handleClose(), 1500);
    } catch { /* handled by mutation */ } finally {
      setSubmitting(false);
    }
  };

  const handleEmotionKeep = () => {
    setEmotionCheck(null);
    setDone(true);
    setTimeout(() => handleClose(), 1500);
  };
  const handleEmotionDelete = async () => {
    if (!emotionCheck) return;
    setEmotionBusy(true);
    try {
      await fetch(`${API}/api/posts/${emotionCheck.postId}`, { method: "DELETE", credentials: "include" });
      qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
    } catch { /* ignore */ } finally {
      setEmotionBusy(false);
      setEmotionCheck(null);
      handleClose();
    }
  };

  const handleClose = () => {
    setEmotionCheck(null); setEmotionBusy(false);
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
    setOtubeFile(null); setOtubePreview(""); setOtubeTitle(""); setOtubeDesc(""); setOtubeTags([]); setOtubeTagInput("");
    setOtubeUploadResult(null); setOtubeUploadProg(0);
    setOtubeCategory(""); setOtubeVisibility("public"); setOtubeThumbnail(""); setOtubeThumbnailFile(null);
    setOtubeChapters([]); setOtubeCards([]); setOtubeAiTitle([]); setOtubeAiDesc(""); setOtubeAiTags([]);
    setOtubeSeoScore(0); setOtubeEstRevenue(""); setOtubeSection("basic"); setOtubeCanvasLayers([]);
    setChalName(""); setChalDesc(""); setChalHashtag("#"); setChalCategory(""); setChalStartDate(""); setChalEndDate("");
    setChalPrize1(""); setChalPrize2(""); setChalPrize3(""); setChalPrizePool(""); setChalJudges([]);
    setChalRules(["","",""]); setChalSection("setup"); setChalMyTag(""); setChalSponsor(""); setChalSponsorUrl("");
    setDone(false); setSubmitting(false);
    onClose();
  };

  const queueUploading = mediaQueue.some(m => m.status === "uploading" || m.status === "idle");
  const queueAllDone   = mediaQueue.length === 0 || mediaQueue.every(m => m.status === "done");

  const canSubmit = !submitting && !upReelBusy && !upStoryBusy && !upReelAudioBusy && !upOtubeBusy && (
    (tab === "post" && queueAllDone && (postContent.trim() || mediaQueue.some(m => m.status === "done"))) ||
    (tab === "reel" && !!reelUploadResult && reelCaption.trim()) ||
    (tab === "story" && !!storyUploadResult) ||
    (tab === "otube" && !!otubeUploadResult && otubeTitle.trim().length > 0) ||
    (tab === "challenge" && chalName.trim().length > 0 && chalHashtag.trim().length > 1)
  );

  const { t } = useTranslation();
  const TABS: { id: TabType; icon: React.ElementType; label: string; grad: string; glow: string; accent: string }[] = [
    { id: "post",      icon: ImagePlus, label: t("create.tab_post"),      grad: "linear-gradient(135deg,#7c3aed,#a78bfa)", glow: "rgba(124,58,237,0.45)", accent: "#a78bfa" },
    { id: "reel",      icon: Film,      label: t("create.tab_reel"),      grad: "linear-gradient(135deg,#dc2626,#f87171)", glow: "rgba(239,68,68,0.45)",  accent: "#f87171" },
    { id: "story",     icon: Camera,    label: t("create.tab_story"),     grad: "linear-gradient(135deg,#d97706,#fbbf24)", glow: "rgba(251,191,36,0.45)", accent: "#fbbf24" },
    { id: "otube",     icon: Tv,        label: t("create.tab_otube"),     grad: "linear-gradient(135deg,#059669,#34d399)", glow: "rgba(52,211,153,0.45)", accent: "#34d399" },
    { id: "challenge", icon: Trophy,    label: t("create.tab_challenge"), grad: "linear-gradient(135deg,#b45309,#fb923c)", glow: "rgba(251,146,60,0.45)", accent: "#fb923c" },
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
          className="fixed inset-0 z-[9996] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm"
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
                <h2 className="font-bold text-base text-white">
                  {singleTab
                    ? (TABS.find(tb => tb.id === tab)?.label ?? t("create.modal_title")) + " " + t("common.create", "yaratish")
                    : t("create.modal_title")}
                </h2>
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

            {/* ── Dramatic Tab Bar — hidden in singleTab mode ── */}
            {!singleTab && (
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
            )}

            <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">

              {/* ─── SUCCESS ─── */}
              {done && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-10">
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.4 }}>
                    <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                  </motion.div>
                  <p className="text-base font-bold text-white">{t("create.success")}</p>
                </motion.div>
              )}

              {/* ─── EMOTION RADAR WARNING ─── */}
              {emotionCheck && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-8 px-2 text-center">
                  <span style={{ fontSize: 40 }}>🫧</span>
                  <p className="text-base font-bold text-white">{t("create.emotion_warn_title")}</p>
                  <p className="text-xs text-white/60">{t("create.emotion_warn_desc")}</p>
                  <div className="flex gap-2 w-full mt-2">
                    <button onClick={handleEmotionDelete} disabled={emotionBusy}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-red-300 disabled:opacity-50"
                      style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)" }}>
                      {t("create.emotion_delete")}
                    </button>
                    <button onClick={handleEmotionKeep} disabled={emotionBusy}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "rgba(124,58,237,0.9)" }}>
                      {t("create.emotion_keep")}
                    </button>
                  </div>
                </motion.div>
              )}

              {emotionBusy && !emotionCheck && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-8">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  <p className="text-xs text-white/50">{t("create.emotion_checking")}</p>
                </motion.div>
              )}

              {!done && !emotionCheck && !emotionBusy && (
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
                              <p className="text-[10px] text-white/35">{t("create.post_drag_hint", "Rasm/Video/Matn/Emoji — xohlagan joyga surib qo'ying")}</p>
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
                              {mediaQueue.length === 0 ? t("create.dropzone_add") : `${t("create.dropzone_add_more")} (${mediaQueue.length}/10)`}
                            </p>
                            <p className="text-xs text-white/35 mt-0.5">{t("create.dropzone_multi_hint")}</p>
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
                                    <span className="text-[10px] font-bold text-white">{t("create.thumb_error")}</span>
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
                                  {mediaQueue.filter(m => m.status === "done").length}/{mediaQueue.length} {t("create.uploaded_count_suffix")}
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
                            placeholder={mediaQueue.length > 0 ? t("create.caption_ph_media") : t("create.caption_ph_empty")}
                            rows={3}
                            value={postContent}
                            onChange={e => setPostContent(e.target.value)}
                            className="w-full resize-none rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                          />
                          <button
                            onClick={generateAiCaption}
                            disabled={aiCaptionLoading}
                            title={t("create.ai_caption_title")}
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
                        <p className="text-xs font-bold text-white/50">{t("create.mood_label")}</p>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { emoji: "🔥", label: t("create.story_react_best"),  color: "#f97316" },
                            { emoji: "😂", label: t("create.mood_funny"),         color: "#facc15" },
                            { emoji: "😍", label: t("create.mood_amazing"),       color: "#f472b6" },
                            { emoji: "💭", label: t("create.mood_thought"),       color: "#818cf8" },
                            { emoji: "💪", label: t("create.mood_strength"),      color: "#22d3ee" },
                            { emoji: "😢", label: t("create.mood_sad"),           color: "#60a5fa" },
                            { emoji: "🤩", label: t("create.mood_wow"),           color: "#fbbf24" },
                            { emoji: "🌙", label: t("create.mood_night"),         color: "#a78bfa" },
                            { emoji: "😤", label: t("create.mood_angry"),         color: "#f87171" },
                            { emoji: "🫶", label: t("create.mood_love"),          color: "#fb7185" },
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
                            <span className="text-xs font-bold text-white/70">{t("create.add_poll", "So'rovnoma qo'shish")}</span>
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
                                  placeholder={t("create.poll_question_ph", "Savol matni…")}
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
                          <p className="text-[10px] text-white/40 mt-0.5">{t("create.poll_exclusive_hint", "Jamoat 🔥/❄️ ovoz beradi. Instagramda yoki TikTokda yo'q!")}</p>
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

                      {/* ── Midnight Confession ── */}
                      {getFeaturePref("midnight_confess", false) && (
                        <div
                          className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all"
                          style={{
                            background: midnightOnly ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                            border: midnightOnly ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.06)",
                          }}
                          onClick={() => setMidnightOnly(p => !p)}
                        >
                          <span style={{ fontSize: 22 }}>🌙</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-white/80">{t("featurehub.feat_midnight_confess_title")}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{t("featurehub.midnight_compose_hint")}</p>
                          </div>
                          <div className="w-9 h-5 rounded-full flex items-center transition-all"
                            style={{
                              background: midnightOnly ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.12)",
                              justifyContent: midnightOnly ? "flex-end" : "flex-start",
                              padding: "2px",
                            }}>
                            <div className="w-4 h-4 rounded-full bg-white" />
                          </div>
                        </div>
                      )}

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
                              <span className="text-xs font-bold text-indigo-300">{t("create.predict_short_title")}</span>
                              <button onClick={() => setPredictOpen(false)}><X className="w-3.5 h-3.5 text-white/40" /></button>
                            </div>
                            {predictLoading ? (
                              <div className="flex justify-center pb-4"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                            ) : prediction && (
                              <div className="px-3.5 pb-3.5 grid grid-cols-4 gap-2">
                                {[
                                  { icon:"❤️", label:t("create.predict_likes"),       val: prediction.likes >= 1000 ? `${(prediction.likes/1000).toFixed(1)}K` : prediction.likes },
                                  { icon:"💬", label:t("create.predict_comments"),    val: prediction.comments },
                                  { icon:"🔁", label:t("create.predict_shares"),      val: prediction.shares },
                                  { icon:"👁", label:t("create.chal_stats_views"),    val: prediction.reach >= 1000 ? `${(prediction.reach/1000).toFixed(1)}K` : prediction.reach },
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
                              <p className="text-xs font-bold text-white/80">{t("create.privacy_perms_title")}</p>
                              <p className="text-[10px] text-white/40">{VIS_OPTIONS.find(v=>v.value===visibility)?.emoji} {t(`create.${VIS_OPTIONS.find(v=>v.value===visibility)?.labelKey}`)} · {t("create.privacy_perms_hint_suffix")}</p>
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
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.who_can_see")}</p>
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
                                          <p className="text-[11px] font-bold text-white/85">{t(`create.${v.labelKey}`)}</p>
                                          <p className="text-[9px] text-white/35">{t(`create.${v.descKey}`)}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Content label */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.content_type_title")}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {CONTENT_LABELS.map(cl => (
                                      <button key={cl.id} onClick={() => setContentLabel(contentLabel===cl.id ? "" : cl.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                        style={{
                                          background: contentLabel===cl.id ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.06)",
                                          border: contentLabel===cl.id ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                                          color: contentLabel===cl.id ? "#d8b4fe" : "rgba(255,255,255,0.5)",
                                        }}>
                                        {cl.emoji} {t(`create.${cl.labelKey}`)}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Location */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.location_title")}</p>
                                  <input placeholder={t("create.location_ph")}
                                    value={locationTag} onChange={e => setLocationTag(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                                {/* Comment & Share pickers */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.interactivity_title")}</p>
                                  <PermPicker label={t("create.who_comment")} icon={MessageCircle} value={commentPerm} onChange={setCommentPerm} />
                                  <PermPicker label={t("create.who_share")} icon={Share2} value={sharePerm} onChange={setSharePerm} />
                                </div>

                                {/* Toggle switches */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.extra_settings_title")}</p>
                                  {[
                                    { label:t("create.toggle_duet"),       desc:t("create.toggle_duet_desc"),       val:duetAllowed,       set:setDuetAllowed,       icon:"🎭", color:"#818cf8" },
                                    { label:t("create.toggle_download"),   desc:t("create.toggle_download_desc"),   val:downloadAllowed,   set:setDownloadAllowed,   icon:"⬇️", color:"#34d399" },
                                    { label:t("create.toggle_hide_likes"), desc:t("create.toggle_hide_likes_desc"), val:hideLikes,         set:setHideLikes,         icon:"❤️", color:"#f472b6" },
                                    { label:t("create.toggle_hide_views"), desc:t("create.toggle_hide_views_desc"), val:hideViews,         set:setHideViews,         icon:"👁", color:"#a78bfa" },
                                    { label:t("create.toggle_sensitive"),  desc:t("create.toggle_sensitive_desc"),  val:sensitiveContent,  set:setSensitiveContent,  icon:"⚠️", color:"#f97316" },
                                    { label:t("create.toggle_age"),        desc:t("create.toggle_age_desc"),        val:ageRestricted,     set:setAgeRestricted,     icon:"🔞", color:"#ef4444" },
                                    { label:t("create.toggle_brand"),      desc:t("create.toggle_brand_desc"),      val:brandPartnership,  set:setBrandPartnership,  icon:"🤝", color:"#fbbf24" },
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
                                    <input placeholder={t("create.mention_friend_ph", "@foydalanuvchi (do'stingizni taklif qiling)")}
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
                                    <Target className="w-3 h-3"/> {t("create.goal_title")}
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { id:"entertain", emoji:"🎭", label:t("create.label_entertainment"),   desc:t("create.label_entertainment_desc", "Zavq berish") },
                                      { id:"educate",   emoji:"📚", label:t("create.goal_educate"),          desc:t("create.label_education_desc_alt", "Bilim ulashish") },
                                      { id:"inspire",   emoji:"✨", label:t("create.goal_inspire"),          desc:t("create.label_inspire_desc", "Motivatsiya") },
                                      { id:"promote",   emoji:"📢", label:t("create.goal_promote"),          desc:t("create.label_promote_desc", "Brend/mahsulot") },
                                      { id:"challenge", emoji:"🏆", label:t("create.chal_label"),            desc:t("create.chal_desc") },
                                      { id:"connect",   emoji:"🤝", label:t("create.goal_connect"),          desc:t("create.label_connect_desc", "Hamjamiyat") },
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
                                    <Repeat2 className="w-3 h-3"/> {t("create.crosspost_title")}
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
                                    <Shield className="w-3 h-3"/> {t("create.keyword_filter_title")}
                                  </p>
                                  <input placeholder={t("create.blocked_keywords_ph", "Bloklash kerak so'zlar (vergul bilan: spam, reklama, ...)")}
                                    value={blockedKeywords} onChange={e => setBlockedKeywords(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none"
                                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
                                </div>

                                {/* AI Best Time */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3 h-3"/> {t("create.ai_best_time_title")}
                                  </p>
                                  <button onClick={fetchBestTime}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                                    style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.35)", color:"#c4b5fd" }}>
                                    {bestTimeLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    {bestTimeLoading ? t("create.ai_best_time_analyzing") : t("create.ai_best_time_btn")}
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
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.creator_notes_label")}</p>
                                  <textarea placeholder={t("create.creator_notes_ph", "Bu post haqida o'zingizga eslatma (hech kim ko'rmaydi)…")}
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
                              <p className="text-xs font-black text-white tracking-wide">{t("create.power_zone_title")}</p>
                              <p className="text-[10px] text-white/40">{t("create.power_zone_subtitle")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                              {t("create.badge_new")}
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
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.ai_director_title")}</p>
                                  <button onClick={runAiDirector} disabled={aiDirectorLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                                    style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.35)", color:"#c4b5fd" }}>
                                    {aiDirectorLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> {t("create.ai_director_analyzing")}</> : <><Sparkles className="w-3.5 h-3.5"/> {t("create.ai_director_btn")}</>}
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
                                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.multilang_title")}</p>
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
                                          {translating ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> {t("create.translating")}</> : t("create.translate_btn", { count: selectedLangs.length })}
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
                                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.ab_test_title")}</p>
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
                                          {t("create.ab_test_desc")}
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="mt-2.5 text-[10px] font-black text-amber-400 w-5 flex-shrink-0">A</span>
                                          <div className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white/40 italic"
                                            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                                            {postContent || t("create.ab_variant_a_fallback")}
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="mt-2.5 text-[10px] font-black text-amber-400 w-5 flex-shrink-0">B</span>
                                          <textarea placeholder={t("create.ab_variant_b_ph")} rows={2} value={captionB} onChange={e=>setCaptionB(e.target.value)}
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
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.secret_gate_title")}</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">{t("create.secret_gate_desc")}</p>
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
                                        <input placeholder={t("create.secret_code_ph")}
                                          value={secretCode} onChange={e=>setSecretCode(e.target.value.toUpperCase())}
                                          className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none font-mono tracking-widest"
                                          style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.4)" }} />
                                        {secretCode && (
                                          <p className="text-[10px] text-violet-400 font-bold px-1">
                                            {t("create.secret_code_label")}<span className="font-mono tracking-widest">{secretCode}</span>{t("create.secret_code_share_suffix")}
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
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.crowd_unlock_title")}</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">{t("create.crowd_unlock_desc", "X kishi reaksiya bergandan so'ng ochiladi")}</p>
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
                                          {t("create.crowd_unlock_hint", `Post blur ko'rinadi → ${crowdThreshold} kishi reaksiya bergandan so'ng to'liq ochiladi`, { threshold: crowdThreshold })}
                                        </p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* ── 6. Remix DNA ── */}
                                <div>
                                  <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.remix_dna_title")}</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { id:"none",     e:"🚫", l:t("create.remix_none", "Remix yo'q"),     d:t("create.remix_none_desc", "Hich kim"),        c:"#f87171" },
                                      { id:"template", e:"📋", l:t("create.remix_template"),                d:t("create.remix_template_desc"),                c:"#fbbf24" },
                                      { id:"style",    e:"🎨", l:t("create.remix_style"),                   d:t("create.remix_style_desc"),                   c:"#818cf8" },
                                      { id:"full",     e:"♻️", l:t("create.remix_full", "To'liq Remix"),    d:t("create.remix_full_desc", "Barcha huquqlar"), c:"#34d399" },
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
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.chain_title")}</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">{t("create.chain_desc")}</p>
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
                                            <option value="50likes" style={{background:"#0e0e1a"}}>{t("create.chain_50likes")}</option>
                                            <option value="100likes" style={{background:"#0e0e1a"}}>{t("create.chain_100likes")}</option>
                                            <option value="500likes" style={{background:"#0e0e1a"}}>{t("create.chain_500likes")}</option>
                                            <option value="10comments" style={{background:"#0e0e1a"}}>{t("create.chain_10comments")}</option>
                                            <option value="1kreach" style={{background:"#0e0e1a"}}>{t("create.chain_1kreach")}</option>
                                            <option value="10kreach" style={{background:"#0e0e1a"}}>{t("create.chain_10kreach")}</option>
                                          </select>
                                          <span className="text-orange-400 font-black text-base">→</span>
                                          <select value={chainAction} onChange={e=>setChainAction(e.target.value)}
                                            className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                                            style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.35)" }}>
                                            <option value="story" style={{background:"#0e0e1a"}}>{t("create.chain_act_story")}</option>
                                            <option value="reel" style={{background:"#0e0e1a"}}>{t("create.chain_act_reel")}</option>
                                            <option value="boost" style={{background:"#0e0e1a"}}>{t("create.chain_act_boost")}</option>
                                            <option value="notify" style={{background:"#0e0e1a"}}>{t("create.chain_act_notify")}</option>
                                            <option value="pin" style={{background:"#0e0e1a"}}>{t("create.chain_act_pin")}</option>
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
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.monetize_post_title")}</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">{t("create.monetize_post_desc")}</p>
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
                                          {[{id:"tip",e:"🪙",l:t("create.monetize_tip_jar", "Tip Jar"),d:t("create.chal_music_opt")},{id:"paytosee",e:"🔒",l:t("create.monetize_pay_to_see", "Pay-to-See"),d:t("create.monetize_pay_to_see_desc", "To'lov kerak")}].map(m => (
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
                                    <p className="text-[10px] text-white/40 mt-0.5">{t("create.sentiment_exclusive_hint", "Tomoshabinlar kayfiyati real-vaqtda ko'rsatiladi — hech kimda yo'q!")}</p>
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
                                    <p className="text-[10px] text-white/40 mt-0.5">{t("create.dynamic_color_hint", "Tomoshabin reaksiyasiga qarab post rangi/toni o'zgaradi")}</p>
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
                                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{t("create.auto_destruct_title", "⏰ Auto Self-Destruct — o'z-o'zidan o'chadi")}</p>
                                      <p className="text-[9px] text-white/25 mt-0.5">{t("create.auto_destruct_desc", "Post belgilangan vaqtdan keyin avtomatik o'chiriladi")}</p>
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
                          { label:"📝 AI Auto-Captions", desc:t("create.reel_auto_caption_desc", "AI avtomatik subtitr qo'shadi"),            val:reelAutoCaption,  set:setReelAutoCaption,  color:"#60a5fa" },
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
                              <p className="text-[9px] text-white/25 px-1">{t("create.add_to_caption_hint", "Bosib caption'ga qo'shish")}</p>
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
                              <p className="text-xs font-bold text-white/85">{t("create.reel_studio_title")}</p>
                              <p className="text-[10px] text-white/35">{t("create.reel_studio_desc")}</p>
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

                      {/* ── 🎵 t("create.reel_audio_studio_title") ── */}
                      <div>
                        <button onClick={()=>setReelAudioEditOpen(p=>!p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                          style={{ background:reelAudioEditOpen?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.04)", border:reelAudioEditOpen?"1px solid rgba(251,191,36,0.35)":"1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-2.5">
                            <span style={{fontSize:18}}>🎵</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white/85">{t("create.reel_audio_studio_title")}</p>
                              <p className="text-[10px] text-white/35">{t("create.reel_audio_studio_desc")}</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{reelAudioEditOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {reelAudioEditOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* Voice Changer */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">{t("create.reel_voice_title")}</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[{id:"normal",e:"🗣️",l:t("create.reel_voice_normal")},{id:"robot",e:"🤖",l:t("create.reel_voice_robot")},{id:"chipmunk",e:"🐿️",l:t("create.reel_voice_chipmunk")},{id:"deep",e:"👹",l:t("create.reel_voice_deep")},{id:"echo",e:"🌊",l:t("create.reel_voice_echo")},{id:"alien",e:"👽",l:t("create.reel_voice_alien")},{id:"helium",e:"🎈",l:t("create.reel_voice_helium")},{id:"cave",e:"🏔️",l:t("create.reel_voice_cave")}].map(v=>(
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
                                  {[{id:"none",e:"🚫",l:t("create.reel_ar_none")},{id:"glow",e:"✨",l:t("create.reel_ar_glow")},{id:"blur_face",e:"🌫️",l:t("create.reel_ar_blur")},{id:"sunglasses",e:"🕶️",l:t("create.reel_ar_sunglasses")},{id:"crown",e:"👑",l:t("create.reel_ar_crown")},{id:"cat",e:"🐱",l:t("create.reel_ar_cat")},{id:"dog",e:"🐶",l:t("create.reel_ar_dog")},{id:"heart_eyes",e:"😍",l:t("create.reel_ar_heart")}].map(f=>(
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
                                  {[{id:"none",l:t("create.reel_anim_none")},{id:"in",l:t("create.reel_anim_zoom_in", "Zoom In")},{id:"out",l:t("create.reel_anim_zoom_out", "Zoom Out")},{id:"bounce",l:t("create.reel_anim_bounce", "Bounce")}].map(z=>(
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
                          <p className="text-[10px] text-white/35 mb-1.5">{t("create.reel_trans_title")}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"cut",l:t("create.reel_trans_cut")},{id:"fade",l:t("create.reel_trans_fade")},{id:"zoom",l:t("create.reel_trans_zoom")},{id:"slide",l:t("create.reel_trans_slide")},{id:"spin",l:t("create.reel_trans_spin")},{id:"glitch",l:t("create.reel_trans_glitch")}].map(t=>(
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
                            {[{id:"none",l:t("create.reel_anim_none")},{id:"typewriter",l:t("create.reel_anim_typewriter")},{id:"slide_in",l:t("create.reel_anim_slide")},{id:"bounce",l:t("create.reel_anim_bounce")},{id:"fade_in",l:t("create.reel_anim_fade")},{id:"neon_blink",l:t("create.reel_anim_neon")},{id:"wave",l:t("create.reel_anim_wave")},{id:"zoom_in",l:t("create.reel_anim_zoom")}].map(t=>(
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
                            {[{id:"none",l:t("create.reel_anim_none")},{id:"top",l:t("create.reel_progress_top")},{id:"bottom",l:t("create.reel_progress_bottom")},{id:"circle",l:t("create.reel_progress_circle")}].map(p=>(
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
                          <p className="text-[10px] text-white/35 mb-1.5">{t("create.reel_lyrics_section_title")}</p>
                          <div className="flex gap-1.5">
                            {[{id:"none",l:t("create.reel_anim_none")},{id:"bottom_bar",l:t("create.reel_lyrics_bottom")},{id:"karaoke",l:t("create.reel_lyrics_karaoke")},{id:"word_by_word",l:t("create.reel_lyrics_word")}].map(ls=>(
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
                          <p className="text-[10px] text-white/35 mb-1.5">{t("create.reel_split_section_title")}</p>
                          <div className="flex gap-1.5">
                            {[{id:"none",l:t("create.reel_anim_none")},{id:"vertical",l:t("create.reel_split_vert")},{id:"horizontal",l:t("create.reel_split_horiz")},{id:"grid",l:t("create.reel_split_grid")}].map(ss=>(
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
                          <p className="text-[10px] text-white/35 mb-1.5">{t("create.reel_cc_lang_title")}</p>
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
                            <p className="text-[10px] text-white/35">{t("create.reel_poll_section_title")}</p>
                            <button onClick={()=>setReelPoll(p=>!p)} className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{ background:reelPoll?"#a78bfa":"rgba(255,255,255,0.12)", justifyContent:reelPoll?"flex-end":"flex-start", height:20, width:34 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <AnimatePresence>
                            {reelPoll && (
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1.5 overflow-hidden">
                                <input placeholder={t("create.reel_poll_ph")} value={reelPollQ} onChange={e=>setReelPollQ(e.target.value)}
                                  className="w-full rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}/>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {reelPollA.map((a,i)=>(
                                    <input key={i} placeholder={`${t("create.story_quiz_var")} ${i+1}`} value={a} onChange={e=>{ const n=[...reelPollA]; n[i]=e.target.value; setReelPollA(n); }}
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
                            {l:t("create.reel_countdown"),                           v:reelCountdown,s:setReelCountdown,c:"#f87171"},
                            {l:t("create.reel_pip"),                                 v:reelPip,      s:setReelPip,      c:"#fbbf24"},
                            {l:t("create.reel_endcard"),                             v:reelEndCard,  s:setReelEndCard,  c:"#34d399"},
                            {l:t("create.reel_age_gate", "🔞 18+ Yosh chegara"),     v:reelAgeGate,  s:setReelAgeGate,  c:"#f87171"},
                            {l:t("create.reel_share_discover", "📡 Discover'ga yuborish"),v:reelShareDiscover,s:setReelShareDiscover,c:"#60a5fa"},
                            {l:t("create.reel_duet_mode"),                           v:reelDuetMode, s:setReelDuetMode, c:"#a78bfa"},
                            {l:t("create.reel_react_video"),                         v:reelReactVideo,s:setReelReactVideo,c:"#fb923c"},
                            {l:t("create.reel_4k_quality"),                          v:reel4k,       s:setReel4k,       c:"#22d3ee"},
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
                          <input placeholder={t("create.reel_comment_pin_ph")} value={reelFirstComment} onChange={e=>setReelFirstComment(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                          <input placeholder={t("create.reel_comment_top_ph")} value={reelPinComment} onChange={e=>setReelPinComment(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                        </div>
                        {/* Watermark position */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1.5">{t("create.reel_watermark_pos_title")}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {[{id:"none",l:t("create.reel_anim_none")},{id:"tl",l:t("create.reel_watermark_tl")},{id:"tr",l:t("create.reel_watermark_tr")},{id:"bl",l:t("create.reel_watermark_bl")},{id:"br",l:t("create.reel_watermark_br")},{id:"center",l:t("create.reel_watermark_center")}].map(w=>(
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
                        <p className="text-xs font-bold text-white/60 mb-1">{t("create.privacy_label")}</p>
                        <PermPicker label={t("create.who_comment")} icon={MessageCircle} value={reelCommentPerm} onChange={setReelCommentPerm} />
                        <PermPicker label={t("create.who_share")}    icon={Share2}        value={reelSharePerm}   onChange={setReelSharePerm} />
                      </div>
                    </div>
                  )}

                  {/* ═══ STORY TAB ═══ */}
                  {tab === "story" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {[
                          { id: "story-img-input", label: t("create.story_upload_photo"), Icon: Camera, accept: ACCEPT.image, color: "#7c3aed" },
                          { id: "story-vid-input", label: t("create.story_upload_video"), Icon: Video,  accept: ACCEPT.video, color: "#06b6d4" },
                        ].map(btn => {
                          const active = btn.id === "story-img-input" ? storyFile?.type.startsWith("image") : storyFile?.type.startsWith("video");
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
                              <CheckCircle2 className="w-3 h-3" /> {t("create.uploaded_label")}
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        placeholder={t("create.story_title_ph")}
                        value={storyCaption}
                        onChange={e => setStoryCaption(e.target.value)}
                        className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      />

                      {/* ── Interactive Stickers ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">{t("create.interactive_sticker_title")}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id:"qa",        e:"❓", l:t("create.sticker_qa_label"),    d:t("create.sticker_qa_desc"),     c:"#818cf8" },
                            { id:"slider",    e:"😍", l:t("create.sticker_slider_label"), d:t("create.sticker_slider_desc"), c:"#f472b6" },
                            { id:"quiz",      e:"🧠", l:t("create.story_sticker_quiz", "Quiz / Test"),      d:t("create.story_sticker_quiz_desc", "Ko'p javobli savol"),             c:"#34d399" },
                            { id:"countdown", e:"⏱", l:t("create.story_sticker_countdown", "Countdown"),        d:t("create.story_sticker_countdown_desc", "Tadbirga qolgan vaqt hisoblagich"),c:"#f97316" },
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
                          <p className="text-xs font-bold text-white/80">{t("create.story_ring_title")}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{t("create.story_chain_exclusive_hint", "Sizning story'ingiz boshqalar story'si bilan zanjirlanadi — Instagram'da yo'q!")}</p>
                        </div>
                        <div className="flex items-center px-0.5 rounded-full transition-all"
                          style={{ background:storyRing?"rgba(168,85,247,0.8)":"rgba(255,255,255,0.12)", justifyContent:storyRing?"flex-end":"flex-start", height:22, width:40 }}>
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* ── ⏰ Story Duration ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">{t("create.story_duration_title")}</p>
                        <div className="flex gap-2">
                          {[{v:"6h",l:t("create.duration_6h")},{v:"12h",l:t("create.duration_12h")},{v:"24h",l:t("create.duration_24h")},{v:"48h",l:t("create.duration_48h")}].map(d => (
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
                        <p className="text-xs font-bold text-white/45 mb-2">{t("create.swipe_link_title")}</p>
                        <div className="flex gap-2 items-center">
                          <input placeholder="https://olchaai.com/..." value={storyLink} onChange={e=>setStoryLink(e.target.value)}
                            className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.25)" }}/>
                          {storyLink && <span className="text-emerald-400 text-lg">✓</span>}
                        </div>
                        <p className="text-[9px] text-white/25 mt-1 px-1">{t("create.swipe_link_hint")}</p>
                      </div>

                      {/* ── 💬 Reply Mode ── */}
                      <div>
                        <p className="text-xs font-bold text-white/45 mb-2">{t("create.reply_mode_title")}</p>
                        <div className="flex gap-2">
                          {[{v:"all",e:"🌐",l:t("create.reply_all")},{v:"followers",e:"👥",l:t("create.reply_followers")},{v:"none",e:"🔕",l:t("create.reply_none")}].map(r => (
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
                              <p className="text-xs font-bold text-white/85">{t("create.story_canvas_title")}</p>
                              <p className="text-[10px] text-white/35">{t("create.story_canvas_hint")}</p>
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
                              <p className="text-xs font-bold text-white/85">{t("create.design_studio_title")}</p>
                              <p className="text-[10px] text-white/35">{t("create.design_studio_hint")}</p>
                            </div>
                          </div>
                          <span className="text-white/40 text-xs">{storyDesignOpen?"▲":"▼"}</span>
                        </button>
                        <AnimatePresence>
                          {storyDesignOpen && (
                            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="mt-2 space-y-3 overflow-hidden">
                              {/* Background */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">{t("create.bg_type_label")}</p>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                  {[
                                    {id:"none",      bg:"rgba(255,255,255,0.06)", label:t("create.reel_ar_none", "Yo'q")},
                                    {id:"solid",     bg:storyBgColor,              label:"Rang"},
                                    {id:"grad1",     bg:"linear-gradient(135deg,#7c3aed,#ec4899)", label:"🌸 Violet"},
                                    {id:"grad2",     bg:"linear-gradient(135deg,#f59e0b,#ef4444)", label:"🔥 Olov"},
                                    {id:"grad3",     bg:"linear-gradient(135deg,#06b6d4,#6366f1)", label:t("create.story_bg_blue", "🌊 Ko'k")},
                                    {id:"grad4",     bg:"linear-gradient(135deg,#10b981,#059669)", label:"🌿 Yashil"},
                                    {id:"grad5",     bg:"linear-gradient(135deg,#1a1a2e,#16213e)", label:"🌌 Kosmik"},
                                    {id:"grad6",     bg:"linear-gradient(135deg,#ff6b6b,#feca57)", label:t("create.story_bg_sun", "🌅 Quyosh")},
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
                                  {[{id:"none",l:t("create.reel_anim_none")},{id:"thin",l:"— Ingichka"},{id:"thick",l:"■ Qalin"},{id:"dashed",l:"- - Uzuq"},{id:"glow_v",l:"✨ Violet yilt."},{id:"glow_g",l:"💚 Yashil yilt."},{id:"neon_r",l:"🔴 Neon qizil"},{id:"rainbow",l:"🌈 Kamalak"}].map(b=>(
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
                                  {[{id:"none",e:"🚫",l:t("create.reel_ar_none")},{id:"beauty",e:"✨",l:"Beauty"},{id:"vintage",e:"📷",l:"Vintage"},{id:"neon_glow",e:"💜",l:"Neon"},{id:"sparkles",e:"🌟",l:"Spora"},{id:"heart",e:"💗",l:t("create.reel_ar_heart", "Yurak")},{id:"stars",e:"⭐",l:"Yulduz"},{id:"rainbow",e:"🌈",l:"Kamalak"}].map(f=>(
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
                              <p className="text-[10px] text-white/35">{t("create.story_stickers_desc", "So'rovnoma, savol, viktorina, sanash va yana ko'p")}</p>
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
                                      <input placeholder={t("create.story_poll_ph", "Savol: Qaysi rangni yaxshi ko'rasiz?")} value={storyPollQ} onChange={e=>setStoryPollQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.25)" }}/>
                                      <div className="flex gap-1.5">
                                        {storyPollA.map((a,i)=>(
                                          <input key={i} placeholder={i===0?t("create.story_poll_ha"):t("create.story_poll_yoq")} value={a} onChange={e=>{ const n=[...storyPollA]; n[i]=e.target.value; setStoryPollA(n); }}
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
                                      <input placeholder={t("create.story_qa_ph")} value={storyQaQ} onChange={e=>setStoryQaQ(e.target.value)}
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
                                      <input placeholder={t("create.story_quiz_ph")} value={storyQuizQ} onChange={e=>setStoryQuizQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}/>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {storyQuizOpts.map((o,i)=>(
                                          <button key={i} onClick={()=>setStoryQuizAns(i)}
                                            className="relative"
                                            style={{}}>
                                            <input value={o} onChange={e=>{ const n=[...storyQuizOpts]; n[i]=e.target.value; setStoryQuizOpts(n); }}
                                              placeholder={`${t("create.story_quiz_var")} ${i+1}`}
                                              className="w-full rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                              style={{ background:storyQuizAns===i?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.05)", border:storyQuizAns===i?"1.5px solid rgba(52,211,153,0.6)":"1px solid rgba(255,255,255,0.08)" }}/>
                                            {storyQuizAns===i && <span className="absolute right-2 top-1.5 text-[10px] text-emerald-400">✓</span>}
                                          </button>
                                        ))}
                                      </div>
                                      <p className="text-[8px] text-white/25">{t("create.story_quiz_hint")}</p>
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
                                      <input placeholder={t("create.story_emoji_ph")} value={storyEmojiQ} onChange={e=>setStoryEmojiQ(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                        style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.25)" }}/>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Location & Mention & Product */}
                              <div className="space-y-1.5">
                                <input placeholder={"📍 " + t("create.story_loc_ph")} value={storyLocationTag} onChange={e=>setStoryLocationTag(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                <input placeholder={t("create.story_mention_ph")} value={storyMention} onChange={e=>setStoryMention(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                                <input placeholder={"🛍️ " + t("create.story_prod_ph")} value={storyProduct} onChange={e=>setStoryProduct(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}/>
                              </div>
                              {/* Music */}
                              <div>
                                <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">🎵 Musiqa Stikeri</p>
                                <input placeholder={t("create.story_music_ph")} value={storyMusic} onChange={e=>setStoryMusic(e.target.value)}
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
                                <input placeholder={t("create.story_gif_ph")} value={storyGif} onChange={e=>setStoryGif(e.target.value)}
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
                                  {l:t("create.story_weather"),  v:storyWeather,      s:setStoryWeather,     c:"#22d3ee"},
                                  {l:t("create.story_addyours"), v:storyAddYours,    s:setStoryAddYours,   c:"#34d399"},
                                  {l:t("create.story_autotrans"),     v:storyAutoTranslate,s:setStoryAutoTranslate,c:"#60a5fa"},
                                  {l:t("create.story_autoarchive"),  v:true,              s:()=>{},             c:"#94a3b8"},
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
                        <p className="text-xs font-bold text-white/60">{t("create.story_special_settings")}</p>
                        {/* Close Friends */}
                        <button onClick={()=>setStoryCloseFriends(p=>!p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background:storyCloseFriends?"rgba(52,211,153,0.12)":"rgba(255,255,255,0.04)", border:storyCloseFriends?"1px solid rgba(52,211,153,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyCloseFriends?"#34d399":"rgba(255,255,255,0.45)" }}>
                          <span>{t("create.story_close_friends")}</span>
                          <div className="flex items-center px-0.5 rounded-full" style={{ background:storyCloseFriends?"#34d399":"rgba(255,255,255,0.12)", justifyContent:storyCloseFriends?"flex-end":"flex-start", height:20, width:36 }}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                          </div>
                        </button>
                        {/* Vanish mode */}
                        <button onClick={()=>setStoryVanish(p=>!p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background:storyVanish?"rgba(239,68,68,0.12)":"rgba(255,255,255,0.04)", border:storyVanish?"1px solid rgba(239,68,68,0.5)":"1px solid rgba(255,255,255,0.07)", color:storyVanish?"#f87171":"rgba(255,255,255,0.45)" }}>
                          <span>{t("create.story_vanish")}</span>
                          <div className="flex items-center px-0.5 rounded-full" style={{ background:storyVanish?"#ef4444":"rgba(255,255,255,0.12)", justifyContent:storyVanish?"flex-end":"flex-start", height:20, width:36 }}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                          </div>
                        </button>
                        {/* Highlight */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-white/60">{t("create.story_highlight_title")}</span>
                            <button onClick={()=>setStoryHighlight(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{ background:storyHighlight?"#fbbf24":"rgba(255,255,255,0.12)", justifyContent:storyHighlight?"flex-end":"flex-start", height:20, width:34 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <AnimatePresence>
                            {storyHighlight && (
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                                <input placeholder={t("create.story_highlight_ph")} value={storyHighlightName} onChange={e=>setStoryHighlightName(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)" }}/>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Schedule */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-white/60">{t("create.story_schedule_title")}</span>
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

                  {/* ══════════════════ OTUBE TAB ══════════════════ */}
                  {tab === "otube" && (
                    <div className="px-4 py-4 space-y-4">

                      {/* Section nav */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                        {(["basic","video","seo","monetize","advanced"] as const).map(s => (
                          <button key={s} onClick={()=>setOtubeSection(s)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                            style={{ background:otubeSection===s?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.07)", color:otubeSection===s?"white":"rgba(255,255,255,0.45)", border:otubeSection===s?"none":"1px solid rgba(255,255,255,0.08)" }}>
                            {s==="basic"?"📝 Asosiy":s==="video"?"🎬 Video":s==="seo"?"🔍 SEO":s==="monetize"?"💰 Daromad":t("create.chal_nav_advanced")}
                          </button>
                        ))}
                      </div>

                      {/* BASIC SECTION */}
                      {otubeSection === "basic" && (<div className="space-y-4">

                        {/* Video Upload */}
                        {otubePreview ? (
                          <div className="space-y-2">
                            {/* Orientation toggle row — ABOVE video, no overlap */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/40 mr-1">{t("create.otube_vis_label")}</span>
                              {([
                                {id:"9:16" as const, icon:"📱", label:t("create.otube_vis_vert")},
                                {id:"16:9" as const, icon:"📺", label:t("create.otube_vis_horiz")},
                                {id:"1:1"  as const, icon:"⬜", label:t("create.otube_vis_square")},
                              ]).map(o=>(
                                <button key={o.id} onClick={()=>setOtubeOrientation(o.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  style={otubeOrientation===o.id
                                    ?{background:"rgba(52,211,153,0.18)",border:"1px solid rgba(52,211,153,0.5)",color:"#34d399"}
                                    :{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)"}}>
                                  <span>{o.icon}</span><span>{o.label}</span>
                                </button>
                              ))}
                            </div>

                            {/* Video player — no overlaid badges */}
                            <div className="rounded-2xl overflow-hidden mx-auto"
                              style={{
                                aspectRatio: otubeOrientation==="9:16"?"9/16":otubeOrientation==="16:9"?"16/9":"1/1",
                                maxHeight: otubeOrientation==="9:16"?320:otubeOrientation==="16:9"?220:220,
                                maxWidth: otubeOrientation==="9:16"?180:otubeOrientation==="16:9"?"100%":220,
                                background:"#000",
                                boxShadow:"0 0 0 1.5px rgba(52,211,153,0.25), 0 8px 28px rgba(0,0,0,0.55)"
                              }}>
                              <video src={otubePreview}
                                className="w-full h-full"
                                style={{objectFit:"contain",display:"block"}}
                                controls
                                playsInline/>
                            </div>

                            {/* File info + remove — below video, clean row */}
                            <div className="flex items-center gap-2 px-0.5 pt-0.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-white/60 truncate">{otubeFile?.name}</p>
                                <p className="text-[9px] text-white/30">
                                  {otubeFile ? `${(otubeFile.size/1024/1024).toFixed(1)} MB` : ""}
                                  {otubeUploadResult ? " · ✓ Yuklandi" : otubeUploadProg>0 ? ` · ${otubeUploadProg}%` : ""}
                                </p>
                              </div>
                              <button onClick={()=>{setOtubeFile(null);setOtubePreview("");setOtubeUploadResult(null);setOtubeUploadProg(0);}}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold"
                                style={{background:"rgba(255,59,48,0.1)",border:"1px solid rgba(255,59,48,0.3)",color:"#ff3b30"}}>
                                <X className="w-3 h-3"/>{t("create.otube_remove")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl overflow-hidden" style={{border:"2px dashed rgba(52,211,153,0.3)", background:"rgba(5,150,105,0.06)"}}>
                            <label className="flex flex-col items-center justify-center py-10 cursor-pointer gap-3">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#059669,#34d399)"}}>
                                <Tv className="w-7 h-7 text-white"/>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-white">{t("create.otube_upload_title")}</p>
                                <p className="text-[11px] text-white/40 mt-0.5">{t("create.otube_upload_desc")}</p>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-white/30">
                                <span>🎬 8K Ultra</span><span>•</span><span>🎵 Dolby Audio</span><span>•</span><span>⚡ 360° Video</span>
                              </div>
                              <input type="file" accept="video/*" className="hidden"
                                onChange={e=>{const f=e.target.files?.[0];if(f){setOtubeFile(f);setOtubePreview(URL.createObjectURL(f));setOtubeUploadResult(null);setOtubeUploadProg(0);upOtube(f);}e.target.value="";}}/>
                            </label>
                          </div>
                        )}

                        {/* Title */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.otube_title_label")}</p>
                          <input value={otubeTitle} onChange={e=>setOtubeTitle(e.target.value)} maxLength={100}
                            placeholder={t("create.otube_title_ph")}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(5,150,105,0.1)",border:"1px solid rgba(52,211,153,0.25)"}}/>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-white/30">{otubeTitle.length}/100</span>
                            <button onClick={runOtubeAiTitle} disabled={otubeAiTitleLoad}
                              className="text-[10px] font-bold flex items-center gap-1" style={{color:"#34d399"}}>
                              {otubeAiTitleLoad?<><Loader2 className="w-3 h-3 animate-spin"/>{t("create.ai_best_time_analyzing")}</>:<><Sparkles className="w-3 h-3"/>{t("create.otube_title_ai")}</>}
                            </button>
                          </div>
                          {otubeAiTitle.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {otubeAiTitle.map((t,i)=>(
                                <button key={i} onClick={()=>setOtubeTitle(t)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/70 transition-all hover:text-white"
                                  style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)"}}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.otube_desc_label")}</p>
                          <textarea value={otubeDesc.length>0?otubeDesc:otubeAiDesc} onChange={e=>{setOtubeDesc(e.target.value);setOtubeAiDesc("");}} rows={4}
                            placeholder={t("create.otube_desc_ph")}
                            className="w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/25 focus:outline-none resize-none"
                            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                          <button onClick={runOtubeAiDesc} disabled={otubeAiDescLoad}
                            className="mt-1.5 text-[10px] font-bold flex items-center gap-1" style={{color:"#34d399"}}>
                            {otubeAiDescLoad?<><Loader2 className="w-3 h-3 animate-spin"/>Yaratilmoqda…</>:<><Sparkles className="w-3 h-3"/>{t("create.otube_desc_ai")}</>}
                          </button>
                        </div>

                        {/* Category */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.otube_cat_label")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {["🎮 " + t("create.label_gaming"),"🎵 " + t("create.label_music"),"📚 " + t("create.label_education"),"🍳 " + t("create.label_food"),"🏋️ " + t("create.label_sports"),"🎭 " + t("create.label_entertainment"),"✈️ " + t("create.label_travel"),"💼 " + t("create.label_tech"),"🎨 " + t("create.label_art"),"🔬 " + t("create.label_tech"),"💄 " + t("create.label_fashion"),"🐾 " + t("create.label_food"),"🎬 " + t("create.label_entertainment"),"🧘 " + t("create.label_sports"),"📰 " + t("create.label_entertainment"),"🎤 " + t("create.label_music")].map(cat=>(
                              <button key={cat} onClick={()=>setOtubeCategory(cat===otubeCategory?"":cat)}
                                className="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                style={{background:otubeCategory===cat?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeCategory===cat?"white":"rgba(255,255,255,0.5)",border:otubeCategory===cat?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visibility */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.otube_vis_main_label")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"public",e:"🌍",l:t("create.otube_vis_public")},{v:"unlisted",e:"🔗",l:t("create.otube_vis_unlisted")},{v:"private",e:"🔒",l:t("create.otube_vis_private")},{v:"scheduled",e:"⏰",l:t("create.otube_vis_scheduled")}].map(({v,e,l})=>(
                              <button key={v} onClick={()=>{setOtubeVisibility(v);if(v==="scheduled")setOtubeScheduled(true);}}
                                className="py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 px-3 transition-all"
                                style={{background:otubeVisibility===v?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.05)",color:otubeVisibility===v?"white":"rgba(255,255,255,0.55)",border:otubeVisibility===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                <span>{e}</span>{l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {otubeScheduled && (
                          <input type="datetime-local" value={otubeScheduleTime} onChange={e=>setOtubeScheduleTime(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            style={{background:"rgba(5,150,105,0.1)",border:"1px solid rgba(52,211,153,0.3)",colorScheme:"dark"}}/>
                        )}

                        {/* Notify Subs + Premiere */}
                        <div className="grid grid-cols-2 gap-2">
                          {[{v:otubeNotifySubs,s:setOtubeNotifySubs,l:t("create.otube_notify_subs")},{v:otubePremiere,s:setOtubePremiere,l:t("create.otube_premiere")}].map(({v,s,l},i)=>(
                            <button key={i} onClick={()=>s((p:boolean)=>!p)}
                              className="py-2.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all"
                              style={{background:v?"rgba(52,211,153,0.15)":"rgba(255,255,255,0.05)",color:v?"#34d399":"rgba(255,255,255,0.45)",border:v?"1px solid rgba(52,211,153,0.35)":"1px solid rgba(255,255,255,0.08)"}}>
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:v?"#34d399":"rgba(255,255,255,0.2)"}}/>{l}
                            </button>
                          ))}
                        </div>
                        {otubePremiere && (
                          <input type="datetime-local" value={otubePremiereTime} onChange={e=>setOtubePremiereTime(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            style={{background:"rgba(5,150,105,0.1)",border:"1px solid rgba(52,211,153,0.3)",colorScheme:"dark"}}
                            placeholder="Premyera vaqtini belgilang"/>
                        )}

                      </div>)}

                      {/* VIDEO SECTION */}
                      {otubeSection === "video" && (<div className="space-y-4">

                        {/* Thumbnail */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_thumb_label")}</p>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {["Auto-kadr 1","Auto-kadr 2","Auto-kadr 3"].map((f,i)=>(
                              <button key={i} onClick={()=>setOtubeThumbnail(`auto${i}`)}
                                className="aspect-video rounded-xl flex items-center justify-center text-[9px] font-bold transition-all"
                                style={{background:otubeThumbnail===`auto${i}`?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeThumbnail===`auto${i}`?"white":"rgba(255,255,255,0.4)",border:otubeThumbnail===`auto${i}`?"none":"1px solid rgba(255,255,255,0.1)"}}>
                                {f}
                              </button>
                            ))}
                          </div>
                          <label className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-all"
                            style={{background:"rgba(52,211,153,0.1)",border:"1px dashed rgba(52,211,153,0.35)",color:"#34d399"}}>
                            <Upload className="w-3.5 h-3.5"/>{t("create.otube_thumb_custom")}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e=>{const f=e.target.files?.[0];if(f){setOtubeThumbnailFile(f);setOtubeThumbnail(URL.createObjectURL(f));}e.target.value="";}}/>
                          </label>
                        </div>

                        {/* Chapters */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_chap_label")}</p>
                          <div className="flex gap-2">
                            <input value={otubeChapTs} onChange={e=>setOtubeChapTs(e.target.value)} placeholder="0:00" className="w-16 rounded-xl px-2 py-2 text-xs text-white focus:outline-none" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}/>
                            <input value={otubeChapTitle} onChange={e=>setOtubeChapTitle(e.target.value)} placeholder={t("create.otube_chap_ph")} className="flex-1 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}/>
                            <button onClick={()=>{if(otubeChapTs&&otubeChapTitle){setOtubeChapters(p=>[...p,{ts:otubeChapTs,title:otubeChapTitle}]);setOtubeChapTs("");setOtubeChapTitle("");}}}
                              className="px-3 rounded-xl text-xs font-bold" style={{background:"linear-gradient(135deg,#059669,#34d399)",color:"white"}}>
                              <Plus className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {otubeChapters.map((ch,i)=>(
                              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.15)"}}>
                                <span className="text-[10px] font-mono text-emerald-400">{ch.ts}</span>
                                <span className="text-xs text-white/70 flex-1">{ch.title}</span>
                                <button onClick={()=>setOtubeChapters(p=>p.filter((_,j)=>j!==i))} className="text-red-400"><X className="w-3 h-3"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Playlist */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.otube_playlist_label")}</p>
                          <input value={otubePlaylist} onChange={e=>setOtubePlaylist(e.target.value)} placeholder={t("create.otube_playlist_ph")}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                        </div>

                        {/* End Card + Cards */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_cards_label")}</p>
                          <div className="flex items-center justify-between py-2 px-3 rounded-xl mb-2" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
                            <span className="text-xs text-white/70">{t("create.otube_card_add")}</span>
                            <button onClick={()=>setOtubeEndCard(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{background:otubeEndCard?"#34d399":"rgba(255,255,255,0.12)",justifyContent:otubeEndCard?"flex-end":"flex-start",height:20,width:34}}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <select value={otubeCardType} onChange={e=>setOtubeCardType(e.target.value)} className="rounded-xl px-2 py-2 text-xs text-white focus:outline-none flex-shrink-0" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}>
                              {["video","channel","playlist","link","poll"].map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                            <input value={otubeCardText} onChange={e=>setOtubeCardText(e.target.value)} placeholder={t("create.otube_card_ph")} className="flex-1 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}/>
                            <button onClick={()=>{if(otubeCardText){setOtubeCards(p=>[...p,{type:otubeCardType,text:otubeCardText}]);setOtubeCardText("");}}}
                              className="px-3 rounded-xl text-xs font-bold" style={{background:"linear-gradient(135deg,#059669,#34d399)",color:"white"}}>
                              <Plus className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {otubeCards.map((c,i)=>(
                              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)"}}>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:"rgba(52,211,153,0.2)",color:"#34d399"}}>{c.type}</span>
                                <span className="text-xs text-white/70 flex-1">{c.text}</span>
                                <button onClick={()=>setOtubeCards(p=>p.filter((_,j)=>j!==i))} className="text-red-400"><X className="w-3 h-3"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Video Quality Toggles */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_quality_label")}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[{v:otubeIs4k,s:setOtubeIs4k,l:"4K Ultra"},{v:otubeIsHdr,s:setOtubeIsHdr,l:"HDR"},{v:otubeIs360,s:setOtubeIs360,l:"360°"},{v:otubeStabilize,s:setOtubeStabilize,l:"Stabilizer"},{v:otubeAutoEnhance,s:setOtubeAutoEnhance,l:"AI Enhance"},{v:otubeSynthetic,s:setOtubeSynthetic,l:"AI Kontent"}].map(({v,s,l},i)=>(
                              <button key={i} onClick={()=>s((p:boolean)=>!p)}
                                className="py-2 rounded-xl text-[10px] font-bold transition-all"
                                style={{background:v?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:v?"white":"rgba(255,255,255,0.4)",border:v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subtitles */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_subs_label")}</p>
                          <div className="flex gap-2">
                            <select value={otubeSubLang} onChange={e=>setOtubeSubLang(e.target.value)} className="rounded-xl px-2 py-2 text-xs text-white focus:outline-none" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}>
                              {["uz","en","ru","de","fr","zh","ar","tr","ko","ja"].map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}
                            </select>
                            <button onClick={()=>setOtubeSubtitles(p=>[...p,{lang:otubeSubLang}])}
                              className="flex-1 py-2 rounded-xl text-xs font-bold" style={{background:"rgba(52,211,153,0.1)",border:"1px dashed rgba(52,211,153,0.3)",color:"#34d399"}}>
                              t("create.otube_subs_add")
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {otubeSubtitles.map((s,i)=>(
                              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]" style={{background:"rgba(52,211,153,0.12)",color:"#34d399"}}>
                                {s.lang.toUpperCase()} <button onClick={()=>setOtubeSubtitles(p=>p.filter((_,j)=>j!==i))}><X className="w-2.5 h-2.5"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* OTube Canvas */}
                        <div>
                          <button onClick={()=>setOtubeCanvasLayers(p=>p.length>0?[]:p)} className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",color:"#34d399"}}>
                            <LayoutTemplate className="w-3.5 h-3.5"/>{t("create.otube_canvas_btn")}
                          </button>
                          {otubeCanvasLayers.length>=0 && otubePreview && (
                            <div className="mt-2">
                              <DragMediaCanvas layers={otubeCanvasLayers} onChange={setOtubeCanvasLayers}/>
                            </div>
                          )}
                        </div>

                      </div>)}

                      {/* SEO SECTION */}
                      {otubeSection === "seo" && (<div className="space-y-4">

                        {/* SEO Score */}
                        <div className="rounded-2xl p-4 text-center" style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)"}}>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">📊 SEO Baho</p>
                          <div className="relative w-20 h-20 mx-auto mb-2">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke={otubeSeoScore>=70?"#34d399":otubeSeoScore>=40?"#fbbf24":"#f87171"} strokeWidth="3"
                                strokeDasharray={`${otubeSeoScore} ${100-otubeSeoScore}`} strokeLinecap="round"/>
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{color:otubeSeoScore>=70?"#34d399":otubeSeoScore>=40?"#fbbf24":"#f87171"}}>{otubeSeoScore}</span>
                          </div>
                          <p className="text-xs font-bold" style={{color:otubeSeoScore>=70?"#34d399":otubeSeoScore>=40?"#fbbf24":"#f87171"}}>{otubeSeoScore>=70?"Zo'r!":otubeSeoScore>=40?"Yaxshi":"Yaxshilash kerak"}</p>
                          <button onClick={runOtubeAiTitle} disabled={otubeAiTitleLoad}
                            className="mt-3 px-4 py-1.5 rounded-full text-[11px] font-bold" style={{background:"linear-gradient(135deg,#059669,#34d399)",color:"white"}}>
                            AI bilan SEO ni oshirish
                          </button>
                        </div>

                        {/* Tags */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">🏷 Teglar</p>
                            <button onClick={runOtubeAiTags} disabled={otubeAiTagsLoad}
                              className="text-[10px] font-bold flex items-center gap-1" style={{color:"#34d399"}}>
                              {otubeAiTagsLoad?<><Loader2 className="w-3 h-3 animate-spin"/>…</>:<><Sparkles className="w-3 h-3"/>AI Teglar</>}
                            </button>
                          </div>
                          <div className="flex gap-2 mb-2">
                            <input value={otubeTagInput} onChange={e=>setOtubeTagInput(e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter"&&otubeTagInput.trim()){setOtubeTags(p=>[...p,otubeTagInput.trim()]);setOtubeTagInput("");}}}
                              placeholder={t("create.otube_tags_ph", "Teg qo'shish → Enter")}
                              className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                            <button onClick={()=>{if(otubeTagInput.trim()){setOtubeTags(p=>[...p,otubeTagInput.trim()]);setOtubeTagInput("");}}}
                              className="px-3 rounded-xl text-xs font-bold" style={{background:"linear-gradient(135deg,#059669,#34d399)",color:"white"}}>
                              <Plus className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[...otubeTags,...otubeAiTags.filter(t=>!otubeTags.includes(t))].map((t,i)=>(
                              <button key={t} onClick={()=>setOtubeTags(p=>[...p.filter(x=>x!==t),...(otubeAiTags.includes(t)&&!otubeTags.includes(t)?[t]:[])])}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                                style={{background:otubeTags.includes(t)?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.06)",color:otubeTags.includes(t)?"#34d399":"rgba(255,255,255,0.45)",border:otubeTags.includes(t)?"1px solid rgba(52,211,153,0.4)":"1px solid rgba(255,255,255,0.08)"}}>
                                #{t}{otubeTags.includes(t)&&<X className="w-2.5 h-2.5" onClick={e=>{e.stopPropagation();setOtubeTags(p=>p.filter(x=>x!==t));}}/>}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Language + Location + Record Date */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">🌐 Video tili</p>
                            <div className="flex flex-wrap gap-1.5">
                              {["uz","en","ru","de","fr","zh","ar","tr"].map(l=>(
                                <button key={l} onClick={()=>setOtubeLanguage(l)}
                                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all"
                                  style={{background:otubeLanguage===l?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeLanguage===l?"white":"rgba(255,255,255,0.5)"}}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">📍 Joylashuv</p>
                            <input value={otubeLocation} onChange={e=>setOtubeLocation(e.target.value)} placeholder="Shahar, Mamlakat"
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">📅 Yozib olingan sana</p>
                            <input type="date" value={otubeRecordDate} onChange={e=>setOtubeRecordDate(e.target.value)}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",colorScheme:"dark"}}/>
                          </div>
                        </div>

                        {/* Pinned Comment + First Comment */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">📌 Qo'llab-quvvatlangan izoh</p>
                            <input value={otubePinComment} onChange={e=>setOtubePinComment(e.target.value)} placeholder="Videodagi eng muhim havolani yozing…"
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">💬 Birinchi izoh</p>
                            <input value={otubeFirstComment} onChange={e=>setOtubeFirstComment(e.target.value)} placeholder={t("create.otube_first_comment_ph", "Video chiqqanda birinchi izoh…")}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                          </div>
                        </div>

                      </div>)}

                      {/* MONETIZE SECTION */}
                      {otubeSection === "monetize" && (<div className="space-y-4">

                        {/* Monetization toggle */}
                        <div className="rounded-2xl p-4" style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.25)"}}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-bold text-white">💰 Monetizatsiya</p>
                              <p className="text-[10px] text-white/40 mt-0.5">Reklamadan daromad oling</p>
                            </div>
                            <button onClick={()=>setOtubeMonetize(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{background:otubeMonetize?"#34d399":"rgba(255,255,255,0.12)",justifyContent:otubeMonetize?"flex-end":"flex-start",height:24,width:40}}>
                              <div className="w-4 h-4 rounded-full bg-white"/>
                            </button>
                          </div>
                          {otubeMonetize && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider">Reklama turi</p>
                              <div className="grid grid-cols-2 gap-2">
                                {[{v:"ads",l:t("create.otube_monetize_ads", "📺 Reklama roliği")},{v:"sponsor",l:t("create.chal_sponsor_label")},{v:"merch",l:t("create.otube_monetize_merch", "🛍 Tovar do'koni")},{v:"membership",l:t("create.otube_monetize_membership", "⭐ A'zolik")}].map(({v,l})=>(
                                  <button key={v} onClick={()=>setOtubeMonetizeType(v)}
                                    className="py-2.5 rounded-xl text-[11px] font-bold transition-all"
                                    style={{background:otubeMonetizeType===v?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeMonetizeType===v?"white":"rgba(255,255,255,0.5)",border:otubeMonetizeType===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Revenue Estimate */}
                        {otubeMonetize && (
                          <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,rgba(5,150,105,0.15),rgba(52,211,153,0.08))"}}>
                            <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">📈 Taxminiy daromad</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              {[{l:"Kunlik",v:"$2–$8"},{l:"Haftalik",v:"$15–$55"},{l:"Oylik",v:"$60–$220"}].map(({l,v})=>(
                                <div key={l}>
                                  <p className="text-[10px] text-white/40">{l}</p>
                                  <p className="text-base font-bold" style={{color:"#34d399"}}>{v}</p>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-white/25 mt-2 text-center">*Taxminiy — haqiqiy ko'rsatkichlar farq qilishi mumkin</p>
                          </div>
                        )}

                        {/* Super Thanks, Members, Merchandise */}
                        <div className="space-y-2">
                          {[{v:otubeSuperThanks,s:setOtubeSuperThanks,e:"💝",l:t("create.otube_super_thanks_desc", "Super Thanks — tomoshabinlar sovg'a yuborsin")},{v:otubeMembersOnly,s:setOtubeMembersOnly,e:"👑",l:t("create.otube_members_only_desc", "Faqat a'zolar uchun (Members only)")},{v:otubeMerchandise,s:setOtubeMerchandise,e:"🛍",l:t("create.otube_merchandise_desc", "Tovar javoni ko'rsatish")}].map(({v,s,e,l})=>(
                            <div key={l} className="flex items-center justify-between px-3 py-3 rounded-xl" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
                              <span className="text-xs text-white/70">{e} {l}</span>
                              <button onClick={()=>s((p:boolean)=>!p)} className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{background:v?"#34d399":"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start",height:20,width:34}}>
                                <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* License */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">⚖️ Litsenziya</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"standard",l:"Standard (OlchaAI)"},{v:"cc",l:"Creative Commons"},{v:"commercial",l:"Tijorat maqsadli"},{v:"educational",l:"Ta'lim maqsadli"}].map(({v,l})=>(
                              <button key={v} onClick={()=>setOtubeLicense(v)}
                                className="py-2.5 px-3 rounded-xl text-[11px] font-bold transition-all"
                                style={{background:otubeLicense===v?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeLicense===v?"white":"rgba(255,255,255,0.5)",border:otubeLicense===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>)}

                      {/* ADVANCED SECTION */}
                      {otubeSection === "advanced" && (<div className="space-y-4">

                        {/* Comments & Interaction */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">💬 Izohlar</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"all",l:"Barcha izohlar"},{v:"hold",l:"Moderatsiya"},{v:"friends",l:"Obunachilargina"},{v:"off",l:"O'chirilgan"}].map(({v,l})=>(
                              <button key={v} onClick={()=>setOtubeCommentMode(v)}
                                className="py-2.5 rounded-xl text-[11px] font-bold transition-all"
                                style={{background:otubeCommentMode===v?"linear-gradient(135deg,#059669,#34d399)":"rgba(255,255,255,0.06)",color:otubeCommentMode===v?"white":"rgba(255,255,255,0.5)",border:otubeCommentMode===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toggle options */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_privacy_title")}</p>
                          <div className="space-y-1.5">
                            {[{v:otubeAllowEmbed,s:setOtubeAllowEmbed,l:t("create.otube_embed")},{v:otubeAllowDownload,s:setOtubeAllowDownload,l:t("create.otube_download")},{v:otubeHideLikes,s:setOtubeHideLikes,l:t("create.otube_hide_likes")},{v:otubeHideViews,s:setOtubeHideViews,l:t("create.otube_hide_views")},{v:otubeAgeGate,s:setOtubeAgeGate,l:t("create.otube_age_gate")},{v:otubeKids,s:setOtubeKids,l:t("create.otube_kids")},{v:otubePaidPromo,s:setOtubePaidPromo,l:t("create.otube_paid_promo")},{v:otubeSynthetic,s:setOtubeSynthetic,l:t("create.otube_synthetic")}].map(({v,s,l})=>(
                              <div key={l} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                                <span className="text-xs text-white/65">{l}</span>
                                <button onClick={()=>s((p:boolean)=>!p)} className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{background:v?"#34d399":"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start",height:20,width:34}}>
                                  <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>)}

                    </div>
                  )}

                  {/* ══════════════════ CHALLENGE TAB ══════════════════ */}
                  {tab === "challenge" && (
                    <div className="px-4 py-4 space-y-4">

                      {/* Section nav */}
                      <div className="flex gap-1.5">
                        {(["setup","rules","prizes","advanced"] as const).map(s=>(
                          <button key={s} onClick={()=>setChalSection(s)}
                            className="flex-1 px-2 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                            style={{background:chalSection===s?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.07)",color:chalSection===s?"white":"rgba(255,255,255,0.45)",border:chalSection===s?"none":"1px solid rgba(255,255,255,0.08)"}}>
                            {s==="setup"?t("create.chal_nav_setup"):s==="rules"?t("create.chal_nav_rules"):s==="prizes"?t("create.chal_nav_prizes"):t("create.chal_nav_advanced")}
                          </button>
                        ))}
                      </div>

                      {/* Banner */}
                      <div className="rounded-2xl p-4 text-center relative overflow-hidden" style={{background:"linear-gradient(135deg,rgba(180,83,9,0.3),rgba(251,146,60,0.15))"}}>
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, #fb923c 0%, transparent 60%), radial-gradient(circle at 80% 50%, #f59e0b 0%, transparent 60%)"}}/>
                        <Trophy className="w-8 h-8 mx-auto mb-2" style={{color:"#fb923c"}}/>
                        <p className="text-sm font-black text-white">{t("create.chal_banner_title")}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">{t("create.chal_banner_desc")}</p>
                      </div>

                      {/* SETUP SECTION */}
                      {chalSection === "setup" && (<div className="space-y-4">

                        {/* Name */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.chal_name_label")}</p>
                          <input value={chalName} onChange={e=>setChalName(e.target.value)} maxLength={60}
                            placeholder={t("create.chal_name_ph")}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.3)"}}/>
                        </div>

                        {/* Hashtag */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.chal_hash_label")}</p>
                          <input value={chalHashtag} onChange={e=>setChalHashtag(e.target.value.startsWith("#")?e.target.value:"#"+e.target.value)}
                            placeholder="#ChallengeName2025"
                            className="w-full rounded-xl px-3 py-2.5 text-sm font-bold placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.3)",color:"#fb923c"}}/>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.chal_desc_label")}</p>
                          <textarea value={chalDesc} onChange={e=>setChalDesc(e.target.value)} rows={3}
                            placeholder={t("create.chal_desc_ph")}
                            className="w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/25 focus:outline-none resize-none"
                            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                        </div>

                        {/* Category */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.otube_cat_label")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {["💃 " + t("create.label_dance"),"🏋️ " + t("create.label_sports"),"🍳 " + t("create.label_food"),"🎨 " + t("create.label_art"),"😂 " + t("create.label_comedy"),"📚 " + t("create.label_education"),"🎵 " + t("create.label_music"),"🌱 " + t("create.label_travel"),"💼 " + t("create.label_tech"),"🎮 " + t("create.label_gaming"),"❤️ " + t("create.label_art"),"🌍 " + t("create.label_travel")].map(cat=>(
                              <button key={cat} onClick={()=>setChalCategory(cat===chalCategory?"":cat)}
                                className="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                style={{background:chalCategory===cat?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalCategory===cat?"white":"rgba(255,255,255,0.5)"}}>
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_start_label")}</p>
                            <input type="date" value={chalStartDate} onChange={e=>setChalStartDate(e.target.value)}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)",colorScheme:"dark"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_end_label")}</p>
                            <input type="date" value={chalEndDate} onChange={e=>setChalEndDate(e.target.value)}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                              style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)",colorScheme:"dark"}}/>
                          </div>
                        </div>

                        {/* Content type */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_content_type_title")}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[{v:"video",e:"🎬",l:t("create.chal_type_video")},{v:"photo",e:"📸",l:t("create.chal_type_photo")},{v:"any",e:"🎭",l:t("create.chal_type_any")}].map(({v,e,l})=>(
                              <button key={v} onClick={()=>setChalContentType(v)}
                                className="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all"
                                style={{background:chalContentType===v?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalContentType===v?"white":"rgba(255,255,255,0.5)",border:chalContentType===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                <span className="text-base">{e}</span>{l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Theme music */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-1.5 uppercase tracking-wider">{t("create.chal_music_label")}</p>
                          <div className="flex gap-2">
                            <input value={chalThemeMusic} onChange={e=>setChalThemeMusic(e.target.value)} placeholder={t("create.chal_music_ph")}
                              className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                            <button onClick={()=>setChalMusicRequired(p=>!p)}
                              className="px-3 rounded-xl text-[10px] font-bold flex-shrink-0 transition-all"
                              style={{background:chalMusicRequired?"rgba(251,146,60,0.2)":"rgba(255,255,255,0.06)",color:chalMusicRequired?"#fb923c":"rgba(255,255,255,0.4)",border:chalMusicRequired?"1px solid rgba(251,146,60,0.4)":"1px solid rgba(255,255,255,0.08)"}}>
                              {chalMusicRequired?t("create.chal_music_req"):t("create.chal_music_opt")}
                            </button>
                          </div>
                        </div>

                        {/* Announce + Demo video */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_video_ann")}</p>
                            <input value={chalAnnVideo} onChange={e=>setChalAnnVideo(e.target.value)} placeholder="Video URL…"
                              className="w-full rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_video_demo")}</p>
                            <input value={chalDemoVideo} onChange={e=>setChalDemoVideo(e.target.value)} placeholder="Video URL…"
                              className="w-full rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}/>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_msg_welcome")}</p>
                            <input value={chalWelcomeMsg} onChange={e=>setChalWelcomeMsg(e.target.value)} placeholder={t("create.chal_msg_welcome_ph")}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.2)"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_msg_complete")}</p>
                            <input value={chalCompleteMsg} onChange={e=>setChalCompleteMsg(e.target.value)} placeholder={t("create.chal_msg_complete_ph")}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.2)"}}/>
                          </div>
                        </div>

                      </div>)}

                      {/* RULES SECTION */}
                      {chalSection === "rules" && (<div className="space-y-4">

                        {/* Video Length */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_rules_len")}</p>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] text-white/50">Min: {chalMinLength} soniya</span>
                                <span className="text-[10px] text-white/50">Max: {chalMaxLength} soniya</span>
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <input type="range" min={5} max={300} value={chalMinLength} onChange={e=>setChalMinLength(+e.target.value)} className="w-full accent-orange-400"/>
                                  <p className="text-[9px] text-white/30 text-center">Minimum</p>
                                </div>
                                <div className="flex-1">
                                  <input type="range" min={5} max={600} value={chalMaxLength} onChange={e=>setChalMaxLength(+e.target.value)} className="w-full accent-orange-400"/>
                                  <p className="text-[9px] text-white/30 text-center">Maksimum</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rules List */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_nav_rules")} ro'yxati</p>
                          <div className="space-y-2">
                            {chalRules.map((r,i)=>(
                              <div key={i} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-[10px] font-black" style={{background:"linear-gradient(135deg,#b45309,#fb923c)",color:"white"}}>{i+1}</div>
                                <input value={r} onChange={e=>setChalRules(p=>{const n=[...p];n[i]=e.target.value;return n;})}
                                  placeholder={`${i+1}t("create.chal_rules_ph")`}
                                  className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)"}}/>
                                {i === chalRules.length-1 && <button onClick={()=>setChalRules(p=>[...p,""])} className="flex-shrink-0 mt-1"><Plus className="w-4 h-4" style={{color:"#fb923c"}}/></button>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Entry requirements */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_req_label")}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                              <span className="text-xs text-white/60">{t("create.chal_req_followers")}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>setChalMinFollowers(p=>Math.max(0,p-100))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">-</span></button>
                                <span className="text-xs font-bold text-white w-12 text-center">{chalMinFollowers.toLocaleString()}</span>
                                <button onClick={()=>setChalMinFollowers(p=>p+100)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">+</span></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                              <span className="text-xs text-white/60">{t("create.chal_req_likes")}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>setChalMinLikes(p=>Math.max(0,p-50))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">-</span></button>
                                <span className="text-xs font-bold text-white w-12 text-center">{chalMinLikes.toLocaleString()}</span>
                                <button onClick={()=>setChalMinLikes(p=>p+50)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">+</span></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                              <span className="text-xs text-white/60">{t("create.chal_req_age")}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>setChalAgeMin(p=>Math.max(0,p-1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">-</span></button>
                                <span className="text-xs font-bold text-white w-8 text-center">{chalAgeMin||"Yo'q"}</span>
                                <button onClick={()=>setChalAgeMin(p=>p+1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">+</span></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                              <span className="text-xs text-white/60">{t("create.chal_req_max_entry")}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>setChalMaxEntries(p=>Math.max(1,p-1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">-</span></button>
                                <span className="text-xs font-bold text-white w-6 text-center">{chalMaxEntries}</span>
                                <button onClick={()=>setChalMaxEntries(p=>p+1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.15)"}}><span className="text-orange-400 text-sm font-bold">+</span></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Toggles */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_options_label")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:chalVerifReq,s:setChalVerifReq,l:t("create.chal_opt_verif")},{v:chalTeamAllowed,s:setChalTeamAllowed,l:t("create.chal_opt_team")},{v:chalDuetReq,s:setChalDuetReq,l:t("create.chal_opt_duet")},{v:chalCollabReq,s:setChalCollabReq,l:t("create.chal_opt_collab")},{v:chalReactionReq,s:setChalReactionReq,l:t("create.chal_opt_reaction")},{v:chalCommentReq,s:setChalCommentReq,l:t("create.chal_opt_comment")},{v:chalReentry,s:setChalReentry,l:t("create.chal_opt_reentry")},{v:chalLeaderboard,s:setChalLeaderboard,l:t("create.chal_opt_leaderboard")}].map(({v,s,l})=>(
                              <button key={l} onClick={()=>s((p:boolean)=>!p)}
                                className="py-2.5 px-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all"
                                style={{background:v?"rgba(251,146,60,0.15)":"rgba(255,255,255,0.05)",color:v?"#fb923c":"rgba(255,255,255,0.45)",border:v?"1px solid rgba(251,146,60,0.35)":"1px solid rgba(255,255,255,0.07)"}}>
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:v?"#fb923c":"rgba(255,255,255,0.2)"}}/>{l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Team size if enabled */}
                        {chalTeamAllowed && (
                          <div className="px-3 py-3 rounded-xl" style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)"}}>
                            <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_team_label")}</p>
                            <div className="flex items-center gap-3 justify-center">
                              <button onClick={()=>setChalTeamSize(p=>Math.max(2,p-1))} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold" style={{background:"rgba(251,146,60,0.15)",color:"#fb923c"}}>-</button>
                              <span className="text-2xl font-black text-white">{chalTeamSize}</span>
                              <button onClick={()=>setChalTeamSize(p=>Math.min(10,p+1))} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold" style={{background:"rgba(251,146,60,0.15)",color:"#fb923c"}}>+</button>
                            </div>
                            <p className="text-[10px] text-white/30 text-center mt-1">{t("create.chal_team_suffix")}</p>
                          </div>
                        )}

                        {/* Review mode */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_review_label")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"auto",l:t("create.chal_review_auto")},{v:"manual",l:t("create.chal_review_manual")},{v:"community",l:t("create.chal_review_comm")},{v:"hybrid",l:t("create.chal_review_hybrid")}].map(({v,l})=>(
                              <button key={v} onClick={()=>setChalReviewMode(v)}
                                className="py-2.5 rounded-xl text-[11px] font-bold transition-all"
                                style={{background:chalReviewMode===v?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalReviewMode===v?"white":"rgba(255,255,255,0.5)",border:chalReviewMode===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>)}

                      {/* PRIZES SECTION */}
                      {chalSection === "prizes" && (<div className="space-y-4">

                        {/* Prize Pool */}
                        <div className="rounded-2xl p-4 text-center" style={{background:"linear-gradient(135deg,rgba(180,83,9,0.25),rgba(251,146,60,0.12))"}}>
                          <p className="text-2xl mb-1">🏆</p>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_prize_pool")}</p>
                          <input value={chalPrizePool} onChange={e=>setChalPrizePool(e.target.value)}
                            placeholder={t("create.chal_prize_ph")}
                            className="w-full text-center rounded-xl px-3 py-2.5 text-lg font-black focus:outline-none"
                            style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.3)",color:"#fb923c"}}/>
                        </div>

                        {/* 1st 2nd 3rd */}
                        <div className="space-y-3">
                          {[{e:"🥇",l:t("create.chal_prize_1"),v:chalPrize1,s:setChalPrize1,col:"#fb923c"},{e:"🥈",l:t("create.chal_prize_2"),v:chalPrize2,s:setChalPrize2,col:"#94a3b8"},{e:"🥉",l:t("create.chal_prize_3"),v:chalPrize3,s:setChalPrize3,col:"#cd7c39"}].map(({e,l,v,s,col})=>(
                            <div key={l} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:"rgba(255,255,255,0.06)"}}>{e}</div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold mb-1" style={{color:col}}>{l}</p>
                                <input value={v} onChange={e=>s(e.target.value)} placeholder={t("create.chal_prize_ph_item")}
                                  className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                  style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${col}33`}}/>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Badge type */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_badge_label")}</p>
                          <div className="flex flex-wrap gap-2">
                            {[t("create.chal_badge_gold", "🥇 Oltin"),t("create.chal_badge_silver", "🥈 Kumush"),t("create.chal_badge_diamond", "💎 Brilliant"),t("create.chal_badge_star", "⭐ Yulduz"),t("create.chal_badge_fire", "🔥 Olov"),t("create.chal_badge_crown", "👑 Toj"),t("create.chal_badge_rocket", "🚀 Raketa"),t("create.chal_badge_trophy", "🏆 Kubka")].map(b=>(
                              <button key={b} onClick={()=>setChalBadge(b)}
                                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                                style={{background:chalBadge===b?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalBadge===b?"white":"rgba(255,255,255,0.5)"}}>
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Certificate */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_cert_label")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"digital",l:t("create.chal_cert_digital")},{v:"physical",l:t("create.chal_cert_physical")},{v:"nft",l:t("create.chal_cert_nft")},{v:"none",l:t("create.chal_cert_none")}].map(({v,l})=>(
                              <button key={v} onClick={()=>setChalCertType(v)}
                                className="py-2.5 rounded-xl text-[11px] font-bold transition-all"
                                style={{background:chalCertType===v?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalCertType===v?"white":"rgba(255,255,255,0.5)",border:chalCertType===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Entry fee */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_fee_label")}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[{v:"free",l:t("create.chal_fee_free")},{v:"paid",l:t("create.chal_fee_paid")},{v:"token",l:t("create.chal_fee_token")}].map(({v,l})=>(
                              <button key={v} onClick={()=>setChalEntryFee(v)}
                                className="py-2.5 rounded-xl text-xs font-bold transition-all"
                                style={{background:chalEntryFee===v?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalEntryFee===v?"white":"rgba(255,255,255,0.5)",border:chalEntryFee===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                          {chalEntryFee !== "free" && (
                            <input value={chalEntryPrice} onChange={e=>setChalEntryPrice(e.target.value)} placeholder={t("create.chal_fee_ph")}
                              className="mt-2 w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)"}}/>
                          )}
                        </div>

                      </div>)}

                      {/* ADVANCED SECTION */}
                      {chalSection === "advanced" && (<div className="space-y-4">

                        {/* Voting */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_vote_label")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{v:"community",l:t("create.chal_review_comm")},{v:"judges",l:t("create.chal_vote_judges")},{v:"hybrid",l:t("create.chal_review_hybrid")},{v:"ai",l:t("create.chal_vote_ai")}].map(({v,l})=>(
                              <button key={v} onClick={()=>setChalVotingType(v)}
                                className="py-2.5 rounded-xl text-xs font-bold transition-all"
                                style={{background:chalVotingType===v?"linear-gradient(135deg,#b45309,#fb923c)":"rgba(255,255,255,0.06)",color:chalVotingType===v?"white":"rgba(255,255,255,0.5)",border:chalVotingType===v?"none":"1px solid rgba(255,255,255,0.08)"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Judges */}
                        {(chalVotingType==="judges"||chalVotingType==="hybrid") && (
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_vote_judges")} Paneli</p>
                            <div className="flex gap-2">
                              <input value={chalJudgeInput} onChange={e=>setChalJudgeInput(e.target.value)}
                                placeholder={t("create.chal_judge_ph")}
                                className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                                style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                              <button onClick={()=>{if(chalJudgeInput.trim()){setChalJudges(p=>[...p,chalJudgeInput.trim()]);setChalJudgeInput("");}}}
                                className="px-3 rounded-xl text-xs font-bold" style={{background:"linear-gradient(135deg,#b45309,#fb923c)",color:"white"}}>
                                <Plus className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {chalJudges.map((j,i)=>(
                                <div key={i} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold" style={{background:"rgba(251,146,60,0.15)",color:"#fb923c"}}>
                                  {j} <button onClick={()=>setChalJudges(p=>p.filter((_,k)=>k!==i))}><X className="w-2.5 h-2.5"/></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Winner delay */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_winner_delay")}</p>
                          <div className="flex items-center gap-3 justify-center px-3 py-3 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                            <button onClick={()=>setChalWinnerDelay(p=>Math.max(0,p-1))} className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold" style={{background:"rgba(251,146,60,0.15)",color:"#fb923c"}}>-</button>
                            <span className="text-2xl font-black text-white w-16 text-center">{chalWinnerDelay}h</span>
                            <button onClick={()=>setChalWinnerDelay(p=>p+1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold" style={{background:"rgba(251,146,60,0.15)",color:"#fb923c"}}>+</button>
                          </div>
                        </div>

                        {/* Sponsor */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_sponsor_label")}</p>
                          <input value={chalSponsor} onChange={e=>setChalSponsor(e.target.value)} placeholder={t("create.chal_sponsor_ph")}
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)"}}/>
                          <input value={chalSponsorUrl} onChange={e=>setChalSponsorUrl(e.target.value)} placeholder="https://homiy-sayti.com"
                            className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                            style={{background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)"}}/>
                        </div>

                        {/* Notifications */}
                        <div>
                          <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_notif_label")}</p>
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-2" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                            <span className="text-xs text-white/60">{t("create.chal_notif_toggle")}</span>
                            <button onClick={()=>setChalNotifReminder(p=>!p)} className="flex items-center px-0.5 rounded-full" style={{background:chalNotifReminder?"#fb923c":"rgba(255,255,255,0.12)",justifyContent:chalNotifReminder?"flex-end":"flex-start",height:20,width:34}}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          {chalNotifReminder && (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{background:"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.2)"}}>
                              <span className="text-xs text-white/60 flex-1">{t("create.chal_notif_days")}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>setChalReminderDays(p=>Math.max(1,p-1))} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.2)"}}><span className="text-orange-400 font-bold">-</span></button>
                                <span className="text-xs font-bold text-white w-6 text-center">{chalReminderDays}</span>
                                <button onClick={()=>setChalReminderDays(p=>p+1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:"rgba(251,146,60,0.2)"}}><span className="text-orange-400 font-bold">+</span></button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Discord + Share template */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_discord_label")}</p>
                            <input value={chalDiscord} onChange={e=>setChalDiscord(e.target.value)} placeholder="discord.gg/..."
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(88,101,242,0.1)",border:"1px solid rgba(88,101,242,0.3)"}}/>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-1 uppercase tracking-wider">{t("create.chal_share_label")}</p>
                            <input value={chalShareTemplate} onChange={e=>setChalShareTemplate(e.target.value)} placeholder={t("create.chal_share_ph")}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none"
                              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>
                          </div>
                        </div>

                        {/* Featured + Geo */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-3 py-3 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                            <div>
                              <p className="text-xs text-white/70">{t("create.chal_featured_label")}</p>
                              <p className="text-[10px] text-white/30">{t("create.chal_featured_desc")}</p>
                            </div>
                            <button onClick={()=>setChalFeatured(p=>!p)} className="flex items-center px-0.5 rounded-full flex-shrink-0" style={{background:chalFeatured?"#fb923c":"rgba(255,255,255,0.12)",justifyContent:chalFeatured?"flex-end":"flex-start",height:20,width:34}}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white"/>
                            </button>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/45 mb-2 uppercase tracking-wider">{t("create.chal_geo_label")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[t("countries.uz", "🇺🇿 O'zbekiston"),t("countries.ru", "🇷🇺 Rossiya"),t("countries.us", "🇺🇸 AQSh"),t("countries.de", "🇩🇪 Germaniya"),t("countries.tr", "🇹🇷 Turkiya"),t("create.vis_everyone", "🌍 Hamma")].map(g=>(
                                <button key={g} onClick={()=>setChalGeoRestrict(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g])}
                                  className="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all"
                                  style={{background:chalGeoRestrict.includes(g)?"rgba(251,146,60,0.2)":"rgba(255,255,255,0.06)",color:chalGeoRestrict.includes(g)?"#fb923c":"rgba(255,255,255,0.45)",border:chalGeoRestrict.includes(g)?"1px solid rgba(251,146,60,0.4)":"1px solid rgba(255,255,255,0.08)"}}>
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Stats preview */}
                        <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,rgba(180,83,9,0.2),rgba(251,146,60,0.08))"}}>
                          <p className="text-[10px] font-bold text-white/45 mb-3 uppercase tracking-wider">{t("create.chal_stats_title")}</p>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[{e:"👥",l:t("create.chal_stats_part"),v:"500–2K"},{e:"👁",l:t("create.chal_stats_views"),v:"50K+"},{e:"🔥",l:t("create.chal_stats_viral"),v:"78%"}].map(({e,l,v})=>(
                              <div key={l}>
                                <span className="text-xl">{e}</span>
                                <p className="text-sm font-black mt-1" style={{color:"#fb923c"}}>{v}</p>
                                <p className="text-[9px] text-white/30 leading-tight mt-0.5">{l}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>)}

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
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("create.ai_analyzing")}</>
                      : <><Sparkles className="w-3.5 h-3.5" /> {t("create.ai_predict")}</>}
                  </button>
                )}
                <div className="flex gap-3">
                  <button onClick={handleClose}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    {t("create.cancel")}
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
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("create.publishing")}</>
                      : timeCapsule && scheduledAt
                        ? <><span>⏳</span> {t("create.capsule_save")}</>
                        : <><Upload className="w-4 h-4" /> {t("create.publish")}</>
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
