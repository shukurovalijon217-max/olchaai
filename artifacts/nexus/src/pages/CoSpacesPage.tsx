import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Users, Plus, ChevronLeft, CheckCircle2, Circle, Zap, Globe, Code, Palette, TrendingUp, Music, BookOpen, Loader2, UserPlus, Flag, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Space {
  id: number; name: string; description: string | null;
  category: string; memberCount: number; status: string;
  createdAt: string; creatorId: number; creatorUsername: string;
  creatorName: string; creatorAvatar: string | null;
  members?: Member[]; tasks?: Task[]; canvas?: string | null;
}
interface Member { id: number; role: string; contribution: number; joinedAt: string; userId: number; username: string; displayName: string; avatar: string | null; }
interface Task { id: number; spaceId: number; title: string; description: string | null; assigneeId: number | null; status: string; priority: string; createdAt: string; }

const CATEGORIES = [
  { key: "general", label: "Umumiy", icon: Globe, color: "#6366f1" },
  { key: "tech", label: "Texnologiya", icon: Code, color: "#3b82f6" },
  { key: "design", label: "Dizayn", icon: Palette, color: "#a855f7" },
  { key: "business", label: "Biznes", icon: TrendingUp, color: "#10b981" },
  { key: "music", label: "Musiqa", icon: Music, color: "#ec4899" },
  { key: "education", label: "Ta'lim", icon: BookOpen, color: "#f59e0b" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#10b981"
};

function TaskItem({ task, members, onUpdate }: { task: Task; members: Member[]; onUpdate: (id: number, status: string) => void }) {
  const isDone = task.status === "done";
  const pColor = PRIORITY_COLORS[task.priority] ?? "#94a3b8";

  return (
    <motion.div layout className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isDone ? "opacity-50 border-white/5 bg-white/2" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => onUpdate(task.id, isDone ? "open" : "done")} className="mt-0.5 flex-shrink-0">
        {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-white/30 hover:text-white/60 transition-colors" />}
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isDone ? "line-through text-white/30" : "text-white"}`}>{task.title}</div>
        {task.description && <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pColor }} />
          <span className="text-xs capitalize" style={{ color: pColor }}>{task.priority}</span>
          {task.assigneeId && (
            <span className="text-xs text-white/30">
              → {members.find(m => m.userId === task.assigneeId)?.displayName ?? "Tayinlangan"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SpaceDetail({ space: initialSpace, onBack }: { space: Space; onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [space, setSpace] = useState(initialSpace);
  const [joining, setJoining] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [canvasText, setCanvasText] = useState(initialSpace.canvas ?? "");
  const [savingCanvas, setSavingCanvas] = useState(false);

  const isMember = space.members?.some(m => m.userId === user?.id);
  const tasks = space.tasks ?? [];
  const members = space.members ?? [];

  async function join() {
    setJoining(true);
    const res = await fetch(`${API}/api/spaces/${space.id}/join`, { method: "POST", credentials: "include" });
    if (res.ok) {
      const updated = await fetch(`${API}/api/spaces/${space.id}`, { credentials: "include" });
      if (updated.ok) setSpace(await updated.json());
    }
    setJoining(false);
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setAddingTask(true);
    const res = await fetch(`${API}/api/spaces/${space.id}/tasks`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask.trim() }),
    });
    if (res.ok) {
      const task = await res.json();
      setSpace(prev => ({ ...prev, tasks: [...(prev.tasks ?? []), task] }));
      setNewTask("");
    }
    setAddingTask(false);
  }

  async function updateTask(taskId: number, status: string) {
    const res = await fetch(`${API}/api/spaces/${space.id}/tasks/${taskId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSpace(prev => ({ ...prev, tasks: prev.tasks?.map(t => t.id === taskId ? updated : t) }));
    }
  }

  async function saveCanvas() {
    setSavingCanvas(true);
    await fetch(`${API}/api/spaces/${space.id}/canvas`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvas: canvasText }),
    });
    setSavingCanvas(false);
  }

  const cat = CAT_MAP[space.category] ?? CATEGORIES[0];
  const openTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
          <ChevronLeft className="w-4 h-4 text-white" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-sm line-clamp-1">{space.name}</h2>
          <div className="text-white/40 text-xs">{space.memberCount} {t("spaces.members_label")} • {t(`spaces.cat_${space.category}`)}</div>
        </div>
        {user && !isMember && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={join} disabled={joining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs"
            style={{ background: `${cat.color}cc` }}>
            {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            {t("spaces.join")}
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {space.description && (
            <p className="text-white/60 text-sm leading-relaxed">{space.description}</p>
          )}

          <div className="flex gap-2 overflow-x-auto">
            <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-white font-bold">{members.length}</div>
              <div className="text-white/40 text-xs">{t("spaces.members_label")}</div>
            </div>
            <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-emerald-400 font-bold">{doneTasks.length}</div>
              <div className="text-white/40 text-xs">{t("spaces.done")}</div>
            </div>
            <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-amber-400 font-bold">{openTasks.length}</div>
              <div className="text-white/40 text-xs">{t("spaces.in_progress")}</div>
            </div>
          </div>

          <div>
            <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">{t("spaces.members_label")}</h3>
            <div className="flex flex-wrap gap-2">
              {members.slice(0, 12).map(m => (
                <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  {m.avatar ? <img src={m.avatar} alt="" className="w-5 h-5 rounded-full object-cover" /> :
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: cat.color }}>
                      {m.displayName?.[0]}
                    </div>}
                  <span className="text-white text-xs">{m.displayName}</span>
                  {m.role === "creator" && <Flag className="w-3 h-3 text-amber-400" />}
                  {m.contribution > 0 && <span className="text-[10px]" style={{ color: cat.color }}>+{m.contribution}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
              {t("spaces.tasks_label")} <span className="bg-white/10 text-white/60 text-[10px] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
            </h3>
            {isMember && (
              <div className="flex gap-2 mb-3">
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
                  placeholder={t("spaces.task_ph")}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/30" />
                <motion.button whileTap={{ scale: 0.9 }} onClick={addTask} disabled={addingTask || !newTask.trim()}
                  className="p-2 rounded-xl text-white disabled:opacity-40" style={{ background: cat.color }}>
                  {addingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </motion.button>
              </div>
            )}
            <div className="space-y-2">
              {openTasks.map(task => <TaskItem key={task.id} task={task} members={members} onUpdate={updateTask} />)}
              {doneTasks.length > 0 && (
                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="text-white/30 text-xs mb-2">{t("spaces.done_tasks")}</div>
                  {doneTasks.map(task => <TaskItem key={task.id} task={task} members={members} onUpdate={updateTask} />)}
                </div>
              )}
              {tasks.length === 0 && <p className="text-white/25 text-sm text-center py-4">{t("spaces.no_tasks")}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">{t("spaces.canvas_label")}</h3>
            <textarea value={canvasText} onChange={e => setCanvasText(e.target.value)}
              readOnly={!isMember}
              rows={6}
              placeholder={isMember ? t("spaces.canvas_ph") : t("spaces.canvas_empty")}
              className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 placeholder:text-white/20 text-sm font-mono resize-none focus:outline-none focus:border-white/20" />
            {isMember && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={saveCanvas} disabled={savingCanvas}
                className="mt-2 px-4 py-2 rounded-xl text-white text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                style={{ background: cat.color }}>
                {savingCanvas ? <><Loader2 className="w-3 h-3 animate-spin" /> {t("spaces.saving")}</> : <>{t("spaces.save")}</>}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateSpaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/spaces`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category }),
      });
      if (res.ok) { onCreated(); onClose(); }
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-4">{t("spaces.new_space")}</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t("spaces.space_name_ph")}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm mb-3 focus:outline-none focus:border-violet-500/60" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("spaces.space_desc_ph")} rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm mb-3 focus:outline-none focus:border-violet-500/60 resize-none" />
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${category === c.key ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/50 hover:border-white/20"}`}>
              <c.icon className="w-4 h-4" style={{ color: category === c.key ? c.color : undefined }} />
              {t(`spaces.cat_${c.key}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm">{t("spaces.cancel")}</button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={create} disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm disabled:opacity-50"
            style={{ background: CAT_MAP[category]?.color ?? "#6366f1" }}>
            {loading ? t("spaces.creating") : t("spaces.create")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CoSpacesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  async function fetchSpaces() {
    setLoading(true);
    const res = await fetch(`${API}/api/spaces`, { credentials: "include" });
    if (res.ok) setSpaces(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchSpaces(); }, []);

  async function openSpace(s: Space) {
    const res = await fetch(`${API}/api/spaces/${s.id}`, { credentials: "include" });
    if (res.ok) setSelectedSpace(await res.json());
  }

  const filtered = selectedCat === "all" ? spaces : spaces.filter(s => s.category === selectedCat);

  if (selectedSpace) return <SpaceDetail space={selectedSpace} onBack={() => setSelectedSpace(null)} />;

  return (
    <div className="h-full flex flex-col bg-[#0a0604]">
      <AnimatePresence>
        {showCreate && <CreateSpaceModal onClose={() => setShowCreate(false)} onCreated={fetchSpaces} />}
      </AnimatePresence>

      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> {t("spaces.title")}
            </h1>
            <p className="text-white/40 text-xs mt-0.5">{t("spaces.subtitle")}</p>
          </div>
          {user && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm hover:bg-indigo-600 transition-colors">
              <Plus className="w-4 h-4" /> {t("spaces.room_btn")}
            </motion.button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCat("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCat === "all" ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {t("spaces.all")}
          </button>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setSelectedCat(c.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCat === c.key ? "text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
              style={selectedCat === c.key ? { background: c.color } : {}}>
              <c.icon className="w-3 h-3" /> {t(`spaces.cat_${c.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-16 h-16 text-indigo-400/20 mb-4" />
            <p className="text-white/30 text-sm">{t("spaces.no_rooms")}</p>
            {user && <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm">
              {t("spaces.be_first")}
            </motion.button>}
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {filtered.map(space => {
              const cat = CAT_MAP[space.category] ?? CATEGORIES[0];
              return (
                <motion.div key={space.id} whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }}
                  onClick={() => openSpace(space)}
                  className="p-4 rounded-2xl border border-white/10 hover:border-white/20 bg-white/3 cursor-pointer transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}25` }}>
                      <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-sm">{space.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${cat.color}22`, color: cat.color }}>
                          {t(`spaces.cat_${space.category}`)}
                        </span>
                      </div>
                      {space.description && <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{space.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {space.memberCount}</div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {space.status === "open" ? t("spaces.open") : t("spaces.closed")}
                        </div>
                        <div>@{space.creatorUsername}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
