"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/shared/money";
import { todayString } from "@/lib/hr/shared";
import { api, ErrorLine, inputCls } from "./common";

interface Rate { id: string; name: string; unit: string; price: number | null; isActive: boolean }
interface Entry {
  id: string;
  quantity: number;
  amount: number | null;
  note: string | null;
  employee: { id: string; fullName: string; department: string | null };
  pieceRate: { id: string; name: string; unit: string };
}

export function PieceworkTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayString());
  const [form, setForm] = useState({ employeeId: "", pieceRateId: "", quantity: "", note: "" });
  const [error, setError] = useState("");

  const { data: emp } = useQuery({
    queryKey: ["employees", "ACTIVE", "all", ""],
    queryFn: () => api<{ employees: { id: string; fullName: string; department: string | null }[] }>("/api/hr/employees?status=ACTIVE"),
  });
  const { data: rates } = useQuery({
    queryKey: ["piece-rates"],
    queryFn: () => api<{ rates: Rate[] }>("/api/hr/piece-rates"),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["piecework", date],
    queryFn: () => api<{ entries: Entry[] }>(`/api/hr/piecework?date=${date}`),
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["piecework", date] }); qc.invalidateQueries({ queryKey: ["payroll"] }); };
  const add = useMutation({
    mutationFn: () => api("/api/hr/piecework", { method: "POST", body: { date, ...form } }),
    onSuccess: () => { setForm((f) => ({ ...f, quantity: "", note: "" })); setError(""); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/hr/piecework?id=${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const activeRates = rates?.rates.filter((r) => r.isActive) ?? [];
  const entries = data?.entries ?? [];
  const showMoney = entries.some((e) => e.amount !== null);
  const unit = activeRates.find((r) => r.id === form.pieceRateId)?.unit;

  return (
    <div className="space-y-4">
      <Input type="date" value={date} max={todayString()} onChange={(e) => e.target.value && setDate(e.target.value)}
        className={`${inputCls} w-44`} />

      {canEdit && (
        activeRates.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
            Ishbay turlari hali kiritilmagan. Direktor yoki buxgalter &quot;Oylik → Ishbay narxlari&quot; bo&apos;limida
            qo&apos;shadi (masalan: &quot;Bint tikish — 1 quti — 2 000 so&apos;m&quot;).
          </div>
        ) : (
          <form className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div className="w-60">
              <p className="text-slate-400 text-xs mb-1">Xodim</p>
              <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-72">
                  {emp?.employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-60">
              <p className="text-slate-400 text-xs mb-1">Ish turi</p>
              <Select value={form.pieceRateId} onValueChange={(v) => setForm((f) => ({ ...f, pieceRateId: v }))}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {activeRates.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <p className="text-slate-400 text-xs mb-1">Miqdor{unit && ` (${unit})`}</p>
              <Input inputMode="decimal" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className={inputCls} required />
            </div>
            <div className="flex-1 min-w-40">
              <p className="text-slate-400 text-xs mb-1">Izoh</p>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} />
            </div>
            <Button type="submit" disabled={add.isPending || !form.employeeId || !form.pieceRateId}
              className="bg-indigo-600 hover:bg-indigo-500">
              {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Qo&apos;shish
            </Button>
          </form>
        )
      )}

      <ErrorLine error={error} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Xodim</th>
              <th className="text-left px-4 py-3 font-medium">Ish turi</th>
              <th className="text-right px-4 py-3 font-medium">Miqdor</th>
              {showMoney && <th className="text-right px-4 py-3 font-medium">Summa</th>}
              <th className="text-left px-4 py-3 font-medium">Izoh</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500 inline" /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500">Bu kunga ishbay ish kiritilmagan</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/50">
                <td className="px-4 py-2.5 text-white">{e.employee.fullName}</td>
                <td className="px-4 py-2.5 text-slate-300">{e.pieceRate.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-200">{e.quantity} {e.pieceRate.unit}</td>
                {showMoney && <td className="px-4 py-2.5 text-right text-green-400"><Money amount={e.amount ?? 0} /></td>}
                <td className="px-4 py-2.5 text-slate-500">{e.note ?? ""}</td>
                {canEdit && (
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400"
                      disabled={remove.isPending} onClick={() => remove.mutate(e.id)} title="O'chirish">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
