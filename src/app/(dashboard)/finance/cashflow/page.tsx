import { Metadata } from "next";
import { CashflowDashboard } from "@/components/finance/cashflow-dashboard";

export const metadata: Metadata = { title: "Pul oqimi" };

// Access is owner-only (finance:profit) — enforced by the middleware and the API.
export default function CashflowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pul oqimi</h1>
        <p className="text-slate-400 text-sm mt-1">Kassa va bank bo&apos;yicha kirim va chiqim — 1C&apos;dan avtomatik olinadi</p>
      </div>
      <CashflowDashboard />
    </div>
  );
}
