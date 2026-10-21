"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money, MoneyFormatToggle } from "@/components/shared/money";
import { monthOf, todayString, monthLabel } from "@/lib/hr/shared";
import { api, MonthSwitcher, ErrorLine, inputCls } from "@/components/hr/common";

interface Category { id: string; name: string; color: string; total: number }
interface Expense {
  id: string; date: string; amount: number; description: string | null; paymentMethod: string | null;
  category: { id: string; name: string; color: string };
}
interface Data { expenses: Expense[]; categories: Category[]; total: number }

const METHODS: Record<string, string> = { CASH: "Naqd", CARD: "Karta", TRANSFER: "O'tkazma" };

export function ExpensesWorkspace({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(monthOf());
  const [filter, setFilter] = useState<string | null>(null);
  const [form, setForm] = useState({ date: todayString(), categoryId: "", amount: "", description: "", paymentMethod: "CASH" });
  const [newCat, setNewCat] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", month],
    queryFn: () => api<Data>(`/api/finance/expenses?month=${month}`),
  });

  const invalidate = () => { setError(""); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["profit"] }); };
  const add = useMutation({
    mutationFn: () => api("/api/finance/expenses", { method: "POST", body: form }),
    onSuccess: () => { setForm((f) => ({ ...f, amount: "", description: "" })); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/finance/expenses/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });
  const addCat = useMutation({
    mutationFn: (name: string) => api<{ category: { id: string } }>("/api/finance/categories", { method: "POST", body: { name } }),
    onSuccess: (r) => { setNewCat(null); setForm((f) => ({ ...f, categoryId: r.category.id })); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const categories = data?.categories ?? [];
  const used = categories.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const list = (data?.expenses ?? []).filter((e) => !filter || e.category.id === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={(m) => { setMonth(m); setFilter(null); }} />
        <span className="text-slate-400 text-sm">
          Jami: <span className="text-white font-semibold"><Money amount={data?.total ?? 0} /></span>
        </span>
        <div className="ml-auto"><MoneyFormatToggle /></div>
      </div>

      {canEdit && (
        <form className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <div>
            <p className="text-slate-400 text-xs mb-1">Sana</p>
            <Input type="date" value={form.date} max={todayString()} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={`${inputCls} w-40`} required />
          </div>
          <div className="w-60">
            <p className="text-slate-400 text-xs mb-1">Xarajat turi</p>
            {newCat !== null ? (
              <div className="flex gap-1">
                <Input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Yangi tur nomi"
                  className={inputCls}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newCat.trim()) addCat.mutate(newCat); } }} />
                <Button type="button" size="sm" className="h-9 bg-indigo-600" disabled={!newCat.trim() || addCat.isPending}
                  onClick={() => addCat.mutate(newCat)}>OK</Button>
              </div>
            ) : (
              <Select value={form.categoryId} onValueChange={(v) => v === "__new" ? setNewCat("") : setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="__new">+ Yangi tur qo&apos;shish</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="w-40">
            <p className="text-slate-400 text-xs mb-1">Summa, so&apos;m</p>
            <Input inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="1 500 000" className={inputCls} required />
          </div>
          <div className="w-32">
            <p className="text-slate-400 text-xs mb-1">To&apos;lov</p>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(METHODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-48">
            <p className="text-slate-400 text-xs mb-1">Izoh</p>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Oktyabr uchun svet puli…" className={inputCls} />
          </div>
          <Button type="submit" disabled={add.isPending || !form.categoryId} className="bg-indigo-600 hover:bg-indigo-500">
            {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Qo&apos;shish
          </Button>
        </form>
      )}

      <ErrorLine error={error} />

      {used.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${!filter ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-700 text-slate-400"}`}>
            Hammasi
          </button>
          {used.map((c) => (
            <button key={c.id} onClick={() => setFilter(filter === c.id ? null : c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 ${filter === c.id ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-700 text-slate-300"}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              {c.name}: <span className="font-semibold"><Money amount={c.total} /></span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Sana</th>
              <th className="text-left px-4 py-3 font-medium">Turi</th>
              <th className="text-left px-4 py-3 font-medium">Izoh</th>
              <th className="text-left px-4 py-3 font-medium">To&apos;lov</th>
              <th className="text-right px-4 py-3 font-medium">Summa</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500 inline" /></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-slate-500">{monthLabel(month)} uchun xarajat kiritilmagan</td></tr>
            ) : list.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/50">
                <td className="px-4 py-2.5 text-slate-300 text-xs">{e.date.slice(0, 10).split("-").reverse().join(".")}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-slate-200">
                    <Tag className="h-3 w-3" style={{ color: e.category.color }} /> {e.category.name}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400">{e.description ?? ""}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{e.paymentMethod ? METHODS[e.paymentMethod] : ""}</td>
                <td className="px-4 py-2.5 text-right text-white font-medium"><Money amount={e.amount} /></td>
                {canEdit && (
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400"
                      disabled={remove.isPending} title="O'chirish"
                      onClick={() => { if (confirm("Xarajatni o'chirasizmi?")) remove.mutate(e.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-slate-500 text-xs">
        Oylik va xom ashyo xaridlari bu yerga kiritilmaydi: ular &quot;Oylik&quot; va &quot;Omborxona → Kirim&quot; dan foyda hisobiga avtomatik qo&apos;shiladi.
      </p>
    </div>
  );
}
