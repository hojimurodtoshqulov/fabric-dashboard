"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, PhoneMissed, BarChart3, AlertCircle, ChevronDown, ChevronUp, Clock, User, Loader2 } from "lucide-react";
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

interface CallRow {
  id: string;
  status: string;
  callResult: string | null;
  callMode: string | null;
  createdAt: string;
  client: { id: string; name: string; phone: string } | null;
  voiceTemplate?: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED:  "Muvaffaqiyatli",
  FAILED:     "Xato",
  NO_ANSWER:  "Javob bermadi",
  BUSY:       "Band",
  PENDING:    "Navbatda",
  CANCELLED:  "Bekor qilingan",
  IN_PROGRESS:"Jarayonda",
  DIALING:    "Terilmoqda",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  FAILED:     "text-red-400 bg-red-500/10 border-red-500/20",
  NO_ANSWER:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  BUSY:       "text-orange-400 bg-orange-500/10 border-orange-500/20",
  PENDING:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CANCELLED:  "text-slate-400 bg-slate-700 border-slate-600",
  IN_PROGRESS:"text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  DIALING:    "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ── Filtered call list ────────────────────────────────────────────────────────
// statusFilter: "all" = no filter (all calls), other string = CallStatus enum value
function CallList({ statusFilter }: { statusFilter: string }) {
  const { data, isLoading } = useQuery<{ data: { calls: CallRow[]; total: number } }>({
    queryKey: ["calls-filtered", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "20" });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      return fetch(`/api/calls?${params}`).then((r) => r.json());
    },
    staleTime: 30_000,
  });

  const calls = data?.data?.calls ?? [];
  const total = data?.data?.total ?? 0;

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
    </div>
  );

  if (calls.length === 0) return (
    <p className="text-sm text-slate-500 text-center py-8">Bu statusdagi qo'ng'iroqlar yo'q</p>
  );

  return (
    <div className="space-y-1.5">
      {total > calls.length && (
        <p className="text-xs text-slate-500 text-right mb-2">Jami {total} ta, oxirgi 20 ta ko'rsatilmoqda</p>
      )}
      {calls.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 rounded-lg border border-slate-700/40 hover:border-slate-600/60 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{c.client?.name ?? "Noma'lum"}</p>
            <p className="text-xs text-slate-500 font-mono">{c.client?.phone ?? "—"}</p>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <span className={`inline-block text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[c.status] ?? "text-slate-400 bg-slate-700 border-slate-600"}`}>
              {STATUS_LABELS[c.status] ?? c.status}
            </span>
            {c.callResult && (
              <p className="text-xs text-slate-500">{CALL_RESULT_LABELS[c.callResult] ?? c.callResult}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <Clock className="h-3 w-3" />
            {fmtDate(c.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CallResultsStats() {
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [showList, setShowList] = useState(false);

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: ResultsData }>({
    queryKey: ["call-results"],
    queryFn: async () => {
      const res = await fetch("/api/calls/results");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !data?.success) return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm">Ma'lumot yuklanmadi. Sahifani yangilang.</p>
    </div>
  );

  const d = data?.data;
  if (!d || d.summary.total === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <BarChart3 className="h-8 w-8" />
      <p className="text-sm">Hali qo'ng'iroqlar amalga oshirilmagan</p>
    </div>
  );

  function handleCard(filter: string, label: string) {
    if (activeFilter === filter && showList) {
      setShowList(false);
      setActiveFilter("");
    } else {
      setActiveFilter(filter);
      setShowList(true);
    }
  }

  const statCards = [
    { label: "Jami qo'ng'iroqlar", value: d.summary.total,             icon: Phone,       color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  filter: "all" },
    { label: "Muvaffaqiyatli",      value: d.summary.completed,         icon: Phone,       color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", filter: "COMPLETED" },
    { label: "Javob bermadi",       value: d.summary.noAnswer,          icon: PhoneMissed, color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  filter: "NO_ANSWER" },
    { label: "Javob ulushi",        value: `${d.summary.answeredRate}%`, icon: BarChart3,  color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",    filter: "COMPLETED" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const isActive = activeFilter === s.filter && showList;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => handleCard(s.filter, s.label)}
              className={`text-left bg-slate-800 rounded-xl border p-4 transition-all cursor-pointer hover:bg-slate-700/80 hover:scale-[1.02] active:scale-[0.99]
                ${isActive ? `${s.border} ring-1 ring-inset ring-current` : "border-slate-700"}`}
            >
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${isActive ? s.color : "text-white"}`}>{s.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400">{s.label}</p>
                {isActive
                  ? <ChevronUp className={`h-3.5 w-3.5 ${s.color}`} />
                  : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                }
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Filtered call list ─────────────────────────────── */}
      {showList && activeFilter !== "" && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {activeFilter === "all" ? "Barcha" : (STATUS_LABELS[activeFilter] ?? activeFilter)} qo&apos;ng&apos;iroqlar
            </h3>
            <button onClick={() => { setShowList(false); setActiveFilter(""); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Yopish ×
            </button>
          </div>
          <CallList statusFilter={activeFilter} />
        </div>
      )}

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
              <div key={item.mode ?? "unknown"} className="flex justify-between items-center">
                <span className="text-sm text-slate-300">{CALL_MODE_LABELS[item.mode ?? ""] ?? item.mode ?? "Noma'lum"}</span>
                <span className="text-sm font-medium text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status bo'yicha</h3>
          <div className="space-y-3">
            {d.byStatus.map((item) => {
              const pct = d.summary.total > 0 ? Math.round((item.count / d.summary.total) * 100) : 0;
              const colors: Record<string, string> = {
                COMPLETED:  "bg-emerald-500",
                FAILED:     "bg-red-500",
                NO_ANSWER:  "bg-yellow-500",
                BUSY:       "bg-orange-500",
                CANCELLED:  "bg-slate-500",
                PENDING:    "bg-blue-500",
                IN_PROGRESS:"bg-indigo-500",
                DIALING:    "bg-purple-500",
              };
              return (
                <button key={item.status} type="button"
                  onClick={() => handleCard(item.status, item.status)}
                  className="w-full text-left hover:opacity-80 transition-opacity">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{STATUS_LABELS[item.status] ?? item.status}</span>
                    <span className="text-slate-400">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[item.status] ?? "bg-slate-500"} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
