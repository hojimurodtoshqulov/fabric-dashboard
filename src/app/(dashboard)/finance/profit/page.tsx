import { Metadata } from "next";
import { ProfitDashboard } from "@/components/finance/profit-dashboard";

export const metadata: Metadata = { title: "Foyda hisobi" };

// Access is owner-only (finance:profit) — enforced by the middleware and the API.
export default function ProfitPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Foyda hisobi</h1>
        <p className="text-slate-400 text-sm mt-1">Daromad − (xom ashyo + oylik + xarajatlar) = sof foyda</p>
      </div>
      <ProfitDashboard />
    </div>
  );
}
