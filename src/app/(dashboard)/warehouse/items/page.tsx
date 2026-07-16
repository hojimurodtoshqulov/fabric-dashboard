"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Plus, Search, Edit2, Trash2, Loader2, AlertTriangle, X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { key: "",                label: "Barchasi"        },
  { key: "RAW_MATERIAL",    label: "Homashyo"        },
  { key: "FINISHED_PRODUCT",label: "Tayyor mahsulot" },
  { key: "PACKAGING",       label: "Qadoqlash"       },
  { key: "CHEMICAL",        label: "Kimyoviy"        },
  { key: "OTHER",           label: "Boshqa"          },
];

const CAT_COLOR: Record<string, string> = {
  RAW_MATERIAL:     "bg-amber-500/15 text-amber-300",
  FINISHED_PRODUCT: "bg-emerald-500/15 text-emerald-300",
  PACKAGING:        "bg-blue-500/15 text-blue-300",
  CHEMICAL:         "bg-purple-500/15 text-purple-300",
  OTHER:            "bg-slate-700 text-slate-400",
};

const UNITS = ["kg","tonna","dona","litr","metr","m2","m3","qop","bochka","roll"];

function fmt(n: number) { return new Intl.NumberFormat("uz-UZ").format(Math.round(n)); }

function fmtInput(v: string) {
  if (!v) return "";
  const [int, dec] = v.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec !== undefined ? "." + dec : "");
}
function numVal(v: string) { return v.replace(/,/g, ""); }

function ItemModal({ item, onClose, qc }: { item?: any; onClose: () => void; qc: any }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name:         item?.name         ?? "",
    sku:          item?.sku          ?? "",
    unit:         item?.unit         ?? "kg",
    category:     item?.category     ?? "RAW_MATERIAL",
    description:  item?.description  ?? "",
    costPrice:    item?.costPrice    ? String(parseFloat(item.costPrice))    : "",
    salePrice:    item?.salePrice    ? String(parseFloat(item.salePrice))    : "",
    minStock:     item?.minStock     ? String(parseFloat(item.minStock))     : "",
    currentStock: item?.currentStock ? String(parseFloat(item.currentStock)) : "0",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Nomi majburiy");
      const url    = isEdit ? `/api/warehouse/items/${item.id}` : "/api/warehouse/items";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          costPrice:    parseFloat(form.costPrice    || "0"),
          salePrice:    parseFloat(form.salePrice    || "0"),
          minStock:     parseFloat(form.minStock     || "0"),
          currentStock: parseFloat(form.currentStock || "0"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouse-items"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const f  = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const fn = (k: string) => (e: any) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    setForm(p => ({ ...p, [k]: parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : "") }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">{isEdit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Nomi *</label>
              <Input value={form.name} onChange={f("name")} placeholder="Mahsulot nomi" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">SKU / Kod</label>
              <Input value={form.sku} onChange={f("sku")} placeholder="M-001" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">O'lchov birligi</label>
              <select value={form.unit} onChange={f("unit")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 h-9 text-sm text-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Kategoriya</label>
              <select value={form.category} onChange={f("category")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 h-9 text-sm text-white">
                {CATEGORIES.slice(1).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Mavjud miqdor
                {isEdit && <span className="ml-1 text-amber-400">(tuzatish)</span>}
              </label>
              <div className="relative">
                <Input value={fmtInput(form.currentStock)} onChange={fn("currentStock")} placeholder="0" inputMode="decimal"
                  className={`bg-slate-800/60 border-slate-700 text-white h-9 pr-12 ${isEdit ? "border-amber-600/50" : ""}`} />
                {form.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">{form.unit}</span>}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Min. miqdor (ogohlantirish)</label>
              <div className="relative">
                <Input value={fmtInput(form.minStock)} onChange={fn("minStock")} placeholder="0" inputMode="decimal"
                  className="bg-slate-800/60 border-slate-700 text-white h-9 pr-12" />
                {form.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">{form.unit}</span>}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Narx (so'm / 1 {form.unit})</label>
              <Input value={fmtInput(form.costPrice)} onChange={fn("costPrice")} placeholder="0" inputMode="decimal" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Sotuv narxi (so'm / 1 {form.unit})</label>
              <Input value={fmtInput(form.salePrice)} onChange={fn("salePrice")} placeholder="0" inputMode="decimal" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
            {(() => {
              const qty   = parseFloat(form.currentStock) || 0;
              const price = parseFloat(form.costPrice)    || 0;
              const total = qty * price;
              if (!qty || !price) return null;
              return (
                <div className="col-span-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-slate-400">
                    {fmtInput(form.currentStock)} {form.unit} × {fmtInput(form.costPrice)} so'm
                  </span>
                  <span className="text-sm font-semibold text-emerald-400">= {fmt(total)} so'm</span>
                </div>
              );
            })()}
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Izoh</label>
              <Input value={form.description} onChange={f("description")} placeholder="Ixtiyoriy" className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
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

export default function ItemsPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<null | "new" | any>(null);

  const { data, isLoading } = useQuery<{ data: { items: any[]; total: number } }>({
    queryKey:  ["warehouse-items", category, search],
    queryFn:   () => {
      const p = new URLSearchParams({ limit: "100" });
      if (category) p.set("category", category);
      if (search)   p.set("search",   search);
      return fetch(`/api/warehouse/items?${p}`).then(r => r.json());
    },
    staleTime: 15_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/warehouse/items/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouse-items"] }),
  });

  const items = data?.data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mahsulotlar</h1>
          <p className="text-slate-400 text-sm mt-1">Ombordagi barcha mahsulot va xom-ashyolar</p>
        </div>
        <Button onClick={() => setModal("new")} className="bg-orange-600 hover:bg-orange-500 gap-2 h-9">
          <Plus className="h-4 w-4" /> Yangi mahsulot
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${category === c.key ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
          className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500" />
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/60">
          <p className="text-sm text-slate-400">Jami: <span className="text-white font-medium">{data?.data?.total ?? 0}</span> ta</p>
        </div>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">Mahsulotlar topilmadi</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {["Nomi", "SKU", "Kategoriya", "Mavjud miqdor", "Min. miqdor", "Narx", "Umumiy narxi", "Holat", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => {
                const stock   = parseFloat(it.currentStock);
                const minStk  = parseFloat(it.minStock);
                const isLow   = minStk > 0 && stock <= minStk;
                const isCrit  = minStk > 0 && stock < minStk * 0.5;
                return (
                  <tr key={it.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{it.name}</p>
                      {it.supplier && <p className="text-xs text-slate-500">{it.supplier.name}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{it.sku ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${CAT_COLOR[it.category]}`}>
                        {CATEGORIES.find(c => c.key === it.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isCrit ? "text-red-400" : isLow ? "text-amber-400" : "text-white"}`}>
                        {stock.toLocaleString()} {it.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{minStk > 0 ? `${minStk} ${it.unit}` : "—"}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmt(parseFloat(it.costPrice))} so'm</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {stock > 0 && parseFloat(it.costPrice) > 0
                        ? <span className="text-emerald-400 font-medium">{fmt(stock * parseFloat(it.costPrice))} so'm</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {isCrit  ? <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="h-3 w-3" />Kritik</span>
                       : isLow ? <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" />Kam</span>
                                : <span className="text-xs text-emerald-400">Normal</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setModal(it)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`"${it.name}" o'chirilsinmi?`)) del.mutate(it.id); }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && <ItemModal item={modal === "new" ? undefined : modal} onClose={() => setModal(null)} qc={qc} />}
    </div>
  );
}
