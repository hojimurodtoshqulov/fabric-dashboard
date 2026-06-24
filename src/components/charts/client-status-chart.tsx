"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  LOST: "Yo'qotilgan",
  DEBTOR: "Qarzdor",
  PROSPECT: "Potensial",
  COMPETITOR: "Raqib",
  RISK: "Xavfli",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  INACTIVE: "#94a3b8",
  LOST: "#ef4444",
  DEBTOR: "#f59e0b",
  PROSPECT: "#6366f1",
  COMPETITOR: "#ec4899",
  RISK: "#f97316",
};

interface ClientStatusChartProps {
  data: Record<string, number>;
}

export function ClientStatusChart({ data }: ClientStatusChartProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        Ma'lumot yo'q
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] || "#6366f1"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
          formatter={(value, name) => [Number(value), String(name)]}
        />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
