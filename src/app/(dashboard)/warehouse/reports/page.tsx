"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2, TrendingUp, TrendingDown, Loader2, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PERIODS = [
  { key: "today", label: "Bugun"    },
  { key: "week",  label: "Hafta"    },
  { key: "month", label: "Oy"       },
  { key: "year",  label: "Yil"      },
  { key: "custom",label: "Boshqa"   },
];

function fmt(n: number) { return new Intl.NumberFormat("uz-UZ").format(Math.round(n)); }

function StatCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#f1f5f9",
};

export default function ReportsPage() {
  const [period,   setPeriod]   = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  const queryParams = new URLSearchParams({ period });
  if (period === "custom" && fromDate) queryParams.set("from", fromDate);
  if (period === "custom" && toDate)   queryParams.set("to",   toDate);

  const { data, isLoading } = useQuery({
    queryKey:  ["warehouse-reports", period, fromDate, toDate],
    queryFn:   () => fetch(`/api/warehouse/reports?${queryParams}`).then(r => r.json()),
    staleTime: 60_000,
    enabled:   period !== "custom" || !!(fromDate && toDate),
  });

  const report = data?.data;

  // Format chart data with readable dates
  const chartData = (report?.chartData ?? []).map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
    in:    Math.round(d.in / 1000),   // Convert to thousands for readability
    out:   Math.round(d.out / 1000),
    production: Math.round(d.production),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hisobotlar</h1>
          <p className="text-slate-400 text-sm mt-1">Ombor moliyaviy tahlili</p>
        </div>
        <Link href="/warehouse" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 px-3 py-1.5 border border-slate-700 rounded-lg">← Dashboard</Link>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${period === p.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"}`}>
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
            <span className="text-slate-500 text-sm">—</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : !report ? (
        <div className="py-24 text-center text-slate-500 text-sm">Ma'lumot yo'q</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Kirim summasi"  value={`${fmt(report.summary.in.amount)}`}  sub={`${report.summary.in.count} ta harakat · so'm`}  color="text-emerald-400" />
            <StatCard title="Chiqim summasi" value={`${fmt(report.summary.out.amount)}`} sub={`${report.summary.out.count} ta harakat · so'm`} color="text-red-400"     />
            <StatCard
              title="Foyda (taxminiy)"
              value={`${fmt(report.summary.in.amount - report.summary.out.amount)}`}
              sub="Kirim − Chiqim"
              color={report.summary.in.amount >= report.summary.out.amount ? "text-white" : "text-red-400"}
            />
            <StatCard title="Harakatlar" value={String(report.summary.in.count + report.summary.out.count)} sub="Jami operatsiyalar" color="text-slate-300" />
          </div>

          {/* Area chart — kirim vs chiqim */}
          {chartData.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Kirim / Chiqim dinamikasi (ming so'm)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inGrad"  x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [`${fmt(v * 1000)} so'm`]} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  <Area type="monotone" dataKey="in"  name="Kirim"  stroke="#34d399" fill="url(#inGrad)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="out" name="Chiqim" stroke="#f87171" fill="url(#outGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top items */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Top mahsulotlar (summa bo'yicha)</h3>
              {report.topItems.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-3">
                  {report.topItems.slice(0, 8).map((t: any, i: number) => {
                    const maxAmt = report.topItems[0]?.amount ?? 1;
                    const pct = Math.round((t.amount / maxAmt) * 100);
                    const isIn = t.type === "IN" || t.type === "PRODUCTION_OUTPUT";
                    return (
                      <div key={`${t.itemId}-${t.type}`} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 truncate max-w-[180px]">{t.item.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs ${isIn ? "text-emerald-400" : "text-red-400"}`}>
                              {isIn ? "↑" : "↓"}
                            </span>
                            <span className="text-white font-medium">{fmt(t.amount)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isIn ? "bg-emerald-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top suppliers */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Top yetkazuvchilar</h3>
              {report.topSuppliers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-3">
                  {report.topSuppliers.map((s: any, i: number) => {
                    const maxAmt = report.topSuppliers[0]?.amount ?? 1;
                    const pct = Math.round((s.amount / maxAmt) * 100);
                    return (
                      <div key={s.supplier.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{s.supplier.name}</span>
                          <div className="text-right">
                            <span className="text-white font-medium">{fmt(s.amount)} so'm</span>
                            <span className="text-slate-500 text-xs ml-2">({s.count} ta)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Production bar chart if there's data */}
          {chartData.some((d: any) => d.production > 0) && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Ishlab chiqarish hajmi (birliklar)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="production" name="Ishlab chiqarish" fill="#818cf8" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
