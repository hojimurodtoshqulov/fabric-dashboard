"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";
import { formatSum, type MoneyFormat } from "@/lib/utils/money";

const STORAGE_KEY = "money-format";
const EVENT = "money-format-change";
const DEFAULT: MoneyFormat = "words";

function read(): MoneyFormat {
  try {
    return localStorage.getItem(STORAGE_KEY) === "full" ? "full" : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The viewer's chosen money style, remembered in this browser. */
export function useMoneyFormat(): [MoneyFormat, (f: MoneyFormat) => void] {
  const format = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const set = (f: MoneyFormat) => {
    try { localStorage.setItem(STORAGE_KEY, f); } catch { /* private mode */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return [format, set];
}

export function Money({ amount, className }: { amount: number; className?: string }) {
  const [format] = useMoneyFormat();
  return <span className={className}>{formatSum(amount, format)}</span>;
}

export function MoneyFormatToggle() {
  const [format, setFormat] = useMoneyFormat();
  const options: { value: MoneyFormat; label: string }[] = [
    { value: "words", label: "1 mln 400 ming" },
    { value: "full",  label: "1 400 000" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-xs" title="Summalarni ko'rsatish usuli">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setFormat(o.value)}
          className={cn(
            "px-2.5 py-1 rounded-md transition-colors",
            format === o.value ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
