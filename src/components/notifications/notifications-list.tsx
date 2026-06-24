"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, AlertTriangle, Info, TrendingUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  SYSTEM:      { icon: Info,         color: "text-blue-400",   bg: "bg-blue-900/20" },
  DEBT_ALERT:  { icon: AlertTriangle,color: "text-red-400",    bg: "bg-red-900/20" },
  NEW_LEAD:    { icon: TrendingUp,   color: "text-green-400",  bg: "bg-green-900/20" },
  CALL_RESULT: { icon: Bell,         color: "text-indigo-400", bg: "bg-indigo-900/20" },
  MESSAGE:     { icon: MessageSquare,color: "text-purple-400", bg: "bg-purple-900/20" },
  TASK:        { icon: Check,        color: "text-yellow-400", bg: "bg-yellow-900/20" },
  PAYMENT:     { icon: TrendingUp,   color: "text-emerald-400",bg: "bg-emerald-900/20" },
  STOCK_ALERT: { icon: AlertTriangle,color: "text-orange-400", bg: "bg-orange-900/20" },
};

export function NotificationsList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=50&unreadOnly=false");
      const json = await res.json();
      return json.data as {
        notifications: Array<{
          id: string; type: string; title: string; body: string;
          isRead: boolean; createdAt: string;
        }>;
        unreadCount: number;
        total: number;
      };
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Jami bildirishnomalar</p>
          <p className="text-white text-2xl font-bold mt-1">{data?.total ?? 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">O'qilmagan</p>
          <p className="text-red-400 text-2xl font-bold mt-1">{unreadCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">O'qilgan</p>
          <p className="text-green-400 text-2xl font-bold mt-1">{(data?.total ?? 0) - unreadCount}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-white font-medium">Barcha bildirishnomalar</h3>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1.5"
              onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-3.5 w-3.5" /> Barchasini o'qildi deb belgilash
            </Button>
          )}
        </div>

        <div className="divide-y divide-slate-800">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex gap-3">
                <div className="w-9 h-9 bg-slate-800 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-800 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))
          ) : !data?.notifications?.length ? (
            <div className="px-4 py-16 text-center">
              <Bell className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Bildirishnomalar yo'q</p>
            </div>
          ) : (
            data.notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.SYSTEM;
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  className={`flex items-start gap-3 px-4 py-4 hover:bg-slate-800/30 transition-colors ${!notif.isRead ? "bg-slate-800/20" : ""}`}>
                  <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-medium ${notif.isRead ? "text-slate-300" : "text-white"}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-2">{notif.body}</p>
                    <p className="text-slate-600 text-xs mt-1">
                      {new Date(notif.createdAt).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-slate-300 flex-shrink-0"
                      onClick={() => markRead.mutate(notif.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
