"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Wallet, Receipt, Info } from "lucide-react";
import { Money, MoneyFormatToggle, useMoneyFormat } from "@/components/shared/money";
import { formatSum, formatSumAxis } from "@/lib/utils/money";
import { monthOf, monthLabel, MONTH_NAMES } from "@/lib/hr/shared";
import { api, MonthSwitcher } from "@/components/hr/common";
import type { MonthPnL } from "@/services/finance/profit.service";

// Validated (dataviz validator, dark surface #0f172a): L in band, CVD ΔE 32.
const REVENUE = "#6366f1";
const COST = "#d97706";

const shortMonth = (m: string) => `${MONTH_NAMES[Number(m.slice(5)) - 1].slice(0, 3)} ${m.slice(2, 4)}`;

export function ProfitDashboard() {
  const [month, setMonth] = useState(monthOf());
  const [moneyFormat] = useMoneyFormat();
  const { data, isLoading } = useQuery({
    queryKey: ["profit", month],
    queryFn: () => api<{ current: MonthPnL; trend: MonthPnL[] }>(`/api/finance/profit?month=${month}`),
  });

  const c = data?.current;
  const loss = c ? c.profit < 0 : false;

  // Statement lines, each with its share of revenue
  const lines = c ? [
    { label: "Xom ashyo xaridi", hint: "Omborxona → Kirim", amount: c.materials },
    {
      label: "Oylik fondi",
      hint: c.payrollSource === "saved" ? (c.payrollStatus === "PAID" ? "to'langan" : "tasdiqlangan") : "taxminiy — oylik hali tasdiqlanmagan",
      amount: c.payroll,
    },
    ...c.expensesByCategory.map((e) => ({ label: e.name, hint: "Xarajatlar", amount: e.amount })),
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} onChange={setMonth} />
        <div className="ml-auto"><MoneyFormatToggle /></div>
      </div>

      {isLoading || !c ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile icon={Wallet} title="Daromad (savdo)" sub={`shundan 1C: ${formatSum(c.revenue1c, moneyFormat)}`}>
              <Money amount={c.revenue} />
            </Tile>
            <Tile icon={Receipt} title="Jami xarajat" sub="xom ashyo + oylik + xarajatlar">
              <Money amount={c.totalCost} />
            </Tile>
            <Tile icon={loss ? TrendingDown : TrendingUp} title={loss ? "Zarar" : "Sof foyda"}
              sub={loss ? "xarajat daromaddan ko'p" : "daromad − jami xarajat"} alert={loss}>
              <Money amount={c.profit} />
            </Tile>
            <Tile icon={TrendingUp} title="Rentabellik" sub="foyda / daromad">
              {c.margin === null ? "—" : `${c.margin}%`}
            </Tile>
          </div>

          {/* P&L statement */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">{monthLabel(month)} — foyda va zarar hisoboti</h2>
            <div className="space-y-1 text-sm">
              <StatementRow label="Daromad" amount={c.revenue} revenue={c.revenue} strong />
              {lines.map((l) => (
                <StatementRow key={l.label} label={l.label} hint={l.hint} amount={-l.amount} revenue={c.revenue} />
              ))}
              <div className="border-t border-slate-700 my-2" />
              <StatementRow label={loss ? "Zarar" : "Sof foyda"} amount={c.profit} revenue={c.revenue} strong alert={loss} />
            </div>
            {c.payrollSource === "estimate" && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-4">
                <Info className="h-3.5 w-3.5" /> Bu oy oyligi hali tasdiqlanmagan — oylik fondi joriy davomat bo&apos;yicha taxminiy hisoblangan.
              </p>
            )}
          </div>

          {/* 12-month trend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold">Daromad va xarajat — so&apos;nggi 12 oy</h2>
            <p className="text-slate-500 text-xs mb-4">Chiziqlar orasidagi farq — o&apos;sha oydagi foyda</p>
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
                <Line type="monotone" dataKey="revenue" name="Daromad" stroke={REVENUE} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="totalCost" name="Xarajat" stroke={COST} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>

            {/* table view of the same numbers */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 font-medium">Oy</th>
                    <th className="text-right py-2 font-medium">Daromad</th>
                    <th className="text-right py-2 font-medium">Xom ashyo</th>
                    <th className="text-right py-2 font-medium">Oylik</th>
                    <th className="text-right py-2 font-medium">Xarajatlar</th>
                    <th className="text-right py-2 font-medium">Foyda</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.trend].reverse().map((t) => (
                    <tr key={t.month} className="border-b border-slate-800/50">
                      <td className="py-1.5 text-slate-300">{monthLabel(t.month)}</td>
                      <td className="py-1.5 text-right text-slate-200"><Money amount={t.revenue} /></td>
                      <td className="py-1.5 text-right text-slate-400"><Money amount={t.materials} /></td>
                      <td className="py-1.5 text-right text-slate-400">
                        <Money amount={t.payroll} />{t.payrollSource === "estimate" && t.payroll > 0 && <span className="text-slate-600">*</span>}
                      </td>
                      <td className="py-1.5 text-right text-slate-400"><Money amount={t.expenses} /></td>
                      <td className="py-1.5 text-right font-medium text-white">
                        {t.profit < 0 && <TrendingDown className="inline h-3 w-3 text-red-400 mr-1" />}
                        <Money amount={t.profit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-slate-600 text-[11px] mt-2">* oylik tasdiqlanmagan, taxminiy</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ icon: Icon, title, sub, alert, children }: {
  icon: typeof Wallet; title: string; sub: string; alert?: boolean; children: React.ReactNode;
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

function StatementRow({ label, hint, amount, revenue, strong, alert }: {
  label: string; hint?: string; amount: number; revenue: number; strong?: boolean; alert?: boolean;
}) {
  const share = revenue > 0 ? Math.min(100, (Math.abs(amount) / revenue) * 100) : 0;
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[14rem_1fr_auto] items-center gap-3 py-1">
      <div className="min-w-0">
        <p className={strong ? "text-white font-semibold" : "text-slate-300"}>{label}</p>
        {hint && <p className="text-slate-600 text-[11px]">{hint}</p>}
      </div>
      <div className="hidden sm:block h-1.5 bg-slate-800 rounded-full overflow-hidden" title={`${share.toFixed(1)}% daromaddan`}>
        <div className="h-full bg-slate-500 rounded-full" style={{ width: `${share}%` }} />
      </div>
      <p className={`text-right tabular-nums ${strong ? "text-white font-semibold" : "text-slate-200"}`}>
        {alert && <TrendingDown className="inline h-3.5 w-3.5 text-red-400 mr-1" />}
        <Money amount={amount} />
      </p>
    </div>
  );
}
