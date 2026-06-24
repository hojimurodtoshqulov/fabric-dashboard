"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Target, BarChart3, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DUMMY_CAMPAIGNS = [
  { id: "1", name: "Vaqf bayram aksiyasi", channel: "Telegram", sent: 142, opened: 98, converted: 23, status: "ACTIVE" },
  { id: "2", name: "Ulgurji chegirma taklifi", channel: "SMS", sent: 256, opened: 189, converted: 41, status: "COMPLETED" },
  { id: "3", name: "Yangi mahsulot prezentatsiyasi", channel: "Telegram+SMS", sent: 78, opened: 54, converted: 12, status: "ACTIVE" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "text-green-400 bg-green-900/20 border-green-800",
  COMPLETED: "text-slate-400 bg-slate-800/50 border-slate-700",
  PAUSED:    "text-yellow-400 bg-yellow-900/20 border-yellow-800",
  DRAFT:     "text-blue-400 bg-blue-900/20 border-blue-800",
};

export function MarketingOverview() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ["marketing-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/overview");
      const json = await res.json();
      return json.data as { totalClients: number; newClientsThisMonth: number };
    },
  });

  const handleGenerateIdeas = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Target, label: "Faol kampaniyalar", value: "3", color: "text-indigo-400", bg: "bg-indigo-900/20" },
          { icon: Users, label: "Qamrov", value: "476", color: "text-blue-400", bg: "bg-blue-900/20" },
          { icon: TrendingUp, label: "Konversiya", value: "15.9%", color: "text-green-400", bg: "bg-green-900/20" },
          { icon: BarChart3, label: "Bu oy yangi mijozlar", value: String(analytics?.newClientsThisMonth ?? "—"), color: "text-purple-400", bg: "bg-purple-900/20" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-slate-400 text-xs">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4">Faol kampaniyalar</h3>
          <div className="space-y-3">
            {DUMMY_CAMPAIGNS.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{c.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{c.channel} · {c.sent} ta yuborildi</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-slate-400 text-xs">Ochildi</p>
                    <p className="text-white text-sm font-medium">{c.opened}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Konversiya</p>
                    <p className="text-green-400 text-sm font-medium">{c.converted}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md border ${STATUS_COLORS[c.status]}`}>
                    {c.status === "ACTIVE" ? "Faol" : "Tugadi"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-yellow-400" />
            <h3 className="text-white font-medium">AI Marketing g'oyalar</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Mijozlar bazasi va savdo ma'lumotlari asosida AI marketing g'oyalari yarating
          </p>
          <Button onClick={handleGenerateIdeas} disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {isGenerating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Yaratilmoqda...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> G'oyalar yaratish</>
            )}
          </Button>
          <div className="mt-4 space-y-2">
            {["VIP mijozlarga maxsus chegirma taklif qiling", "Faolsiz mijozlarni Telegram orqali qayta jalb qiling", "Mevsimiy mahsulot aksiyasini rejalashtiring"].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg">
                <span className="text-indigo-400 text-xs mt-0.5">→</span>
                <p className="text-slate-300 text-xs">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
