import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Play, GitBranch, Plus, Eye, ChevronLeft, Globe, Lock, Sparkles, RotateCcw, Film } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Branch {
  id: number; scenarioId: number; parentId: number | null;
  videoUrl: string | null; choiceText: string; choiceEmoji: string;
  isRoot: boolean; orderIndex: number; viewCount: number;
}
interface Scenario {
  id: number; creatorId: number; title: string; description: string | null;
  thumbnail: string | null; isPublished: boolean; viewCount: number;
  branches?: Branch[];
}

const CATEGORY_COLORS: Record<string, string> = {
  adventure: "from-emerald-500 to-teal-500",
  romance: "from-pink-500 to-rose-500",
  mystery: "from-red-700 to-amber-700",
  comedy: "from-amber-500 to-yellow-500",
  drama: "from-blue-500 to-cyan-500",
  horror: "from-red-700 to-red-500",
};

function BranchTree({ branches, onSelect, currentId }: { branches: Branch[]; onSelect: (b: Branch) => void; currentId: number | null }) {
  const root = branches.find(b => b.isRoot);
  if (!root) return null;

  function Node({ branch, depth }: { branch: Branch; depth: number }) {
    const children = branches.filter(b => b.parentId === branch.id);
    const isCurrent = branch.id === currentId;
    return (
      <div className="flex flex-col items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(branch)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${isCurrent ? "border-primary bg-primary/20 text-amber-300" : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"}`}
        >
          {branch.choiceEmoji} {branch.choiceText.slice(0, 20)}
        </motion.button>
        {children.length > 0 && (
          <div className="flex gap-4 mt-1">
            {children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-3 bg-white/20" />
                <Node branch={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4">
      <Node branch={root} depth={0} />
    </div>
  );
}

function ScenarioCard({ sc, onClick }: { sc: Scenario; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-primary/50 transition-all"
    >
      <div className="aspect-video bg-gradient-to-br from-red-950/50 to-amber-950/30 flex items-center justify-center relative">
        {sc.thumbnail ? (
          <img src={sc.thumbnail} alt="" className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <GitBranch className="w-12 h-12 text-amber-400/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Eye className="w-3 h-3" /> {sc.viewCount}
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <GitBranch className="w-2.5 h-2.5" /> Interactive
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm line-clamp-1">{sc.title}</h3>
        {sc.description && <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{sc.description}</p>}
      </div>
    </motion.div>
  );
}

function PlayerView({ scenario, onBack }: { scenario: Scenario; onBack: () => void }) {
  const { t } = useTranslation();
  const branches = scenario.branches ?? [];
  const root = branches.find(b => b.isRoot);
  const [current, setCurrent] = useState<Branch | null>(root ?? null);
  const [path, setPath] = useState<Branch[]>(root ? [root] : []);
  const [showTree, setShowTree] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const choices = branches.filter(b => b.parentId === current?.id);

  function pickChoice(branch: Branch) {
    setCurrent(branch);
    setPath(prev => [...prev, branch]);
    if (videoRef.current) { videoRef.current.load(); videoRef.current.play().catch(() => {}); }
  }

  function restart() { if (root) { setCurrent(root); setPath([root]); } }
  function goBack() { if (path.length > 1) { const newPath = path.slice(0, -1); setPath(newPath); setCurrent(newPath[newPath.length - 1]); } }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
          <ChevronLeft className="w-4 h-4 text-white" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-sm line-clamp-1">{scenario.title}</h2>
          <div className="text-white/40 text-xs">{t("multiscene.step")} {path.length}/{Math.max(path.length, branches.length)}</div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowTree(!showTree)}
          className={`p-2 rounded-xl transition-colors ${showTree ? "bg-primary/30 text-amber-300" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
          <GitBranch className="w-4 h-4" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={restart} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
          <RotateCcw className="w-4 h-4 text-white/60" />
        </motion.button>
      </div>

      <AnimatePresence>
        {showTree && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-b border-white/10 bg-black/30">
            <BranchTree branches={branches} onSelect={(b) => { setShowTree(false); setCurrent(b); }} currentId={current?.id ?? null} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px]">
          {current?.videoUrl ? (
            <video ref={videoRef} src={current.videoUrl} controls autoPlay className="w-full h-full object-contain max-h-[50vh]" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <Film className="w-16 h-16 text-amber-400/40" />
              <p className="text-white/40 text-sm">{current?.choiceText ?? t("multiscene.start_point")}</p>
              {path.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {path.map((b, i) => (
                    <span key={b.id} className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/60">
                      {i > 0 ? "→ " : ""}{b.choiceEmoji} {b.choiceText.slice(0, 15)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {choices.length > 0 ? (
            <>
              <p className="text-white/60 text-xs text-center">{t("multiscene.choose_path")}</p>
              <div className="grid grid-cols-1 gap-2">
                {choices.map(choice => (
                  <motion.button
                    key={choice.id}
                    whileHover={{ scale: 1.02, x: 6 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pickChoice(choice)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/60 hover:bg-primary/10 text-left transition-all"
                  >
                    <span className="text-2xl">{choice.choiceEmoji}</span>
                    <span className="text-white text-sm font-medium">{choice.choiceText}</span>
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-white/60 text-sm">{t("multiscene.end_reached")}</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm hover:bg-red-700 transition-colors">
                {t("multiscene.restart")}
              </motion.button>
              {path.length > 1 && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={goBack}
                  className="mt-2 ml-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors">
                  {t("multiscene.back")}
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/scenarios`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
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
        <h3 className="text-white font-bold text-lg mb-4">{t("multiscene.new_scenario")}</h3>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={t("multiscene.title_ph")}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm mb-3 focus:outline-none focus:border-primary/60" />
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder={t("multiscene.desc_ph")}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm mb-4 focus:outline-none focus:border-primary/60 resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">
            {t("multiscene.cancel")}
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreate} disabled={loading || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
            {loading ? t("multiscene.creating") : t("multiscene.create")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MultiScenePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"explore" | "mine">("explore");

  async function fetchScenarios() {
    setLoading(true);
    try {
      const url = tab === "mine" ? `${API}/api/scenarios/mine` : `${API}/api/scenarios`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setScenarios(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchScenarios(); }, [tab]);

  async function openScenario(sc: Scenario) {
    const res = await fetch(`${API}/api/scenarios/${sc.id}`, { credentials: "include" });
    if (res.ok) setSelected(await res.json());
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0604]">
      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchScenarios} />}
      </AnimatePresence>

      {selected ? (
        <PlayerView scenario={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-white font-bold text-xl flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-amber-400" /> {t("multiscene.title")}
                </h1>
                <p className="text-white/50 text-xs mt-0.5">{t("multiscene.subtitle")}</p>
              </div>
              {user && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm hover:bg-red-700 transition-colors">
                  <Plus className="w-4 h-4" /> {t("multiscene.create_btn")}
                </motion.button>
              )}
            </div>

            <div className="flex gap-2">
              {(["explore", "mine"] as const).map(tabKey => (
                <button key={tabKey} onClick={() => setTab(tabKey)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${tab === tabKey ? "bg-primary text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
                  {tabKey === "explore" ? <><Globe className="w-3 h-3 inline mr-1" />{t("multiscene.explore_tab")}</> : <><Lock className="w-3 h-3 inline mr-1" />{t("multiscene.mine_tab")}</>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : scenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <GitBranch className="w-16 h-16 text-amber-400/30 mb-4" />
                <p className="text-white/40 text-sm">{t("multiscene.no_scenarios")}</p>
                {user && <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm">
                  {t("multiscene.be_first")}
                </motion.button>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {scenarios.map(sc => (
                  <ScenarioCard key={sc.id} sc={sc} onClick={() => openScenario(sc)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
