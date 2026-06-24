"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Qoralama",    className: "border-slate-700 text-slate-400" },
  SENT:      { label: "Yuborilgan",  className: "border-blue-800 text-blue-400" },
  PAID:      { label: "To'langan",   className: "border-green-800 text-green-400" },
  PARTIAL:   { label: "Qisman",      className: "border-yellow-800 text-yellow-400" },
  OVERDUE:   { label: "Muddati o'tgan", className: "border-red-800 text-red-400" },
  CANCELLED: { label: "Bekor",       className: "border-slate-700 text-slate-500" },
};

export function InvoicesTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page, search, status],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (status !== "all") p.set("status", status);
      const res = await fetch(`/api/invoices?${p}`);
      const json = await res.json();
      return json.data as {
        invoices: Array<{
          id: string; number: string; status: string;
          total: number; paid: number;
          client: { name: string };
          createdBy: { name: string };
          dueDate: string | null;
          createdAt: string;
        }>;
        total: number; totalPages: number;
      };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input placeholder="Qidirish..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-slate-800 border-slate-700 text-white" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Barcha</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Raqam", "Mijoz", "Holat", "Jami", "To'langan", "Muddat", "Amallar"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 bg-slate-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : !data?.invoices?.length ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Fakturalar topilmadi</td></tr>
            ) : (
              data.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{inv.number}</td>
                  <td className="px-4 py-3 text-white">{inv.client.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_CONFIG[inv.status]?.className}>
                      {STATUS_CONFIG[inv.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white">{Number(inv.total).toLocaleString()} so'm</td>
                  <td className="px-4 py-3 text-green-400">{Number(inv.paid).toLocaleString()} so'm</td>
                  <td className="px-4 py-3 text-slate-400">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("uz-UZ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" asChild>
                      <Link href={`/sales/invoices/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-slate-500 text-sm">Jami: {data.total} ta</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Oldingi</Button>
              <span className="text-slate-400 text-sm py-1.5 px-2">{page}/{data.totalPages}</span>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Keyingi</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
