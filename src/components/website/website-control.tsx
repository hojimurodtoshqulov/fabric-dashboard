"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, MessageSquare, Eye as EyeOn, EyeOff,
  Star, StarOff, ChevronDown, ChevronUp, Plus,
  Phone, User, MapPin, Clock, Loader2, Trash2, X,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WProduct {
  id: string;
  isPublished: boolean;
  isFeatured: boolean;
  inStock: boolean;
  nameUz: string | null;
  nameRu: string | null;
  descriptionUz: string | null;
  descriptionRu: string | null;
  packaging: string | null;
  validity: string | null;
  composition: string | null;
  packageQty: number | null;
  category: string | null;
  websitePrice: number | null;
  order: number;
  product: { name: string; sku: string; price: number; unit: string; images: string[] };
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  province: string | null;
  message: string;
  status: string;
  createdAt: string;
}

type EditForm = {
  nameUz: string; nameRu: string;
  descriptionUz: string; descriptionRu: string;
  packaging: string; validity: string; composition: string;
  packageQty: string; websitePrice: string;
  category: string; inStock: boolean;
};

const EMPTY_FORM: EditForm = {
  nameUz: "", nameRu: "", descriptionUz: "", descriptionRu: "",
  packaging: "", validity: "", composition: "",
  packageQty: "", websitePrice: "", category: "", inStock: true,
};

const CATEGORIES = [
  { value: "BINT",      label: "Bint" },
  { value: "VATA",      label: "Vata" },
  { value: "MARLA",     label: "Marla" },
  { value: "SALFETKA",  label: "Salfetka" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wpToForm(wp: WProduct): EditForm {
  return {
    nameUz:        wp.nameUz        ?? wp.product.name,
    nameRu:        wp.nameRu        ?? "",
    descriptionUz: wp.descriptionUz ?? "",
    descriptionRu: wp.descriptionRu ?? "",
    packaging:     wp.packaging     ?? "",
    validity:      wp.validity      ?? "",
    composition:   wp.composition   ?? "",
    packageQty:    wp.packageQty    != null ? String(wp.packageQty)   : "",
    websitePrice:  wp.websitePrice  != null ? String(wp.websitePrice) : "",
    category:      wp.category?.toUpperCase() ?? "",
    inStock:       wp.inStock,
  };
}

// ─── Product row (with inline edit) ──────────────────────────────────────────

function ProductRow({
  item,
  onToggle,
  onSave,
  onDelete,
  saving,
}: {
  item: WProduct;
  onToggle: (id: string, field: "isPublished" | "isFeatured", val: boolean) => void;
  onSave: (id: string, data: Partial<EditForm>, onSuccess?: () => void) => void;
  onDelete: (id: string) => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EditForm>(() => wpToForm(item));

  const set = (k: keyof EditForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const displayName = item.nameUz ?? item.product.name;

  return (
    <div className={`rounded-xl border transition-colors ${open ? "border-indigo-600/50 bg-slate-800/60" : "border-slate-800 bg-slate-800/30"}`}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{displayName}</p>
          <p className="text-slate-500 text-xs font-mono">{item.product.sku}</p>
        </div>

        {item.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
            {item.category}
          </span>
        )}

        <div className="text-right shrink-0">
          <p className="text-slate-300 text-xs">
            {(item.websitePrice ?? item.product.price)?.toLocaleString()} UZS
          </p>
          <p className="text-slate-500 text-xs">{item.product.unit}</p>
        </div>

        {/* inStock pill */}
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${item.inStock ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20"}`}>
          {item.inStock ? "Bor" : "Yo'q"}
        </span>

        {/* Featured toggle */}
        <button
          onClick={() => onToggle(item.id, "isFeatured", !item.isFeatured)}
          title={item.isFeatured ? "Tavsiyadan olib tashlash" : "Tavsiya qilish"}
          className="text-slate-500 hover:text-yellow-400 transition-colors shrink-0"
        >
          {item.isFeatured
            ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            : <StarOff className="h-4 w-4" />}
        </button>

        {/* Publish toggle */}
        <button
          onClick={() => onToggle(item.id, "isPublished", !item.isPublished)}
          title={item.isPublished ? "Saytdan yashirish" : "Saytga chiqarish"}
          className="shrink-0"
        >
          {item.isPublished
            ? <EyeOn className="h-4 w-4 text-green-400" />
            : <EyeOff className="h-4 w-4 text-slate-500" />}
        </button>

        {/* Expand */}
        <button
          onClick={() => { setOpen(o => !o); if (!open) setForm(wpToForm(item)); }}
          className="text-slate-400 hover:text-white transition-colors shrink-0"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Edit form */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/60 pt-4 space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Nomi (UZ)</span>
              <input value={form.nameUz} onChange={e => set("nameUz", e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Nomi (RU)</span>
              <input value={form.nameRu} onChange={e => set("nameRu", e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Tavsif (UZ)</span>
              <textarea value={form.descriptionUz} onChange={e => set("descriptionUz", e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Tavsif (RU)</span>
              <textarea value={form.descriptionRu} onChange={e => set("descriptionRu", e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500" />
            </label>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Qadoqlash</span>
              <input value={form.packaging} onChange={e => set("packaging", e.target.value)}
                placeholder="1 dona / 1 шт"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Yaroqlilik muddati</span>
              <input value={form.validity} onChange={e => set("validity", e.target.value)}
                placeholder="5 yil / 5 лет"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Tarkibi</span>
              <input value={form.composition} onChange={e => set("composition", e.target.value)}
                placeholder="100% paxta / 100% хлопок"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
          </div>

          {/* Numbers + category + inStock */}
          <div className="grid grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Saytdagi narx (UZS)</span>
              <input type="number" value={form.websitePrice} onChange={e => set("websitePrice", e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Qutidagi soni</span>
              <input type="number" value={form.packageQty} onChange={e => set("packageQty", e.target.value)}
                placeholder="400"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Kategoriya</span>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="">— tanlang —</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-xs">Mavjudligi</span>
              <div className="flex items-center gap-3 pt-1.5">
                <button
                  type="button"
                  onClick={() => set("inStock", !form.inStock)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent overflow-hidden transition-colors duration-200 ${form.inStock ? "bg-green-600" : "bg-slate-600"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.inStock ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-slate-300 text-sm">{form.inStock ? "Bor" : "Yo'q"}</span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> O'chirish
            </button>
            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                className="border-slate-700 text-slate-400 h-8 px-3"
                onClick={() => setOpen(false)}>
                Bekor
              </Button>
              <Button size="sm" disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4"
                onClick={() => onSave(item.id, form, () => setOpen(false))}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Saqlash"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add product form ────────────────────────────────────────────────────────

type AddForm = { nameUz: string; nameRu: string; sku: string; price: string; unit: string; category: string };
const EMPTY_ADD: AddForm = { nameUz: "", nameRu: "", sku: "", price: "", unit: "dona", category: "" };

function AddProductPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<AddForm>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof AddForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nameUz || !form.sku || !form.price) { setErr("nameUz, SKU va narx majburiy"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/website/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Xato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-indigo-600/40 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-sm">Yangi mahsulot qo'shish</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-slate-400 text-xs">Nomi (UZ) *</span>
          <input value={form.nameUz} onChange={e => set("nameUz", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400 text-xs">Nomi (RU)</span>
          <input value={form.nameRu} onChange={e => set("nameRu", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-slate-400 text-xs">SKU *</span>
          <input value={form.sku} onChange={e => set("sku", e.target.value)}
            placeholder="bint-steril-7x10"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400 text-xs">Narx (UZS) *</span>
          <input type="number" value={form.price} onChange={e => set("price", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400 text-xs">Birlik</span>
          <select value={form.unit} onChange={e => set("unit", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
            {["dona", "kg", "m", "l", "quti"].map(u => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-slate-400 text-xs">Kategoriya</span>
        <select value={form.category} onChange={e => set("category", e.target.value)}
          className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
          <option value="">— tanlang —</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>

      {err && <p className="text-red-400 text-xs">{err}</p>}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 h-8 px-3" onClick={onClose}>
          Bekor
        </Button>
        <Button size="sm" disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4"
          onClick={handleSubmit}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Qo'shish"}
        </Button>
      </div>
    </div>
  );
}

// ─── Lead row ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  NEW:         { label: "Yangi",              cls: "text-blue-400 bg-blue-900/20" },
  IN_PROGRESS: { label: "Jarayonda",          cls: "text-yellow-400 bg-yellow-900/20" },
  CLOSED:      { label: "Yopildi",            cls: "text-slate-400 bg-slate-800" },
  CONVERTED:   { label: "Mijozga aylandi",    cls: "text-green-400 bg-green-900/20" },
};

function LeadRow({ lead }: { lead: Lead }) {
  const s = STATUS_LABELS[lead.status] ?? STATUS_LABELS.NEW;
  const diff = Date.now() - new Date(lead.createdAt).getTime();
  const m = Math.floor(diff / 60000);
  const ago = m < 60 ? `${m} daqiqa oldin` : m < 1440 ? `${Math.floor(m / 60)} soat oldin` : `${Math.floor(m / 1440)} kun oldin`;

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-white text-sm font-medium truncate">{lead.name ?? "Noma'lum"}</span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${s.cls}`}>{s.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        {lead.phone   && <span className="flex items-center gap-1"><Phone   className="h-3 w-3" />{lead.phone}</span>}
        {lead.province && <span className="flex items-center gap-1"><MapPin  className="h-3 w-3" />{lead.province}</span>}
        <span className="flex items-center gap-1 ml-auto"><Clock className="h-3 w-3" />{ago}</span>
      </div>
      {lead.message && <p className="text-slate-400 text-xs line-clamp-2">{lead.message}</p>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type Tab = "products" | "leads";

export function WebsiteControl() {
  const [tab, setTab]         = useState<Tab>("products");
  const [showAdd, setShowAdd] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast]     = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const qc = useQueryClient();

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: products = [], isLoading: loadingProducts } = useQuery<WProduct[]>({
    queryKey: ["website-products"],
    queryFn:  async () => { const r = await fetch("/api/website/products"); return (await r.json()).items ?? []; },
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: ["website-leads"],
    queryFn:  async () => { const r = await fetch("/api/leads?source=WEBSITE&limit=50"); return (await r.json()).leads ?? []; },
    enabled: tab === "leads",
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, val }: { id: string; field: string; val: boolean }) => {
      const res = await fetch(`/api/website/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      });
      if (!res.ok) throw new Error("Toggle xato");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website-products"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditForm>; onSuccess?: () => void }) => {
      setSavingId(id);
      const res = await fetch(`/api/website/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Saqlash xato");
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["website-products"] });
      setSavingId(null);
      showToast("success", "Muvaffaqiyatli saqlandi ✓");
      variables.onSuccess?.();
    },
    onError: () => {
      setSavingId(null);
      showToast("error", "Saqlashda xatolik yuz berdi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/website/products/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website-products"] }),
  });

  const publishedCount = products.filter(p => p.isPublished).length;
  const newLeadsCount  = leads.filter(l => l.status === "NEW").length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Package,      label: "Saytda ko'rinadi", value: String(publishedCount),     color: "text-blue-400",   bg: "bg-blue-900/20" },
          { icon: Package,      label: "Jami mahsulot",    value: String(products.length),    color: "text-indigo-400", bg: "bg-indigo-900/20" },
          { icon: MessageSquare,label: "Yangi zayavka",    value: String(newLeadsCount || 0), color: "text-green-400",  bg: "bg-green-900/20" },
          { icon: MessageSquare,label: "Jami zayavka",     value: String(leads.length || 0),  color: "text-purple-400", bg: "bg-purple-900/20" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-slate-400 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-2">
          <div className="flex">
            {([
              { key: "products" as Tab, label: "Mahsulotlar", icon: Package },
              { key: "leads"    as Tab, label: "Zayavkalar",  icon: MessageSquare },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.key ? "text-white border-b-2 border-indigo-500" : "text-slate-400 hover:text-slate-200"
                }`}>
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.key === "leads" && newLeadsCount > 0 && (
                  <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                    {newLeadsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab === "products" && (
            <Button size="sm" onClick={() => setShowAdd(v => !v)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 px-3 mr-1 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Qo'shish
            </Button>
          )}
        </div>

        <div className="p-5 space-y-3">
          {/* Products tab */}
          {tab === "products" && (
            <>
              {showAdd && (
                <AddProductPanel
                  onClose={() => setShowAdd(false)}
                  onCreated={() => qc.invalidateQueries({ queryKey: ["website-products"] })}
                />
              )}

              {loadingProducts ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yuklanmoqda...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Hali mahsulot qo'shilmagan.</p>
                  <p className="text-xs mt-1">Yuqoridagi "Qo'shish" tugmasini bosing.</p>
                </div>
              ) : (
                products.map(item => (
                  <ProductRow
                    key={item.id}
                    item={item}
                    saving={savingId === item.id}
                    onToggle={(id, field, val) => toggleMutation.mutate({ id, field, val })}
                    onSave={(id, data, onSuccess) => saveMutation.mutate({ id, data, onSuccess })}
                    onDelete={(id) => { if (confirm("O'chirilsinmi?")) deleteMutation.mutate(id); }}
                  />
                ))
              )}

              <p className="text-slate-600 text-xs pt-1">
                API: <code className="text-green-600">GET /api/public/products</code>
                {" · "}
                <code className="text-green-600">POST /api/leads/website</code>
              </p>
            </>
          )}

          {/* Leads tab */}
          {tab === "leads" && (
            loadingLeads ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yuklanmoqda...
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Hali zayavka yo'q.</p>
                <p className="text-xs mt-1">
                  Saytdagi forma <code>POST /api/leads/website</code> ga yuborsa shu yerda ko'rinadi.
                </p>
              </div>
            ) : (
              leads.map(lead => <LeadRow key={lead.id} lead={lead} />)
            )
          )}
        </div>
      </div>
    </div>
  );
}
