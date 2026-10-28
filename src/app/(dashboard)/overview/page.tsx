import { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { analyticsService } from "@/services/analytics/analytics.service";
import {
  Users, ShoppingCart, CreditCard, TrendingUp,
  AlertTriangle, CheckSquare,
} from "lucide-react";
import { SalesChart } from "@/components/charts/sales-chart";
import { ClientStatusChart } from "@/components/charts/client-status-chart";
import { Money, MoneyFormatToggle } from "@/components/shared/money";
import { metricHref } from "@/lib/analytics/metrics";

export const metadata: Metadata = { title: "Bosh sahifa" };
export const dynamic = "force-dynamic";

const EMPTY_OVERVIEW = {
  clients: { total: 0, activeCount: 0, retentionRate: 0, lostRate: 0, byStatus: {} },
  debts: { totalDebt: 0, overdue: { amount: 0, count: 0 }, recoveryRate: 0 },
  today: { sales: 0, invoices: 0, paid: 0 },
  monthly: { sales: 0, invoices: 0 },
  tasks: {} as Record<string, number>,
};

export default async function OverviewPage() {
  let overview = EMPTY_OVERVIEW;
  try {
    overview = await analyticsService.getDashboardOverview();
  } catch {
    // DB mavjud emas yoki xatolik — bo'sh ma'lumot ko'rsatiladi
  }

  const { clients, debts, today, monthly, tasks } = overview;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Bosh sahifa</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bugungi holat — {new Date().toLocaleDateString("uz-UZ")}
          </p>
        </div>
        <MoneyFormatToggle />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami mijozlar" value={clients.total.toLocaleString()}
          subtitle={`${clients.activeCount} faol`} icon={Users} color="indigo" href={metricHref("clients")} />
        <StatCard title="Bugungi savdo" value={<Money amount={today.sales} />}
          subtitle={`${today.invoices} ta hisob-faktura`} icon={ShoppingCart} color="green" href={metricHref("today-sales")} />
        <StatCard title="Muddati o'tgan qarz" value={<Money amount={debts.overdue.amount} />}
          subtitle={`30 kundan oshgan qismi · ${debts.overdue.count} ta mijoz`} icon={AlertTriangle} color="red" href={metricHref("overdue-debt")} />
        <StatCard title="Oylik savdo" value={<Money amount={monthly.sales} />}
          subtitle={`${monthly.invoices} ta hisob-faktura`} icon={TrendingUp} color="blue" href={metricHref("monthly-sales")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faol mijozlar" value={clients.activeCount}
          subtitle={`${clients.retentionRate}% saqlanish`} icon={Users} color="green" href={metricHref("active-clients")} />
        <StatCard title="Yo'qotilgan mijozlar" value={(clients.byStatus as Record<string,number>)?.LOST || 0}
          subtitle={`${clients.lostRate}% yo'qotish`} icon={Users} color="red" href={metricHref("lost-clients")} />
        <StatCard title="Jami qarz" value={<Money amount={debts.totalDebt} />}
          subtitle="Barcha to'lanmagan qarz (muddati o'tgan + o'tmagan)" icon={CreditCard} color="yellow" href={metricHref("total-debt")} />
        <StatCard title="Faol vazifalar" value={tasks["IN_PROGRESS"] || 0}
          subtitle={`${tasks["TODO"] || 0} kutmoqda`} icon={CheckSquare} color="purple" href={metricHref("tasks")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <Link href={metricHref("sales-trend")} className="group inline-flex items-center gap-2 text-white font-semibold mb-4 hover:text-indigo-300">
            Oylik savdo dinamikasi <span className="text-slate-600 group-hover:text-indigo-300">→</span>
          </Link>
          <SalesChart />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <Link href={metricHref("client-status")} className="group inline-flex items-center gap-2 text-white font-semibold mb-4 hover:text-indigo-300">
            Mijozlar holati <span className="text-slate-600 group-hover:text-indigo-300">→</span>
          </Link>
          <ClientStatusChart data={(clients.byStatus as Record<string,number>) || {}} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href={metricHref("debt-recovery")} className="block bg-slate-900 border border-slate-800 rounded-xl p-5 transition-colors hover:border-slate-600 hover:bg-slate-800/40">
          <h3 className="text-slate-400 text-sm font-medium">Qarz qaytarish</h3>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Qaytarilgan</span>
              <span className="text-green-400">{debts.recoveryRate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${debts.recoveryRate}%` }} />
            </div>
          </div>
        </Link>
        <Link href={metricHref("client-status")} className="block bg-slate-900 border border-slate-800 rounded-xl p-5 transition-colors hover:border-slate-600 hover:bg-slate-800/40">
          <h3 className="text-slate-400 text-sm font-medium">Mijoz saqlanish</h3>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Saqlanish darajasi</span>
              <span className="text-indigo-400">{clients.retentionRate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${clients.retentionRate}%` }} />
            </div>
          </div>
        </Link>
        <Link href={metricHref("today-payments")} className="block bg-slate-900 border border-slate-800 rounded-xl p-5 transition-colors hover:border-slate-600 hover:bg-slate-800/40">
          <h3 className="text-slate-400 text-sm font-medium">Bugungi to&apos;lovlar</h3>
          <p className="text-2xl font-bold text-white mt-2"><Money amount={today.paid} /></p>
        </Link>
      </div>
    </div>
  );
}
