"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Phone, User, Clock, Target, Loader2,
  MessageSquare, Activity,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:     { label: "Kutilmoqda",        className: "border-slate-700 text-slate-400 bg-slate-800/50" },
  DIALING:     { label: "Terilmoqda",        className: "border-blue-800 text-blue-400 bg-blue-950/40" },
  IN_PROGRESS: { label: "Gaplashmoqda",      className: "border-indigo-800 text-indigo-400 bg-indigo-950/40" },
  COMPLETED:   { label: "Tugadi",            className: "border-green-800 text-green-400 bg-green-950/40" },
  FAILED:      { label: "Muvaffaqiyatsiz",   className: "border-red-800 text-red-400 bg-red-950/40" },
  NO_ANSWER:   { label: "Javob bermadi",     className: "border-yellow-800 text-yellow-400 bg-yellow-950/40" },
  BUSY:        { label: "Band",              className: "border-orange-800 text-orange-400 bg-orange-950/40" },
  CANCELLED:   { label: "Bekor",            className: "border-slate-700 text-slate-500 bg-slate-800/30" },
};

const PURPOSE_LABELS: Record<string, string> = {
  DEBT_REMINDER: "Qarz eslatmasi",
  REACTIVATION:  "Qayta jalb",
  OFFER:         "Taklif",
  FOLLOW_UP:     "Kuzatuv",
  SURVEY:        "So'rov",
};

interface CallDetail {
  id: string;
  status: string;
  purpose: string;
  phone: string;
  duration: number | null;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  client: { name: string; phone: string };
  initiatedBy: { name: string };
  logs: Array<{ id: string; event: string; detail: string | null; createdAt: string }>;
  transcripts: Array<{ id: string; speaker: string; text: string; createdAt: string }>;
}

interface Props {
  callId: string | null;
  onClose: () => void;
}

export function CallDetailModal({ callId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["call-detail", callId],
    queryFn: async () => {
      const res = await fetch(`/api/calls/${callId}`);
      const json = await res.json();
      return json.data as CallDetail;
    },
    enabled: !!callId,
  });

  const statusCfg = data ? (STATUS_CONFIG[data.status] ?? STATUS_CONFIG.PENDING) : null;

  return (
    <Dialog open={!!callId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="p-1.5 bg-purple-500/15 rounded-lg">
              <Phone className="h-4 w-4 text-purple-400" />
            </div>
            AI Qo'ng'iroq tafsilotlari
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : !data ? (
          <p className="text-slate-500 text-center py-12">Ma'lumot topilmadi</p>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mijoz</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="text-white text-sm font-medium">{data.client.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300 text-sm font-mono">{data.phone}</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Holat</p>
                {statusCfg && (
                  <Badge variant="outline" className={statusCfg.className}>
                    {statusCfg.label}
                  </Badge>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-300">{PURPOSE_LABELS[data.purpose] ?? data.purpose}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-400">
                    {data.duration ? `${data.duration} soniya` : "—"} · Urinish: {data.attempt}/{data.maxAttempts}
                  </span>
                </div>
              </div>
            </div>

            {/* Transcripts */}
            {data.transcripts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-white">Suhbat</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {data.transcripts.map((t) => (
                    <div
                      key={t.id}
                      className={`flex gap-2.5 ${t.speaker === "AI" ? "flex-row" : "flex-row-reverse"}`}
                    >
                      <div className={`text-xs px-2 py-0.5 rounded shrink-0 h-fit mt-1 ${
                        t.speaker === "AI"
                          ? "bg-purple-900/50 text-purple-300"
                          : "bg-slate-700 text-slate-300"
                      }`}>
                        {t.speaker === "AI" ? "AI" : "Mijoz"}
                      </div>
                      <div className={`text-sm rounded-xl px-3 py-2 max-w-xs ${
                        t.speaker === "AI"
                          ? "bg-slate-800 text-slate-200"
                          : "bg-indigo-900/40 text-indigo-100"
                      }`}>
                        {t.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs */}
            {data.logs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-white">Hodisalar</p>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {data.logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs">
                      <span className="text-slate-600 font-mono shrink-0 mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString("uz-UZ")}
                      </span>
                      <span className="text-indigo-400 font-medium shrink-0">{log.event}</span>
                      {log.detail && <span className="text-slate-400">{log.detail}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.transcripts.length === 0 && data.logs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                {data.status === "PENDING"
                  ? "Qo'ng'iroq navbatda kutilmoqda..."
                  : "Ma'lumot yo'q"}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
