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

  const handleEditorDone = (overlays: TextOverlay[], audioName: string, filterName: string) => {
    setPostOverlays(overlays);
    setPostAudioName(audioName);
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

  const TABS: { id: TabType; icon: React.ElementType; label: string }[] = [
    { id: "post",  icon: ImagePlus, label: "Post"  },
    { id: "reel",  icon: Film,      label: "Reel"  },
    { id: "story", icon: Camera,    label: "Story" },
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

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/6">
              <h2 className="font-bold text-base text-white">Kontent yaratish</h2>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: tab === t.id ? "rgba(124,58,237,0.9)" : "rgba(255,255,255,0.06)",
                    color: tab === t.id ? "white" : "rgba(255,255,255,0.45)",
                  }}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
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
