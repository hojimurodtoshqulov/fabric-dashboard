import { Metadata } from "next";
import { NotificationsList } from "@/components/notifications/notifications-list";

export const metadata: Metadata = { title: "Bildirishnomalar" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bildirishnomalar</h1>
        <p className="text-slate-400 text-sm mt-1">Barcha xabarnomalar</p>
      </div>
      <NotificationsList />
    </div>
  );
}
