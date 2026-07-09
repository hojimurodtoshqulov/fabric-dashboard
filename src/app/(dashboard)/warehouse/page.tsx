"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
  Factory, Loader2, RefreshCw, Clock, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface Stats {
  totalValue:    number;
  totalItems:    number;
  lowStockCount: number;
  today: {
    in:  { amount: number; count: number };
    out: { amount: number; count: number };
  };
  recentMovements: any[];
  lowStockItems:   any[];
}

const CATEGORY_LABEL: Record<string, string> = {
  RAW_MATERIAL:     "Homashyo",
  FINISHED_PRODUCT: "Tayyor mahsulot",
  PACKAGING:        "Qadoqlash",
  CHEMICAL:         "Kimyoviy",
  OTHER:            "Boshqa",
};

const MOVE_CFG: Record<string, { label: string; cls: string; sign: string }> = {
  IN:               { label: "Kirim",      cls: "text-emerald-400 bg-emerald-500/15", sign: "+" },
  OUT:              { label: "Chiqim",     cls: "text-red-400 bg-red-500/15",         sign: "-" },
  PRODUCTION_USE:   { label: "Ishlat.",    cls: "text-amber-400 bg-amber-500/15",     sign: "-" },
  PRODUCTION_OUTPUT:{ label: "Ishlab ch.", cls: "text-indigo-400 bg-indigo-500/15",   sign: "+" },
  ADJUSTMENT:       { label: "Tuzatish",  cls: "text-slate-400 bg-slate-700",         sign: "±" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("uz-UZ", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

export default function WarehouseDashboard() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Stats }>({
    queryKey:  ["warehouse-stats"],
    queryFn:   () => fetch("/api/warehouse/stats").then(r => r.json()),
    staleTime: 30_000,
  });

  const stats = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/15 rounded-xl"><Factory className="h-5 w-5 text-orange-400" /></div>
            Omborxona
          </h1>
          <p className="text-slate-400 text-sm mt-1">Ombor holati va harakatlar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"
            onClick={() => qc.invalidateQueries({ queryKey: ["warehouse-stats"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/warehouse/movements">
            <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2 h-9">
              <Plus className="h-4 w-4" /> Kirim / Chiqim
            </Button>
          </Link>
        </div>
      </div>

      {/* Sub-nav */}
      <nav className="flex gap-1 border-b border-slate-800 pb-0">
        {[
          { href: "/warehouse",            label: "Dashboard",     active: true  },
          { href: "/warehouse/items",      label: "Mahsulotlar",   active: false },
          { href: "/warehouse/movements",  label: "Harakatlar",    active: false },
          { href: "/warehouse/production", label: "Ishlab chiqarish", active: false },
          { href: "/warehouse/suppliers",  label: "Yetkazuvchilar", active: false },
          { href: "/warehouse/reports",    label: "Hisobotlar",    active: false },
        ].map(n => (
          <Link key={n.href} href={n.href}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              n.active
                ? "border-orange-500 text-orange-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}>
            {n.label}
          </Link>
        ))}
      </nav>

      {isLoading ? (
        <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-slate-500 uppercase tracking-wide">Jami qiymat</span>
              </div>
              <p className="text-2xl font-bold text-white">{fmt(stats?.totalValue ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">so'm · {stats?.totalItems ?? 0} ta mahsulot</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-500 uppercase tracking-wide">Bugun kirim</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{fmt(stats?.today.in.amount ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.today.in.count ?? 0} ta harakat</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-xs text-slate-500 uppercase tracking-wide">Bugun chiqim</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{fmt(stats?.today.out.amount ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.today.out.count ?? 0} ta harakat</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-500 uppercase tracking-wide">Kam qolgan</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{stats?.lowStockCount ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">mahsulot past miqdorda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent movements */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-medium text-white">So'nggi harakatlar</h3>
                </div>
                <Link href="/warehouse/movements" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  Barchasi <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {!stats?.recentMovements.length ? (
                <div className="py-12 text-center text-slate-600 text-sm">Harakatlar yo'q</div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {stats.recentMovements.map((m: any) => {
                    const cfg = MOVE_CFG[m.type] ?? MOVE_CFG.ADJUSTMENT;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.cls}`}>{cfg.label}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{m.item?.name}</p>
                          <p className="text-xs text-slate-500">{m.supplier?.name ?? m.client?.name ?? "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-medium ${cfg.sign === "+" ? "text-emerald-400" : "text-red-400"}`}>
                            {cfg.sign}{parseFloat(m.quantity)} {m.item?.unit}
                          </p>
                          <p className="text-xs text-slate-500">{fmtDate(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Low stock */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-white">Kam qolgan mahsulotlar</h3>
                </div>
                <Link href="/warehouse/items" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  Barchasi <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {!stats?.lowStockItems.length ? (
                <div className="py-12 text-center text-slate-600 text-sm">Hammasi yetarli</div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {stats.lowStockItems.map((it: any) => {
                    const pct = Math.min(100, Math.round((parseFloat(it.currentStock) / parseFloat(it.minStock)) * 100));
                    const isCritical = pct < 50;
                    return (
                      <div key={it.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <span className="text-sm text-white">{it.name}</span>
                            <span className="ml-2 text-xs text-slate-500">{CATEGORY_LABEL[it.category]}</span>
                          </div>
                          <span className={`text-sm font-medium ${isCritical ? "text-red-400" : "text-amber-400"}`}>
                            {parseFloat(it.currentStock)} / {parseFloat(it.minStock)} {it.unit}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCritical ? "bg-red-500" : "bg-amber-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { href: "/warehouse/items",      label: "Mahsulotlar",      color: "from-orange-500/20 to-orange-600/10 border-orange-500/30",  icon: Package      },
              { href: "/warehouse/movements",  label: "Kirim / Chiqim",   color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",icon: TrendingUp   },
              { href: "/warehouse/production", label: "Ishlab chiqarish", color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",   icon: Factory      },
              { href: "/warehouse/suppliers",  label: "Yetkazuvchilar",   color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",        icon: Package      },
              { href: "/warehouse/reports",    label: "Hisobotlar",       color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",   icon: TrendingUp   },
            ].map(({ href, label, color, icon: Icon }) => (
              <Link key={href} href={href}
                className={`bg-gradient-to-br ${color} border rounded-xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity`}>
                <Icon className="h-5 w-5 text-white/70" />
                <span className="text-sm font-medium text-white">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-white/40 self-end mt-auto" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
