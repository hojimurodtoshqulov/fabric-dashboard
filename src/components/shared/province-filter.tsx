"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PROVINCE_GROUPS } from "@/lib/provinces";

interface ProvinceStat {
  key: string;
  count: number;
}

interface CardProps {
  label: string;
  sublabel: string;
  count: number;
  countLabel: string;
  isSelected: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function ProvinceCard({
  label, sublabel, count, countLabel,
  isSelected, isEmpty, isLoading, onClick,
}: CardProps) {
  if (isLoading) {
    return <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-24 animate-pulse" />;
  }

  return (
    <button
      onClick={isEmpty && !isSelected ? undefined : onClick}
      className={`bg-slate-900 border rounded-xl p-4 text-left transition-all group w-full ${
        isSelected
          ? "border-indigo-600 bg-indigo-900/15 ring-1 ring-indigo-600/20"
          : isEmpty
          ? "border-slate-800/40 opacity-40 cursor-default"
          : "border-slate-800 hover:border-indigo-600/50 hover:bg-slate-800/60 cursor-pointer"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? "bg-indigo-900/50" : isEmpty ? "bg-slate-800/50" : "bg-slate-800"
          }`}>
            <MapPin className={`h-4 w-4 ${
              isSelected ? "text-indigo-400" : isEmpty ? "text-slate-600" : "text-slate-400"
            }`} />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-sm leading-tight truncate transition-colors ${
              isSelected
                ? "text-indigo-300"
                : isEmpty
                ? "text-slate-600"
                : "text-white group-hover:text-indigo-300"
            }`}>
              {label}
            </p>
            <p className="text-slate-600 text-[10px]">{sublabel}</p>
          </div>
        </div>
        <span className={`text-2xl font-bold shrink-0 ml-1 ${
          isSelected ? "text-indigo-400" : isEmpty ? "text-slate-700" : "text-white"
        }`}>
          {count}
        </span>
      </div>
      <p className={`text-[11px] ${isSelected ? "text-indigo-500/80" : "text-slate-600"}`}>
        {countLabel}
      </p>
    </button>
  );
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  statsUrl: string;
  countLabel?: string;
}

export function ProvinceFilter({ value, onChange, statsUrl, countLabel = "ta yozuv" }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["province-stats", statsUrl],
    queryFn: async () => {
      const res = await fetch(statsUrl);
      const json = await res.json();
      return json.data as { provinces: ProvinceStat[] };
    },
    staleTime: 30_000,
  });

  const countMap = new Map<string, number>();
  for (const p of data?.provinces ?? []) {
    countMap.set(p.key, p.count);
  }
  const total = Array.from(countMap.values()).reduce((s, n) => s + n, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <ProvinceCard
        label="Barchasi"
        sublabel="Barcha viloyatlar"
        count={total}
        countLabel={countLabel}
        isSelected={!value}
        isEmpty={false}
        isLoading={isLoading}
        onClick={() => onChange("")}
      />
      {PROVINCE_GROUPS.map((p) => {
        const count = countMap.get(p.key) ?? 0;
        return (
          <ProvinceCard
            key={p.key}
            label={p.label}
            sublabel="Viloyat"
            count={count}
            countLabel={countLabel}
            isSelected={value === p.key}
            isEmpty={count === 0}
            isLoading={isLoading}
            onClick={() => onChange(value === p.key ? "" : p.key)}
          />
        );
      })}
    </div>
  );
}
