import { Metadata } from "next";
import { StatCard } from "@/components/shared/stat-card";
import { analyticsService } from "@/services/analytics/analytics.service";
import {
  Users, ShoppingCart, CreditCard, TrendingUp,
  AlertTriangle, CheckSquare, Phone, DollarSign,
} from "lucide-react";
import { SalesChart } from "@/components/charts/sales-chart";
import { ClientStatusChart } from "@/components/charts/client-status-chart";

export const metadata: Metadata = { title: "Bosh sahifa" };

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const overview = await analyticsService.getDashboardOverview();

  const { clients, debts, today, monthly, tasks } = overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bosh sahifa</h1>
        <p className="text-slate-400 text-sm mt-1">Bugungi holat — {new Date().toLocaleDateString("uz-UZ")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami mijozlar"
          value={clients.total.toLocaleString()}
          subtitle={`${clients.activeCount} faol`}
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Bugungi savdo"
          value={`${(today.sales / 1_000_000).toFixed(1)}M`}
          subtitle={`${today.invoices} ta hisob-faktura`}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Muddati o'tgan qarz"
          value={`${(debts.overdue.amount / 1_000_000).toFixed(1)}M`}
          subtitle={`${debts.overdue.count} ta mijoz`}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Oylik savdo"
          value={`${(monthly.sales / 1_000_000).toFixed(1)}M`}
          subtitle={`${monthly.invoices} ta hisob-faktura`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faol mijozlar"
          value={clients.activeCount}
          subtitle={`${clients.retentionRate}% saqlanish`}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Yo'qotilgan mijozlar"
          value={clients.byStatus?.LOST || 0}
          subtitle={`${clients.lostRate}% yo'qotish`}
          icon={Users}
          color="red"
        />
        <StatCard
          title="Qarzlar jami"
          value={`${(debts.totalDebt / 1_000_000).toFixed(1)}M`}
          subtitle={`${debts.recoveryRate}% qaytarilgan`}
          icon={CreditCard}
          color="yellow"
        />
        <StatCard
          title="Faol vazifalar"
          value={tasks["IN_PROGRESS"] || 0}
          subtitle={`${tasks["TODO"] || 0} kutmoqda`}
          icon={CheckSquare}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Oylik savdo dinamikasi</h2>
          <SalesChart />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Mijozlar holati</h2>
          <ClientStatusChart data={clients.byStatus || {}} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-400 text-sm font-medium">Qarz qaytarish</h3>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Qaytarilgan</span>
              <span className="text-green-400">{debts.recoveryRate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${debts.recoveryRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-400 text-sm font-medium">Mijoz saqlanish</h3>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Saqlanish darajasi</span>
              <span className="text-indigo-400">{clients.retentionRate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${clients.retentionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-400 text-sm font-medium">Bugungi to'lovlar</h3>
          <p className="text-2xl font-bold text-white mt-2">
            {(today.paid / 1_000_000).toFixed(2)}M
          </p>
          <p className="text-slate-500 text-xs mt-1">so'm</p>
        </div>
      </div>
    </div>
  );
}
