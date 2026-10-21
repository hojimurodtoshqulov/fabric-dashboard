"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceStatus } from "@prisma/client";
import { Loader2, CheckCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTENDANCE_LABELS, todayString } from "@/lib/hr/shared";
import { api, ErrorLine, inputCls } from "./common";

interface Row {
  id: string;
  fullName: string;
  position: string;
  department: string | null;
  status: AttendanceStatus | null;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
}

type Edit = Pick<Row, "status" | "checkIn" | "checkOut">;
const STATUSES = Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[];

export function AttendanceDay({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayString());
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", date],
    queryFn: () => api<{ rows: Row[] }>(`/api/hr/attendance?date=${date}`),
  });
  const rows = useMemo(() => data?.rows ?? [], [data]);

  const current = (r: Row): Edit => edits[r.id] ?? { status: r.status, checkIn: r.checkIn, checkOut: r.checkOut };
  const set = (r: Row, patch: Partial<Edit>) => {
    setSaved(false);
    setEdits((e) => ({ ...e, [r.id]: { ...current(r), ...patch } }));
  };

  const save = useMutation({
    mutationFn: () => api("/api/hr/attendance", {
      method: "PUT",
      body: { date, entries: Object.entries(edits).map(([employeeId, e]) => ({ employeeId, ...e })) },
    }),
    onSuccess: () => {
      setEdits({}); setError(""); setSaved(true);
      qc.invalidateQueries({ queryKey: ["attendance", date] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const unmarked = rows.filter((r) => !current(r).status);
  const counts = STATUSES.map((s) => ({ s, n: rows.filter((r) => current(r).status === s).length })).filter((c) => c.n > 0);
  const dirty = Object.keys(edits).length;

  // group by department for a readable list
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const k = r.department || "Bo'limsiz";
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={date} max={todayString()}
          onChange={(e) => { if (e.target.value) { setDate(e.target.value); setEdits({}); setSaved(false); } }}
          className={`${inputCls} w-44`} />
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300">Jami: {rows.length}</span>
          {counts.map(({ s, n }) => (
            <span key={s} className={`px-2 py-1 rounded-md border ${ATTENDANCE_LABELS[s].className}`}>
              {ATTENDANCE_LABELS[s].label}: {n}
            </span>
          ))}
          {unmarked.length > 0 && (
            <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-500">Belgilanmagan: {unmarked.length}</span>
          )}
        </div>
        {canEdit && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" disabled={unmarked.length === 0}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => unmarked.forEach((r) => set(r, { status: "PRESENT" }))}>
              <CheckCheck className="mr-2 h-4 w-4 text-green-400" /> Qolganlarni &quot;Keldi&quot;
            </Button>
            <Button disabled={dirty === 0 || save.isPending} onClick={() => save.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500">
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Saqlash{dirty > 0 && ` (${dirty})`}
            </Button>
          </div>
        )}
      </div>

      <ErrorLine error={error} />
      {saved && dirty === 0 && <p className="text-sm text-green-400">Saqlandi</p>}

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center text-slate-500">
          Xodimlar yo&apos;q. Avval &quot;Xodimlar&quot; bo&apos;limida xodim qo&apos;shing.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([dept, list]) => (
            <div key={dept} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                {dept} · {list.length}
              </div>
              <div className="divide-y divide-slate-800/60">
                {list.map((r) => {
                  const c = current(r);
                  const changed = r.id in edits;
                  return (
                    <div key={r.id} className={`px-4 py-2.5 flex flex-wrap items-center gap-3 ${changed ? "bg-indigo-500/5" : ""}`}>
                      <div className="w-56 min-w-0">
                        <p className="text-white text-sm truncate">{r.fullName}</p>
                        <p className="text-slate-500 text-xs truncate">{r.position}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map((s) => {
                          const on = c.status === s;
                          return (
                            <button key={s} disabled={!canEdit}
                              onClick={() => set(r, { status: on ? null : s })}
                              className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                                on ? ATTENDANCE_LABELS[s].className : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                              } disabled:cursor-default`}>
                              {ATTENDANCE_LABELS[s].label}
                            </button>
                          );
                        })}
                      </div>
                      {(c.status === "PRESENT" || c.status === "LATE" || c.status === "HALF_DAY") && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Input type="time" value={c.checkIn ?? ""} disabled={!canEdit} title="Keldi"
                            onChange={(e) => set(r, { checkIn: e.target.value || null })}
                            className={`${inputCls} h-8 w-28 text-xs`} />
                          <span className="text-slate-600">–</span>
                          <Input type="time" value={c.checkOut ?? ""} disabled={!canEdit} title="Ketdi"
                            onChange={(e) => set(r, { checkOut: e.target.value || null })}
                            className={`${inputCls} h-8 w-28 text-xs`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
