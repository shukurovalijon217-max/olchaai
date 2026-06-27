import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Lock, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListGroups, useJoinGroup, useCreateGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: groups = [], isLoading } = useListGroups({ search: search || undefined });
  const join = useJoinGroup();
  const create = useCreateGroup();
  const qc = useQueryClient();
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isPrivate: false });
  const [creating, setCreating] = useState(false);

  const handleJoin = (id: number) => {
    const s = new Set(joinedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setJoinedIds(s);
    join.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }) });
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setCreating(true);
    create.mutate(
      { data: { name: form.name.trim(), description: form.description.trim(), isPrivate: form.isPrivate } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setShowCreate(false);
          setForm({ name: "", description: "", isPrivate: false });
          setCreating(false);
        },
        onError: () => setCreating(false),
      }
    );
  };

  const COLORS = [
    "from-violet-500/30 to-purple-600/20",
    "from-cyan-500/30 to-blue-600/20",
    "from-rose-500/30 to-pink-600/20",
    "from-emerald-500/30 to-teal-600/20",
    "from-amber-500/30 to-orange-600/20",
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("groups.title")}
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t("groups.create")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("groups.search_ph")}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
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
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
              >
                {/* Cover */}
                <div className={`h-24 bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center relative overflow-hidden`}>
                  {group.coverUrl ? (
                    <img src={group.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-white/20">{group.name[0]}</span>
                  )}
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
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoin(group.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
                        isMember
                          ? "bg-muted text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      }`}
                    >
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

      {/* ── Create Group Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              style={{ top: "50%", transform: "translateY(-50%)", maxWidth: 480, margin: "0 auto" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-foreground text-base">{t("groups.create")}</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    {t("groups.name_label") || "Nomi *"}
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t("groups.name_ph") || "Jamoa nomi..."}
                    maxLength={60}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    {t("groups.desc_label") || "Tavsif *"}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t("groups.desc_ph") || "Jamoa haqida qisqacha..."}
                    rows={3}
                    maxLength={300}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.isPrivate ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPrivate ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      {t("groups.private")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("groups.private_hint") || "Faqat taklif bilan qo'shilish"}</p>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={!form.name.trim() || !form.description.trim() || creating}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {creating ? "..." : (t("groups.create_btn") || "Yaratish")}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
