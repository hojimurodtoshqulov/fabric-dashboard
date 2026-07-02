import { Metadata } from "next";
import { DebtsTable } from "@/components/sales/debts-table";

export const metadata: Metadata = { title: "Qarzlar" };

export default function DebtsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Qarzlar</h1>
        <p className="text-slate-400 text-sm mt-1">
          Barcha qarzdor mijozlar · Muddati o'tgan fakturalardan avtomatik yaratiladi
        </p>
      </div>
      <DebtsTable />
    </div>
  );
}
