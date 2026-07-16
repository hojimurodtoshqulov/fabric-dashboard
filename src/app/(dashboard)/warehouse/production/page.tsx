"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Factory, Plus, Play, Trash2, Loader2, X, CheckCircle, AlertTriangle, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmt(n: number) { return new Intl.NumberFormat("uz-UZ").format(+n.toFixed(3)); }
function fmtInput(v: string) {
  if (!v) return "";
  const [int, dec] = v.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec !== undefined ? "." + dec : "");
}
function numHandler(setter: (v: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    setter(parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : ""));
  };
}

// ── Run Production Modal ──
function RunModal({ recipe, onClose, qc }: { recipe: any; onClose: () => void; qc: any }) {
  const [batches, setBatches] = useState("1");
  const [note,    setNote]    = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState<{ outputQty: number } | null>(null);

  const batchNum  = parseFloat(batches.replace(/,/g, "")) || 0;
  const outputQty = batchNum * parseFloat(recipe.outputQty);

  const run = useMutation({
    mutationFn: async () => {
      if (!batches || batchNum <= 0) throw new Error("Batch sonini kiriting");
      const res = await fetch("/api/warehouse/production/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id, batches: batchNum, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["warehouse-recipes"] });
      qc.invalidateQueries({ queryKey: ["warehouse-stats"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      setSuccess({ outputQty: data.outputQty });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/15 rounded-lg"><Factory className="h-4 w-4 text-indigo-400" /></div>
            <h2 className="font-semibold text-white">Ishlab chiqarish: {recipe.name}</h2>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-white font-medium text-lg">Muvaffaqiyatli!</p>
            <p className="text-slate-400 text-sm">
              {fmt(success.outputQty)} {recipe.outputItem.unit} {recipe.outputItem.name} ishlab chiqarildi
            </p>
            <Button onClick={onClose} className="mt-4 bg-emerald-600 hover:bg-emerald-500">Yopish</Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Batch soni</label>
                <Input value={fmtInput(batches)} onChange={numHandler(setBatches)} inputMode="decimal"
                  placeholder="1" className="bg-slate-800/60 border-slate-700 text-white h-9" />
                <p className="text-xs text-slate-500 mt-1">
                  Natija: <span className="text-indigo-300 font-medium">{fmt(outputQty)} {recipe.outputItem.unit} {recipe.outputItem.name}</span>
                </p>
              </div>

              {/* Ingredient requirements */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Sarflanadigan materiallar</p>
                {recipe.ingredients.map((ing: any) => {
                  const needed  = parseFloat(ing.quantity) * batchNum;
                  const inStock = parseFloat(ing.item.currentStock);
                  const enough  = inStock >= needed;
                  return (
                    <div key={ing.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{ing.item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${enough ? "text-white" : "text-red-400"}`}>
                          {fmt(needed)} {ing.item.unit}
                        </span>
                        {!enough && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                        <span className="text-slate-500 text-xs">({fmt(inStock)} mavjud)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Izoh</label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ixtiyoriy"
                  className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-1.5">{error}</p>}
            </div>

            <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800">
              <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300 h-9">Bekor</Button>
              <Button onClick={() => { setError(""); run.mutate(); }} disabled={run.isPending || batchNum <= 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 h-9 gap-2">
                {run.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Ishlanmoqda...</> : <><Play className="h-4 w-4" />Ishlab chiqar</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── New Recipe Modal ──
function RecipeModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const [form, setForm] = useState({ name: "", outputItemId: "", outputQty: "", description: "" });
  const [ingredients, setIngredients] = useState<{ itemId: string; quantity: string; _item?: any }[]>([]);
  const [outSearch,  setOutSearch]  = useState("");
  const [ingSearch,  setIngSearch]  = useState("");
  const [showOutDd,  setShowOutDd]  = useState(false);
  const [showIngDd,  setShowIngDd]  = useState(false);
  const [selectedOut, setSelectedOut] = useState<any>(null);
  const [error,       setError]       = useState("");

  const { data: outData } = useQuery({
    queryKey: ["w-out-search", outSearch],
    queryFn:  () => fetch(`/api/warehouse/items?search=${encodeURIComponent(outSearch)}&limit=6`).then(r => r.json()),
    enabled:  outSearch.length >= 1 && !selectedOut,
  });
  const { data: ingData } = useQuery({
    queryKey: ["w-ing-search", ingSearch],
    queryFn:  () => fetch(`/api/warehouse/items?search=${encodeURIComponent(ingSearch)}&limit=6`).then(r => r.json()),
    enabled:  ingSearch.length >= 1,
  });

  const outSuggs = outData?.data?.items ?? [];
  const ingSuggs = ingData?.data?.items ?? [];

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.outputItemId || !form.outputQty || !ingredients.length) {
        throw new Error("Barcha majburiy maydonlarni to'ldiring");
      }
      const res = await fetch("/api/warehouse/production/recipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, outputQty: parseFloat(form.outputQty), ingredients }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouse-recipes"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Yangi ishlab chiqarish formulasi</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Formula nomi *</label>
            <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              placeholder="Masalan: Paxtadan gazlama" className="bg-slate-800/60 border-slate-700 text-white h-9" />
          </div>

          {/* Output item */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tayyor mahsulot (natija) *</label>
            {selectedOut ? (
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-white">{selectedOut.name}</span>
                <button onClick={() => { setSelectedOut(null); setForm(p => ({...p, outputItemId: ""})); setOutSearch(""); }}>
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input value={outSearch} onChange={e => { setOutSearch(e.target.value); setShowOutDd(true); }}
                  onFocus={() => setShowOutDd(true)} onBlur={() => setTimeout(() => setShowOutDd(false), 160)}
                  placeholder="Mahsulot qidirish..." className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
                {showOutDd && outSuggs.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-xl overflow-hidden">
                    {outSuggs.map((it: any) => (
                      <button key={it.id} type="button"
                        onMouseDown={() => { setSelectedOut(it); setForm(p => ({...p, outputItemId: it.id})); setShowOutDd(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700/30 last:border-0">
                        <span className="text-white">{it.name}</span>
                        <span className="ml-2 text-slate-500 text-xs">{it.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Bir batch natijasi ({selectedOut?.unit ?? "birlik"}) *
            </label>
            <Input value={fmtInput(form.outputQty)} onChange={numHandler(v => setForm(p => ({...p, outputQty: v})))}
              placeholder="0" inputMode="decimal"
              className="bg-slate-800/60 border-slate-700 text-white h-9" />
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-500 uppercase tracking-wide">Xom-ashyo (bir batch uchun) *</label>
            </div>
            {ingredients.length > 0 && (
              <div className="space-y-2 mb-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-white">{ing._item?.name ?? ing.itemId}</span>
                    <span className="text-sm text-slate-400">{ing.quantity} {ing._item?.unit}</span>
                    <button onClick={() => setIngredients(p => p.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-slate-500 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Input value={ingSearch} onChange={e => { setIngSearch(e.target.value); setShowIngDd(true); }}
                onFocus={() => setShowIngDd(true)} onBlur={() => setTimeout(() => setShowIngDd(false), 160)}
                placeholder="+ Xom-ashyo qo'shish..." className="bg-slate-800/60 border-slate-700 text-white h-9 placeholder:text-slate-500" />
              {showIngDd && ingSuggs.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-xl overflow-hidden">
                  {ingSuggs.map((it: any) => (
                    <button key={it.id} type="button"
                      onMouseDown={() => {
                        const qty = prompt(`${it.name} — bir batch uchun qancha ${it.unit}?`);
                        if (qty && parseFloat(qty) > 0) {
                          setIngredients(p => [...p, { itemId: it.id, quantity: qty, _item: it }]);
                          setIngSearch("");
                        }
                        setShowIngDd(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700/30 last:border-0">
                      <span className="text-white">{it.name}</span>
                      <span className="ml-2 text-slate-500 text-xs">{parseFloat(it.currentStock)} {it.unit} mavjud</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-1.5">{error}</p>}
        </div>

        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300 h-9">Bekor</Button>
          <Button onClick={() => { setError(""); save.mutate(); }} disabled={save.isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 h-9">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const qc = useQueryClient();
  const [runRecipe,  setRunRecipe]  = useState<any>(null);
  const [showNew,    setShowNew]    = useState(false);

  const { data, isLoading } = useQuery<{ data: { recipes: any[] } }>({
    queryKey: ["warehouse-recipes"],
    queryFn:  () => fetch("/api/warehouse/production/recipes").then(r => r.json()),
    staleTime: 30_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/warehouse/production/recipes?id=${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouse-recipes"] }),
  });

  const recipes = data?.data?.recipes ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ishlab chiqarish</h1>
          <p className="text-slate-400 text-sm mt-1">Formulalar va ishlab chiqarish jarayoni</p>
        </div>
        <div className="flex gap-2">
          <Link href="/warehouse" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 px-3 py-1.5 border border-slate-700 rounded-lg">← Dashboard</Link>
          <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-500 gap-2 h-9">
            <Plus className="h-4 w-4" /> Yangi formula
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : recipes.length === 0 ? (
        <div className="py-24 text-center">
          <Factory className="h-12 w-12 mx-auto mb-4 text-slate-700" />
          <p className="text-slate-500 mb-3">Formulalar yo'q</p>
          <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <Plus className="h-4 w-4" /> Birinchi formulani qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recipes.map((r: any) => (
            <div key={r.id} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              {/* Recipe header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{r.name}</h3>
                  <p className="text-sm text-emerald-400 mt-0.5">
                    → {fmt(parseFloat(r.outputQty))} {r.outputItem.unit} {r.outputItem.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mavjud: {parseFloat(r.outputItem.currentStock).toLocaleString()} {r.outputItem.unit}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => del.mutate(r.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Bir batch uchun materiallar:</p>
                {r.ingredients.map((ing: any) => {
                  const inStock = parseFloat(ing.item.currentStock);
                  const needed  = parseFloat(ing.quantity);
                  const maxBatches = inStock > 0 ? Math.floor(inStock / needed) : 0;
                  return (
                    <div key={ing.id} className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="flex-1 text-sm text-slate-300">{ing.item.name}</span>
                      <span className="text-sm text-white font-medium">{fmt(needed)} {ing.item.unit}</span>
                      <span className={`text-xs ${maxBatches > 0 ? "text-slate-500" : "text-red-400"}`}>
                        ({maxBatches} batch mumkin)
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button onClick={() => setRunRecipe(r)} className="w-full bg-indigo-600 hover:bg-indigo-500 gap-2 h-9">
                <Play className="h-4 w-4" /> Ishlab chiqarish
              </Button>
            </div>
          ))}
        </div>
      )}

      {runRecipe && <RunModal recipe={runRecipe} onClose={() => setRunRecipe(null)} qc={qc} />}
      {showNew   && <RecipeModal onClose={() => setShowNew(false)} qc={qc} />}
    </div>
  );
}
