"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Plus, Search, Loader2, X, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOVE_TYPES = [
  { key: "",                 label: "Barchasi"        },
  { key: "IN",               label: "Kirim (Prixod)"  },
  { key: "OUT",              label: "Chiqim (Rasxod)" },
  { key: "PRODUCTION_USE",   label: "Ishlab chiqarish (iste'mol)" },
  { key: "PRODUCTION_OUTPUT",label: "Ishlab chiqarish (tayyor)"  },
  { key: "ADJUSTMENT",       label: "Tuzatish"        },
];

const MOVE_CFG: Record<string, { label: string; cls: string; sign: string }> = {
  IN:               { label: "Kirim",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", sign: "+" },
  OUT:              { label: "Chiqim",      cls: "bg-red-500/15 text-red-300 border-red-500/30",            sign: "-" },
  PRODUCTION_USE:   { label: "Iste'mol",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",      sign: "-" },
  PRODUCTION_OUTPUT:{ label: "Ishlab ch.",  cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",   sign: "+" },
  ADJUSTMENT:       { label: "Tuzatish",   cls: "bg-slate-700 text-slate-400 border-slate-600",             sign: "±" },
};

function fmt(n: number) { return new Intl.NumberFormat("uz-UZ").format(Math.round(n)); }
function fmtInput(v: string) {
  if (!v) return "";
  const [int, dec] = v.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec !== undefined ? "." + dec : "");
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("uz-UZ", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
}

// ── Movement Modal ──
function MovementModal({ type, onClose, qc }: { type: "IN" | "OUT"; onClose: () => void; qc: any }) {
  const isIn = type === "IN";

  const [form, setForm] = useState({
    itemId:     "",
    quantity:   "",
    unitPrice:  "",
    supplierId: "",
    invoiceNo:  "",
    clientId:   "",
    note:       "",
  });
  const [itemSearch, setItemSearch]       = useState("");
  const [supplierSearch, setSupSearch]    = useState("");
  const [showItemDd, setShowItemDd]       = useState(false);
  const [showSupDd,  setShowSupDd]        = useState(false);
  const [selectedItem, setSelectedItem]   = useState<any>(null);
  const [selectedSup,  setSelectedSup]    = useState<any>(null);
  const [error, setError]                 = useState("");

  const { data: itemData } = useQuery({
    queryKey: ["w-item-search", itemSearch],
    queryFn:  () => fetch(`/api/warehouse/items?search=${encodeURIComponent(itemSearch)}&limit=8`).then(r => r.json()),
    enabled:  itemSearch.length >= 1 && !selectedItem,
  });
  const { data: supData } = useQuery({
    queryKey: ["w-sup-search", supplierSearch],
    queryFn:  () => fetch(`/api/warehouse/suppliers?search=${encodeURIComponent(supplierSearch)}`).then(r => r.json()),
    enabled:  isIn && supplierSearch.length >= 1 && !selectedSup,
  });

  const itemSuggestions = itemData?.data?.items ?? [];
  const supSuggestions  = supData?.data?.suppliers ?? [];

  const total = selectedItem && form.quantity && form.unitPrice
    ? parseFloat(form.quantity.replace(/,/g, "")) * parseFloat(form.unitPrice.replace(/,/g, ""))
    : 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.itemId)   throw new Error("Mahsulotni tanlang");
      if (!form.quantity) throw new Error("Miqdorni kiriting");
      const res = await fetch("/api/warehouse/movements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          itemId:     form.itemId,
          quantity:   parseFloat(form.quantity),
          unitPrice:  parseFloat(form.unitPrice || "0"),
          supplierId: form.supplierId || null,
          invoiceNo:  form.invoiceNo  || null,
          clientId:   form.clientId   || null,
          note:       form.note       || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
      qc.invalidateQueries({ queryKey: ["warehouse-stats"]    });
      qc.invalidateQueries({ queryKey: ["warehouse-items"]    });
      onClose();
    },
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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isIn ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
              {isIn ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
            </div>
            <h2 className="font-semibold text-white">{isIn ? "Prixod — Kirim" : "Rasxod — Chiqim"}</h2>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Item search */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Mahsulot *</label>
            {selectedItem ? (
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{selectedItem.name}</p>
                  <p className="text-xs text-slate-500">Mavjud: {parseFloat(selectedItem.currentStock)} {selectedItem.unit}</p>
                </div>
                <button onClick={() => { setSelectedItem(null); setForm(p => ({...p, itemId: ""})); setItemSearch(""); }}>
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <Input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDd(true); }}
                  onFocus={() => setShowItemDd(true)} onBlur={() => setTimeout(() => setShowItemDd(false), 160)}
                  placeholder="Mahsulot qidirish..."
                  className="pl-9 bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
                {showItemDd && itemSuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-xl overflow-hidden">
                    {itemSuggestions.map((it: any) => (
                      <button key={it.id} type="button"
                        onMouseDown={() => { setSelectedItem(it); setForm(p => ({...p, itemId: it.id, unitPrice: String(parseFloat(it.costPrice))})); setShowItemDd(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700/30 last:border-0">
                        <span className="text-white">{it.name}</span>
                        <span className="ml-2 text-slate-500 text-xs">{parseFloat(it.currentStock)} {it.unit} mavjud</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Miqdor *</label>
              <div className="flex gap-1">
                <Input value={fmtInput(form.quantity)} onChange={fn("quantity")} placeholder="0" inputMode="decimal"
                  className="bg-slate-800/60 border-slate-700 text-white h-9 flex-1" />
                {selectedItem && <span className="flex items-center px-2 text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-md">{selectedItem.unit}</span>}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Narx (so'm/{selectedItem?.unit ?? "birlik"})</label>
              <Input value={fmtInput(form.unitPrice)} onChange={fn("unitPrice")} placeholder="0" inputMode="decimal"
                className="bg-slate-800/60 border-slate-700 text-white h-9" />
            </div>
          </div>

          {total > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 flex justify-between">
              <span className="text-sm text-slate-400">Jami summa:</span>
              <span className="text-sm font-bold text-white">{fmt(total)} so'm</span>
            </div>
          )}

          {isIn && (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Yetkazuvchi</label>
                {selectedSup ? (
                  <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-white">{selectedSup.name}</span>
                    <button onClick={() => { setSelectedSup(null); setForm(p => ({...p, supplierId: ""})); setSupSearch(""); }}>
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input value={supplierSearch} onChange={e => { setSupSearch(e.target.value); setShowSupDd(true); }}
                      onFocus={() => setShowSupDd(true)} onBlur={() => setTimeout(() => setShowSupDd(false), 160)}
                      placeholder="Yetkazuvchi qidirish..."
                      className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
                    {showSupDd && supSuggestions.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-xl overflow-hidden">
                        {supSuggestions.map((s: any) => (
                          <button key={s.id} type="button"
                            onMouseDown={() => { setSelectedSup(s); setForm(p => ({...p, supplierId: s.id})); setShowSupDd(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700/30 last:border-0">
                            <span className="text-white">{s.name}</span>
                            {s.phone && <span className="ml-2 text-slate-500 text-xs">{s.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hujjat / Faktura raqami</label>
                <Input value={form.invoiceNo} onChange={f("invoiceNo")} placeholder="INV-001"
                  className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Izoh</label>
            <Input value={form.note} onChange={f("note")} placeholder="Ixtiyoriy"
              className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-1.5">{error}</p>}
        </div>

        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300 h-9">Bekor</Button>
          <Button onClick={() => { setError(""); save.mutate(); }} disabled={save.isPending}
            className={`flex-1 h-9 ${isIn ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isIn ? "Kirim qilish" : "Chiqim qilish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MovementsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [modal,      setModal]      = useState<"IN" | "OUT" | null>(null);
  const [page,       setPage]       = useState(1);

  const { data, isLoading } = useQuery<{ data: { movements: any[]; total: number } }>({
    queryKey: ["warehouse-movements", typeFilter, fromDate, toDate, page],
    queryFn:  () => {
      const p = new URLSearchParams({ page: String(page), limit: "30" });
      if (typeFilter) p.set("type", typeFilter);
      if (fromDate)   p.set("from", fromDate);
      if (toDate)     p.set("to",   toDate);
      return fetch(`/api/warehouse/movements?${p}`).then(r => r.json());
    },
    staleTime: 15_000,
  });

  const movements = data?.data?.movements ?? [];
  const total     = data?.data?.total ?? 0;
  const pages     = Math.ceil(total / 30);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Harakatlar</h1>
          <p className="text-slate-400 text-sm mt-1">Prixod va rasxod jurnali</p>
        </div>
        <div className="flex gap-2">
          <Link href="/warehouse" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 px-3 py-1.5 border border-slate-700 rounded-lg">← Dashboard</Link>
          <Button onClick={() => setModal("OUT")} className="bg-red-600 hover:bg-red-500 gap-2 h-9">
            <TrendingDown className="h-4 w-4" /> Rasxod
          </Button>
          <Button onClick={() => setModal("IN")} className="bg-emerald-600 hover:bg-emerald-500 gap-2 h-9">
            <TrendingUp className="h-4 w-4" /> Prixod
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
        <Filter className="h-4 w-4 text-slate-500 shrink-0" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
          {MOVE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Dan:</span>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Gacha:</span>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
        </div>
        {(typeFilter || fromDate || toDate) && (
          <button onClick={() => { setTypeFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Tozalash
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">Jami: {total}</span>
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : movements.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">Harakatlar topilmadi</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {["Sana", "Tur", "Mahsulot", "Miqdor", "Narx", "Summa", "Kontragent", "Izoh"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((m: any) => {
                const cfg = MOVE_CFG[m.type] ?? MOVE_CFG.ADJUSTMENT;
                return (
                  <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-white">{m.item?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${cfg.sign === "+" ? "text-emerald-400" : "text-red-400"}`}>
                        {cfg.sign}{parseFloat(m.quantity).toLocaleString()} {m.item?.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmt(parseFloat(m.unitPrice))} so'm</td>
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{fmt(parseFloat(m.totalAmount))} so'm</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.supplier?.name ?? m.client?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate">{m.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm ${page === p ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {modal && <MovementModal type={modal} onClose={() => setModal(null)} qc={qc} />}
    </div>
  );
}
