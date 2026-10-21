"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayType } from "@prisma/client";
import { Loader2, UserPlus, Pencil, Search, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/shared/money";
import { PAY_TYPE_LABELS, todayString } from "@/lib/hr/shared";
import { api, ErrorLine, inputCls } from "./common";

interface Employee {
  id: string;
  fullName: string;
  phone: string | null;
  position: string;
  department: string | null;
  payType: PayType;
  baseSalary: number | null; // null when the viewer may not see pay
  dailyRate: number | null;
  hireDate: string;
  fireDate: string | null;
  status: "ACTIVE" | "FIRED";
  notes: string | null;
}

interface ListData {
  employees: Employee[];
  departments: { name: string; count: number }[];
  active: number;
  fired: number;
  canSeePay: boolean;
  canEditPay: boolean;
}

const fmtDate = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join(".") : "—");

export function EmployeesTab({ canEdit }: { canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "FIRED">("ACTIVE");
  const [department, setDepartment] = useState("all");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", status, department, search],
    queryFn: () => {
      const p = new URLSearchParams({ status });
      if (department !== "all") p.set("department", department);
      if (search.trim()) p.set("search", search.trim());
      return api<ListData>(`/api/hr/employees?${p}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input placeholder="Ism, lavozim yoki telefon…" value={search}
            onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9`} />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className={`${inputCls} w-48`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Barcha bo&apos;limlar</SelectItem>
            {data?.departments.map((d) => <SelectItem key={d.name} value={d.name}>{d.name} ({d.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-sm">
          {(["ACTIVE", "FIRED"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-md ${status === s ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {s === "ACTIVE" ? `Ishlayapti (${data?.active ?? 0})` : `Bo'shagan (${data?.fired ?? 0})`}
            </button>
          ))}
        </div>
        {canEdit && (
          <Button onClick={() => setEditing("new")} className="bg-indigo-600 hover:bg-indigo-500">
            <UserPlus className="mr-2 h-4 w-4" /> Yangi xodim
          </Button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Xodim</th>
              <th className="text-left px-4 py-3 font-medium">Bo&apos;lim</th>
              <th className="text-left px-4 py-3 font-medium">Telefon</th>
              <th className="text-left px-4 py-3 font-medium">Oylik turi</th>
              {data?.canSeePay && <th className="text-right px-4 py-3 font-medium">Stavka</th>}
              <th className="text-left px-4 py-3 font-medium">Ishga kirgan</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500 inline" /></td></tr>
            ) : data?.employees.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-500">Xodim topilmadi</td></tr>
            ) : data?.employees.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-2.5">
                  <p className="text-white">{e.fullName}</p>
                  <p className="text-slate-500 text-xs">{e.position}</p>
                </td>
                <td className="px-4 py-2.5 text-slate-300">{e.department ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">{e.phone ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="border-slate-700 text-slate-300">{PAY_TYPE_LABELS[e.payType]}</Badge>
                </td>
                {data?.canSeePay && (
                  <td className="px-4 py-2.5 text-right text-slate-200">
                    {e.payType === "MONTHLY" ? <><Money amount={e.baseSalary ?? 0} /><span className="text-slate-500 text-xs"> /oy</span></>
                      : e.payType === "DAILY" ? <><Money amount={e.dailyRate ?? 0} /><span className="text-slate-500 text-xs"> /kun</span></>
                      : <span className="text-slate-500 text-xs">ishbay narxlari bo&apos;yicha</span>}
                  </td>
                )}
                <td className="px-4 py-2.5 text-slate-400 text-xs">
                  {fmtDate(e.hireDate)}
                  {e.fireDate && <span className="text-red-400"> → {fmtDate(e.fireDate)}</span>}
                </td>
                {canEdit && (
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-400"
                      onClick={() => setEditing(e)} title="Tahrirlash">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EmployeeDialog
          employee={editing === "new" ? null : editing}
          departments={data?.departments.map((d) => d.name) ?? []}
          canEditPay={data?.canEditPay ?? false}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EmployeeDialog({ employee, departments, canEditPay, onClose }: {
  employee: Employee | null;
  departments: string[];
  canEditPay: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: employee?.fullName ?? "",
    position: employee?.position ?? "",
    department: employee?.department ?? "",
    phone: employee?.phone ?? "",
    hireDate: employee?.hireDate.slice(0, 10) ?? todayString(),
    payType: employee?.payType ?? ("MONTHLY" as PayType),
    baseSalary: employee?.baseSalary ? String(employee.baseSalary) : "",
    dailyRate: employee?.dailyRate ? String(employee.dailyRate) : "",
    notes: employee?.notes ?? "",
  });
  const [error, setError] = useState("");
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const done = () => { qc.invalidateQueries({ queryKey: ["employees"] }); qc.invalidateQueries({ queryKey: ["attendance"] }); onClose(); };

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        fullName: form.fullName, position: form.position, department: form.department,
        phone: form.phone, hireDate: form.hireDate, notes: form.notes,
      };
      if (canEditPay) Object.assign(body, { payType: form.payType, baseSalary: form.baseSalary || 0, dailyRate: form.dailyRate || 0 });
      return employee
        ? api(`/api/hr/employees/${employee.id}`, { method: "PATCH", body })
        : api("/api/hr/employees", { method: "POST", body });
    },
    onSuccess: done,
    onError: (e: Error) => setError(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: () => api(`/api/hr/employees/${employee!.id}`, {
      method: "PATCH",
      body: employee!.status === "ACTIVE" ? { status: "FIRED", fireDate: todayString() } : { status: "ACTIVE" },
    }),
    onSuccess: done,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader><DialogTitle>{employee ? "Xodimni tahrirlash" : "Yangi xodim"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div>
            <Label className="text-slate-400 text-sm">Ism familiya</Label>
            <Input value={form.fullName} onChange={f("fullName")} className={`${inputCls} mt-1`} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-sm">Lavozim</Label>
              <Input value={form.position} onChange={f("position")} placeholder="Tikuvchi, haydovchi…" className={`${inputCls} mt-1`} required />
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Bo&apos;lim</Label>
              <Input value={form.department} onChange={f("department")} list="hr-departments"
                placeholder="Tikuv sexi, ombor…" className={`${inputCls} mt-1`} />
              <datalist id="hr-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-sm">Telefon</Label>
              <Input value={form.phone} onChange={f("phone")} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Ishga kirgan sana</Label>
              <Input type="date" value={form.hireDate} onChange={f("hireDate")} className={`${inputCls} mt-1`} required />
            </div>
          </div>

          {canEditPay ? (
            <div className="rounded-lg border border-slate-800 p-3 space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">Oylik turi</Label>
                <Select value={form.payType} onValueChange={(v) => setForm((s) => ({ ...s, payType: v as PayType }))}>
                  <SelectTrigger className={`${inputCls} mt-1`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {(Object.keys(PAY_TYPE_LABELS) as PayType[]).map((t) => <SelectItem key={t} value={t}>{PAY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.payType === "MONTHLY" && (
                <div>
                  <Label className="text-slate-400 text-sm">Oylik summasi (so&apos;m)</Label>
                  <Input inputMode="numeric" value={form.baseSalary} onChange={f("baseSalary")} placeholder="4 000 000" className={`${inputCls} mt-1`} />
                  <p className="text-slate-500 text-xs mt-1">Ishlagan kunlariga qarab hisoblanadi</p>
                </div>
              )}
              {form.payType === "DAILY" && (
                <div>
                  <Label className="text-slate-400 text-sm">Bir kunlik summa (so&apos;m)</Label>
                  <Input inputMode="numeric" value={form.dailyRate} onChange={f("dailyRate")} placeholder="150 000" className={`${inputCls} mt-1`} />
                </div>
              )}
              {form.payType === "PIECE" && (
                <p className="text-slate-500 text-xs">Faqat bajargan ishiga qarab: narxlar &quot;Oylik → Ishbay narxlari&quot; bo&apos;limida</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Oylik shartlarini direktor yoki buxgalter belgilaydi.</p>
          )}

          <ErrorLine error={error} />
          <DialogFooter className="gap-2">
            {employee && (
              <Button type="button" variant="outline" disabled={toggleStatus.isPending} onClick={() => toggleStatus.mutate()}
                className={`border-slate-700 mr-auto ${employee.status === "ACTIVE" ? "text-red-300 hover:bg-red-900/20" : "text-green-300 hover:bg-green-900/20"}`}>
                {employee.status === "ACTIVE"
                  ? <><UserX className="mr-2 h-4 w-4" /> Ishdan bo&apos;shatish</>
                  : <><UserCheck className="mr-2 h-4 w-4" /> Qayta ishga olish</>}
              </Button>
            )}
            <Button type="submit" disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
