import { Metadata } from "next";
import { MessagesPanel } from "@/components/messages/messages-panel";

export const metadata: Metadata = { title: "Telegram xabarlar" };

export default function TelegramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Xabarlar</h1>
        <p className="text-slate-400 text-sm mt-1">Telegram va SMS xabarlar</p>
      </div>
      <MessagesPanel />
    </div>
  );
}
