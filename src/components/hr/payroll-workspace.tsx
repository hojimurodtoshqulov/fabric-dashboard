"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayAdjustmentType, PayType } from "@prisma/client";
import { Loader2, CheckCircle2, Banknote, RotateCcw, Plus, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money, MoneyFormatToggle } from "@/components/shared/money";
import { PAY_TYPE_LABELS, ADJUSTMENT_LABELS, PAYROLL_STATUS_LABELS, monthOf, monthLabel } from "@/lib/hr/shared";
import { api, MonthSwitcher, ErrorLine, inputCls } from "./common";

interface Line {
  employeeId: string; fullName: string; position: string; department: string | null; payType: PayType;
  workedDays: number; markedDays: number;
  baseAmount: number; pieceAmount: number; bonus: number; penalty: number; advance: number; total: number;
}
interface Adjustment { id: string; type: PayAdjustmentType; amount: number; reason: string | null; employee: { fullName: string } }
interface PayrollData {
  month: string;
  status: "DRAFT" | "APPROVED" | "PAID";
  workingDays: number;
  lines: Line[];
  totals: { base: number; piece: number; bonus: number; penalty: number; advance: number; total: number };
  adjustments: Adjustment[];
}

const STATUS_CLS = {
  DRAFT: "bg-slate-500/10 text-slate-300 border-slate-700",
  APPROVED: "bg-amber-500/10 text-amber-300 border-amber-800",
  PAID: "bg-green-500/10 text-green-300 border-green-800",
};

export function PayrollWorkspace({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(monthOf());
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [adjOpen, setAdjOpen] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payroll", month, workingDays],
    queryFn: () => api<PayrollData>(`/api/hr/payroll?month=${month}${workingDays ? `&workingDays=${workingDays}` : ""}`),
  });

  const act = useMutation({
    mutationFn: (action: "approve" | "pay" | "reopen") =>
      api("/api/hr/payroll", { method: "PATCH", body: { month, action, workingDays: data?.workingDays } }),
    onSuccess: () => { setError(""); qc.invalidateQueries({ queryKey: ["payroll"] }); },
    onError: (e: Error) => setError(e.message),
  });
  const removeAdj = useMutation({
    mutationFn: (id: string) => api(`/api/hr/adjustments?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
    onError: (e: Error) => setError(e.message),
  });

  const open = data?.status === "DRAFT";
  const noTabel = data?.lines.filter((l) => l.payType !== "PIECE" && l.markedDays === 0) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={(m) => { setMonth(m); setWorkingDays(null); }} />
        {data && (
          <>
            <Badge variant="outline" className={STATUS_CLS[data.status]}>{PAYROLL_STATUS_LABELS[data.status]}</Badge>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Ish kunlari:
              <Input type="number" min={1} max={31} value={data.workingDays} disabled={!open || !canEdit}
                onChange={(e) => setWorkingDays(Number(e.target.value) || null)}
                className={`${inputCls} h-8 w-16`} />
            </label>
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <MoneyFormatToggle />
          {canEdit && data && open && (
            <>
              <Button variant="outline" onClick={() => setAdjOpen(true)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" /> Bonus / jarima / avans
              </Button>
              <Button disabled={act.isPending || data.lines.length === 0} onClick={() => act.mutate("approve")}
                className="bg-amber-600 hover:bg-amber-500">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Tasdiqlash
              </Button>
            </>
          )}
          {canEdit && data?.status === "APPROVED" && (
            <Button disabled={act.isPending} onClick={() => act.mutate("pay")} className="bg-green-700 hover:bg-green-600">
              <Banknote className="mr-2 h-4 w-4" /> To&apos;landi deb belgilash
            </Button>
          )}
          {canEdit && data && !open && (
            <Button variant="outline" disabled={act.isPending} onClick={() => act.mutate("reopen")}
              className="border-slate-700 text-slate-400 hover:bg-slate-800" title="Qayta ochish — tuzatish kiritish uchun">
              <RotateCcw className="mr-2 h-4 w-4" /> Qayta ochish
            </Button>
          )}
        </div>
      </div>

      <p className="text-slate-500 text-xs -mt-2">
        {open
          ? "Qoralama: davomat, ishbay va bonuslar o'zgarsa, hisob darhol yangilanadi. Tasdiqlangach bu oy yozuvlari qulflanadi."
          : "Tasdiqlangan: summalar muzlatilgan, bu oyning davomati va ishbay yozuvlarini o'zgartirib bo'lmaydi."}
      </p>

      <ErrorLine error={error} />

      {open && noTabel.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2 text-sm text-amber-200 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {noTabel.length} ta xodimga bu oyda davomat belgilanmagan — oyligi 0 chiqadi:{" "}
            {noTabel.slice(0, 5).map((l) => l.fullName).join(", ")}{noTabel.length > 5 && "…"}
          </span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Asosiy oylik", v: data.totals.base, c: "text-white" },
            { label: "Ishbay", v: data.totals.piece, c: "text-sky-300" },
            { label: "Bonuslar", v: data.totals.bonus, c: "text-green-400" },
            { label: "Jarimalar", v: -data.totals.penalty, c: "text-red-400" },
            { label: "Avanslar", v: -data.totals.advance, c: "text-amber-300" },
            { label: "Qo'lga beriladi", v: data.totals.total, c: "text-indigo-300" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 text-xs">{s.label}</p>
              <p className={`font-bold mt-0.5 ${s.c}`}><Money amount={s.v} /></p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Xodim</th>
              <th className="text-left px-4 py-3 font-medium">Turi</th>
              <th className="text-right px-4 py-3 font-medium">Ishladi</th>
              <th className="text-right px-4 py-3 font-medium">Asosiy</th>
              <th className="text-right px-4 py-3 font-medium">Ishbay</th>
              <th className="text-right px-4 py-3 font-medium">Bonus</th>
              <th className="text-right px-4 py-3 font-medium">Jarima</th>
              <th className="text-right px-4 py-3 font-medium">Avans</th>
              <th className="text-right px-4 py-3 font-medium">Qo&apos;lga</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500 inline" /></td></tr>
            ) : data?.lines.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-500">Bu oyda ishlagan xodim yo&apos;q</td></tr>
            ) : data?.lines.map((l) => (
              <tr key={l.employeeId} className="border-b border-slate-800/50">
                <td className="px-4 py-2.5">
                  <p className="text-white">{l.fullName}</p>
                  <p className="text-slate-500 text-xs">{[l.department, l.position].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{PAY_TYPE_LABELS[l.payType]}</td>
                <td className="px-4 py-2.5 text-right text-slate-300">
                  {l.payType === "PIECE" ? "—" : <>{l.workedDays}<span className="text-slate-600"> / {data.workingDays}</span></>}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-200"><Money amount={l.baseAmount} /></td>
                <td className="px-4 py-2.5 text-right text-sky-300">{l.pieceAmount ? <Money amount={l.pieceAmount} /> : "—"}</td>
                <td className="px-4 py-2.5 text-right text-green-400">{l.bonus ? <Money amount={l.bonus} /> : "—"}</td>
                <td className="px-4 py-2.5 text-right text-red-400">{l.penalty ? <Money amount={-l.penalty} /> : "—"}</td>
                <td className="px-4 py-2.5 text-right text-amber-300">{l.advance ? <Money amount={-l.advance} /> : "—"}</td>
                <td className="px-4 py-2.5 text-right text-white font-semibold"><Money amount={l.total} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.adjustments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-white text-sm font-semibold">Bonus, jarima va avanslar — {monthLabel(month)}</h3>
          {data.adjustments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className={
                a.type === "BONUS" ? "border-green-800 text-green-300" : a.type === "PENALTY" ? "border-red-800 text-red-300" : "border-amber-800 text-amber-300"
              }>{ADJUSTMENT_LABELS[a.type]}</Badge>
              <span className="text-white">{a.employee.fullName}</span>
              <span className="text-slate-200"><Money amount={a.amount} /></span>
              <span className="text-slate-500 truncate">{a.reason}</span>
              {canEdit && open && (
                <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-slate-500 hover:text-red-400"
                  onClick={() => removeAdj.mutate(a.id)} title="O'chirish">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <PieceRatesManager canEdit={canEdit} />

      {adjOpen && data && (
        <AdjustmentDialog month={month} employees={data.lines} onClose={() => setAdjOpen(false)} />
      )}
    </div>
  );
}

function AdjustmentDialog({ month, employees, onClose }: { month: string; employees: Line[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employeeId: "", type: "BONUS" as PayAdjustmentType, amount: "", reason: "" });
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => api("/api/hr/adjustments", { method: "POST", body: { ...form, month } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader><DialogTitle>Bonus / jarima / avans — {monthLabel(month)}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ADJUSTMENT_LABELS) as PayAdjustmentType[]).map((t) => (
              <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`py-2 rounded-lg border text-sm ${form.type === t ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-700 text-slate-400"}`}>
                {ADJUSTMENT_LABELS[t]}
              </button>
            ))}
          </div>
          <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Xodimni tanlang" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-72">
              {employees.map((e) => <SelectItem key={e.employeeId} value={e.employeeId}>{e.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input inputMode="numeric" placeholder="Summa, so'm" value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} required />
          <Input placeholder="Sababi (ixtiyoriy)" value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} />
          <p className="text-slate-500 text-xs">
            {form.type === "ADVANCE" ? "Avans — oy davomida oldindan berilgan pul, oylikdan ayiriladi."
              : form.type === "PENALTY" ? "Jarima oylikdan ayiriladi." : "Bonus oylikka qo'shiladi."}
          </p>
          <ErrorLine error={error} />
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !form.employeeId} className="bg-indigo-600 hover:bg-indigo-500">
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface Rate { id: string; name: string; unit: string; price: number | null; isActive: boolean }

function PieceRatesManager({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", unit: "dona", price: "" });
  const [editing, setEditing] = useState<{ id: string; price: string } | null>(null);
  const [error, setError] = useState("");
  const { data } = useQuery({ queryKey: ["piece-rates"], queryFn: () => api<{ rates: Rate[] }>("/api/hr/piece-rates") });

  const done = () => { setError(""); qc.invalidateQueries({ queryKey: ["piece-rates"] }); qc.invalidateQueries({ queryKey: ["payroll"] }); };
  const add = useMutation({
    mutationFn: () => api("/api/hr/piece-rates", { method: "POST", body: form }),
    onSuccess: () => { setForm({ name: "", unit: "dona", price: "" }); done(); },
    onError: (e: Error) => setError(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/api/hr/piece-rates/${id}`, { method: "PATCH", body }),
    onSuccess: () => { setEditing(null); done(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-white text-sm font-semibold">Ishbay narxlari</h3>
        <p className="text-slate-500 text-xs">Har bir ish turi uchun xodim oladigan summa. Narx o&apos;zgarsa, faqat keyingi yozuvlarga ta&apos;sir qiladi.</p>
      </div>
      <div className="divide-y divide-slate-800">
        {data?.rates.length === 0 && <p className="text-slate-500 text-sm py-2">Hali kiritilmagan</p>}
        {data?.rates.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 py-2 text-sm ${r.isActive ? "" : "opacity-50"}`}>
            <span className="text-white flex-1">{r.name}</span>
            {editing?.id === r.id ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); update.mutate({ id: r.id, body: { price: editing.price } }); }}>
                <Input autoFocus inputMode="numeric" value={editing.price} onChange={(e) => setEditing({ id: r.id, price: e.target.value })}
                  className={`${inputCls} h-8 w-32`} />
                <Button size="sm" type="submit" className="h-8 bg-indigo-600">OK</Button>
              </form>
            ) : (
              <span className="text-slate-200"><Money amount={r.price ?? 0} /> <span className="text-slate-500">/ {r.unit}</span></span>
            )}
            {canEdit && editing?.id !== r.id && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-indigo-400" title="Narxni o'zgartirish"
                  onClick={() => setEditing({ id: r.id, price: String(r.price ?? "") })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <button className="text-xs text-slate-500 hover:text-white w-20 text-right"
                  onClick={() => update.mutate({ id: r.id, body: { isActive: !r.isActive } })}>
                  {r.isActive ? "O'chirish" : "Yoqish"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Input placeholder="Ish turi (masalan: Bint tikish)" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${inputCls} flex-1 min-w-48`} required />
          <Input placeholder="Birlik" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            className={`${inputCls} w-24`} />
          <Input placeholder="Narx, so'm" inputMode="numeric" value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={`${inputCls} w-36`} required />
          <Button type="submit" disabled={add.isPending} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="mr-1 h-4 w-4" /> Qo&apos;shish
          </Button>
        </form>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
