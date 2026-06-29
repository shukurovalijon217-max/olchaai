import { useState, useRef, useCallback, useEffect, ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Lock, Plus, Search, X, ChevronLeft, ChevronRight,
  Globe, Eye, EyeOff, Shield, Zap, Image as ImageIcon,
  MessageSquare, Upload, Check, AlertCircle, Crown, Mic,
  Radio, ShoppingBag, Award, Pin, File, Bot, Mail, Send,
  Instagram, Hash, Link, BookOpen, Music, Utensils, Plane,
  Briefcase, FlaskConical, Heart, Palette, Info, Settings2,
  BarChart3, CalendarDays, Volume2, Sparkles, Code, Clock,
  Bell, Languages, Repeat2, Star, Flame, Swords, Brush,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListGroups, useJoinGroup, useCreateGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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
  return `${API}/api/storage/objects/${objectPath}`;
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
  joinedAt: string;
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

  // ── Group detail helpers ──────────────────────────────────────
  const openGroup = (group: GroupRow) => {
    setSelectedGroup(group);
    setActiveDetailTab("feed");
    setGroupMembers([]);
    setNewPostContent("");
  };

  const closeDetail = () => {
    setSelectedGroup(null);
    setGroupMembers([]);
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

  useEffect(() => {
    if (selectedGroup && activeDetailTab === "members" && groupMembers.length === 0) {
      fetchMembers(selectedGroup.id);
    }
  }, [selectedGroup, activeDetailTab, groupMembers.length, fetchMembers]);

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
          <ToggleRow icon={File}      label="Fayl ulashish"       desc="Hujjat, PDF, arxiv ulashish"
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
                  <img src={selectedGroup.coverUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <span className="text-8xl font-black text-white/10 select-none">
                    {selectedGroup.name[0]}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
              </div>

              {/* Back button */}
              <button
                onClick={closeDetail}
                className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

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
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ImageIcon className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Mic className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Sparkles className="w-4 h-4" /></button>
                      </div>
                      <button
                        disabled={!newPostContent.trim()}
                        onClick={() => setNewPostContent("")}
                        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                      >
                        Yuborish
                      </button>
                    </div>
                  </div>

                  {/* Empty feed state */}
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                      <MessageSquare className="w-9 h-9 opacity-30" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">Hali postlar yo'q</p>
                    <p className="text-sm">Bu guruhda birinchi bo'lib post yozing!</p>
                  </div>
                </div>
              )}

              {activeDetailTab === "members" && (
                <div>
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
                      {groupMembers.map((member, i) => (
                        <motion.div key={member.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                          <div className="w-11 h-11 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground">
                            {member.avatarUrl
                              ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <span className="font-bold text-base">{member.displayName[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm text-foreground truncate">{member.displayName}</p>
                              {member.isVerified && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                              {member.isPremium && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground">@{member.username}</p>
                          </div>
                        </motion.div>
                      ))}
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
                </div>
              )}
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
