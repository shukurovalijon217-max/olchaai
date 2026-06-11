import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImagePlus, Video, Music, FileText, Upload, Loader2,
  CheckCircle2, Play, Film, Camera, Plus
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

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: TabType;
}

const ACCEPT = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  video: "video/mp4,video/webm,video/mov,video/avi",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac",
  any: "image/*,video/*,audio/*",
};

function UploadZone({
  accept, label, icon: Icon, onFile, file, isUploading, progress, preview,
}: {
  accept: string;
  label: string;
  icon: React.ElementType;
  onFile: (f: File) => void;
  file: File | null;
  isUploading: boolean;
  progress: number;
  preview?: string;
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

      {/* Preview — preview is always a blob: URL from createObjectURL, works in all src attrs */}
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

      {/* Upload progress */}
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="w-32 bg-border rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}

      {/* Empty state */}
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

export default function CreateContentModal({ open, onClose, defaultTab = "post" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const createPost = useCreatePost();
  const createReel = useCreateReel();
  const createStory = useCreateStory();

  const [tab, setTab] = useState<TabType>(defaultTab);
  const [done, setDone] = useState(false);

  const [postContent, setPostContent] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string>("");
  const [postUploadResult, setPostUploadResult] = useState<{ serveUrl: string } | null>(null);

  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelPreview, setReelPreview] = useState<string>("");
  const [reelCaption, setReelCaption] = useState("");
  const [reelAudio, setReelAudio] = useState("");
  const [reelAudioFile, setReelAudioFile] = useState<File | null>(null);
  const [reelAudioPreview, setReelAudioPreview] = useState<string>("");
  const [reelUploadResult, setReelUploadResult] = useState<{ serveUrl: string } | null>(null);
  const [reelAudioUploadResult, setReelAudioUploadResult] = useState<{ serveUrl: string } | null>(null);

  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string>("");
  const [storyCaption, setStoryCaption] = useState("");
  const [storyUploadResult, setStoryUploadResult] = useState<{ serveUrl: string } | null>(null);

  const { uploadFile: upPost, isUploading: upPostBusy, progress: upPostProg } = useMediaUpload({
    onSuccess: r => { setPostUploadResult(r); },
  });
  const { uploadFile: upReel, isUploading: upReelBusy, progress: upReelProg } = useMediaUpload({
    onSuccess: r => { setReelUploadResult(r); },
  });
  const { uploadFile: upReelAudio, isUploading: upReelAudioBusy, progress: upReelAudioProg } = useMediaUpload({
    onSuccess: r => { setReelAudioUploadResult(r); },
  });
  const { uploadFile: upStory, isUploading: upStoryBusy, progress: upStoryProg } = useMediaUpload({
    onSuccess: r => { setStoryUploadResult(r); },
  });

  const [submitting, setSubmitting] = useState(false);

  const handleFile = (file: File, setter: (f: File) => void, previewSetter: (s: string) => void, uploader: (f: File) => Promise<any>) => {
    setter(file);
    const url = URL.createObjectURL(file);
    previewSetter(url);
    uploader(file);
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      if (tab === "post") {
        const type = postFile
          ? postFile.type.startsWith("video") ? "video"
          : postFile.type.startsWith("audio") ? "video"
          : "photo"
          : "text";
        await createPost.mutateAsync({
          data: {
            authorId: user.id,
            content: postContent || postCaption,
            type,
            mediaUrl: postUploadResult?.serveUrl,
          },
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
      setTimeout(() => { handleClose(); }, 1500);
    } catch {
      /* error handled by mutation */
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPostContent(""); setPostCaption(""); setPostFile(null); setPostPreview(""); setPostUploadResult(null);
    setReelFile(null); setReelPreview(""); setReelCaption(""); setReelAudio(""); setReelAudioFile(null); setReelAudioPreview(""); setReelUploadResult(null); setReelAudioUploadResult(null);
    setStoryFile(null); setStoryPreview(""); setStoryCaption(""); setStoryUploadResult(null);
    setDone(false); setSubmitting(false);
    onClose();
  };

  const canSubmit = !submitting && !upPostBusy && !upReelBusy && !upStoryBusy && !upReelAudioBusy && (
    (tab === "post" && (postContent.trim() || postUploadResult)) ||
    (tab === "reel" && !!reelUploadResult && reelCaption.trim()) ||
    (tab === "story" && !!storyUploadResult)
  );

  const TABS: { id: TabType; icon: React.ElementType; label: string }[] = [
    { id: "post", icon: ImagePlus, label: "Post" },
    { id: "reel", icon: Film, label: "Reel" },
    { id: "story", icon: Camera, label: "Story" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-lg bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">Kontent yaratish</h2>
              <button onClick={handleClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Success */}
              {done && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                  <p className="text-lg font-bold text-foreground">Muvaffaqiyatli yuklandi!</p>
                </motion.div>
              )}

              {!done && (
                <>
                  {/* POST TAB */}
                  {tab === "post" && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => document.getElementById("post-img-input")?.click()}
                          className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed transition-colors ${postFile?.type.startsWith("image") ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <ImagePlus className="w-6 h-6 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Rasm</span>
                          <input id="post-img-input" type="file" accept={ACCEPT.image} className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setPostFile, setPostPreview, upPost); e.target.value = ""; }} />
                        </button>
                        <button
                          onClick={() => document.getElementById("post-vid-input")?.click()}
                          className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed transition-colors ${postFile?.type.startsWith("video") ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <Video className="w-6 h-6 text-cyan-400" />
                          <span className="text-xs font-semibold text-foreground">Video</span>
                          <input id="post-vid-input" type="file" accept={ACCEPT.video} className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setPostFile, setPostPreview, upPost); e.target.value = ""; }} />
                        </button>
                        <button
                          onClick={() => document.getElementById("post-aud-input")?.click()}
                          className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed transition-colors ${postFile?.type.startsWith("audio") ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <Music className="w-6 h-6 text-amber-400" />
                          <span className="text-xs font-semibold text-foreground">Qo'shiq</span>
                          <input id="post-aud-input" type="file" accept={ACCEPT.audio} className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setPostFile, setPostPreview, upPost); e.target.value = ""; }} />
                        </button>
                      </div>

                      {postFile && (
                        <div className="relative rounded-2xl overflow-hidden bg-muted" style={{ minHeight: 140 }}>
                          {upPostBusy ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                              <Loader2 className="w-7 h-7 text-primary animate-spin" />
                              <div className="w-32 bg-border rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${upPostProg}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground">Yuklanmoqda {upPostProg}%</p>
                            </div>
                          ) : postFile.type.startsWith("image") ? (
                            <img src={postPreview} alt="" className="w-full max-h-64 object-cover" />
                          ) : postFile.type.startsWith("video") ? (
                            <video src={postPreview} className="w-full max-h-64 object-cover" controls muted />
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                              <Music className="w-8 h-8 text-amber-400" />
                              <p className="text-sm font-medium text-foreground">{postFile.name}</p>
                              <audio controls src={postPreview} className="w-48" />
                            </div>
                          )}
                          {!upPostBusy && (
                            <button
                              onClick={() => { setPostFile(null); setPostPreview(""); setPostUploadResult(null); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          )}
                          {postUploadResult && !upPostBusy && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-400/90 text-black text-xs font-bold px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Yuklandi
                            </div>
                          )}
                        </div>
                      )}

                      <textarea
                        placeholder="Nima haqida yozyapsiz?"
                        rows={3}
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        className="w-full resize-none bg-muted rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}

                  {/* REEL TAB */}
                  {tab === "reel" && (
                    <div className="space-y-3">
                      <UploadZone
                        accept={ACCEPT.video}
                        label="Video yuklang (Reel)"
                        icon={Play}
                        onFile={f => handleFile(f, setReelFile, setReelPreview, upReel)}
                        file={reelFile}
                        isUploading={upReelBusy}
                        progress={upReelProg}
                        preview={reelPreview}
                      />
                      {reelUploadResult && !upReelBusy && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Video yuklandi
                        </div>
                      )}

                      <textarea
                        placeholder="Reel tavsifi..."
                        rows={2}
                        value={reelCaption}
                        onChange={e => setReelCaption(e.target.value)}
                        className="w-full resize-none bg-muted rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />

                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Fon musiqa (ixtiyoriy)</p>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => document.getElementById("reel-audio-input")?.click()}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed text-sm transition-colors ${reelAudioFile ? "border-amber-400/50 bg-amber-400/5 text-amber-400" : "border-border text-muted-foreground hover:border-amber-400/50"}`}
                          >
                            <Music className="w-4 h-4" />
                            {reelAudioFile ? reelAudioFile.name.slice(0, 20) + "…" : "Audio yuklash"}
                            <input id="reel-audio-input" type="file" accept={ACCEPT.audio} className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setReelAudioFile, setReelAudioPreview, upReelAudio); e.target.value = ""; }} />
                          </button>
                          {upReelAudioBusy && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                          {reelAudioUploadResult && !upReelAudioBusy && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          <span className="text-xs text-muted-foreground">yoki</span>
                          <input
                            placeholder="Musiqa nomi"
                            value={reelAudio}
                            onChange={e => setReelAudio(e.target.value)}
                            className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STORY TAB */}
                  {tab === "story" && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => document.getElementById("story-img-input")?.click()}
                          className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed transition-colors ${storyFile?.type.startsWith("image") ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <Camera className="w-7 h-7 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Rasm</span>
                          <input id="story-img-input" type="file" accept={ACCEPT.image} className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setStoryFile, setStoryPreview, upStory); e.target.value = ""; }} />
                        </button>
                        <button
                          onClick={() => document.getElementById("story-vid-input")?.click()}
                          className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed transition-colors ${storyFile?.type.startsWith("video") ? "border-cyan-400 bg-cyan-400/5" : "border-border hover:border-cyan-400/50"}`}
                        >
                          <Video className="w-7 h-7 text-cyan-400" />
                          <span className="text-xs font-semibold text-foreground">Video</span>
                          <input id="story-vid-input" type="file" accept={ACCEPT.video} className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, setStoryFile, setStoryPreview, upStory); e.target.value = ""; }} />
                        </button>
                      </div>

                      {storyFile && (
                        <div className="relative rounded-2xl overflow-hidden bg-muted" style={{ minHeight: 200 }}>
                          {upStoryBusy ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              <div className="w-32 bg-border rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${upStoryProg}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground">{upStoryProg}%</p>
                            </div>
                          ) : storyFile.type.startsWith("image") ? (
                            <img src={storyPreview} alt="" className="w-full max-h-72 object-cover" />
                          ) : (
                            <video src={storyPreview} className="w-full max-h-72 object-cover" controls muted />
                          )}
                          {!upStoryBusy && (
                            <button
                              onClick={() => { setStoryFile(null); setStoryPreview(""); setStoryUploadResult(null); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          )}
                          {storyUploadResult && !upStoryBusy && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-400/90 text-black text-xs font-bold px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Yuklandi
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        placeholder="Story sarlavhasi (ixtiyoriy)"
                        value={storyCaption}
                        onChange={e => setStoryCaption(e.target.value)}
                        className="w-full bg-muted rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!done && (
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={handleClose} className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                  Bekor
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {submitting ? "Yuklanmoqda..." : "E'lon qilish"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
