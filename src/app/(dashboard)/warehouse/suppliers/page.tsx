"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, Edit2, Loader2, X, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SupplierModal({ supplier, onClose, qc }: { supplier?: any; onClose: () => void; qc: any }) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name:    supplier?.name    ?? "",
    company: supplier?.company ?? "",
    phone:   supplier?.phone   ?? "",
    region:  supplier?.region  ?? "",
    inn:     supplier?.inn     ?? "",
    notes:   supplier?.notes   ?? "",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Ism majburiy");
      const res = await fetch("/api/warehouse/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: supplier.id, ...form } : form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouse-suppliers"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">{isEdit ? "Yetkazuvchini tahrirlash" : "Yangi yetkazuvchi"}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To'liq ism / nomi *</label>
            <Input value={form.name} onChange={f("name")} placeholder="Abdullayev Behruz" className="bg-slate-800/60 border-slate-700 text-white h-9" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Kompaniya nomi</label>
            <Input value={form.company} onChange={f("company")} placeholder="Selxozmash MChJ" className="bg-slate-800/60 border-slate-700 text-white h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
              <Input value={form.phone} onChange={f("phone")} placeholder="+998901234567" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Viloyat / Hudud</label>
              <Input value={form.region} onChange={f("region")} placeholder="Toshkent" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">INN</label>
            <Input value={form.inn} onChange={f("inn")} placeholder="123456789" className="bg-slate-800/60 border-slate-700 text-white h-9" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Izoh</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2}
              placeholder="Qo'shimcha ma'lumot"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-orange-500" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-1.5">{error}</p>}
        </div>
        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300 h-9">Bekor</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-orange-600 hover:bg-orange-500 h-9">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Saqlash" : "Qo'shish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal,  setModal]  = useState<null | "new" | any>(null);

  const { data, isLoading } = useQuery<{ data: { suppliers: any[] } }>({
    queryKey: ["warehouse-suppliers", search],
    queryFn:  () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      return fetch(`/api/warehouse/suppliers?${p}`).then(r => r.json());
    },
    staleTime: 30_000,
  });

  const suppliers = data?.data?.suppliers ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Yetkazuvchilar</h1>
          <p className="text-slate-400 text-sm mt-1">Mahsulot va xom-ashyo yetkazib beruvchilar</p>
        </div>
        <div className="flex gap-2">
          <Link href="/warehouse" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 px-3 py-1.5 border border-slate-700 rounded-lg">← Dashboard</Link>
          <Button onClick={() => setModal("new")} className="bg-orange-600 hover:bg-orange-500 gap-2 h-9">
            <Plus className="h-4 w-4" /> Yangi yetkazuvchi
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
          className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500" />
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : suppliers.length === 0 ? (
        <div className="py-24 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-700" />
          <p className="text-slate-500 mb-3">Yetkazuvchilar topilmadi</p>
          <Button onClick={() => setModal("new")} className="bg-orange-600 hover:bg-orange-500 gap-2">
            <Plus className="h-4 w-4" /> Qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s: any) => (
            <div key={s.id} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-500/15 rounded-xl shrink-0">
                    <Building2 className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    {s.company && <p className="text-xs text-slate-500">{s.company}</p>}
                  </div>
                </div>
                <button onClick={() => setModal(s)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg shrink-0">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-600" />
                    <a href={`tel:${s.phone}`} className="hover:text-white">{s.phone}</a>
                  </div>
                )}
                {s.region && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-600" />
                    {s.region}
                  </div>
                )}
                {s.inn && (
                  <div className="text-xs text-slate-500">INN: {s.inn}</div>
                )}
              </div>

              <div className="flex gap-3 pt-1 border-t border-slate-700/60">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{s._count?.movements ?? 0}</p>
                  <p className="text-xs text-slate-500">Yetkazma</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{s._count?.items ?? 0}</p>
                  <p className="text-xs text-slate-500">Mahsulot</p>
                </div>
                {s.notes && (
                  <div className="flex-1 text-xs text-slate-500 truncate self-center">{s.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <SupplierModal supplier={modal === "new" ? undefined : modal} onClose={() => setModal(null)} qc={qc} />}
    </div>
  );
}
