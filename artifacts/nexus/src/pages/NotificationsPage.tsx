import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Users, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
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

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { data: notifs = [], isLoading } = useListNotifications();
  const mark = useMarkNotificationRead();
  const qc = useQueryClient();

  const handleRead = (id: number) => {
    mark.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) });
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {t("notif.title")}
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => notifs.filter(n => !n.isRead).forEach(n => handleRead(n.id))}
            className="text-xs text-primary hover:underline font-semibold"
          >
            {t("notif.mark_read")}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
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
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{t("notif.all_caught")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((notif, i) => {
            const Icon = TYPE_ICON[notif.type] || Info;
            const color = TYPE_COLOR[notif.type] || TYPE_COLOR.system;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !notif.isRead && handleRead(notif.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
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
                    {new Date(notif.createdAt).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
