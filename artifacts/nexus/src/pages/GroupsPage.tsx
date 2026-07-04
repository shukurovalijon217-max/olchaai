import { useState, useRef, useCallback, useEffect, ElementType } from "react";
import { playSmsSound, getFeaturePref } from "@/lib/sounds";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Lock, Plus, Search, X, ChevronLeft, ChevronRight,
  Globe, Eye, EyeOff, Shield, Zap, Image as ImageIcon,
  MessageSquare, Upload, Check, AlertCircle, Crown, Mic,
  Radio, ShoppingBag, Award, Pin, File as FileIcon, Bot, Mail, Send,
  Instagram, Hash, Link, BookOpen, Music, Utensils, Plane,
  Briefcase, FlaskConical, Heart, Palette, Info, Settings2,
  BarChart3, CalendarDays, Volume2, Sparkles, Code, Clock,
  Bell, Languages, Repeat2, Star, Flame, Swords, Brush,
  Trash2, AlertTriangle, MoreHorizontal, MessageCircle, Bookmark,
  Flag, Copy, UserMinus, PenLine,
} from "lucide-react";
import DrawingCanvas from "@/components/DrawingCanvas";
import { useTranslation } from "react-i18next";
import { useListGroups, useJoinGroup, useCreateGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Upload cover image ─────────────────────────────────────── */
async function uploadFile(file: File): Promise<string> {
  const r = await fetch(`${API}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!r.ok) throw new Error("Yuklash URL olishda xato");
  const { uploadURL, objectPath } = await r.json();
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  const cleanPath = String(objectPath).replace(/^\/+/, "");
  return `${API}/api/storage/objects/${cleanPath}`;
}

/* ── Constants ──────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "education",      label: "Ta'lim",       icon: BookOpen },
  { id: "technology",     label: "Texnologiya",   icon: Zap },
  { id: "entertainment",  label: "Ko'ngilochar",  icon: Star },
  { id: "sports",         label: "Sport",         icon: Flame },
  { id: "gaming",         label: "O'yinlar",      icon: Swords },
  { id: "art",            label: "San'at",        icon: Brush },
  { id: "music",          label: "Musiqa",        icon: Music },
  { id: "food",           label: "Ovqat",         icon: Utensils },
  { id: "travel",         label: "Sayohat",       icon: Plane },
  { id: "business",       label: "Biznes",        icon: Briefcase },
  { id: "science",        label: "Fan",           icon: FlaskConical },
  { id: "health",         label: "Salomatlik",    icon: Heart },
  { id: "other",          label: "Boshqa",        icon: Globe },
];

const GROUP_TYPES = [
  { id: "discussion",   label: "Muhokama" },
  { id: "learning",     label: "O'rganish" },
  { id: "news",         label: "Yangiliklar" },
  { id: "entertainment",label: "Ko'ngilochar" },
  { id: "project",      label: "Loyiha" },
  { id: "community",    label: "Jamiyat" },
  { id: "club",         label: "Klub" },
  { id: "official",     label: "Rasmiy" },
];

const GROUP_ICONS = [
  "🌟","🔥","💎","🚀","🎯","🌈","⚡","🎮","🎵","🎨",
  "🦋","🌊","🏆","🦁","🐉","🌙","☀️","❄️","🍀","🎭",
  "🤖","🌺","🏔️","🎸","🦊","🌍","💡","🎪","🏄","🎓",
];

const THEME_COLORS = [
  { hex: "#7857ff", label: "Binafsha" },
  { hex: "#ef4444", label: "Qizil" },
  { hex: "#f97316", label: "To'q sariq" },
  { hex: "#eab308", label: "Sariq" },
  { hex: "#22c55e", label: "Yashil" },
  { hex: "#06b6d4", label: "Ko'k" },
  { hex: "#ec4899", label: "Pushti" },
  { hex: "#8b5cf6", label: "Siyohrang" },
];

const PERM_OPTIONS = [
  { id: "all",      label: "Hamma" },
  { id: "members",  label: "A'zolar" },
  { id: "verified", label: "Tasdiqlangan" },
  { id: "admins",   label: "Adminlar" },
];

const PERM_OPTIONS_SHORT = [
  { id: "members", label: "A'zolar" },
  { id: "admins",  label: "Adminlar" },
];

const STEPS = [
  { id: 1, label: "Asosiy",     icon: Info },
  { id: 2, label: "Tasvir",     icon: ImageIcon },
  { id: 3, label: "Maxfiylik",  icon: Shield },
  { id: 4, label: "Ruxsatlar",  icon: Lock },
  { id: 5, label: "Funksiyalar",icon: Zap },
  { id: 6, label: "Qo'shimcha", icon: Settings2 },
];

const COLORS_CARD = [
  "from-violet-500/30 to-purple-600/20",
  "from-cyan-500/30 to-blue-600/20",
  "from-rose-500/30 to-pink-600/20",
  "from-emerald-500/30 to-teal-600/20",
  "from-amber-500/30 to-orange-600/20",
];

/* ── Types ──────────────────────────────────────────────────── */
interface GroupMember {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
  role: string;
  isMuted: boolean;
  joinedAt: string;
}

interface SettingsForm {
  name: string;
  description: string;
  category: string;
  groupType: string;
  privacyLevel: "public" | "private" | "secret";
  joinType: "auto" | "manual" | "invite";
  icon: string;
  themeColor: string;
  maxMembers: number;
  coverUrl: string;
  coverFile: File | null;
  coverPreview: string;
  welcomeMessage: string;
  rules: string[];
  tags: string[];
  websiteUrl: string;
  contactEmail: string;
  telegramLink: string;
  instagramLink: string;
}

interface GroupPost {
  id: number;
  groupId: number;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  mediaUrl: string | null;
  postType: string;
  isPinned: boolean;
  likesCount: number;
  reactionsCount: number;
  commentsCount: number;
  bookmarksCount: number;
  isLikedByMe: boolean;
  myReaction: string | null;
  isBookmarked: boolean;
  createdAt: string;
}

interface GroupComment {
  id: number;
  postId: number;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  parentId: number | null;
  content: string;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

interface GroupPoll {
  id: number;
  groupId: number;
  creatorId: number;
  question: string;
  options: string[];
  totalVotes: number;
  voteCounts: number[];
  myVoteIndex: number | null;
  endsAt: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

const REACTIONS: { type: string; emoji: string; label: string }[] = [
  { type: "heart", emoji: "❤️", label: "Sevaman" },
  { type: "fire",  emoji: "🔥", label: "Ajoyib" },
  { type: "laugh", emoji: "😂", label: "Kulgili" },
  { type: "wow",   emoji: "😮", label: "Hayratda" },
  { type: "clap",  emoji: "👏", label: "Bravo" },
  { type: "sad",   emoji: "😢", label: "Achinish" },
];

function renderContent(text: string) {
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) return <span key={i} className="text-primary font-semibold">{part}</span>;
    if (/^@\w+/.test(part)) return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
    if (/^https?:\/\/\S+/.test(part)) return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 break-all">{part}</a>;
    return part;
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

type PrivacyLevel = "public" | "private" | "secret";
type JoinType     = "auto" | "manual" | "invite";
type PermLevel    = "all" | "members" | "verified" | "admins";
type PermShort    = "members" | "admins";

interface FormState {
  // Step 1
  name: string;
  description: string;
  about: string;
  category: string;
  groupType: string;
  // Step 2
  coverUrl: string;
  coverFile: File | null;
  coverPreview: string;
  icon: string;
  themeColor: string;
  // Step 3
  privacy: PrivacyLevel;
  joinType: JoinType;
  ageRestriction: boolean;
  maxMembers: number;
  showMemberList: boolean;
  showOnlineMembers: boolean;
  searchDiscovery: boolean;
  requireApproval: boolean;
  // Step 4
  postPermission: PermLevel;
  commentPermission: PermLevel;
  mediaPermission: PermLevel;
  invitePermission: PermLevel;
  eventPermission: PermShort;
  pollPermission: PermShort;
  allowExternalLinks: boolean;
  allowAnonymousPosts: boolean;
  allowCrossPosting: boolean;
  // Step 5
  featPolls: boolean;
  featEvents: boolean;
  featVoiceRooms: boolean;
  featLiveStreams: boolean;
  featMarketplace: boolean;
  featBadges: boolean;
  featPinnedPosts: boolean;
  featFileSharing: boolean;
  featAiModeration: boolean;
  featWeeklyDigest: boolean;
  featAnnouncements: boolean;
  featAutoTranslate: boolean;
  featCodeSnippets: boolean;
  featScheduledPosts: boolean;
  // Step 6
  welcomeMessage: string;
  rules: string[];
  tags: string[];
  websiteUrl: string;
  contactEmail: string;
  telegramLink: string;
  instagramLink: string;
  missionStatement: string;
  joinQuestion1: string;
  joinQuestion2: string;
  joinQuestion3: string;
}

const DEFAULT_FORM: FormState = {
  name: "", description: "", about: "", category: "", groupType: "",
  coverUrl: "", coverFile: null, coverPreview: "", icon: "🌟", themeColor: "#7857ff",
  privacy: "public", joinType: "auto", ageRestriction: false, maxMembers: 0,
  showMemberList: true, showOnlineMembers: true, searchDiscovery: true, requireApproval: false,
  postPermission: "all", commentPermission: "all", mediaPermission: "members",
  invitePermission: "members", eventPermission: "members", pollPermission: "members",
  allowExternalLinks: true, allowAnonymousPosts: false, allowCrossPosting: false,
  featPolls: true, featEvents: true, featVoiceRooms: false, featLiveStreams: false,
  featMarketplace: false, featBadges: true, featPinnedPosts: true, featFileSharing: true,
  featAiModeration: true, featWeeklyDigest: false, featAnnouncements: true,
  featAutoTranslate: false, featCodeSnippets: false, featScheduledPosts: false,
  welcomeMessage: "", rules: ["", "", "", "", ""], tags: ["", "", "", "", ""],
  websiteUrl: "", contactEmail: "", telegramLink: "", instagramLink: "",
  missionStatement: "", joinQuestion1: "", joinQuestion2: "", joinQuestion3: "",
};

/* ── Sub-components ─────────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative focus:outline-none ${on ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function ToggleRow({
  icon: Icon, label, desc, on, onToggle, accent = "text-primary",
}: { icon: ElementType; label: string; desc: string; on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-2.5">
        <div className={`w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

function PermSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              value === opt.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function GroupsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: groups = [], isLoading } = useListGroups({ search: search || undefined });
  const join = useJoinGroup();
  const create = useCreateGroup();
  const qc = useQueryClient();
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Group detail state ────────────────────────────────────────
  type GroupRow = (typeof groups)[0];
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"feed" | "members" | "about">("feed");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [groupPostsLoading, setGroupPostsLoading] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string>("");
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const postFileRef = useRef<HTMLInputElement>(null);

  // ── Post features state ──────────────────────────────────────
  const [commentsByPost, setCommentsByPost] = useState<Record<number, GroupComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [loadingComments, setLoadingComments] = useState<Set<number>>(new Set());
  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Set<number>>(new Set());
  const [reactionPickerPostId, setReactionPickerPostId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [postFilter, setPostFilter] = useState<"all" | "media" | "polls">("all");
  const [postSort, setPostSort] = useState<"newest" | "popular">("newest");
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [showPollCompose, setShowPollCompose] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [submittingPoll, setSubmittingPoll] = useState(false);
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [groupStats, setGroupStats] = useState<{ posts: number; members: number; totalLikes: number; totalComments: number } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [postMenuOpenId, setPostMenuOpenId] = useState<number | null>(null);
  const [memberMenuId, setMemberMenuId] = useState<number | null>(null);

  // ── Voice recording state ─────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── AI assist state ───────────────────────────────────────────
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [drawingBlob, setDrawingBlob] = useState<Blob | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ── Internal share modal state ────────────────────────────────
  const [sharePost, setSharePost] = useState<GroupPost | null>(null);
  const [shareComment, setShareComment] = useState("");
  const [sharingPost, setSharingPost] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // ── Settings panel state ─────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsCoverUploading, setSettingsCoverUploading] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [newTagText, setNewTagText] = useState("");
  const settingsCoverRef = useRef<HTMLInputElement>(null);
  const DEFAULT_SETTINGS_FORM: SettingsForm = {
    name: "", description: "", category: "", groupType: "",
    privacyLevel: "public", joinType: "auto", icon: "🌟", themeColor: "#7857ff",
    maxMembers: 0, coverUrl: "", coverFile: null, coverPreview: "",
    welcomeMessage: "", rules: [], tags: [],
    websiteUrl: "", contactEmail: "", telegramLink: "", instagramLink: "",
  };
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);

  const sf = <K extends keyof SettingsForm>(key: K, val: SettingsForm[K]) =>
    setSettingsForm(prev => ({ ...prev, [key]: val }));

  const { user } = useAuth();

  // 🔔 Sound: track new group posts from others
  const prevPostIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!user) return;
    const newFromOthers = groupPosts.filter(p => !prevPostIdsRef.current.has(p.id) && p.authorId !== user.id);
    if (newFromOthers.length > 0 && prevPostIdsRef.current.size > 0) {
      if (getFeaturePref("sound_notif", true)) playSmsSound();
    }
    prevPostIdsRef.current = new Set(groupPosts.map(p => p.id));
  }, [groupPosts.length]);

  // 🔔 Sound: track new group comments from others
  const prevGroupCommentCountRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const total = Object.values(commentsByPost)
      .flat()
      .filter(c => c.authorId !== user.id).length;
    if (total > prevGroupCommentCountRef.current && prevGroupCommentCountRef.current > 0) {
      if (getFeaturePref("sound_notif", true)) playSmsSound();
    }
    prevGroupCommentCountRef.current = total;
  }, [Object.values(commentsByPost).reduce((s, arr) => s + arr.length, 0)]);

  // 🔔 Poll for new group posts every 25s when a group is open
  const selectedGroupIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedGroup) { selectedGroupIdRef.current = null; return; }
    selectedGroupIdRef.current = selectedGroup.id;
    const iv = setInterval(async () => {
      const gid = selectedGroupIdRef.current;
      if (!gid) return;
      try {
        const r = await fetch(`${API}/api/groups/${gid}/posts`, { credentials: "include" });
        if (!r.ok) return;
        const fresh: GroupPost[] = await r.json();
        const prevIds = prevPostIdsRef.current;
        const hasNew = fresh.some(p => !prevIds.has(p.id) && p.authorId !== user?.id);
        if (hasNew) {
          setGroupPosts(fresh);
        }
      } catch { /* silent */ }
    }, 25000);
    return () => clearInterval(iv);
  }, [selectedGroup?.id]);

  const f = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  /* ── Cover upload ──────────────────────────────────────────── */
  const handleFileChange = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    f("coverPreview", preview);
    f("coverFile", file);
  }, []);

  const uploadCover = useCallback(async (): Promise<string> => {
    if (!form.coverFile) return form.coverUrl;
    setUploading(true);
    try {
      const url = await uploadFile(form.coverFile);
      f("coverUrl", url);
      return url;
    } finally {
      setUploading(false);
    }
  }, [form.coverFile, form.coverUrl]);

  /* ── Join group ────────────────────────────────────────────── */
  const handleJoin = (id: number) => {
    const s = new Set(joinedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setJoinedIds(s);
    join.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }) });
  };

  /* ── Submit ────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setCreating(true);
    try {
      const uploadedCoverUrl = await uploadCover();

      const settings = {
        privacy: {
          ageRestriction: form.ageRestriction,
          showMemberList: form.showMemberList,
          showOnlineMembers: form.showOnlineMembers,
          searchDiscovery: form.searchDiscovery,
          requireApproval: form.requireApproval,
        },
        permissions: {
          post: form.postPermission,
          comment: form.commentPermission,
          media: form.mediaPermission,
          invite: form.invitePermission,
          event: form.eventPermission,
          poll: form.pollPermission,
          externalLinks: form.allowExternalLinks,
          anonymousPosts: form.allowAnonymousPosts,
          crossPosting: form.allowCrossPosting,
        },
        features: {
          polls: form.featPolls,
          events: form.featEvents,
          voiceRooms: form.featVoiceRooms,
          liveStreams: form.featLiveStreams,
          marketplace: form.featMarketplace,
          badges: form.featBadges,
          pinnedPosts: form.featPinnedPosts,
          fileSharing: form.featFileSharing,
          aiModeration: form.featAiModeration,
          weeklyDigest: form.featWeeklyDigest,
          announcements: form.featAnnouncements,
          autoTranslate: form.featAutoTranslate,
          codeSnippets: form.featCodeSnippets,
          scheduledPosts: form.featScheduledPosts,
        },
        extra: {
          missionStatement: form.missionStatement,
          welcomeMessage: form.welcomeMessage,
          rules: form.rules.filter(r => r.trim()),
          tags: form.tags.filter(t => t.trim()),
          websiteUrl: form.websiteUrl,
          contactEmail: form.contactEmail,
          telegramLink: form.telegramLink,
          instagramLink: form.instagramLink,
          joinQuestion1: form.joinQuestion1,
          joinQuestion2: form.joinQuestion2,
          joinQuestion3: form.joinQuestion3,
        },
      };

      create.mutate(
        {
          data: {
            name: form.name.trim(),
            description: `${form.description.trim()}${form.about.trim() ? `\n\n${form.about.trim()}` : ""}`,
            coverUrl: uploadedCoverUrl || undefined,
            isPrivate: form.privacy !== "public",
            privacyLevel: form.privacy,
            joinType: form.joinType,
            category: form.category || undefined,
            groupType: form.groupType || undefined,
            icon: form.icon,
            themeColor: form.themeColor,
            maxMembers: form.maxMembers || undefined,
            settings,
          },
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
            setCreated(true);
            setTimeout(() => {
              setShowCreate(false);
              setCreated(false);
              setStep(1);
              setForm(DEFAULT_FORM);
            }, 1800);
          },
          onError: () => setCreating(false),
        }
      );
    } catch {
      setCreating(false);
    }
  };

  /* ── Step validation ───────────────────────────────────────── */
  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 2 && form.description.trim().length >= 5;
    return true;
  };

  const closeModal = () => {
    setShowCreate(false);
    setTimeout(() => { setStep(1); setForm(DEFAULT_FORM); setCreated(false); setCreating(false); }, 300);
  };

  // ── Settings panel helpers ────────────────────────────────────
  const handleOpenSettings = useCallback(() => {
    if (!selectedGroup) return;
    const g = selectedGroup as any;
    const extra = g.settings?.extra ?? {};
    setSettingsForm({
      name: g.name ?? "",
      description: g.description ?? "",
      category: g.category ?? "",
      groupType: g.groupType ?? "",
      privacyLevel: g.privacyLevel ?? "public",
      joinType: g.joinType ?? "auto",
      icon: g.icon ?? "🌟",
      themeColor: g.themeColor ?? "#7857ff",
      maxMembers: g.maxMembers ?? 0,
      coverUrl: g.coverUrl ?? "",
      coverFile: null,
      coverPreview: "",
      welcomeMessage: extra.welcomeMessage ?? "",
      rules: Array.isArray(extra.rules) ? extra.rules : [],
      tags: Array.isArray(extra.tags) ? extra.tags : [],
      websiteUrl: extra.websiteUrl ?? "",
      contactEmail: extra.contactEmail ?? "",
      telegramLink: extra.telegramLink ?? "",
      instagramLink: extra.instagramLink ?? "",
    });
    setNewRuleText("");
    setNewTagText("");
    setShowSettings(true);
  }, [selectedGroup]);

  const handleSettingsCoverChange = useCallback(async (file: File) => {
    sf("coverPreview", URL.createObjectURL(file));
    sf("coverFile", file);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!selectedGroup) return;
    setSettingsSaving(true);
    try {
      let finalCoverUrl = settingsForm.coverUrl;

      if (settingsForm.coverFile) {
        setSettingsCoverUploading(true);
        try {
          const url = await uploadFile(settingsForm.coverFile);
          finalCoverUrl = url;
        } finally {
          setSettingsCoverUploading(false);
        }
      }

      const payload = {
        name: settingsForm.name,
        description: settingsForm.description,
        category: settingsForm.category,
        privacyLevel: settingsForm.privacyLevel,
        joinType: settingsForm.joinType,
        icon: settingsForm.icon,
        themeColor: settingsForm.themeColor,
        maxMembers: settingsForm.maxMembers,
        coverUrl: finalCoverUrl,
        settings: {
          extra: {
            welcomeMessage: settingsForm.welcomeMessage,
            rules: settingsForm.rules,
            tags: settingsForm.tags,
            websiteUrl: settingsForm.websiteUrl,
            contactEmail: settingsForm.contactEmail,
            telegramLink: settingsForm.telegramLink,
            instagramLink: settingsForm.instagramLink,
          }
        },
      };

      const res = await fetch(`${API}/api/groups/${selectedGroup.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedGroup(updated);
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowSettings(false);
      }
    } catch { /* silent */ } finally {
      setSettingsSaving(false);
    }
  }, [selectedGroup, settingsForm, qc]);

  // ── Group detail helpers ──────────────────────────────────────
  const fetchGroupPosts = useCallback(async (groupId: number) => {
    setGroupPostsLoading(true);
    try {
      const r = await fetch(`${API}/api/groups/${groupId}/posts`, { credentials: "include" });
      if (r.ok) setGroupPosts(await r.json());
    } catch { /* silent */ } finally {
      setGroupPostsLoading(false);
    }
  }, []);

  const openGroup = (group: GroupRow) => {
    setSelectedGroup(group);
    setActiveDetailTab("feed");
    setGroupMembers([]);
    setGroupPosts([]);
    setNewPostContent("");
    setDeleteGroupConfirm(false);
    setPostImageFile(null);
    setPostImagePreview("");
    fetchGroupPosts(group.id);
  };

  const closeDetail = () => {
    setSelectedGroup(null);
    setGroupMembers([]);
    setGroupPosts([]);
    setDeleteGroupConfirm(false);
    setPostImageFile(null);
    setPostImagePreview("");
  };

  const fetchMembers = useCallback(async (groupId: number) => {
    setMembersLoading(true);
    try {
      const r = await fetch(`${API}/api/groups/${groupId}/members`, { credentials: "include" });
      if (r.ok) setGroupMembers(await r.json());
    } catch { /* silent */ } finally {
      setMembersLoading(false);
    }
  }, []);

  const handlePostImageChange = useCallback(async (file: File) => {
    setPostImagePreview(URL.createObjectURL(file));
    setPostImageFile(file);
  }, []);

  /* ── Voice recording ─────────────────────────────────────────── */
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recordingChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 59) { handleStopRecording(); return 60; }
          return t + 1;
        });
      }, 1000);
    } catch {
      showToast("Mikrofon ruxsat berilmadi");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    handleStopRecording();
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
  };

  /* ── AI text assist ──────────────────────────────────────────── */
  const handleDrawingSend = (blob: Blob, dataUrl: string) => {
    setShowDraw(false);
    setDrawingBlob(blob);
    setDrawingPreview(dataUrl);
  };

  const handleAiAssist = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const r = await fetch(`${API}/api/ai/group-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          groupName: selectedGroup?.name,
          groupCategory: selectedGroup?.category,
        }),
      });
      if (r.ok) {
        const { text } = await r.json();
        setNewPostContent(prev => prev ? prev + "\n" + text : text);
        setAiPrompt("");
        setShowAiAssist(false);
        showToast("AI matni qo'shildi ✓");
      } else {
        showToast("AI xizmati hozir mavjud emas");
      }
    } catch {
      showToast("AI xizmatiga ulanishda xato");
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Internal OlchaAI share ─────────────────────────────────────── */
  const handleShareToFeed = async () => {
    if (!sharePost || sharingPost) return;
    setSharingPost(true);
    try {
      const content = shareComment.trim()
        ? `${shareComment}\n\n📢 "${sharePost.content.slice(0, 80)}${sharePost.content.length > 80 ? "..." : ""}"`
        : `📢 "${selectedGroup?.name}" guruhidan: ${sharePost.content.slice(0, 100)}${sharePost.content.length > 100 ? "..." : ""}`;
      const r = await fetch(`${API}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, mediaUrl: sharePost.mediaUrl ?? null }),
      });
      if (r.ok) {
        showToast("Post lentangizga ulashildi ✓");
        setSharePost(null);
        setShareComment("");
      } else {
        showToast("Ulashishda xato");
      }
    } catch {
      showToast("Ulashishda xato");
    } finally {
      setSharingPost(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!selectedGroup || submittingPost) return;
    const hasText = newPostContent.trim().length > 0;
    const hasImage = !!postImageFile;
    const hasAudio = !!audioBlob;
    const hasDrawing = !!drawingBlob;
    if (!hasText && !hasImage && !hasAudio && !hasDrawing) return;

    setSubmittingPost(true);
    try {
      let mediaUrl: string | null = null;

      if (drawingBlob) {
        try {
          const drawFile = new File([drawingBlob], `drawing-${Date.now()}.png`, { type: "image/png" });
          mediaUrl = await uploadFile(drawFile);
        } catch {
          showToast("Chizma yuklanmadi");
          setSubmittingPost(false);
          return;
        }
      } else if (hasImage) {
        setUploadingPostImage(true);
        try {
          mediaUrl = await uploadFile(postImageFile!);
        } catch {
          showToast("Rasm yuklanmadi, qayta urinib ko'ring");
          setUploadingPostImage(false);
          return;
        }
        setUploadingPostImage(false);
      } else if (hasAudio) {
        setUploadingAudio(true);
        try {
          const audioFile = new File([audioBlob!], `voice-${Date.now()}.webm`, { type: "audio/webm" });
          mediaUrl = await uploadFile(audioFile);
        } catch {
          showToast("Audio yuklanmadi");
          setUploadingAudio(false);
          return;
        }
        setUploadingAudio(false);
      }

      const content = hasText ? newPostContent.trim() : (hasAudio ? "🎤 Ovozli xabar" : "");
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, mediaUrl, postType: hasAudio ? "voice" : "text" }),
      });
      if (r.ok) {
        const newPost: GroupPost = await r.json();
        setGroupPosts(prev => [newPost, ...prev]);
        setNewPostContent("");
        setPostImageFile(null);
        setPostImagePreview("");
        setAudioBlob(null);
        setAudioPreviewUrl(null);
        setRecordingTime(0);
        setDrawingBlob(null);
        setDrawingPreview(null);
        setSelectedGroup(prev => prev ? { ...prev, postsCount: (prev.postsCount ?? 0) + 1 } : null);
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        showToast("Post yuborildi ✓");
      } else {
        const errData = await r.json().catch(() => ({}));
        showToast((errData as any).error ?? "Post yuborishda xato");
      }
    } catch {
      showToast("Post yuborishda xato");
    } finally {
      setSubmittingPost(false);
      setUploadingPostImage(false);
      setUploadingAudio(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    if (!selectedGroup) return;
    setGroupPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const nowLiked = !p.isLikedByMe;
      return { ...p, isLikedByMe: nowLiked, likesCount: nowLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) };
    }));
    try {
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/like`, {
        method: "POST", credentials: "include",
      });
      if (r.ok) {
        const { liked, likesCount } = await r.json();
        setGroupPosts(prev => prev.map(p => p.id === postId ? { ...p, isLikedByMe: liked, likesCount } : p));
      }
    } catch { /* silent */ }
  };

  const handleSharePost = async (post: GroupPost) => {
    const text = `${post.authorDisplayName}: ${post.content}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedGroup?.name ?? "OlchaAI", text, url: window.location.href });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.ok) {
      setGroupPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedGroup(prev => prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount ?? 0) - 1) } : null);
      qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.ok) {
      closeDetail();
      qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    }
  };

  // ── Reaction helpers ─────────────────────────────────────────
  const handleReact = useCallback(async (postId: number, reactionType: string) => {
    if (!selectedGroup) return;
    setReactionPickerPostId(null);
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/react`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactionType }),
    });
    if (r.ok) {
      const { myReaction, reactionsCount } = await r.json();
      setGroupPosts(prev => prev.map(p => p.id === postId ? { ...p, myReaction, reactionsCount } : p));
    }
  }, [selectedGroup]);

  // ── Comment helpers ──────────────────────────────────────────
  const toggleComments = useCallback(async (postId: number) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); return next; }
      next.add(postId); return next;
    });
    if (!commentsByPost[postId]) {
      if (!selectedGroup) return;
      setLoadingComments(prev => new Set([...prev, postId]));
      try {
        const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/comments`, { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          setCommentsByPost(prev => ({ ...prev, [postId]: data }));
        }
      } finally {
        setLoadingComments(prev => { const n = new Set(prev); n.delete(postId); return n; });
      }
    }
  }, [selectedGroup, commentsByPost]);

  const handleSubmitComment = useCallback(async (postId: number) => {
    const text = newCommentText[postId]?.trim();
    if (!text || !selectedGroup) return;
    setSubmittingComment(prev => new Set([...prev, postId]));
    try {
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (r.ok) {
        const newComment = await r.json();
        setCommentsByPost(prev => ({ ...prev, [postId]: [newComment, ...(prev[postId] ?? [])] }));
        setNewCommentText(prev => ({ ...prev, [postId]: "" }));
        setGroupPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      }
    } finally {
      setSubmittingComment(prev => { const n = new Set(prev); n.delete(postId); return n; });
    }
  }, [selectedGroup, newCommentText]);

  const handleDeleteComment = useCallback(async (postId: number, commentId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/comments/${commentId}`, {
      method: "DELETE", credentials: "include",
    });
    if (r.ok) {
      setCommentsByPost(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }));
      setGroupPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p));
    }
  }, [selectedGroup]);

  const handleLikeComment = useCallback(async (postId: number, commentId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/comments/${commentId}/like`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) {
      const { liked, likesCount } = await r.json();
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map(c => c.id === commentId ? { ...c, isLikedByMe: liked, likesCount } : c),
      }));
    }
  }, [selectedGroup]);

  // ── Bookmark helper ──────────────────────────────────────────
  const handleBookmark = useCallback(async (postId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/bookmark`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) {
      const { bookmarked } = await r.json();
      setGroupPosts(prev => prev.map(p => p.id === postId
        ? { ...p, isBookmarked: bookmarked, bookmarksCount: bookmarked ? p.bookmarksCount + 1 : Math.max(0, p.bookmarksCount - 1) }
        : p));
      showToast(bookmarked ? "Saqlandi ✓" : "Saqlash bekor qilindi");
    }
  }, [selectedGroup]);

  // ── Pin helper ───────────────────────────────────────────────
  const handlePin = useCallback(async (postId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${postId}/pin`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) {
      const { pinned } = await r.json();
      setGroupPosts(prev => prev.map(p => ({
        ...p,
        isPinned: p.id === postId ? pinned : false,
      })).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      setPostMenuOpenId(null);
      showToast(pinned ? "Post pin qilindi 📌" : "Pin olib tashlandi");
    }
  }, [selectedGroup]);

  // ── Report helper ────────────────────────────────────────────
  const handleSubmitReport = useCallback(async () => {
    if (!reportPostId || !selectedGroup || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/posts/${reportPostId}/report`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (r.ok) {
        setReportPostId(null);
        setReportReason("");
        showToast("Shikoyat yuborildi ✓");
      }
    } finally {
      setSubmittingReport(false);
    }
  }, [reportPostId, reportReason, selectedGroup]);

  // ── Poll helpers ─────────────────────────────────────────────
  const fetchPolls = useCallback(async (groupId: number) => {
    const r = await fetch(`${API}/api/groups/${groupId}/polls`, { credentials: "include" });
    if (r.ok) setPolls(await r.json());
  }, []);

  const handleCreatePoll = useCallback(async () => {
    if (!selectedGroup || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    setSubmittingPoll(true);
    try {
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/polls`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) }),
      });
      if (r.ok) {
        const newPoll = await r.json();
        setPolls(prev => [newPoll, ...prev]);
        setPollQuestion(""); setPollOptions(["", ""]);
        setShowPollCompose(false);
        showToast("So'rovnoma yaratildi ✓");
      }
    } finally {
      setSubmittingPoll(false);
    }
  }, [selectedGroup, pollQuestion, pollOptions]);

  const handleVotePoll = useCallback(async (pollId: number, optionIndex: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/polls/${pollId}/vote`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
    if (r.ok) {
      const { totalVotes, voteCounts, myVoteIndex } = await r.json();
      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, totalVotes, voteCounts, myVoteIndex } : p));
    }
  }, [selectedGroup]);

  // ── Member management ────────────────────────────────────────
  const handleKickMember = useCallback(async (memberId: number) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/members/${memberId}`, {
      method: "DELETE", credentials: "include",
    });
    if (r.ok) {
      setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      setSelectedGroup(prev => prev ? { ...prev, membersCount: Math.max(0, (prev.membersCount ?? 0) - 1) } : null);
      setMemberMenuId(null);
      showToast("A'zo chiqarib yuborildi");
    }
  }, [selectedGroup]);

  const handleChangeRole = useCallback(async (memberId: number, role: string) => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/members/${memberId}/role`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (r.ok) {
      setGroupMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      setMemberMenuId(null);
      showToast(`Rol o'zgartirildi: ${role}`);
    }
  }, [selectedGroup]);

  // ── Invite link ──────────────────────────────────────────────
  const fetchInviteLink = useCallback(async () => {
    if (!selectedGroup || inviteLink) return;
    setLoadingInvite(true);
    try {
      const r = await fetch(`${API}/api/groups/${selectedGroup.id}/invite-link`, { credentials: "include" });
      if (r.ok) { const { link } = await r.json(); setInviteLink(link); }
    } finally {
      setLoadingInvite(false);
    }
  }, [selectedGroup, inviteLink]);

  // ── Stats ────────────────────────────────────────────────────
  const fetchGroupStats = useCallback(async () => {
    if (!selectedGroup) return;
    const r = await fetch(`${API}/api/groups/${selectedGroup.id}/stats`, { credentials: "include" });
    if (r.ok) setGroupStats(await r.json());
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedGroup && activeDetailTab === "members" && groupMembers.length === 0) {
      fetchMembers(selectedGroup.id);
    }
  }, [selectedGroup, activeDetailTab, groupMembers.length, fetchMembers]);

  useEffect(() => {
    if (selectedGroup && activeDetailTab === "feed" && polls.length === 0) {
      fetchPolls(selectedGroup.id);
    }
  }, [selectedGroup, activeDetailTab]);

  /* ── Step content ──────────────────────────────────────────── */
  const renderStep = () => {
    switch (step) {
      /* ── STEP 1: Basic ──────────────────────────────────────── */
      case 1: return (
        <div className="space-y-4">
          <div>
            <label className="label-sm">Jamoa nomi <span className="text-destructive">*</span></label>
            <input value={form.name} onChange={e => f("name", e.target.value)} maxLength={60}
              placeholder="Jamoa nomini kiriting..."
              className="input-base" />
            <p className="text-[10px] text-muted-foreground mt-1">{form.name.length}/60</p>
          </div>

          <div>
            <label className="label-sm">Qisqa tavsif <span className="text-destructive">*</span></label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)}
              rows={2} maxLength={200} placeholder="Jamoa haqida qisqacha..."
              className="input-base resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">{form.description.length}/200</p>
          </div>

          <div>
            <label className="label-sm">Batafsil ma'lumot</label>
            <textarea value={form.about} onChange={e => f("about", e.target.value)}
              rows={3} maxLength={1000} placeholder="Jamoa maqsadi, qoidalar, kutilmalar..."
              className="input-base resize-none" />
          </div>

          <div>
            <label className="label-sm">Kategoriya</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => f("category", cat.id)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    form.category === cat.id
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}>
                  <cat.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-sm">Jamoa turi</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {GROUP_TYPES.map(gt => (
                <button key={gt.id} onClick={() => f("groupType", gt.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    form.groupType === gt.id
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {gt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

      /* ── STEP 2: Media ──────────────────────────────────────── */
      case 2: return (
        <div className="space-y-5">
          {/* Cover image */}
          <div>
            <label className="label-sm">Muqova rasmi (Obloshka)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`relative mt-1 h-36 rounded-2xl overflow-hidden border-2 border-dashed transition-all cursor-pointer group ${
                form.coverPreview ? "border-primary/30" : "border-border hover:border-primary/40"
              }`}
            >
              {form.coverPreview ? (
                <>
                  <img src={form.coverPreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-br ${COLORS_CARD[0]}`}>
                  <Upload className="w-8 h-8 opacity-60" />
                  <p className="text-xs font-medium">Rasm tanlash</p>
                  <p className="text-[10px] opacity-60">JPG, PNG, WebP · Maks 10MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f2 = e.target.files?.[0]; if (f2) handleFileChange(f2); }} />
            {form.coverPreview && (
              <button onClick={() => { f("coverPreview", ""); f("coverFile", null); f("coverUrl", ""); }}
                className="mt-1.5 flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive">
                <X className="w-3 h-3" /> Rasmni olib tashlash
              </button>
            )}
          </div>

          {/* Group emoji icon */}
          <div>
            <label className="label-sm">Jamoa belgisi (emoji)</label>
            <div className="grid grid-cols-8 gap-1.5 mt-1">
              {GROUP_ICONS.map(emoji => (
                <button key={emoji} onClick={() => f("icon", emoji)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.icon === emoji ? "bg-primary/20 ring-2 ring-primary/50 scale-110" : "bg-muted hover:bg-muted/80"
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Theme color */}
          <div>
            <label className="label-sm">Mavzu rangi</label>
            <div className="flex gap-2 mt-1">
              {THEME_COLORS.map(c => (
                <button key={c.hex} onClick={() => f("themeColor", c.hex)}
                  title={c.label}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.themeColor === c.hex ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"
                  }`}
                  style={{ background: c.hex, outline: form.themeColor === c.hex ? `2px solid ${c.hex}` : undefined }} />
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div>
            <label className="label-sm">Ko'rinish namunasi</label>
            <div className="mt-1 rounded-2xl overflow-hidden border border-border">
              <div className="h-20 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${form.themeColor}40, ${form.themeColor}20)` }}>
                {form.coverPreview
                  ? <img src={form.coverPreview} alt="" className="w-full h-full object-cover absolute inset-0" />
                  : <span className="text-4xl z-10 relative">{form.icon}</span>}
              </div>
              <div className="p-3 bg-card">
                <p className="font-bold text-sm text-foreground">{form.name || "Jamoa nomi"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description || "Tavsif..."}</p>
              </div>
            </div>
          </div>
        </div>
      );

      /* ── STEP 3: Privacy ────────────────────────────────────── */
      case 3: return (
        <div className="space-y-5">
          {/* Privacy level */}
          <div>
            <label className="label-sm">Maxfiylik darajasi</label>
            <div className="space-y-2 mt-1">
              {([
                { id: "public",  icon: Globe,   label: "Ochiq",   desc: "Hamma ko'ra oladi va qo'shila oladi" },
                { id: "private", icon: Lock,    label: "Maxsus",  desc: "Ko'rinadi, lekin admin ruxsati kerak" },
                { id: "secret",  icon: EyeOff,  label: "Yashirin", desc: "Faqat taklif orqali topiladi" },
              ] as { id: PrivacyLevel; icon: ElementType; label: string; desc: string }[]).map(p => (
                <button key={p.id} onClick={() => f("privacy", p.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    form.privacy === p.id ? "bg-primary/10 border-primary/30" : "border-border hover:border-border/80"
                  }`}>
                  <p.icon className={`w-5 h-5 flex-shrink-0 ${form.privacy === p.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  {form.privacy === p.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Join type */}
          <div>
            <label className="label-sm">Qo'shilish usuli</label>
            <div className="space-y-2 mt-1">
              {([
                { id: "auto",   label: "Avtomatik",      desc: "Hamma darhol qo'shila oladi" },
                { id: "manual", label: "Qo'lda tasdiqlash", desc: "Admin har bir arizani ko'rib chiqadi" },
                { id: "invite", label: "Faqat taklif",   desc: "Faqat taklif linki orqali" },
              ] as { id: JoinType; label: string; desc: string }[]).map(jt => (
                <button key={jt.id} onClick={() => f("joinType", jt.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    form.joinType === jt.id ? "bg-primary/10 border-primary/30" : "border-border hover:border-border/80"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.joinType === jt.id ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{jt.label}</p>
                    <p className="text-xs text-muted-foreground">{jt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-0 rounded-2xl bg-card border border-border px-4 py-2">
            <ToggleRow icon={AlertCircle} label="18+ yosh chegarasi" desc="Faqat 18+ yoshdagilar uchun"
              on={form.ageRestriction} onToggle={() => f("ageRestriction", !form.ageRestriction)} accent="text-rose-400" />
            <ToggleRow icon={Eye} label="A'zolar ro'yxatini ko'rsatish" desc="Kim ko'ra olishini nazorat qiling"
              on={form.showMemberList} onToggle={() => f("showMemberList", !form.showMemberList)} />
            <ToggleRow icon={Globe} label="Online a'zolarni ko'rsatish" desc="Hozir faol a'zolar"
              on={form.showOnlineMembers} onToggle={() => f("showOnlineMembers", !form.showOnlineMembers)} />
            <ToggleRow icon={Search} label="Qidiruvda topilish" desc="Boshqalar jamoani topa oladi"
              on={form.searchDiscovery} onToggle={() => f("searchDiscovery", !form.searchDiscovery)} />
            <ToggleRow icon={Check} label="Ariza tasdiqlash" desc="Yangi a'zolarni qo'lda tasdiqlash"
              on={form.requireApproval} onToggle={() => f("requireApproval", !form.requireApproval)} />
          </div>

          {/* Max members */}
          <div>
            <label className="label-sm">A'zolar limiti</label>
            <div className="flex items-center gap-3 mt-1">
              <input type="number" value={form.maxMembers || ""} min={0} max={100000}
                onChange={e => f("maxMembers", Number(e.target.value))}
                placeholder="Cheksiz (0)"
                className="input-base flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">0 = cheksiz</span>
            </div>
          </div>
        </div>
      );

      /* ── STEP 4: Permissions ────────────────────────────────── */
      case 4: return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border px-4 py-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2 border-b border-border/40">Post & Izoh</p>
            <PermSelect label="Kim post yozadi" value={form.postPermission} options={PERM_OPTIONS}
              onChange={v => f("postPermission", v as PermLevel)} />
            <PermSelect label="Kim izoh yozadi" value={form.commentPermission} options={PERM_OPTIONS}
              onChange={v => f("commentPermission", v as PermLevel)} />
            <PermSelect label="Kim media yuklaydi" value={form.mediaPermission} options={PERM_OPTIONS}
              onChange={v => f("mediaPermission", v as PermLevel)} />
          </div>

          <div className="rounded-2xl bg-card border border-border px-4 py-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2 border-b border-border/40">Taklif & Tadbirlar</p>
            <PermSelect label="Kim taklif qiladi" value={form.invitePermission} options={PERM_OPTIONS}
              onChange={v => f("invitePermission", v as PermLevel)} />
            <PermSelect label="Kim event yaratadi" value={form.eventPermission} options={PERM_OPTIONS_SHORT}
              onChange={v => f("eventPermission", v as PermShort)} />
            <PermSelect label="Kim so'rovnoma yaratadi" value={form.pollPermission} options={PERM_OPTIONS_SHORT}
              onChange={v => f("pollPermission", v as PermShort)} />
          </div>

          <div className="rounded-2xl bg-card border border-border px-4 py-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2 border-b border-border/40">Qo'shimcha ruxsatlar</p>
            <ToggleRow icon={Link} label="Tashqi havolalar" desc="Post va izohlarda URL ishlaydi"
              on={form.allowExternalLinks} onToggle={() => f("allowExternalLinks", !form.allowExternalLinks)} />
            <ToggleRow icon={EyeOff} label="Anonim postlar" desc="A'zolar anonimlik bilan yozishi mumkin"
              on={form.allowAnonymousPosts} onToggle={() => f("allowAnonymousPosts", !form.allowAnonymousPosts)} />
            <ToggleRow icon={Repeat2} label="Boshqa guruhga ulashish" desc="Postlarni boshqa guruhlarga ulashish"
              on={form.allowCrossPosting} onToggle={() => f("allowCrossPosting", !form.allowCrossPosting)} />
          </div>
        </div>
      );

      /* ── STEP 5: Features ───────────────────────────────────── */
      case 5: return (
        <div className="space-y-1 rounded-2xl bg-card border border-border px-4 py-2">
          <ToggleRow icon={BarChart3}  label="So'rovnomalar"       desc="A'zolar ovoz berishi mumkin"
            on={form.featPolls}       onToggle={() => f("featPolls",       !form.featPolls)} />
          <ToggleRow icon={CalendarDays} label="Tadbirlar"         desc="Guruh ichida events yaratish"
            on={form.featEvents}      onToggle={() => f("featEvents",      !form.featEvents)} />
          <ToggleRow icon={Volume2}   label="Ovozli xonalar"      desc="Real-vaqtda audio suhbatlar"
            on={form.featVoiceRooms}  onToggle={() => f("featVoiceRooms",  !form.featVoiceRooms)} accent="text-emerald-400" />
          <ToggleRow icon={Radio}     label="Jonli efir"          desc="Guruh ichida live stream"
            on={form.featLiveStreams}  onToggle={() => f("featLiveStreams",  !form.featLiveStreams)} accent="text-rose-400" />
          <ToggleRow icon={ShoppingBag} label="Guruh bozorchasi"  desc="A'zolar mahsulot sotishi"
            on={form.featMarketplace} onToggle={() => f("featMarketplace", !form.featMarketplace)} accent="text-amber-400" />
          <ToggleRow icon={Award}     label="Nishon tizimi"       desc="Faol a'zolarga nishon berish"
            on={form.featBadges}      onToggle={() => f("featBadges",      !form.featBadges)} accent="text-yellow-400" />
          <ToggleRow icon={Pin}       label="Muhrlangan postlar"  desc="Muhim postlarni yuqoriga qo'yish"
            on={form.featPinnedPosts} onToggle={() => f("featPinnedPosts", !form.featPinnedPosts)} />
          <ToggleRow icon={FileIcon}  label="Fayl ulashish"       desc="Hujjat, PDF, arxiv ulashish"
            on={form.featFileSharing} onToggle={() => f("featFileSharing", !form.featFileSharing)} />
          <ToggleRow icon={Bot}       label="AI moderatsiya"      desc="Spam va zararli kontent filtrlanadi"
            on={form.featAiModeration} onToggle={() => f("featAiModeration", !form.featAiModeration)} accent="text-violet-400" />
          <ToggleRow icon={Mail}      label="Haftalik xulosa"     desc="A'zolarga haftalik email yuboriladi"
            on={form.featWeeklyDigest} onToggle={() => f("featWeeklyDigest", !form.featWeeklyDigest)} />
          <ToggleRow icon={Bell}      label="E'lonlar kanali"     desc="Adminlar uchun alohida e'lon kanali"
            on={form.featAnnouncements} onToggle={() => f("featAnnouncements", !form.featAnnouncements)} />
          <ToggleRow icon={Languages} label="Avtomatik tarjima"   desc="Xabarlar foydalanuvchi tiliga tarjima"
            on={form.featAutoTranslate} onToggle={() => f("featAutoTranslate", !form.featAutoTranslate)} accent="text-cyan-400" />
          <ToggleRow icon={Code}      label="Kod parchalar"       desc="Sintaksis rangli kod bloklari"
            on={form.featCodeSnippets} onToggle={() => f("featCodeSnippets", !form.featCodeSnippets)} accent="text-green-400" />
          <ToggleRow icon={Clock}     label="Rejalashtirilgan postlar" desc="Kelajakka post rejalash"
            on={form.featScheduledPosts} onToggle={() => f("featScheduledPosts", !form.featScheduledPosts)} />
        </div>
      );

      /* ── STEP 6: Extra ──────────────────────────────────────── */
      default: return null;
      case 6: return (
        <div className="space-y-4">
          {/* Mission */}
          <div>
            <label className="label-sm">Missiya bayonoti</label>
            <textarea value={form.missionStatement} onChange={e => f("missionStatement", e.target.value)}
              rows={2} maxLength={140} placeholder="Jamoaning asosiy maqsadi 140 belgi ichida..."
              className="input-base resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">{form.missionStatement.length}/140</p>
          </div>

          {/* Welcome message */}
          <div>
            <label className="label-sm">Yangi a'zo xush kelibsiz xabari</label>
            <textarea value={form.welcomeMessage} onChange={e => f("welcomeMessage", e.target.value)}
              rows={2} maxLength={500} placeholder="Yangi a'zolarga avtomatik yuboriladi..."
              className="input-base resize-none" />
          </div>

          {/* Rules */}
          <div>
            <label className="label-sm">Jamoa qoidalari (max 5 ta)</label>
            <div className="space-y-2 mt-1">
              {form.rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <input value={rule} onChange={e => {
                    const r = [...form.rules]; r[i] = e.target.value; f("rules", r);
                  }} placeholder={`${i + 1}-qoida...`} className="input-base py-2 text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label-sm">Teglar / hashtag (max 5 ta)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.tags.map((tag, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded-xl px-2 py-1.5">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <input value={tag} onChange={e => {
                    const tgs = [...form.tags]; tgs[i] = e.target.value.replace(/\s/g, ""); f("tags", tgs);
                  }} placeholder={`teg${i + 1}`} maxLength={20}
                    className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Qo'shilish savollari */}
          <div>
            <label className="label-sm">Qo'shilish savollari (ixtiyoriy)</label>
            <div className="space-y-2 mt-1">
              {[
                { key: "joinQuestion1" as const, ph: "1-savol: Nima uchun qo'shilmoqchisiz?" },
                { key: "joinQuestion2" as const, ph: "2-savol: Tajribangiz qanday?" },
                { key: "joinQuestion3" as const, ph: "3-savol: Qanday hissa qo'sha olasiz?" },
              ].map(({ key, ph }) => (
                <input key={key} value={form[key]} onChange={e => f(key, e.target.value)}
                  placeholder={ph} className="input-base text-sm" />
              ))}
            </div>
          </div>

          {/* Social links */}
          <div className="space-y-2">
            <label className="label-sm">Aloqa va ijtimoiy tarmoqlar</label>
            {[
              { key: "websiteUrl" as const,   icon: Globe,     ph: "https://sayt.uz" },
              { key: "contactEmail" as const, icon: Mail,      ph: "admin@jamoa.uz" },
              { key: "telegramLink" as const, icon: Send,      ph: "https://t.me/jamoa" },
              { key: "instagramLink" as const,icon: Instagram, ph: "https://instagram.com/jamoa" },
            ].map(({ key, icon: Icon, ph }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input value={form[key]} onChange={e => f(key, e.target.value)}
                  placeholder={ph} className="input-base text-sm" />
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("groups.title")}
        </h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          {t("groups.create")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t("groups.search_ph")}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors" />
      </div>

      {/* Groups grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="h-28 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t("groups.not_found")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group, i) => {
            const isMember = joinedIds.has(group.id) || group.isMember;
            return (
              <motion.div key={group.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => openGroup(group)}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-colors cursor-pointer">
                <div className={`h-24 bg-gradient-to-br ${COLORS_CARD[i % COLORS_CARD.length]} flex items-center justify-center relative overflow-hidden`}>
                  {group.coverUrl
                    ? <img src={group.coverUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-4xl font-black text-white/20">{group.name[0]}</span>}
                  {group.isPrivate && (
                    <div className="absolute top-2 right-2 bg-black/50 rounded-lg px-2 py-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">{t("groups.private")}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-foreground">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">{group.category}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); handleJoin(group.id); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
                        isMember
                          ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      }`}>
                      {isMember ? t("groups.leave") : t("groups.join")}
                    </motion.button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{group.membersCount.toLocaleString()} {t("groups.members")}</span>
                    <span>{group.postsCount} {t("groups.posts")}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Group Detail Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            key="group-detail"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            {/* Cover + header */}
            <div className="relative">
              <div
                className={`h-48 w-full bg-gradient-to-br ${COLORS_CARD[selectedGroup.id % COLORS_CARD.length]} relative flex items-center justify-center overflow-hidden`}
              >
                {selectedGroup.coverUrl ? (
                  <img
                    src={selectedGroup.coverUrl}
                    alt=""
                    className="w-full h-full object-cover absolute inset-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : null}
                <span className="text-8xl font-black text-white/10 select-none absolute">
                  {selectedGroup.name[0]}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
              </div>

              {/* Back button */}
              <button
                onClick={closeDetail}
                className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Settings button — creator only */}
              {user?.id === (selectedGroup as any).creatorId && (
                <button
                  onClick={handleOpenSettings}
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  title="Guruh sozlamalari"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
              )}

              {/* Group info overlay on cover */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <h2 className="text-xl font-bold text-white drop-shadow-lg">{selectedGroup.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
                  {selectedGroup.isPrivate
                    ? <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Yopiq guruh</span>
                    : <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Ochiq guruh</span>}
                  {selectedGroup.category && <span>• {selectedGroup.category}</span>}
                </div>
              </div>
            </div>

            {/* Stats + Join row */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-card/50">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{(selectedGroup.membersCount ?? 0).toLocaleString()}</span>
                  <span>a'zo</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{(selectedGroup.postsCount ?? 0).toLocaleString()}</span>
                  <span>post</span>
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={e => { e.stopPropagation(); handleJoin(selectedGroup.id); setSelectedGroup(prev => prev ? { ...prev, isMember: !prev.isMember, membersCount: prev.isMember ? prev.membersCount - 1 : prev.membersCount + 1 } : null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  (joinedIds.has(selectedGroup.id) || selectedGroup.isMember)
                    ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {(joinedIds.has(selectedGroup.id) || selectedGroup.isMember) ? "Chiqish" : "Qo'shilish"}
              </motion.button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border sticky top-0 bg-background z-10">
              {(["feed", "members", "about"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                    activeDetailTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "feed" ? "Lenta" : tab === "members" ? "A'zolar" : "Haqida"}
                  {activeDetailTab === tab && (
                    <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="max-w-2xl mx-auto px-4 py-5">
              {activeDetailTab === "feed" && (
                <div className="space-y-4">
                  {/* Post composer */}
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <textarea
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      placeholder="Guruh bilan fikringizni baham ko'ring..."
                      rows={3}
                      className="w-full bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
                    />
                    {/* Drawing preview in composer */}
                    {drawingPreview && (
                      <div className="relative mt-2 mb-1">
                        <img src={drawingPreview} alt="Chizma" className="rounded-xl w-full max-h-48 object-contain bg-[#1a1a2e]" />
                        <div className="absolute top-2 left-2 flex items-center gap-1 opacity-70">
                          <PenLine className="w-3 h-3 text-white" />
                          <span className="text-[9px] text-white font-medium">Chizma</span>
                        </div>
                        <button
                          onClick={() => { setDrawingBlob(null); setDrawingPreview(null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Image preview in composer */}
                    {postImagePreview && (
                      <div className="relative mt-2 mb-1">
                        <img src={postImagePreview} alt="" className="rounded-xl w-full max-h-48 object-cover" />
                        <button
                          onClick={() => { setPostImageFile(null); setPostImagePreview(""); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {uploadingPostImage && (
                          <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Audio preview */}
                    {audioPreviewUrl && !isRecording && (
                      <div className="mt-2 mb-1 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                        <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <audio src={audioPreviewUrl} controls className="flex-1 h-8" style={{ minWidth: 0, maxWidth: "100%" }} />
                        <button onClick={handleCancelRecording}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {uploadingAudio && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                      </div>
                    )}

                    {/* Recording indicator */}
                    {isRecording && (
                      <div className="mt-2 mb-1 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <span className="text-xs font-semibold text-red-400">Yozilmoqda... {recordingTime}s</span>
                        <button onClick={handleStopRecording}
                          className="ml-auto px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
                          To'xtatish
                        </button>
                      </div>
                    )}

                    {/* AI Assist input */}
                    <AnimatePresence>
                      {showAiAssist && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="mt-2 overflow-hidden">
                          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <input
                              autoFocus
                              value={aiPrompt}
                              onChange={e => setAiPrompt(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleAiAssist(); if (e.key === "Escape") setShowAiAssist(false); }}
                              placeholder="AI nima haqida yozsin? (Enter bosing)"
                              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                            {aiLoading
                              ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              : <button onClick={handleAiAssist} className="text-primary hover:opacity-70"><Send className="w-3.5 h-3.5" /></button>
                            }
                            <button onClick={() => { setShowAiAssist(false); setAiPrompt(""); }} className="text-muted-foreground hover:text-foreground">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Hidden file input */}
                    <input
                      ref={postFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePostImageChange(f); e.target.value = ""; }}
                    />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {/* Image */}
                        <button
                          onClick={() => postFileRef.current?.click()}
                          disabled={isRecording || !!audioBlob}
                          className={`p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 ${postImageFile ? "text-primary" : ""}`}
                          title="Rasm qo'shish"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        {/* Mic */}
                        <button
                          disabled={!!postImageFile}
                          onClick={isRecording ? handleStopRecording : (audioBlob ? handleCancelRecording : handleStartRecording)}
                          title={isRecording ? "Yozishni to'xtatish" : "Ovozli xabar"}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                            isRecording ? "text-red-400 bg-red-500/10 animate-pulse" :
                            audioBlob ? "text-primary bg-primary/10" :
                            "hover:bg-muted"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                        {/* Poll */}
                        <button
                          onClick={() => setShowPollCompose(s => !s)}
                          className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${showPollCompose ? "text-primary" : ""}`}
                          title="So'rovnoma yaratish">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        {/* AI Sparkles */}
                        <button
                          onClick={() => { setShowAiAssist(s => !s); setAiPrompt(""); }}
                          className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${showAiAssist ? "text-primary" : ""}`}
                          title="AI yordamida yozish"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        {/* Drawing canvas */}
                        <button
                          onClick={() => setShowDraw(true)}
                          className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${showDraw ? "text-primary" : ""}`}
                          title="Kanvasda chiz"
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        disabled={(!newPostContent.trim() && !postImageFile && !audioBlob && !drawingBlob) || submittingPost}
                        onClick={handleSubmitPost}
                        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        {submittingPost
                          ? <><div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Yuborilmoqda</>
                          : <><Send className="w-3 h-3" /> Yuborish</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Poll compose panel */}
                  <AnimatePresence>
                    {showPollCompose && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        className="bg-card border border-primary/20 rounded-2xl p-4 space-y-3 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          <p className="text-sm font-bold text-foreground">So'rovnoma yaratish</p>
                          <button onClick={() => setShowPollCompose(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          value={pollQuestion}
                          onChange={e => setPollQuestion(e.target.value)}
                          placeholder="Savol yozing..."
                          className="w-full bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <div className="space-y-2">
                          {pollOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                value={opt}
                                onChange={e => {
                                  const next = [...pollOptions];
                                  next[idx] = e.target.value;
                                  setPollOptions(next);
                                }}
                                placeholder={`Variant ${idx + 1}`}
                                className="flex-1 bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                              />
                              {pollOptions.length > 2 && (
                                <button onClick={() => setPollOptions(p => p.filter((_, i) => i !== idx))}
                                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {pollOptions.length < 6 && (
                            <button onClick={() => setPollOptions(p => [...p, ""])}
                              className="text-xs text-primary font-semibold flex items-center gap-1 hover:opacity-80">
                              <Plus className="w-3.5 h-3.5" /> Variant qo'shish
                            </button>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={handleCreatePoll}
                            disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || submittingPoll}
                            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1.5">
                            {submittingPoll
                              ? <><div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Yuklanmoqda</>
                              : "Yaratish"
                            }
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Filter + Sort bar */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
                      {(["all", "media", "polls"] as const).map(f => (
                        <button key={f} onClick={() => setPostFilter(f)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${postFilter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                          {f === "all" ? "Barchasi" : f === "media" ? "📷 Media" : "📊 So'rovnomalar"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
                      {(["newest", "popular"] as const).map(s => (
                        <button key={s} onClick={() => setPostSort(s)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${postSort === s ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                          {s === "newest" ? "🕒 Yangi" : "🔥 Mashhur"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Polls section */}
                  {postFilter !== "media" && polls.length > 0 && (
                    <div className="space-y-3">
                      {polls.map(poll => (
                        <div key={poll.id} className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">📊</span>
                            <p className="font-semibold text-sm text-foreground">{poll.question}</p>
                          </div>
                          <div className="space-y-2">
                            {poll.options.map((opt, idx) => {
                              const pct = poll.totalVotes > 0 ? Math.round((poll.voteCounts[idx] ?? 0) / poll.totalVotes * 100) : 0;
                              const isMyVote = poll.myVoteIndex === idx;
                              return (
                                <button key={idx}
                                  onClick={() => handleVotePoll(poll.id, idx)}
                                  className={`w-full text-left relative overflow-hidden rounded-xl border transition-all ${isMyVote ? "border-primary" : "border-border hover:border-primary/40"}`}>
                                  <div className="absolute inset-y-0 left-0 bg-primary/15 transition-all" style={{ width: `${pct}%` }} />
                                  <div className="relative flex items-center justify-between px-3 py-2">
                                    <span className={`text-xs font-semibold ${isMyVote ? "text-primary" : "text-foreground"}`}>{opt}</span>
                                    <span className="text-xs text-muted-foreground">{pct}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{poll.totalVotes} ovoz</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Posts list */}
                  {groupPostsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-muted rounded w-1/3" />
                              <div className="h-2 bg-muted rounded w-1/4" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded w-full" />
                            <div className="h-3 bg-muted rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : groupPosts.filter(p =>
                    postFilter === "media" ? !!p.mediaUrl :
                    postFilter === "polls" ? p.postType === "poll" : true
                  ).length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                        <MessageSquare className="w-9 h-9 opacity-30" />
                      </div>
                      <p className="font-semibold text-foreground mb-1">Hali postlar yo'q</p>
                      <p className="text-sm">Bu guruhda birinchi bo'lib post yozing!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupPosts
                        .filter(p =>
                          postFilter === "media" ? !!p.mediaUrl :
                          postFilter === "polls" ? p.postType === "poll" : true
                        )
                        .sort((a, b) =>
                          (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
                          (postSort === "popular"
                            ? (b.reactionsCount + b.commentsCount) - (a.reactionsCount + a.commentsCount)
                            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        )
                        .map(post => {
                        const isCreatorOrAdmin = user?.id === (selectedGroup as any)?.creatorId ||
                          groupMembers.find(m => m.id === user?.id)?.role === "admin";
                        const commentsOpen = expandedComments.has(post.id);
                        const postComments = commentsByPost[post.id] ?? [];
                        const myReactionEmoji = post.myReaction ? REACTIONS.find(r => r.type === post.myReaction)?.emoji : null;

                        return (
                          <motion.div key={post.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className={`bg-card border rounded-2xl overflow-hidden ${post.isPinned ? "border-amber-400/40 shadow-amber-400/10 shadow-md" : "border-border"}`}>
                            {post.isPinned && (
                              <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
                                <span className="text-xs">📌</span>
                                <span className="text-xs font-semibold text-amber-500">Muhim post</span>
                              </div>
                            )}

                            <div className="p-4">
                              {/* Author row */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground font-bold text-sm">
                                    {post.authorAvatarUrl
                                      ? <img src={post.authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                                      : post.authorDisplayName[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground leading-tight">{post.authorDisplayName}</p>
                                    <p className="text-[11px] text-muted-foreground">@{post.authorUsername} · {timeAgo(post.createdAt)}</p>
                                  </div>
                                </div>
                                {/* Post menu */}
                                <div className="relative flex-shrink-0">
                                  <button onClick={() => setPostMenuOpenId(postMenuOpenId === post.id ? null : post.id)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                  <AnimatePresence>
                                    {postMenuOpenId === post.id && (
                                      <motion.div initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-8 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[150px]">
                                        <button onClick={() => handleBookmark(post.id)}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2">
                                          <Bookmark className={`w-3.5 h-3.5 ${post.isBookmarked ? "fill-primary text-primary" : ""}`} />
                                          {post.isBookmarked ? "Saqlangan" : "Saqlash"}
                                        </button>
                                        {isCreatorOrAdmin && (
                                          <button onClick={() => handlePin(post.id)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2">
                                            <span>{post.isPinned ? "📌 Pin olib tashlash" : "📌 Pin qilish"}</span>
                                          </button>
                                        )}
                                        <button onClick={() => { setReportPostId(post.id); setPostMenuOpenId(null); }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-orange-500 flex items-center gap-2">
                                          <Flag className="w-3.5 h-3.5" /> Shikoyat
                                        </button>
                                        {(user?.id === post.authorId || isCreatorOrAdmin) && (
                                          <button onClick={() => { handleDeletePost(post.id); setPostMenuOpenId(null); }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-destructive flex items-center gap-2">
                                            <Trash2 className="w-3.5 h-3.5" /> O'chirish
                                          </button>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>

                              {/* Content */}
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>

                              {/* Media */}
                              {post.mediaUrl && post.postType === "voice" ? (
                                <div className="mt-3 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                                  <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
                                  <audio src={post.mediaUrl} controls className="flex-1 h-8" style={{ minWidth: 0 }} />
                                </div>
                              ) : post.mediaUrl ? (
                                <button onClick={() => setLightboxUrl(post.mediaUrl)} className="mt-3 w-full block">
                                  <img
                                    src={post.mediaUrl}
                                    alt=""
                                    className="rounded-xl w-full object-cover max-h-72 hover:opacity-95 transition-opacity cursor-zoom-in"
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </button>
                              ) : null}

                              {/* Reaction summary */}
                              {post.reactionsCount > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  {REACTIONS.filter(r => {
                                    return true;
                                  }).slice(0, 3).map(r => (
                                    <span key={r.type} className="text-sm">{r.emoji}</span>
                                  ))}
                                  <span className="text-xs text-muted-foreground ml-1">{post.reactionsCount}</span>
                                </div>
                              )}

                              {/* Action bar */}
                              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border flex-wrap">
                                {/* Reaction picker trigger */}
                                <div className="relative">
                                  <motion.button whileTap={{ scale: 0.85 }}
                                    onClick={() => setReactionPickerPostId(reactionPickerPostId === post.id ? null : post.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                      post.myReaction ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}>
                                    <span className="text-sm leading-none">{myReactionEmoji ?? "👍"}</span>
                                    {post.reactionsCount > 0 && <span>{post.reactionsCount}</span>}
                                  </motion.button>
                                  <AnimatePresence>
                                    {reactionPickerPostId === post.id && (
                                      <motion.div initial={{ opacity: 0, scale: 0.8, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 4 }} transition={{ duration: 0.12 }}
                                        className="absolute bottom-10 left-0 z-20 bg-card border border-border rounded-2xl shadow-xl p-2 flex gap-1">
                                        {REACTIONS.map(r => (
                                          <motion.button key={r.type} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                                            onClick={() => handleReact(post.id, r.type)}
                                            title={r.label}
                                            className={`text-xl p-1 rounded-lg transition-colors ${post.myReaction === r.type ? "bg-primary/15" : "hover:bg-muted"}`}>
                                            {r.emoji}
                                          </motion.button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Like button */}
                                <motion.button whileTap={{ scale: 0.85 }}
                                  onClick={() => handleLikePost(post.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                    post.isLikedByMe ? "bg-rose-500/15 text-rose-500" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}>
                                  <Heart className={`w-3.5 h-3.5 ${post.isLikedByMe ? "fill-rose-500" : ""}`} />
                                  {post.likesCount > 0 && <span>{post.likesCount}</span>}
                                </motion.button>

                                {/* Comment toggle */}
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleComments(post.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                    commentsOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}>
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
                                </motion.button>

                                {/* Share - OlchaAI internal */}
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={() => { setSharePost(post); setShareComment(""); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                                  <Repeat2 className="w-3.5 h-3.5" />
                                </motion.button>

                                <div className="flex-1" />

                                {/* Bookmark shortcut */}
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={() => handleBookmark(post.id)}
                                  className={`p-1.5 rounded-xl text-xs transition-all ${post.isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                                  <Bookmark className={`w-3.5 h-3.5 ${post.isBookmarked ? "fill-primary" : ""}`} />
                                </motion.button>
                              </div>

                              {/* Comments section */}
                              <AnimatePresence>
                                {commentsOpen && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    className="mt-3 pt-3 border-t border-border space-y-3 overflow-hidden">
                                    {/* Comment input */}
                                    <div className="flex items-start gap-2">
                                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                                        {user?.displayName?.[0]?.toUpperCase() ?? "?"}
                                      </div>
                                      <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                                        <input
                                          value={newCommentText[post.id] ?? ""}
                                          onChange={e => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(post.id); } }}
                                          placeholder="Izoh yozing..."
                                          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                        />
                                        <motion.button whileTap={{ scale: 0.9 }}
                                          onClick={() => handleSubmitComment(post.id)}
                                          disabled={!newCommentText[post.id]?.trim() || submittingComment.has(post.id)}
                                          className="text-primary disabled:opacity-40 flex-shrink-0">
                                          <Send className="w-3.5 h-3.5" />
                                        </motion.button>
                                      </div>
                                    </div>

                                    {/* Comments list */}
                                    {loadingComments.has(post.id) ? (
                                      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                        <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                                        Yuklanmoqda...
                                      </div>
                                    ) : postComments.length === 0 ? (
                                      <p className="text-xs text-muted-foreground py-1">Hali izohlar yo'q. Birinchi bo'ling!</p>
                                    ) : (
                                      <div className="space-y-2.5">
                                        {postComments.map(comment => (
                                          <div key={comment.id} className="flex items-start gap-2 group">
                                            <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-muted-foreground">
                                              {comment.authorAvatarUrl
                                                ? <img src={comment.authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                                                : comment.authorDisplayName[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="bg-muted/60 rounded-xl px-3 py-2">
                                                <p className="text-[11px] font-semibold text-foreground">{comment.authorDisplayName}</p>
                                                <p className="text-xs text-foreground leading-relaxed mt-0.5">{comment.content}</p>
                                              </div>
                                              <div className="flex items-center gap-3 mt-1 px-1">
                                                <button onClick={() => handleLikeComment(post.id, comment.id)}
                                                  className={`text-[10px] font-semibold flex items-center gap-1 ${comment.isLikedByMe ? "text-rose-400" : "text-muted-foreground hover:text-foreground"}`}>
                                                  <Heart className={`w-2.5 h-2.5 ${comment.isLikedByMe ? "fill-rose-400" : ""}`} />
                                                  {comment.likesCount > 0 && comment.likesCount}
                                                </button>
                                                <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                                {(user?.id === comment.authorId || isCreatorOrAdmin) && (
                                                  <button onClick={() => handleDeleteComment(post.id, comment.id)}
                                                    className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                    O'chirish
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === "members" && (
                <div>
                  {/* Invite link banner (creator only) */}
                  {user?.id === (selectedGroup as any)?.creatorId && (
                    <div className="mb-4 bg-primary/8 border border-primary/20 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Taklif havolasi</span>
                        </div>
                        <button onClick={fetchInviteLink} disabled={loadingInvite}
                          className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">
                          {loadingInvite ? "Yuklanmoqda..." : inviteLink ? "Yangilash" : "Ko'rsatish"}
                        </button>
                      </div>
                      {inviteLink && (
                        <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
                          <p className="text-xs text-muted-foreground flex-1 truncate font-mono">{inviteLink}</p>
                          <button onClick={() => { navigator.clipboard.writeText(inviteLink); showToast("Nusxa olindi ✓"); }}
                            className="text-xs text-primary font-semibold flex-shrink-0 flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Nusxa
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {membersLoading ? (
                    <div className="space-y-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                          <div className="w-11 h-11 rounded-full bg-muted flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-muted rounded w-1/3" />
                            <div className="h-2 bg-muted rounded w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : groupMembers.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-foreground mb-1">A'zolar yo'q</p>
                      <p className="text-sm">Guruhga qo'shiling va do'stlarni taklif qiling!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupMembers.map((member, i) => {
                        const isCreator = member.id === (selectedGroup as any)?.creatorId;
                        const iAmCreator = user?.id === (selectedGroup as any)?.creatorId;
                        const canManage = iAmCreator && !isCreator && member.id !== user?.id;

                        return (
                          <motion.div key={member.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                            <div className="w-11 h-11 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground">
                              {member.avatarUrl
                                ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="font-bold text-base">{member.displayName[0]?.toUpperCase()}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-sm text-foreground truncate">{member.displayName}</p>
                                {member.isVerified && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                {member.isPremium && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                {isCreator && <span className="text-[10px] bg-amber-400/20 text-amber-600 font-bold px-1.5 py-0.5 rounded-md">Asoschı</span>}
                                {(member as any).role === "admin" && !isCreator && <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded-md">Admin</span>}
                                {(member as any).role === "moderator" && <span className="text-[10px] bg-blue-500/20 text-blue-500 font-bold px-1.5 py-0.5 rounded-md">Mod</span>}
                                {(member as any).isMuted && <span className="text-[10px] bg-orange-500/20 text-orange-500 font-bold px-1.5 py-0.5 rounded-md">🔇</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">@{member.username}</p>
                            </div>
                            {canManage && (
                              <div className="relative flex-shrink-0">
                                <button onClick={() => setMemberMenuId(memberMenuId === member.id ? null : member.id)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                  {memberMenuId === member.id && (
                                    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.12 }}
                                      className="absolute right-0 top-8 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
                                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide border-b border-border">Rol o'zgartirish</div>
                                      {["member", "moderator", "admin"].map(role => (
                                        <button key={role} onClick={() => handleChangeRole(member.id, role)}
                                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 ${(member as any).role === role ? "text-primary font-semibold" : "text-foreground"}`}>
                                          {role === "member" ? "👤 A'zo" : role === "moderator" ? "🛡️ Moderator" : "⚡ Admin"}
                                          {(member as any).role === role && <Check className="w-3 h-3 ml-auto" />}
                                        </button>
                                      ))}
                                      <div className="border-t border-border my-1" />
                                      <button onClick={() => handleKickMember(member.id)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-destructive flex items-center gap-2">
                                        <UserMinus className="w-3.5 h-3.5" /> Guruhdan chiqarish
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === "about" && (
                <div className="space-y-5">
                  {selectedGroup.description && (
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Tavsif</p>
                      <p className="text-sm text-foreground leading-relaxed">{selectedGroup.description}</p>
                    </div>
                  )}

                  <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                    {[
                      { icon: Globe, label: "Maxfiylik", value: selectedGroup.isPrivate ? "Yopiq guruh" : "Ochiq guruh" },
                      { icon: Hash, label: "Kategoriya", value: selectedGroup.category || "Belgilanmagan" },
                      { icon: Users, label: "A'zolar soni", value: (selectedGroup.membersCount ?? 0).toLocaleString() },
                      { icon: MessageSquare, label: "Postlar soni", value: (selectedGroup.postsCount ?? 0).toLocaleString() },
                      { icon: CalendarDays, label: "Yaratilgan", value: selectedGroup.createdAt ? new Date(selectedGroup.createdAt).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground flex-1">{label}</span>
                        <span className="text-sm font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delete group — only visible to creator */}
                  {user?.id === (selectedGroup as any).creatorId && (
                    <div className="pt-2">
                      {!deleteGroupConfirm ? (
                        <button
                          onClick={() => setDeleteGroupConfirm(true)}
                          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Guruhni o'chirish
                        </button>
                      ) : (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-foreground">Guruhni o'chirasizmi?</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Bu amalni qaytarib bo'lmaydi. Barcha postlar va a'zolar ro'yxati o'chiriladi.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteGroupConfirm(false)}
                              className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            >
                              Bekor qilish
                            </button>
                            <button
                              onClick={handleDeleteGroup}
                              className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                              Ha, o'chirish
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Cover File Input ──────────────────────────── */}
      <input ref={settingsCoverRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleSettingsCoverChange(f); e.target.value = ""; }} />

      {/* ── Group Settings Overlay ─────────────────────────────── */}
      <AnimatePresence>
        {showSettings && selectedGroup && (
          <motion.div
            key="group-settings"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[60] bg-background overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3">
              <button onClick={() => setShowSettings(false)}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Guruh sozlamalari</p>
                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{selectedGroup.name}</p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsCoverUploading || !settingsForm.name.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-opacity"
              >
                {settingsSaving ? "..." : "Saqlash"}
              </button>
            </div>

            <div className="px-4 py-5 space-y-5 max-w-lg mx-auto pb-20">

              {/* Cover image */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div
                  className={`h-36 w-full bg-gradient-to-br ${COLORS_CARD[selectedGroup.id % COLORS_CARD.length]} relative flex items-center justify-center cursor-pointer group`}
                  onClick={() => settingsCoverRef.current?.click()}
                >
                  {(settingsForm.coverPreview || settingsForm.coverUrl) ? (
                    <img
                      src={settingsForm.coverPreview || settingsForm.coverUrl}
                      alt="" className="w-full h-full object-cover absolute inset-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/60 rounded-xl px-3 py-1.5 text-white text-xs font-semibold">
                      <ImageIcon className="w-3.5 h-3.5" /> Cover rasmni o'zgartirish
                    </div>
                  </div>
                  {settingsCoverUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="text-3xl cursor-pointer" onClick={() => {
                    const icons = GROUP_ICONS;
                    const cur = icons.indexOf(settingsForm.icon);
                    sf("icon", icons[(cur + 1) % icons.length]);
                  }}>{settingsForm.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Ikon</p>
                    <p className="text-xs text-muted-foreground">Bosing — o'zgartirish</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {THEME_COLORS.map(tc => (
                      <button key={tc.hex} onClick={() => sf("themeColor", tc.hex)}
                        className={`w-6 h-6 rounded-full transition-transform ${settingsForm.themeColor === tc.hex ? "scale-125 ring-2 ring-offset-1 ring-offset-card" : "hover:scale-110"}`}
                        style={{ backgroundColor: tc.hex, ...(settingsForm.themeColor === tc.hex ? { ringColor: tc.hex } : {}) }}
                        title={tc.label} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Basic info */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Asosiy ma'lumot</p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Guruh nomi *</label>
                  <input
                    value={settingsForm.name}
                    onChange={e => sf("name", e.target.value)}
                    placeholder="Guruh nomi..."
                    maxLength={60}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tavsif</label>
                  <textarea
                    value={settingsForm.description}
                    onChange={e => sf("description", e.target.value)}
                    placeholder="Guruh haqida qisqacha..."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Kategoriya</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => sf("category", cat.id === settingsForm.category ? "" : cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          settingsForm.category === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}>
                        <cat.icon className="w-3 h-3" />{cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Xush kelibsiz xabari</label>
                  <textarea
                    value={settingsForm.welcomeMessage}
                    onChange={e => sf("welcomeMessage", e.target.value)}
                    placeholder="Yangi a'zolarga xabar..."
                    rows={2}
                    maxLength={300}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Maxfiylik</p>
                <div className="space-y-2">
                  {([
                    { v: "public",  label: "Ochiq",    desc: "Hamma ko'radi va qo'shila oladi",          icon: Globe },
                    { v: "private", label: "Yopiq",    desc: "Faqat taklif bilan qo'shilish mumkin",     icon: Lock },
                    { v: "secret",  label: "Maxfiy",   desc: "Faqat a'zolarga ko'rinadi",                icon: Shield },
                  ] as const).map(opt => (
                    <button key={opt.v} onClick={() => sf("privacyLevel", opt.v)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                        settingsForm.privacyLevel === opt.v
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/40"
                      }`}>
                      <opt.icon className={`w-4 h-4 flex-shrink-0 ${settingsForm.privacyLevel === opt.v ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${settingsForm.privacyLevel === opt.v ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {settingsForm.privacyLevel === opt.v && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Qo'shilish turi</label>
                  <div className="flex gap-2">
                    {([
                      { v: "auto",   label: "Avtomatik" },
                      { v: "manual", label: "Qo'lda" },
                      { v: "invite", label: "Taklif" },
                    ] as const).map(opt => (
                      <button key={opt.v} onClick={() => sf("joinType", opt.v)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          settingsForm.joinType === opt.v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Maksimal a'zolar soni (0 = cheksiz)</label>
                  <input
                    type="number" min={0} max={100000}
                    value={settingsForm.maxMembers || ""}
                    onChange={e => sf("maxMembers", Number(e.target.value) || 0)}
                    placeholder="0 (cheksiz)"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Rules */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Guruh qoidalari</p>
                <div className="space-y-2">
                  {settingsForm.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded-xl border border-border">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                      <p className="text-sm text-foreground flex-1">{rule}</p>
                      <button onClick={() => sf("rules", settingsForm.rules.filter((_, i) => i !== idx))}
                        className="w-6 h-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newRuleText}
                    onChange={e => setNewRuleText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newRuleText.trim()) {
                        sf("rules", [...settingsForm.rules, newRuleText.trim()]);
                        setNewRuleText("");
                      }
                    }}
                    placeholder="Yangi qoida qo'shing..."
                    maxLength={200}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => { if (newRuleText.trim()) { sf("rules", [...settingsForm.rules, newRuleText.trim()]); setNewRuleText(""); } }}
                    disabled={!newRuleText.trim()}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold disabled:opacity-40 hover:bg-primary/20 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Teglar</p>
                {settingsForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settingsForm.tags.map((tag, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                        #{tag}
                        <button onClick={() => sf("tags", settingsForm.tags.filter((_, i) => i !== idx))}
                          className="ml-0.5 hover:text-primary/70"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newTagText}
                    onChange={e => setNewTagText(e.target.value.replace(/\s/g, ""))}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newTagText.trim() && !settingsForm.tags.includes(newTagText.trim())) {
                        sf("tags", [...settingsForm.tags, newTagText.trim()]);
                        setNewTagText("");
                      }
                    }}
                    placeholder="#teg qo'shing..."
                    maxLength={30}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => { if (newTagText.trim() && !settingsForm.tags.includes(newTagText.trim())) { sf("tags", [...settingsForm.tags, newTagText.trim()]); setNewTagText(""); } }}
                    disabled={!newTagText.trim() || settingsForm.tags.includes(newTagText.trim())}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold disabled:opacity-40 hover:bg-primary/20 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Links */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Aloqa va havolalar</p>
                {[
                  { key: "websiteUrl",    label: "Veb-sayt",       ph: "https://example.com" },
                  { key: "contactEmail",  label: "Email",          ph: "info@example.com" },
                  { key: "telegramLink",  label: "Telegram",       ph: "https://t.me/guruh" },
                  { key: "instagramLink", label: "Instagram",      ph: "@guruh_nomi" },
                ].map(({ key, label, ph }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                    <input
                      value={(settingsForm as any)[key]}
                      onChange={e => sf(key as keyof SettingsForm, e.target.value as any)}
                      placeholder={ph}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}
              </div>

              {/* Save button (bottom) */}
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsCoverUploading || !settingsForm.name.trim()}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-opacity"
              >
                {settingsSaving ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Group Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />

            <motion.div initial={{ opacity: 0, y: 60, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="fixed inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-lg bg-background border border-border md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "90dvh" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
                <div>
                  <h2 className="font-bold text-foreground text-base">Yangi jamoa yaratish</h2>
                  <p className="text-xs text-muted-foreground">{step}/{STEPS.length} • {STEPS[step - 1].label}</p>
                </div>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-1.5 px-5 py-3 flex-shrink-0 overflow-x-auto scrollbar-hide">
                {STEPS.map(s => (
                  <button key={s.id} onClick={() => { if (s.id < step || (s.id === step + 1 && canNext())) setStep(s.id); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex-shrink-0 ${
                      s.id === step
                        ? "bg-primary text-primary-foreground"
                        : s.id < step
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                    {s.id < step ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Success state */}
              <AnimatePresence mode="wait">
                {created ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Check className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-foreground mb-1">Jamoa yaratildi! 🎉</h3>
                      <p className="text-sm text-muted-foreground">"{form.name}" jamoasi muvaffaqiyatli yaratildi</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                    className="flex-1 overflow-y-auto px-5 py-4">
                    {renderStep()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer navigation */}
              {!created && (
                <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
                  {step > 1 ? (
                    <button onClick={() => setStep(s => s - 1)}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Orqaga
                    </button>
                  ) : (
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors">
                      Bekor qilish
                    </button>
                  )}
                  <div className="flex-1">
                    {step < STEPS.length ? (
                      <motion.button whileTap={{ scale: 0.97 }}
                        onClick={() => canNext() && setStep(s => s + 1)}
                        disabled={!canNext()}
                        className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                        Keyingisi <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.97 }}
                        onClick={handleCreate}
                        disabled={!form.name.trim() || !form.description.trim() || creating || uploading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                        {(creating || uploading) ? (
                          <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Yaratilmoqda...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" /> Yaratish</>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out">
            <motion.img
              initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              src={lightboxUrl} alt=""
              className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Internal share modal ─────────────────────────────────── */}
      <AnimatePresence>
        {sharePost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setSharePost(null)}>
            <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Repeat2 className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">OlchaAI'da ulashish</h3>
                <button onClick={() => setSharePost(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Original post preview */}
              <div className="bg-muted/40 border border-border rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{sharePost.authorDisplayName}</p>
                <p className="text-sm text-foreground line-clamp-3">{sharePost.content}</p>
                {sharePost.mediaUrl && (
                  <img src={sharePost.mediaUrl} alt="" className="mt-2 rounded-lg w-full max-h-24 object-cover" />
                )}
              </div>
              <textarea
                value={shareComment}
                onChange={e => setShareComment(e.target.value)}
                placeholder="Fikringizni qo'shing (ixtiyoriy)..."
                rows={2}
                className="w-full bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => setSharePost(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  Bekor qilish
                </button>
                <button onClick={handleShareToFeed} disabled={sharingPost}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  {sharingPost
                    ? <><div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Ulashilmoqda</>
                    : <><Send className="w-3.5 h-3.5" /> Lentaga ulashish</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {reportPostId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setReportPostId(null)}>
            <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-foreground">Shikoyat yuborish</h3>
              </div>
              <div className="space-y-2 mb-4">
                {["Spam", "Noto'g'ri ma'lumot", "Nafrat nutqi", "Zo'ravonlik", "Boshqa"].map(reason => (
                  <button key={reason} onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                      reportReason === reason ? "border-orange-400 bg-orange-400/10 text-orange-400 font-semibold" : "border-border text-foreground hover:bg-muted"
                    }`}>
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReportPostId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  Bekor qilish
                </button>
                <button onClick={handleSubmitReport} disabled={!reportReason || submittingReport}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                  {submittingReport ? "Yuborilmoqda..." : "Yuborish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drawing canvas modal ────────────────────────────────── */}
      <AnimatePresence>
        {showDraw && (
          <DrawingCanvas onSend={handleDrawingSend} onClose={() => setShowDraw(false)} />
        )}
      </AnimatePresence>

      {/* ── Toast notification ──────────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }} transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl pointer-events-none whitespace-nowrap">
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shared CSS-in-TS workaround: tailwind @apply not allowed, use className strings ── */}
      <style>{`
        .label-sm { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground, #888); margin-bottom: 4px; }
        .input-base { width: 100%; padding: 10px 14px; border-radius: 12px; background: var(--card, #0d1526); border: 1px solid var(--border, #1e2d4a); color: var(--foreground, #fff); font-size: 14px; outline: none; transition: border-color 0.2s; }
        .input-base:focus { border-color: rgba(120, 87, 255, 0.5); box-shadow: 0 0 0 2px rgba(120, 87, 255, 0.1); }
        .input-base::placeholder { color: var(--muted-foreground, #666); }
      `}</style>
    </div>
  );
}
