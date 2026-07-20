import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Users, Info, X, Trash2, CheckCheck } from "lucide-react";
import { toast as _shadcnToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_ICON: Record<string, React.ElementType> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  group: Users,
  system: Info,
};

const TYPE_COLOR: Record<string, string> = {
  like: "text-pink-400 bg-pink-400/10",
  comment: "text-blue-400 bg-blue-400/10",
  follow: "text-primary bg-primary/10",
  mention: "text-amber-400 bg-amber-400/10",
  group: "text-emerald-400 bg-emerald-400/10",
  system: "text-muted-foreground bg-muted",
};

function NotifCard({
  notif,
  onRead,
  onDelete,
}: {
  notif: { id: number; type: string; message: string; actorName?: string | null; isRead: boolean; createdAt: string };
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { i18n } = useTranslation();
  const [dragX, setDragX] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const Icon = TYPE_ICON[notif.type] || Info;
  const color = TYPE_COLOR[notif.type] || TYPE_COLOR.system;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      setDismissed(true);
      setTimeout(() => onDelete(notif.id), 200);
    } else {
      setDragX(0);
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal background */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 bg-red-500/90 rounded-2xl pointer-events-none">
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        animate={{ x: dismissed ? -400 : dragX }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        onClick={() => !notif.isRead && onRead(notif.id)}
        className={`relative flex items-start gap-3 p-4 border cursor-pointer transition-colors touch-pan-y select-none ${
          notif.isRead
            ? "bg-card border-border"
            : "bg-primary/5 border-primary/20 hover:bg-primary/8"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {notif.actorName && (
            <p className="text-sm font-semibold text-foreground">{notif.actorName}</p>
          )}
          <p className="text-sm text-muted-foreground">{notif.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(notif.createdAt).toLocaleDateString(i18n.language, {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!notif.isRead && (
            <div className="w-2 h-2 rounded-full bg-primary" />
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useListNotifications();
  const mark = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const handleRead = (id: number) => {
    mark.mutate({ id }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    qc.setQueryData(getListNotificationsQueryKey(), (old: typeof notifs) =>
      old ? old.filter(n => n.id !== id) : old
    );
    del.mutate({ id }, { onSuccess: invalidate });
  };

  const handleMarkAll = () => {
    markAll.mutate(undefined, { onSuccess: invalidate });
  };

  const handleClearAll = () => {
    clearAll.mutate(undefined, {
      onSuccess: () => {
        qc.setQueryData(getListNotificationsQueryKey(), []);
        setShowConfirmClear(false);
      },
      onError: () => {
        setShowConfirmClear(false);
        toast.error("Bildirishnomalar o'chirilmadi. Qayta urinib ko'ring.");
      },
    });
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {t("notif.title")}
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>

        {notifs.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markAll.isPending}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("notif.mark_read")}
              </button>
            )}
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold px-2.5 py-1.5 rounded-xl bg-red-400/10 hover:bg-red-400/15 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("notif.clear")}
            </button>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      {notifs.length > 0 && !isLoading && (
        <p className="text-xs text-muted-foreground mb-3 opacity-60">
          {t("notif.swipe_hint")}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">{t("notif.all_caught")}</p>
          <p className="text-xs mt-1 opacity-60">{t("notif.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notifs.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <NotifCard
                    notif={notif}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Confirm clear dialog */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-foreground text-center mb-1">
                {t("notif.confirm_clear_title")}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {t("notif.confirm_clear_desc", { count: notifs.length })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearAll.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {clearAll.isPending ? "..." : t("notif.delete")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
