"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone, PhoneOff, PhoneMissed, BarChart3 } from "lucide-react";
import { CALL_RESULT_LABELS, CALL_MODE_LABELS } from "@/constants";

interface ResultsData {
  summary: {
    total: number;
    completed: number;
    noAnswer: number;
    failed: number;
    busy: number;
    answeredRate: number;
  };
  byStatus: { status: string; count: number }[];
  byResult: { result: string | null; count: number }[];
  byMode:   { mode: string; count: number }[];
  dtmfBreakdown: { key: string; label: string; count: number }[];
}

export function CallResultsStats() {
  const { data, isLoading } = useQuery<{ success: boolean; data: ResultsData }>({
    queryKey: ["call-results"],
    queryFn: () => fetch("/api/calls/results").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const d = data?.data;
  if (!d) return null;

  const statCards = [
    { label: "Jami qo'ng'iroqlar", value: d.summary.total, icon: Phone,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
    { label: "Muvaffaqiyatli",      value: d.summary.completed, icon: Phone,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Javob bermadi",       value: d.summary.noAnswer, icon: PhoneMissed, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Javob ulushi",        value: `${d.summary.answeredRate}%`, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DTMF responses */}
        {d.dtmfBreakdown.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">DTMF javoblari</h3>
            <div className="space-y-3">
              {d.dtmfBreakdown.map((item) => {
                const pct = d.summary.completed > 0 ? Math.round((item.count / d.summary.completed) * 100) : 0;
                return (
                  <div key={item.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{item.key}. {item.label}</span>
                      <span className="text-slate-400">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Call results */}
        {d.byResult.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Natijalar bo'yicha</h3>
            <div className="space-y-2">
              {d.byResult.filter((r) => r.result).map((item) => (
                <div key={item.result} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">{CALL_RESULT_LABELS[item.result!] ?? item.result}</span>
                  <span className="text-sm font-medium text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By mode */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Rejim bo'yicha</h3>
          <div className="space-y-2">
            {d.byMode.map((item) => (
              <div key={item.mode} className="flex justify-between items-center">
                <span className="text-sm text-slate-300">{CALL_MODE_LABELS[item.mode] ?? item.mode}</span>
                <span className="text-sm font-medium text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status bo'yicha</h3>
          <div className="space-y-2">
            {d.byStatus.map((item) => {
              const pct = d.summary.total > 0 ? Math.round((item.count / d.summary.total) * 100) : 0;
              const colors: Record<string, string> = {
                COMPLETED: "bg-emerald-500",
                FAILED: "bg-red-500",
                NO_ANSWER: "bg-yellow-500",
                BUSY: "bg-orange-500",
                CANCELLED: "bg-slate-500",
                PENDING: "bg-blue-500",
              };
              return (
                <div key={item.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{item.status}</span>
                    <span className="text-slate-400">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[item.status] ?? "bg-slate-500"} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
