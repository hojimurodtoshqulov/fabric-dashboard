"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientsTable } from "@/components/crm/clients-table";
import { AddClientModal } from "@/components/crm/add-client-modal";
import { ImportClientsModal } from "@/components/crm/import-clients-modal";
import { Button } from "@/components/ui/button";
import {
  UserPlus, FileSpreadsheet, ArrowLeft,
  Users, CheckCircle, AlertTriangle, TrendingDown,
  MapPin, UserCheck, Building2,
} from "lucide-react";

interface RegionStats {
  key: string;
  label: string;
  total: number;
  active: number;
  inactive: number;
  debtor: number;
  lost: number;
  prospect: number;
}

// ── District chips + table ────────────────────────────────────────────────────
function DistrictChips({ provinceKey }: { provinceKey: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDistrict = searchParams.get("district");

  function setDistrict(district: string | null) {
    const p = new URLSearchParams();
    p.set("province", provinceKey);
    if (district) p.set("district", district);
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
      />
    </div>
  );
}

// ── Province card ─────────────────────────────────────────────────────────────
function ProvinceCard({ stat, onClick }: { stat: RegionStats; onClick: () => void }) {
  const activeRate = stat.total > 0 ? Math.round((stat.active / stat.total) * 100) : 0;
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
          <span className="text-slate-500">Faollik</span>
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
          <p className="text-green-400 font-bold text-sm">{stat.active}</p>
          <p className="text-slate-600 text-[10px]">Faol</p>
        </div>
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-sm">{stat.debtor}</p>
          <p className="text-slate-600 text-[10px]">Qarzdor</p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 font-bold text-sm">{stat.inactive}</p>
          <p className="text-slate-600 text-[10px]">Nofaol</p>
        </div>
        <div className="text-center">
          <p className="text-red-400 font-bold text-sm">{stat.lost}</p>
          <p className="text-slate-600 text-[10px]">Yo'qotilgan</p>
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

  const { data: regionData, isLoading } = useQuery({
    queryKey: ["client-regions"],
    queryFn: async () => {
      const res = await fetch("/api/clients/regions");
      const json = await res.json();
      return json.data as { total: number; regions: RegionStats[] };
    },
    staleTime: 0,
  });

  const regions = regionData?.regions ?? [];
  const total = regionData?.total ?? 0;
  const totalActive   = regions.reduce((s, r) => s + r.active,   0);
  const totalDebtor   = regions.reduce((s, r) => s + r.debtor,   0);
  const totalProspect = regions.reduce((s, r) => s + r.prospect, 0);

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
                ? `${selectedProvince.total} ta mijoz · ${selectedProvince.active} faol`
                : "Viloyatlar bo'yicha boshqarish"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400 shrink-0" />
              <div>
                <p className="text-green-400 text-xl font-bold">{selectedProvince.active}</p>
                <p className="text-slate-500 text-xs">Faol</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400 shrink-0" />
              <div>
                <p className="text-yellow-400 text-xl font-bold">{selectedProvince.debtor}</p>
                <p className="text-slate-500 text-xs">Qarzdor</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-300 text-xl font-bold">{selectedProvince.inactive}</p>
                <p className="text-slate-500 text-xs">Nofaol</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <p className="text-red-400 text-xl font-bold">{selectedProvince.lost}</p>
                <p className="text-slate-500 text-xs">Yo'qotilgan</p>
              </div>
            </div>
          </div>

          {/* Tuman chiplari */}
          <DistrictChips provinceKey={selectedProvince.key} />
        </>
      ) : (
        <>
          {/* ── Umumiy statistika ── */}
          {total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-white text-xl font-bold">{total}</p>
                  <p className="text-slate-500 text-xs">Jami mijozlar</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-400 text-xl font-bold">{totalActive}</p>
                  <p className="text-slate-500 text-xs">Faol</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-yellow-400 text-xl font-bold">{totalDebtor}</p>
                  <p className="text-slate-500 text-xs">Qarzdor</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-400 shrink-0" />
                <div>
                  <p className="text-blue-400 text-xl font-bold">{totalProspect}</p>
                  <p className="text-slate-500 text-xs">Potensial</p>
                </div>
              </div>
            </div>
          )}

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
                  onClick={() => router.push(`/crm/clients?province=${stat.key}`)}
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
