import { Metadata } from "next";
import { MarketingOverview } from "@/components/marketing/marketing-overview";

export const metadata: Metadata = { title: "Marketing" };

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Marketing</h1>
        <p className="text-slate-400 text-sm mt-1">Ijtimoiy tarmoqlar va kampaniyalar</p>
      </div>
      <MarketingOverview />
    </div>
  );
}
