"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Kutilmoqda",   className: "border-blue-800 text-blue-400" },
  PARTIAL:    { label: "Qisman",       className: "border-yellow-800 text-yellow-400" },
  OVERDUE:    { label: "Muddati o'tgan", className: "border-red-800 text-red-400" },
  PAID:       { label: "To'langan",    className: "border-green-800 text-green-400" },
  WRITTEN_OFF:{ label: "Hisobdan chiqarilgan", className: "border-slate-700 text-slate-500" },
};

export function DebtsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const res = await fetch("/api/debts?limit=50");
      const json = await res.json();
      return json.data as {
        debts: Array<{
          id: string; status: string; amount: number; paidAmount: number;
          dueDate: string;
          client: { id: string; name: string; phone: string };
        }>;
        total: number;
      };
    },
  });

  const totalOverdue = data?.debts
    ?.filter(d => d.status === "OVERDUE")
    ?.reduce((s, d) => s + (Number(d.amount) - Number(d.paidAmount)), 0) ?? 0;

  return (
    <div className="space-y-4">
      {totalOverdue > 0 && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">
            Muddati o'tgan umumiy qarz: <strong>{totalOverdue.toLocaleString()} so'm</strong>
          </p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Mijoz", "Qarz miqdori", "To'langan", "Qoldiq", "Muddat", "Holat", "Amallar"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td colSpan={7} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : !data?.debts?.length ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Qarzlar topilmadi</td></tr>
            ) : (
              data.debts.map((debt) => {
                const remaining = Number(debt.amount) - Number(debt.paidAmount);
                const isOverdue = debt.status === "OVERDUE";
                return (
                  <tr key={debt.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${isOverdue ? "bg-red-900/5" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{debt.client.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{debt.client.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-white">{Number(debt.amount).toLocaleString()} so'm</td>
                    <td className="px-4 py-3 text-green-400">{Number(debt.paidAmount).toLocaleString()} so'm</td>
                    <td className={`px-4 py-3 font-medium ${isOverdue ? "text-red-400" : "text-yellow-400"}`}>
                      {remaining.toLocaleString()} so'm
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(debt.dueDate).toLocaleDateString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_CONFIG[debt.status]?.className}>
                        {STATUS_CONFIG[debt.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                        <a href={`tel:${debt.client.phone}`}><Phone className="h-3.5 w-3.5" /></a>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
