"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const periods = [
  { label: "Kunlik", value: "daily" },
  { label: "Haftalik", value: "weekly" },
  { label: "Oylik", value: "monthly" },
  { label: "Yillik", value: "yearly" },
] as const;

type Period = (typeof periods)[number]["value"];

export function SalesChart() {
  const [period, setPeriod] = useState<Period>("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["sales-chart", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/sales?period=${period}`);
      const json = await res.json();
      return json.data as Array<{ period: string; total: number; paid: number; count: number }>;
    },
  });

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {periods.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? "default" : "ghost"}
            className={period === p.value ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Yuklanmoqda...</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value) => [`${(Number(value) / 1_000_000).toFixed(2)}M so'm`, ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              name="Jami"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="paid"
              name="To'langan"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
