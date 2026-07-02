"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, Pencil } from "lucide-react";
import { useState } from "react";
import { CallDetailModal } from "./call-detail-modal";
import { EditCallModal } from "./edit-call-modal";
import { ProvinceFilter } from "@/components/shared/province-filter";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:     { label: "Kutilmoqda",       className: "border-slate-700 text-slate-400" },
  DIALING:     { label: "Terilmoqda",       className: "border-blue-800 text-blue-400" },
  IN_PROGRESS: { label: "Gaplashmoqda",     className: "border-indigo-800 text-indigo-400" },
  COMPLETED:   { label: "Tugadi",           className: "border-green-800 text-green-400" },
  FAILED:      { label: "Muvaffaqiyatsiz",  className: "border-red-800 text-red-400" },
  NO_ANSWER:   { label: "Javob bermadi",    className: "border-yellow-800 text-yellow-400" },
  BUSY:        { label: "Band",             className: "border-orange-800 text-orange-400" },
  CANCELLED:   { label: "Bekor",            className: "border-slate-700 text-slate-500" },
};

const PURPOSE_LABELS: Record<string, string> = {
  DEBT_REMINDER: "Qarz eslatmasi",
  REACTIVATION:  "Qayta jalb",
  OFFER:         "Taklif",
  FOLLOW_UP:     "Kuzatuv",
  SURVEY:        "So'rov",
};

interface CallRow {
  id: string;
  status: string;
  purpose: string;
  duration: number | null;
  phone: string;
  attempt: number;
  createdAt: string;
  client: { id: string; name: string; phone: string };
  initiatedBy: { name: string };
}

export function CallsTable() {
  const [page, setPage] = useState(1);
  const [province, setProvince] = useState("");
  const [detailCallId, setDetailCallId] = useState<string | null>(null);
  const [editCall, setEditCall] = useState<CallRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["calls", page, province],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (province) p.set("province", province);
      const res = await fetch(`/api/calls?${p}`);
      const json = await res.json();
      return json.data as { calls: CallRow[]; total: number; totalPages: number };
    },
  });

  return (
    <>
      <div className="space-y-4">
        <ProvinceFilter
          value={province}
          onChange={(v) => { setProvince(v); setPage(1); }}
          statsUrl="/api/calls/province-stats"
          countLabel="ta qo'ng'iroq"
        />
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Mijoz", "Maqsad", "Holat", "Davomiyligi", "Urinish", "Sana", "Amallar"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : !data?.calls?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Phone className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">Qo'ng'iroqlar topilmadi</p>
                    <p className="text-slate-600 text-xs mt-1">
                      Yangi AI qo'ng'iroq boshlash uchun "Qo'ng'iroq boshlash" tugmasini bosing
                    </p>
                  </td>
                </tr>
              ) : (
                data.calls.map((call) => (
                  <tr key={call.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{call.client.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{call.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {PURPOSE_LABELS[call.purpose] || call.purpose}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_CONFIG[call.status]?.className}>
                        {STATUS_CONFIG[call.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {call.duration ? `${call.duration}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{call.attempt}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(call.createdAt).toLocaleDateString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Ko'rish */}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                          title="Tafsilotlar"
                          onClick={() => setDetailCallId(call.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {/* Tahrirlash */}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30"
                          title="Tahrirlash"
                          onClick={() => setEditCall(call)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-slate-500 text-sm">Jami: {data.total} ta</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
                  disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <span className="text-slate-400 text-sm py-1.5 px-2">{page}/{data.totalPages}</span>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
                  disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CallDetailModal callId={detailCallId} onClose={() => setDetailCallId(null)} />
      <EditCallModal call={editCall} onClose={() => setEditCall(null)} />
    </>
  );
}
