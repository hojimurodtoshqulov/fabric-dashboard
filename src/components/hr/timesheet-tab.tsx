"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AttendanceStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { ATTENDANCE_LABELS, monthOf } from "@/lib/hr/shared";
import { api, MonthSwitcher } from "./common";

interface Data {
  month: string;
  days: number;
  workingDays: number;
  rows: { id: string; fullName: string; position: string; department: string | null; days: Record<number, AttendanceStatus>; worked: number }[];
}

export function TimesheetTab() {
  const [month, setMonth] = useState(monthOf());
  const { data, isLoading } = useQuery({
    queryKey: ["timesheet", month],
    queryFn: () => api<Data>(`/api/hr/attendance/month?month=${month}`),
  });

  const [y, m] = month.split("-").map(Number);
  const isSunday = (d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
  const dayNums = Array.from({ length: data?.days ?? 0 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={setMonth} />
        {data && <span className="text-slate-400 text-sm">Ish kunlari (dush–shan): {data.workingDays}</span>}
        <div className="flex flex-wrap gap-1.5 text-xs ml-auto">
          {(Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]).map((s) => (
            <span key={s} className={`px-1.5 py-0.5 rounded border ${ATTENDANCE_LABELS[s].className}`}>
              {ATTENDANCE_LABELS[s].short} {ATTENDANCE_LABELS[s].label}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-slate-500">
                <th className="sticky left-0 bg-slate-900 text-left px-3 py-2 font-medium min-w-48 border-b border-slate-800">Xodim</th>
                {dayNums.map((d) => (
                  <th key={d} className={`w-7 py-2 font-medium border-b border-slate-800 ${isSunday(d) ? "text-red-400/70" : ""}`}>{d}</th>
                ))}
                <th className="px-3 py-2 font-medium border-b border-slate-800 text-right">Ishladi</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length === 0 && (
                <tr><td colSpan={dayNums.length + 2} className="py-10 text-center text-slate-500">Xodimlar yo&apos;q</td></tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/50">
                  <td className="sticky left-0 bg-slate-900 px-3 py-1.5">
                    <p className="text-slate-200 truncate max-w-48">{r.fullName}</p>
                    <p className="text-slate-600 truncate max-w-48">{r.department ?? r.position}</p>
                  </td>
                  {dayNums.map((d) => {
                    const s = r.days[d];
                    return (
                      <td key={d} className={`text-center py-1.5 ${isSunday(d) ? "bg-slate-800/30" : ""}`}
                        title={s ? ATTENDANCE_LABELS[s].label : undefined}>
                        {s && (
                          <span className={`inline-block w-5 h-5 leading-5 rounded border ${ATTENDANCE_LABELS[s].className}`}>
                            {ATTENDANCE_LABELS[s].short}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right text-white font-medium">
                    {r.worked}<span className="text-slate-500 font-normal"> / {data.workingDays}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
