import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Lock, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListGroups, useJoinGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: groups = [], isLoading } = useListGroups({ search: search || undefined });
  const join = useJoinGroup();
  const qc = useQueryClient();
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const handleJoin = (id: number) => {
    const s = new Set(joinedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setJoinedIds(s);
    join.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }) });
  };

  const COLORS = [
    "from-red-900/30 to-amber-900/20",
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
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
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
    </div>
  );
}
