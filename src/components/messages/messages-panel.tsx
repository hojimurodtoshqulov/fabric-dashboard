"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Kutilmoqda", className: "border-slate-700 text-slate-400" },
  SENT:      { label: "Yuborildi",  className: "border-blue-800 text-blue-400" },
  DELIVERED: { label: "Yetkazildi", className: "border-green-800 text-green-400" },
  READ:      { label: "O'qildi",    className: "border-indigo-800 text-indigo-400" },
  FAILED:    { label: "Xato",       className: "border-red-800 text-red-400" },
};

export function MessagesPanel() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["messages", "telegram", search],
    queryFn: async () => {
      const p = new URLSearchParams({ type: "TELEGRAM", limit: "50" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/messages?${p}`);
      const json = await res.json();
      return json.data as {
        messages: Array<{
          id: string; type: string; status: string; body: string;
          createdAt: string;
          client: { name: string; phone: string } | null;
          sentBy: { name: string } | null;
        }>;
        total: number;
      };
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Jami xabarlar", value: data?.total ?? 0, color: "text-white" },
          { label: "Yuborilgan", value: data?.messages?.filter(m => m.status === "SENT" || m.status === "DELIVERED").length ?? 0, color: "text-green-400" },
          { label: "Xato", value: data?.messages?.filter(m => m.status === "FAILED").length ?? 0, color: "text-red-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input placeholder="Xabar yoki mijoz qidirish..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <Button variant="outline" size="icon" className="border-slate-700 text-slate-400"
          onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-white font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-400" /> Telegram xabarlar tarixi
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Mijoz", "Xabar", "Holat", "Yuborildi", "Sana"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td colSpan={5} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : !data?.messages?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Send className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">Telegram xabarlar topilmadi</p>
                </td>
              </tr>
            ) : (
              data.messages.map((msg) => (
                <tr key={msg.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{msg.client?.name ?? "—"}</p>
                    <p className="text-slate-500 text-xs">{msg.client?.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{msg.body}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_CONFIG[msg.status]?.className}>
                      {STATUS_CONFIG[msg.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{msg.sentBy?.name ?? "Tizim"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(msg.createdAt).toLocaleString("uz-UZ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
