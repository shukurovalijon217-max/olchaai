import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImagePlus, Video, Music, FileText, Upload, Loader2,
  CheckCircle2, Play, Film, Camera,
  Maximize2, Square, RectangleVertical,
  MessageCircle, Share2, Users, Globe, Ban, Plus, Trash2,
} from "lucide-react";
import {
  useCreatePost, useCreateReel, useCreateStory,
  getListPostsQueryKey, getListReelsQueryKey, getListStoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMediaUpload } from "@/hooks/useMediaUpload";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type TabType = "post" | "reel" | "story";
type Permission = "everyone" | "followers" | "none";
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
  { value: "none",      icon: Ban,            label: "O'chirilgan",   desc: "Hech kim",                 color: "#f87171" },
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

  /* Sequential upload runner */
  useEffect(() => {
    const pending = mediaQueue.find(m => m.status === "idle");
    if (!pending || uploadingRef.current) return;
    uploadingRef.current = true;
    setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "uploading" } : m));
    const form = new FormData();
    form.append("file", pending.file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/api/media/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = e => {
      if (e.lengthComputable)
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, progress: Math.round((e.loaded / e.total) * 100) } : m));
    };
    xhr.onload = () => {
      uploadingRef.current = false;
      try {
        const res = JSON.parse(xhr.responseText);
        const serveUrl: string = res.serveUrl ?? res.url ?? "";
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "done", progress: 100, serveUrl } : m));
      } catch {
        setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "error" } : m));
      }
    };
    xhr.onerror = () => { uploadingRef.current = false; setMediaQueue(q => q.map(m => m.id === pending.id ? { ...m, status: "error" } : m)); };
    xhr.send(form);
  }, [mediaQueue]);

  const addFiles = (files: FileList) => {
    const newItems: MediaItem[] = Array.from(files).slice(0, 10 - mediaQueue.length).map(f => ({
      id: `${Date.now()}-${Math.random()}`, file: f,
      preview: URL.createObjectURL(f),
      status: "idle", progress: 0,
    }));
    setMediaQueue(q => [...q, ...newItems]);
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

                      {/* Caption */}
                      <textarea
                        placeholder={mediaQueue.length > 0 ? "Izoh qo'shing…" : "Nima haqida yozyapsiz?"}
                        rows={3}
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      />

                      {/* Permission settings */}
                      <div className="rounded-2xl p-3.5 space-y-3.5"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold text-white/60 mb-1">Maxfiylik sozlamalari</p>
                        <PermPicker label="Kim izoh yoza oladi" icon={MessageCircle} value={commentPerm} onChange={setCommentPerm} />
                        <PermPicker label="Kim ulasha oladi"    icon={Share2}        value={sharePerm}   onChange={setSharePerm} />
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
              <div className="px-5 pb-6 flex gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
                    : <><Upload className="w-4 h-4" /> E'lon qilish</>
                  }
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
