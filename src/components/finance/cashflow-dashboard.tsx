"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, ArrowDownLeft, ArrowUpRight, Scale, Info } from "lucide-react";
import { Money, MoneyFormatToggle, useMoneyFormat } from "@/components/shared/money";
import { formatSum, formatSumAxis } from "@/lib/utils/money";
import { monthOf, monthLabel, MONTH_NAMES } from "@/lib/hr/shared";
import { api, MonthSwitcher } from "@/components/hr/common";
import { categoryLabel, CHANNEL_LABELS } from "@/lib/sync/cashflow";
import type { CashTransactionRow, CashTrendPoint, MonthCashFlow } from "@/services/finance/cashflow.service";

// Same validated pair as the profit dashboard: money in / money out.
const INCOME = "#6366f1";
const OUTGO = "#d97706";

type Filter = "ALL" | "IN" | "OUT";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Barchasi" },
  { value: "IN", label: "Kirim" },
  { value: "OUT", label: "Chiqim" },
];

const shortMonth = (m: string) => `${MONTH_NAMES[Number(m.slice(5)) - 1].slice(0, 3)} ${m.slice(2, 4)}`;
const shortDate = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}`;

export function CashflowDashboard() {
  const [month, setMonth] = useState(monthOf());
  const [filter, setFilter] = useState<Filter>("ALL");
  const [moneyFormat] = useMoneyFormat();
  const { data, isLoading } = useQuery({
    queryKey: ["cashflow", month, filter],
    queryFn: () => api<{ current: MonthCashFlow; trend: CashTrendPoint[]; transactions: CashTransactionRow[] }>(
      `/api/finance/cashflow?month=${month}${filter === "ALL" ? "" : `&direction=${filter}`}`,
    ),
  });

  const c = data?.current;
  const outflow = c ? c.net < 0 : false;
  const hasAnyData = !!data && (data.trend.some((t) => t.in > 0 || t.out > 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={setMonth} />
        <div className="ml-auto"><MoneyFormatToggle /></div>
      </div>

      {isLoading || !c || !data ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : !hasAnyData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Info className="h-6 w-6 text-slate-500 mx-auto mb-2" />
          <p className="text-white font-medium">1C&apos;dan kassa va bank ma&apos;lumoti hali kelmagan</p>
          <p className="text-slate-400 text-sm mt-1">
            Ma&apos;lumot sync-agent 1.2.0 (yoki yangiroq) o&apos;rnatilib, birinchi sinxronizatsiya o&apos;tgandan keyin paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Tile icon={ArrowDownLeft} title="Kirim" sub="kassa + bank">
              <Money amount={c.totalIn} />
            </Tile>
            <Tile icon={ArrowUpRight} title="Chiqim" sub="kassa + bank">
              <Money amount={c.totalOut} />
            </Tile>
            <Tile icon={Scale} title={outflow ? "Pul kamaydi" : "Sof pul oqimi"} sub="kirim − chiqim" alert={outflow}>
              <Money amount={c.net} />
            </Tile>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Breakdown title="Kirim — nimadan" direction="IN" data={c} color={INCOME} />
            <Breakdown title="Chiqim — nimaga" direction="OUT" data={c} color={OUTGO} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Kassa va bank</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.byChannel.map((ch) => (
                <div key={ch.channel} className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-300 text-sm font-medium">{CHANNEL_LABELS[ch.channel]}</p>
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-slate-500">Kirim</span><span className="text-slate-200 tabular-nums"><Money amount={ch.in} /></span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Chiqim</span><span className="text-slate-200 tabular-nums"><Money amount={ch.out} /></span>
                  </div>
                </div>
              ))}
            </div>
            {c.lastSyncedAt && (
              <p className="text-slate-600 text-[11px] mt-3">
                1C bilan oxirgi tasdiqlangan: {new Date(c.lastSyncedAt).toLocaleString("uz-UZ")}
              </p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold">Kirim va chiqim — so&apos;nggi 12 oy</h2>
            <p className="text-slate-500 text-xs mb-4">Chiziqlar orasidagi farq — o&apos;sha oydagi sof pul oqimi</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trend.map((t) => ({ ...t, label: shortMonth(t.month) }))} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64}
                  tickFormatter={(v) => formatSumAxis(Number(v))} />
                <Tooltip
                  cursor={{ stroke: "#475569", strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(v, name) => [formatSum(Number(v), moneyFormat), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} />
                <Line type="monotone" dataKey="in" name="Kirim" stroke={INCOME} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="out" name="Chiqim" stroke={OUTGO} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-white font-semibold">{monthLabel(month)} — operatsiyalar</h2>
              <div className="ml-auto flex gap-1">
                {FILTERS.map((f) => (
                  <button key={f.value} onClick={() => setFilter(f.value)}
                    className={`px-3 py-1 rounded-md text-xs border ${filter === f.value
                      ? "bg-slate-700 border-slate-600 text-white" : "border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">Bu oyda operatsiya yo&apos;q</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-2 font-medium">Sana</th>
                      <th className="text-left py-2 font-medium">Turi</th>
                      <th className="text-left py-2 font-medium">Kontragent</th>
                      <th className="text-left py-2 font-medium hidden md:table-cell">Izoh</th>
                      <th className="text-right py-2 font-medium">Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-slate-800/50 align-top">
                        <td className="py-1.5 text-slate-400 whitespace-nowrap">{shortDate(t.date)}</td>
                        <td className="py-1.5 text-slate-300">
                          <span className={t.direction === "IN" ? "text-indigo-400" : "text-amber-500"}>
                            {t.direction === "IN" ? "↓" : "↑"}
                          </span>{" "}
                          {categoryLabel(t.direction, t.category)}
                          <span className="text-slate-600"> · {t.channel === "CASH" ? "kassa" : "bank"}</span>
                        </td>
                        <td className="py-1.5 text-slate-300">
                          {t.client
                            ? <Link href={`/crm/clients/${t.client.id}`} className="hover:text-white underline-offset-2 hover:underline">{t.client.name}</Link>
                            : t.counterparty ?? <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-1.5 text-slate-500 hidden md:table-cell max-w-xs truncate" title={t.purpose ?? t.docRef}>
                          {t.purpose ?? t.docRef}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-slate-100 whitespace-nowrap">
                          <Money amount={t.amount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.transactions.length >= 300 && (
                  <p className="text-slate-600 text-[11px] mt-2">Eng so&apos;nggi 300 ta operatsiya ko&apos;rsatilgan</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Breakdown({ title, direction, data, color }: {
  title: string; direction: "IN" | "OUT"; data: MonthCashFlow; color: string;
}) {
  const rows = data.byCategory.filter((r) => r.direction === direction);
  const total = direction === "IN" ? data.totalIn : data.totalOut;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-white font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">Bu oyda yo&apos;q</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const share = total > 0 ? (r.amount / total) * 100 : 0;
            return (
              <div key={r.category}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{categoryLabel(direction, r.category)}</span>
                  <span className="text-slate-200 tabular-nums"><Money amount={r.amount} /></span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1" title={`${share.toFixed(1)}%`}>
                  <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, title, sub, alert, children }: {
  icon: typeof Scale; title: string; sub: string; alert?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`bg-slate-900 border rounded-xl p-5 ${alert ? "border-red-900" : "border-slate-800"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <Icon className={`h-5 w-5 ${alert ? "text-red-400" : "text-slate-500"}`} />
      </div>
      <p className="text-2xl font-bold text-white mt-1 leading-tight break-words">{children}</p>
      <p className="text-slate-500 text-xs mt-1">{sub}</p>
    </div>
  );
}
