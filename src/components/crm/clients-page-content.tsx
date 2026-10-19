"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClientsTable } from "@/components/crm/clients-table";
import { AddClientModal } from "@/components/crm/add-client-modal";
import { ImportClientsModal } from "@/components/crm/import-clients-modal";
import { Button } from "@/components/ui/button";
import {
  UserPlus, FileSpreadsheet, ArrowLeft,
  Users, CheckCircle, AlertTriangle, Sparkles,
  MapPin, Target, Building2, GitMerge,
} from "lucide-react";
import { CATEGORY_LABELS, isCategory, type ClientCategory } from "@/lib/clients/category";

interface CategoryStats {
  total: number;
  faol: number;      // 1C clients, debtors included
  qarzdor: number;
  potensial: number;
  yangi: number;
}

interface RegionStats extends CategoryStats {
  key: string;
  label: string;
}

const CATEGORY_CARDS: { key: ClientCategory; hint: string; Icon: typeof Users; color: string }[] = [
  { key: "faol",      hint: "1C dagi mijozlar",          Icon: CheckCircle,   color: "text-green-400" },
  { key: "qarzdor",   hint: "1C da qarzi bor",           Icon: AlertTriangle, color: "text-yellow-400" },
  { key: "potensial", hint: "Yuklangan, 1C da yo'q",     Icon: Target,        color: "text-sky-400" },
  { key: "yangi",     hint: "Sayt, Instagram, Telegram", Icon: Sparkles,      color: "text-emerald-400" },
];

// ── Category cards (also the category filter) ────────────────────────────────
function CategoryCards({ stats, showTotal }: { stats: CategoryStats; showTotal?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get("category");

  function toggle(cat: ClientCategory) {
    const p = new URLSearchParams(searchParams.toString());
    if (current === cat) p.delete("category"); else p.set("category", cat);
    router.push(`/crm/clients?${p.toString()}`);
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${showTotal ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
      {showTotal && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-indigo-400 shrink-0" />
          <div>
            <p className="text-white text-xl font-bold">{stats.total}</p>
            <p className="text-slate-500 text-xs">Jami mijozlar</p>
          </div>
        </div>
      )}
      {CATEGORY_CARDS.map(({ key, hint, Icon, color }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={`bg-slate-900 border rounded-xl p-4 flex items-center gap-3 text-left transition-colors ${
            current === key ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 hover:border-slate-600"
          }`}
        >
          <Icon className={`h-8 w-8 shrink-0 ${color}`} />
          <div className="min-w-0">
            <p className={`text-xl font-bold ${color}`}>{stats[key]}</p>
            <p className="text-slate-300 text-xs font-medium">{CATEGORY_LABELS[key]}</p>
            <p className="text-slate-500 text-[10px] truncate">{hint}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── District chips + table ────────────────────────────────────────────────────
function DistrictChips({ provinceKey, category }: { provinceKey: string; category?: ClientCategory }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDistrict = searchParams.get("district");

  function setDistrict(district: string | null) {
    const p = new URLSearchParams();
    p.set("province", provinceKey);
    if (district) p.set("district", district);
    if (category) p.set("category", category);
    router.push(`/crm/clients?${p.toString()}`);
  }

  const { data } = useQuery({
    queryKey: ["client-districts", provinceKey],
    queryFn: async () => {
      const res = await fetch(`/api/clients/districts?province=${provinceKey}`);
      const json = await res.json();
      return json.data as { districts: { region: string; count: number }[] };
    },
    staleTime: 0,
  });

  const districts = data?.districts ?? [];

  return (
    <div className="space-y-4">
      {/* Tuman chiplari — kamida 2 xil district bo'lsagina ko'rsatiladi */}
      {districts.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDistrict(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedDistrict === null
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Hammasi
          </button>
          {districts.map(({ region, count }) => (
            <button
              key={region}
              onClick={() => setDistrict(selectedDistrict === region ? null : region)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDistrict === region
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
              }`}
            >
              {region}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                selectedDistrict === region ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      <ClientsTable
        provinceKey={selectedDistrict ? undefined : provinceKey}
        exactRegion={selectedDistrict ?? undefined}
        category={category}
      />
    </div>
  );
}

// ── Province card ─────────────────────────────────────────────────────────────
function ProvinceCard({ stat, onClick }: { stat: RegionStats; onClick: () => void }) {
  const activeRate = stat.total > 0 ? Math.round((stat.faol / stat.total) * 100) : 0;
  const isEmpty = stat.total === 0;

  return (
    <button
      onClick={isEmpty ? undefined : onClick}
      className={`bg-slate-900 border rounded-xl p-5 text-left transition-all group w-full ${
        isEmpty
          ? "border-slate-800/50 opacity-50 cursor-default"
          : "border-slate-800 hover:border-indigo-600 hover:bg-slate-800/60 cursor-pointer"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isEmpty ? "bg-slate-800/50" : "bg-indigo-900/40"
          }`}>
            <MapPin className={`h-4 w-4 ${isEmpty ? "text-slate-600" : "text-indigo-400"}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm leading-tight transition-colors ${
              isEmpty ? "text-slate-500" : "text-white group-hover:text-indigo-300"
            }`}>
              {stat.label}
            </p>
            <p className="text-slate-600 text-xs mt-0.5">Viloyat</p>
          </div>
        </div>
        <span className={`text-2xl font-bold ${isEmpty ? "text-slate-600" : "text-white"}`}>
          {stat.total}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">1C dagi ulushi</span>
          <span className="text-green-400 font-medium">{activeRate}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${activeRate}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <div className="text-center">
          <p className="text-green-400 font-bold text-sm">{stat.faol}</p>
          <p className="text-slate-600 text-[10px]">Faol</p>
        </div>
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-sm">{stat.qarzdor}</p>
          <p className="text-slate-600 text-[10px]">Qarzdor</p>
        </div>
        <div className="text-center">
          <p className="text-sky-400 font-bold text-sm">{stat.potensial}</p>
          <p className="text-slate-600 text-[10px]">Potensial</p>
        </div>
        <div className="text-center">
          <p className="text-emerald-400 font-bold text-sm">{stat.yangi}</p>
          <p className="text-slate-600 text-[10px]">Yangi</p>
        </div>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ClientsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const selectedProvinceKey = searchParams.get("province");
  const categoryParam = searchParams.get("category");
  const category = isCategory(categoryParam) ? categoryParam : undefined;

  const { data: regionData, isLoading } = useQuery({
    queryKey: ["client-regions"],
    queryFn: async () => {
      const res = await fetch("/api/clients/regions");
      const json = await res.json();
      return json.data as { total: number; totals: CategoryStats; regions: RegionStats[] };
    },
    staleTime: 0,
  });

  const { data: dupData } = useQuery({
    queryKey: ["client-duplicates-count"],
    queryFn: async () => {
      const res = await fetch("/api/clients/duplicates?limit=1");
      const json = await res.json();
      return json.data as { total: number };
    },
  });

  const regions = regionData?.regions ?? [];
  const total = regionData?.total ?? 0;
  const pendingDuplicates = dupData?.total ?? 0;

  // Always derived from fresh query data — never stale
  const selectedProvince = selectedProvinceKey
    ? (regions.find(r => r.key === selectedProvinceKey) ?? null)
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedProvince && (
            <button
              onClick={() => router.push("/crm/clients")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Orqaga
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {selectedProvince ? selectedProvince.label : "Mijozlar"}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {selectedProvince
                ? `${selectedProvince.total} ta mijoz · ${selectedProvince.faol} faol`
                : "Faol — 1C dagi mijozlar · Potensial — yuklangan ro'yxat · Yangi — sayt va ijtimoiy tarmoqlardan"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/clients/duplicates">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <GitMerge className="mr-2 h-4 w-4 text-amber-400" />
              Dublikatlar
              {pendingDuplicates > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  {pendingDuplicates}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-400" />
            Exceldan yuklash
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Yangi mijoz
          </Button>
        </div>
      </div>

      {/* ── VILOYAT TANLANDI → jadval ── */}
      {selectedProvince ? (
        <>
          <CategoryCards stats={selectedProvince} />

          {/* Tuman chiplari */}
          <DistrictChips provinceKey={selectedProvince.key} category={category} />
        </>
      ) : (
        <>
          {/* ── Umumiy statistika ── */}
          {total > 0 && regionData && <CategoryCards stats={regionData.totals} showTotal />}

          {/* Kategoriya tanlansa — barcha viloyatlar bo'yicha jadval */}
          {category && <ClientsTable category={category} />}

          {/* ── Viloyat cardlari ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regions.map((stat) => (
                <ProvinceCard
                  key={stat.key}
                  stat={stat}
                  onClick={() => router.push(`/crm/clients?province=${stat.key}${category ? `&category=${category}` : ""}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddClientModal open={addOpen} onOpenChange={setAddOpen} />
      <ImportClientsModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
