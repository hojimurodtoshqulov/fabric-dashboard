"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, Search, Edit2, Trash2, Loader2, X,
  ChevronLeft, MapPin, Phone, Mail, User2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PROVINCE_GROUPS } from "@/lib/provinces";

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUSES = [
  { key: "ACTIVE",   label: "Faol",        color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" },
  { key: "INACTIVE", label: "Faol emas",   color: "bg-slate-700 text-slate-400 border-slate-600" },
  { key: "PROSPECT", label: "Potentsial",  color: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  { key: "CONTRACT", label: "Shartnoma",   color: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
  { key: "REJECTED", label: "Rad etilgan", color: "bg-red-500/15 text-red-300 border-red-500/20" },
];

const ORG_TYPES = [
  "Maktab", "Kasb-hunar kolleji", "Universitet", "Shifoxona", "Poliklinika",
  "Mahalla", "Hokimiyat", "Vazirlik", "Harbiy qism", "Boshqa",
];

function statusInfo(key: string) {
  return STATUSES.find(s => s.key === key) ?? STATUSES[2];
}

// ── OrgModal ───────────────────────────────────────────────────────────────────
function OrgModal({ org, onClose, qc }: { org?: any; onClose: () => void; qc: any }) {
  const isEdit = !!org;
  const [form, setForm] = useState({
    name:          org?.name          ?? "",
    phone:         org?.phone         ?? "",
    phone2:        org?.phone2        ?? "",
    email:         org?.email         ?? "",
    contactPerson: org?.contactPerson ?? "",
    position:      org?.position      ?? "",
    orgType:       org?.orgType       ?? "",
    address:       org?.address       ?? "",
    province:      org?.province      ?? "",
    region:        org?.region        ?? "",
    status:        org?.status        ?? "PROSPECT",
    inn:           org?.inn           ?? "",
    notes:         org?.notes         ?? "",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name)  throw new Error("Nomi majburiy");
      if (!form.phone) throw new Error("Telefon majburiy");
      const url    = isEdit ? `/api/budget-orgs/${org.id}` : "/api/budget-orgs";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-orgs"] });
      qc.invalidateQueries({ queryKey: ["budget-orgs-regions"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="font-semibold text-white">
            {isEdit ? "Tashkilotni tahrirlash" : "Yangi tashkilot"}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Row 1 */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tashkilot nomi *</label>
            <Input value={form.name} onChange={f("name")} placeholder="Masalan: 25-maktab" className="bg-slate-800/60 border-slate-700 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon *</label>
              <Input value={form.phone} onChange={f("phone")} placeholder="+998901234567" className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon 2</label>
              <Input value={form.phone2} onChange={f("phone2")} placeholder="+998901234567" className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Mas'ul shaxs</label>
              <Input value={form.contactPerson} onChange={f("contactPerson")} placeholder="F.I.Sh." className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Lavozimi</label>
              <Input value={form.position} onChange={f("position")} placeholder="Direktor" className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tashkilot turi</label>
              <select value={form.orgType} onChange={f("orgType")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 h-9 text-sm text-white">
                <option value="">Tanlang...</option>
                {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Holat</label>
              <select value={form.status} onChange={f("status")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 h-9 text-sm text-white">
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Viloyat</label>
              <select value={form.province} onChange={f("province")} className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-3 h-9 text-sm text-white">
                <option value="">Tanlang...</option>
                {PROVINCE_GROUPS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tuman / Shahar</label>
              <Input value={form.region} onChange={f("region")} placeholder="Masalan: Chilonzor" className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">INN</label>
              <Input value={form.inn} onChange={f("inn")} placeholder="123456789" className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <Input value={form.email} onChange={f("email")} placeholder="info@..." className="bg-slate-800/60 border-slate-700 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Manzil</label>
            <Input value={form.address} onChange={f("address")} placeholder="Ko'cha, uy" className="bg-slate-800/60 border-slate-700 text-white" />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Izoh</label>
            <Input value={form.notes} onChange={f("notes")} placeholder="Qo'shimcha ma'lumot" className="bg-slate-800/60 border-slate-700 text-white" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded px-3 py-1.5">{error}</p>}
        </div>

        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800 sticky bottom-0 bg-slate-900">
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300 h-9">Bekor</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 h-9">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Saqlash" : "Qo'shish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Province Grid ──────────────────────────────────────────────────────────────
function ProvinceGrid({ onSelect }: { onSelect: (key: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["budget-orgs-regions"],
    queryFn: () => fetch("/api/budget-orgs/regions").then(r => r.json()),
    staleTime: 30_000,
  });

  const regions: any[] = data?.data?.regions ?? [];
  const total: number  = data?.data?.total   ?? 0;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-5 py-3">
          <p className="text-xs text-indigo-400 mb-0.5">Jami tashkilotlar</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl px-5 py-3">
          <p className="text-xs text-emerald-400 mb-0.5">Faol</p>
          <p className="text-2xl font-bold text-white">{regions.reduce((s, r) => s + r.active, 0)}</p>
        </div>
        <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl px-5 py-3">
          <p className="text-xs text-purple-400 mb-0.5">Shartnoma</p>
          <p className="text-2xl font-bold text-white">{regions.reduce((s, r) => s + r.contract, 0)}</p>
        </div>
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl px-5 py-3">
          <p className="text-xs text-blue-400 mb-0.5">Potentsial</p>
          <p className="text-2xl font-bold text-white">{regions.reduce((s, r) => s + r.prospect, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {regions.map((r: any) => {
          const isEmpty = r.total === 0;
          const activePercent = r.total > 0 ? Math.round((r.active / r.total) * 100) : 0;
          return (
            <button
              key={r.key}
              onClick={() => !isEmpty && onSelect(r.key)}
              disabled={isEmpty}
              className={`p-4 rounded-xl border text-left transition-all ${
                isEmpty
                  ? "border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed"
                  : "border-slate-700 bg-slate-800/40 hover:border-indigo-500/50 hover:bg-slate-800/80 cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{r.label}</p>
                  {!isEmpty && <p className="text-xs text-slate-500 mt-0.5">{activePercent}% faol</p>}
                </div>
                <span className="text-2xl font-bold text-indigo-400">{r.total}</span>
              </div>
              {!isEmpty && (
                <>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activePercent}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <span className="text-emerald-400">{r.active} faol</span>
                    <span className="text-purple-400">{r.contract} shart.</span>
                    <span className="text-blue-400">{r.prospect} pot.</span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Orgs Table ─────────────────────────────────────────────────────────────────
function OrgsTable({ province, qc, onEdit }: { province: string; qc: any; onEdit: (org: any) => void }) {
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["budget-orgs", province, search, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ province, limit: "50", page: String(page) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return fetch(`/api/budget-orgs?${p}`).then(r => r.json());
    },
    staleTime: 15_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/budget-orgs/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-orgs"] });
      qc.invalidateQueries({ queryKey: ["budget-orgs-regions"] });
    },
  });

  const orgs: any[]  = data?.data?.orgs  ?? [];
  const total: number = data?.data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Qidirish..." className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-slate-800/60 border border-slate-700 rounded-md px-3 h-10 text-sm text-white">
          <option value="">Barcha holatlar</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/60">
          <p className="text-sm text-slate-400">Jami: <span className="text-white font-medium">{total}</span> ta tashkilot</p>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : orgs.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">Tashkilotlar topilmadi</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {["Tashkilot", "Mas'ul shaxs", "Telefon", "Turi", "Holat", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => {
                const st = statusInfo(org.status);
                return (
                  <tr key={org.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{org.name}</p>
                      {org.region && <p className="text-xs text-slate-500">{org.region}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {org.contactPerson
                        ? <div>
                            <p className="text-slate-200">{org.contactPerson}</p>
                            {org.position && <p className="text-xs text-slate-500">{org.position}</p>}
                          </div>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{org.phone}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{org.orgType || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => onEdit(org)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`"${org.name}" o'chirilsinmi?`)) del.mutate(org.id); }}
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
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BudgetOrgsPage() {
  const qc = useQueryClient();
  const [province, setProvince] = useState<string | null>(null);
  const [modal,    setModal]    = useState<null | "new" | any>(null);

  const provinceLabel = province
    ? PROVINCE_GROUPS.find(p => p.key === province)?.label ?? province
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {province && (
            <button onClick={() => setProvince(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {province ? provinceLabel : "Budjet tashkilotlari"}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {province ? "Tashkilotlar ro'yxati" : "Barcha viloyatlar bo'yicha"}
            </p>
          </div>
        </div>
        <Button onClick={() => setModal("new")} className="bg-indigo-600 hover:bg-indigo-500 gap-2 h-9">
          <Plus className="h-4 w-4" /> Yangi tashkilot
        </Button>
      </div>

      {/* Content */}
      {!province
        ? <ProvinceGrid onSelect={setProvince} />
        : <OrgsTable province={province} qc={qc} onEdit={(org) => setModal(org)} />
      }

      {modal && (
        <OrgModal
          org={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          qc={qc}
        />
      )}
    </div>
  );
}
