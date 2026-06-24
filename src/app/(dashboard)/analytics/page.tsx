import { Metadata } from "next";
import { analyticsService } from "@/services/analytics/analytics.service";
import { StatCard } from "@/components/shared/stat-card";
import { BarChart3, TrendingUp, Users, CreditCard, MapPin, Award } from "lucide-react";

export const metadata: Metadata = { title: "Analitika" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [clientStats, debtStats, topProducts, regionPerf, managerPerf] = await Promise.all([
    analyticsService.getClientStats(),
    analyticsService.getDebtStats(),
    analyticsService.getTopProducts(5),
    analyticsService.getRegionPerformance(),
    analyticsService.getManagerPerformance(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analitika</h1>
        <p className="text-slate-400 text-sm mt-1">Biznes ko'rsatkichlari</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami mijozlar" value={clientStats.total} icon={Users} color="indigo" />
        <StatCard title="Saqlanish darajasi" value={`${clientStats.retentionRate}%`} icon={TrendingUp} color="green" />
        <StatCard title="Yo'qotish darajasi" value={`${clientStats.lostRate}%`} icon={Users} color="red" />
        <StatCard title="Qarz qaytarish" value={`${debtStats.recoveryRate}%`} icon={CreditCard} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            Top Mahsulotlar
          </h2>
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={product.productId || i} className="flex items-center gap-3">
                <span className="text-slate-500 text-sm w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{product.name}</p>
                  <p className="text-slate-500 text-xs">{product.orderCount} ta buyurtma</p>
                </div>
                <span className="text-green-400 text-sm font-medium">
                  {(product.totalRevenue / 1_000_000).toFixed(1)}M
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-slate-500 text-sm">Ma'lumot yo'q</p>
            )}
          </div>
        </div>

        {/* Region Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400" />
            Hududlar bo'yicha
          </h2>
          <div className="space-y-3">
            {regionPerf.slice(0, 5).map((region, i) => (
              <div key={region.region} className="flex items-center gap-3">
                <span className="text-slate-500 text-sm w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{region.region}</p>
                  <p className="text-slate-500 text-xs">{region.clients} ta mijoz</p>
                </div>
                <span className="text-green-400 text-sm font-medium">
                  {(region.revenue / 1_000_000).toFixed(1)}M
                </span>
              </div>
            ))}
            {regionPerf.length === 0 && (
              <p className="text-slate-500 text-sm">Ma'lumot yo'q</p>
            )}
          </div>
        </div>

        {/* Manager Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            Menejerlar natijasi
          </h2>
          <div className="space-y-3">
            {managerPerf.map((mgr) => (
              <div key={mgr.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold">
                  {mgr.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{mgr.name}</p>
                  <p className="text-slate-500 text-xs">
                    {mgr.activeClients}/{mgr.totalClients} faol
                  </p>
                </div>
                <span className="text-green-400 text-sm font-medium">
                  {(mgr.revenue / 1_000_000).toFixed(1)}M
                </span>
              </div>
            ))}
            {managerPerf.length === 0 && (
              <p className="text-slate-500 text-sm">Ma'lumot yo'q</p>
            )}
          </div>
        </div>

        {/* Debt overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-400" />
            Qarz holati
          </h2>
          <div className="space-y-3">
            {[
              { label: "Kutilmoqda", data: debtStats.pending, color: "text-blue-400" },
              { label: "Muddati o'tgan", data: debtStats.overdue, color: "text-red-400" },
              { label: "Qisman to'langan", data: debtStats.partial, color: "text-yellow-400" },
              { label: "To'langan", data: debtStats.paid, color: "text-green-400" },
            ].map(({ label, data, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className="text-slate-600 text-xs">({data.count})</span>
                </div>
                <span className={`text-sm font-medium ${color}`}>
                  {(data.amount / 1_000_000).toFixed(2)}M
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
