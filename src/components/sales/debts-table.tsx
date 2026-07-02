"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Phone, RefreshCw, CheckCircle2,
  Bot, Send, Loader2,
} from "lucide-react";
import { ProvinceFilter } from "@/components/shared/province-filter";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:     { label: "Kutilmoqda",            className: "border-blue-800 text-blue-400" },
  PARTIAL:     { label: "Qisman",                className: "border-yellow-800 text-yellow-400" },
  OVERDUE:     { label: "Muddati o'tgan",        className: "border-red-800 text-red-400" },
  PAID:        { label: "To'langan",             className: "border-green-800 text-green-400" },
  WRITTEN_OFF: { label: "Hisobdan chiqarilgan",  className: "border-slate-700 text-slate-500" },
};

type ActionType = "AI_CALL" | "TELEGRAM";

interface Debt {
  id: string;
  status: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  client: { id: string; name: string; phone: string };
}

export function DebtsTable() {
  const queryClient = useQueryClient();
  const [checkResult, setCheckResult] = useState<number | null>(null);
  const [province, setProvince] = useState("");
  // Track loading per: "debtId-actionType"
  const [pending, setPending] = useState<Set<string>>(new Set());
  // Track success/error toast per debt
  const [toasts, setToasts] = useState<Record<string, { msg: string; ok: boolean }>>({});

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/check-overdue", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json.data as { processed: number };
    },
    onSuccess: (data) => {
      setCheckResult(data.processed);
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setTimeout(() => setCheckResult(null), 5000);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["debts", province],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "50" });
      if (province) p.set("province", province);
      const res = await fetch(`/api/debts?${p}`);
      const json = await res.json();
      return json.data as { debts: Debt[]; total: number };
    },
  });

  async function sendRemind(debtId: string, type: ActionType) {
    const key = `${debtId}-${type}`;
    setPending((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/debts/${debtId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      const msg = res.ok
        ? json.data?.message ?? "Yuborildi"
        : json.error ?? "Xatolik";
      setToasts((prev) => ({ ...prev, [key]: { msg, ok: res.ok } }));
      setTimeout(() => setToasts((prev) => { const n = { ...prev }; delete n[key]; return n; }), 4000);
    } catch {
      setToasts((prev) => ({ ...prev, [key]: { msg: "Xatolik", ok: false } }));
    } finally {
      setPending((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  const totalOverdue =
    data?.debts
      ?.filter((d) => d.status === "OVERDUE")
      ?.reduce((s, d) => s + (Number(d.amount) - Number(d.paidAmount)), 0) ?? 0;

  return (
    <div className="space-y-4">
      <ProvinceFilter
        value={province}
        onChange={setProvince}
        statsUrl="/api/debts/province-stats"
        countLabel="ta qarz"
      />

      {/* Manual trigger */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checkMutation.isPending ? "animate-spin" : ""}`} />
          {checkMutation.isPending ? "Tekshirilmoqda..." : "Muddati o'tganlarni tekshirish"}
        </Button>
        {checkResult !== null && (
          <div className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {checkResult > 0
              ? `${checkResult} ta faktura qayta ishlandi`
              : "Muddati o'tgan faktura topilmadi"}
          </div>
        )}
        {checkMutation.isError && (
          <p className="text-sm text-red-400">{(checkMutation.error as Error).message}</p>
        )}
        <p className="ml-auto text-xs text-slate-600">Avtomatik: har kecha 06:00 (UZT)</p>
      </div>

      {totalOverdue > 0 && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">
            Muddati o'tgan umumiy qarz:{" "}
            <strong>{totalOverdue.toLocaleString()} so'm</strong>
          </p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Mijoz", "Qarz miqdori", "To'langan", "Qoldiq", "Muddat", "Holat", "Amallar"].map(
                (h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">
                    {h}
                  </th>
                )
              )}
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
            ) : !data?.debts?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  Qarzlar topilmadi
                </td>
              </tr>
            ) : (
              data.debts.map((debt) => {
                const remaining = Number(debt.amount) - Number(debt.paidAmount);
                const isOverdue = debt.status === "OVERDUE";
                const aiKey = `${debt.id}-AI_CALL`;
                const tgKey = `${debt.id}-TELEGRAM`;

                return (
                  <tr
                    key={debt.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${isOverdue ? "bg-red-900/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{debt.client.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{debt.client.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {Number(debt.amount).toLocaleString()} so'm
                    </td>
                    <td className="px-4 py-3 text-green-400">
                      {Number(debt.paidAmount).toLocaleString()} so'm
                    </td>
                    <td className={`px-4 py-3 font-medium ${isOverdue ? "text-red-400" : "text-yellow-400"}`}>
                      {remaining.toLocaleString()} so'm
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(debt.dueDate).toLocaleDateString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={STATUS_CONFIG[debt.status]?.className}
                      >
                        {STATUS_CONFIG[debt.status]?.label}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Oddiy qo'ng'iroq */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                          title="Qo'ng'iroq qilish"
                          asChild
                        >
                          <a href={`tel:${debt.client.phone}`}>
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </Button>

                        {/* AI qo'ng'iroq */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                          title="AI qo'ng'iroq"
                          disabled={pending.has(aiKey)}
                          onClick={() => sendRemind(debt.id, "AI_CALL")}
                        >
                          {pending.has(aiKey) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* Telegram xabar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-sky-400 hover:text-sky-300 hover:bg-sky-900/30"
                          title="Telegram xabar yuborish"
                          disabled={pending.has(tgKey)}
                          onClick={() => sendRemind(debt.id, "TELEGRAM")}
                        >
                          {pending.has(tgKey) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      {/* Toast under buttons */}
                      {(toasts[aiKey] || toasts[tgKey]) && (
                        <p
                          className={`text-xs mt-1 ${
                            (toasts[aiKey] ?? toasts[tgKey]).ok
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {(toasts[aiKey] ?? toasts[tgKey]).msg}
                        </p>
                      )}
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
