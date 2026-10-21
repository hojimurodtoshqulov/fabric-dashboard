"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/hr/shared";

/** fetch JSON from our API; throws the server's Uzbek error message. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Xatolik yuz berdi");
  return json.data as T;
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white"
        onClick={() => onChange(shiftMonth(month, -1))} title="Oldingi oy">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-white font-medium w-32 text-center">{monthLabel(month)}</span>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white"
        onClick={() => onChange(shiftMonth(month, 1))} title="Keyingi oy">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return <div className="bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">{error}</div>;
}

export const inputCls = "bg-slate-800 border-slate-700 text-white";
