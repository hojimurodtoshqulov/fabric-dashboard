"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Money, MoneyFormatToggle } from "@/components/shared/money";
import { api } from "@/components/hr/common";
import { METRICS, type Cell, type Column, type MetricDetail, type MetricKey, type SummaryItem, type Tone } from "@/lib/analytics/metrics";

const TONES: Record<Tone, string> = {
  green: "bg-green-500/10 text-green-400 border-green-800",
  red: "bg-red-500/10 text-red-400 border-red-800",
  amber: "bg-amber-500/10 text-amber-400 border-amber-800",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-800",
  slate: "bg-slate-500/10 text-slate-400 border-slate-700",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric" });

export function MetricDetailView({ metric }: { metric: MetricKey }) {
  const meta = METRICS[metric];
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["metric-detail", metric, q, page],
    queryFn: () => api<MetricDetail>(`/api/analytics/detail?metric=${metric}&page=${page}&q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(input.trim());
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/overview" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Bosh sahifa
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-2xl font-bold text-white">{meta.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{meta.description}</p>
          </div>
          <MoneyFormatToggle />
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : isError || !data ? (
        <p className="text-red-400 text-sm bg-red-500/5 border border-red-900/50 rounded-lg px-4 py-3">
          Ma&apos;lumotni yuklab bo&apos;lmadi: {error instanceof Error ? error.message : "xatolik"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.summary.map((s) => <Summary key={s.label} item={s} />)}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            {data.searchable && (
              <form onSubmit={submitSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Qidirish…"
                    className="pl-9 bg-slate-800 border-slate-700 text-white" />
                </div>
                {q && (
                  <button type="button" onClick={() => { setInput(""); setQ(""); setPage(1); }}
                    className="text-xs text-slate-400 hover:text-white px-2">Tozalash</button>
                )}
              </form>
            )}

            {data.rows.length === 0 ? (
              <p className="text-slate-500 text-sm py-10 text-center">
                {q ? "Hech narsa topilmadi" : "Hozircha ma'lumot yo'q"}
              </p>
            ) : (
              <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      {data.columns.map((c) => (
                        <th key={c.key} className={`px-3 py-2 font-medium whitespace-nowrap ${isRight(c) ? "text-right" : "text-left"}`}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        {data.columns.map((c) => (
                          <td key={c.key} className={`px-3 py-2 ${isRight(c) ? "text-right tabular-nums" : ""}`}>
                            <CellView column={c} cell={row.cells[c.key]} href={c.primary ? row.href : undefined} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pager data={data} onPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

const isRight = (c: Column) => c.type === "money" || c.type === "number";

function Summary({ item }: { item: SummaryItem }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-xs font-medium">{item.label}</p>
      <p className="text-xl font-bold text-white mt-1 leading-tight break-words">
        {item.kind === "money" ? <Money amount={Number(item.value)} />
          : item.kind === "percent" ? `${item.value}%`
          : item.kind === "count" ? Number(item.value).toLocaleString("ru-RU")
          : item.value}
      </p>
      {item.hint && <p className="text-slate-500 text-[11px] mt-1">{item.hint}</p>}
    </div>
  );
}

function CellView({ column, cell, href }: { column: Column; cell: Cell | undefined; href?: string }) {
  if (cell === null || cell === undefined || cell === "") return <span className="text-slate-600">—</span>;

  if (typeof cell === "object") {
    return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${TONES[cell.tone]}`}>{cell.label}</span>;
  }
  if (column.type === "money") return <span className="text-slate-100"><Money amount={Number(cell)} /></span>;
  if (column.type === "number") return <span className="text-slate-200">{Number(cell).toLocaleString("ru-RU")}</span>;
  if (column.type === "date") return <span className="text-slate-400 whitespace-nowrap">{fmtDate(String(cell))}</span>;

  return href
    ? <Link href={href} className="text-slate-100 hover:text-white hover:underline underline-offset-2">{cell}</Link>
    : <span className={column.primary ? "text-slate-100" : "text-slate-300"}>{cell}</span>;
}

function Pager({ data, onPage }: { data: MetricDetail; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (pages <= 1) return null;
  const from = (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.total, data.page * data.pageSize);
  return (
    <div className="flex items-center justify-between text-sm text-slate-400 pt-1">
      <span>{from}–{to} / {data.total.toLocaleString("ru-RU")}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}
          className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Oldingi sahifa">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2">{data.page} / {pages}</span>
        <button type="button" disabled={data.page >= pages} onClick={() => onPage(data.page + 1)}
          className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Keyingi sahifa">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
