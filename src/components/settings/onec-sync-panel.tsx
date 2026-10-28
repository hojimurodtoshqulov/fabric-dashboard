"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, RefreshCw, ShoppingCart, CreditCard, UserPlus, ArrowLeftRight, CheckCircle2, Trash2, AlertTriangle, ArrowRight,
} from "lucide-react";
import type { OneCChangeKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/money";
import { CHANGE_LABELS, formatAgo, type Freshness } from "@/lib/sync/onec-status";
import type { OneCChangeRow, OneCStatus } from "@/services/sync/onec-status.service";

const KIND_ICON: Record<OneCChangeKind, typeof ShoppingCart> = {
  SALE_NEW: ShoppingCart,
  SALE_CHANGED: ShoppingCart,
  DEBT_NEW: CreditCard,
  DEBT_CHANGED: CreditCard,
  DEBT_CLOSED: CheckCircle2,
  CLIENT_NEW: UserPlus,
  CASH_NEW: ArrowLeftRight,
  CASH_CHANGED: ArrowLeftRight,
  CASH_REMOVED: Trash2,
};

const FRESHNESS: Record<Freshness, { label: string; className: string }> = {
  fresh: { label: "Ishlayapti", className: "bg-green-500/10 text-green-400 border-green-800" },
  late: { label: "Kechikmoqda", className: "bg-amber-500/10 text-amber-400 border-amber-800" },
  stale: { label: "To'xtagan", className: "bg-red-500/10 text-red-400 border-red-800" },
  never: { label: "Hech qachon", className: "bg-slate-500/10 text-slate-400 border-slate-700" },
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/** Agents before 1.2.0 do not report cash movements and cannot close paid debts. */
const isOldAgent = (v: string | null | undefined) => {
  if (!v) return true;
  const [a, b] = v.split(".").map(Number);
  return a < 1 || (a === 1 && b < 2);
};

export function OneCSyncPanel() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["onec-status"],
    queryFn: async () => {
      const res = await fetch("/api/settings/onec");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
      return json.data as OneCStatus;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">1C sinxronizatsiya</h2>
          <p className="text-slate-500 text-sm mt-0.5">1C&apos;dan ma&apos;lumot qachon kelgani va oxirgi o&apos;zgarishlar</p>
        </div>
        <button type="button" onClick={() => refetch()} disabled={isFetching}
          className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800" title="Yangilash">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading || !data ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <Health data={data} />
          <Stats data={data} />
          <Changes changes={data.changes} />
        </>
      )}
    </div>
  );
}

function Health({ data }: { data: OneCStatus }) {
  const f = FRESHNESS[data.freshness];
  const warnings: string[] = [];
  if (data.freshness === "late") warnings.push("Oxirgi muvaffaqiyatli sinxronizatsiya 8 soatdan oldin bo'lgan. Zavod kompyuteri yoqilganini va agent ishlayotganini tekshiring.");
  if (data.freshness === "stale") warnings.push("1C'dan bir sutkadan ortiq ma'lumot kelmagan. Zavod kompyuteri o'chiq yoki agent to'xtagan bo'lishi mumkin.");
  if (data.lastSync && data.lastSync.status === "FAILED") warnings.push(`Oxirgi urinish xato bilan tugagan: ${data.lastSync.error ?? "sabab ko'rsatilmagan"}`);
  if (data.lastSync && isOldAgent(data.lastSync.agentVersion)) warnings.push("Zavoddagi agent eski versiyada (1.2.0 dan past). Kassa/bank ma'lumotlari kelmaydi va 1C'da to'langan qarzlar yopilmaydi. Yangi agentni o'rnating.");
  if (data.debts.notSeenCount > 0) warnings.push(`${data.debts.notSeenCount} ta qarz so'nggi o'qishda 1C ro'yxatida chiqmagan — ehtimol to'langan, lekin bu yerda hali ochiq turibdi.`);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Badge variant="outline" className={f.className}>{f.label}</Badge>
        <p className="text-slate-200 text-sm">
          Oxirgi muvaffaqiyatli sinxronizatsiya: <span className="font-medium text-white">{when(data.lastSuccessAt)}</span>
          <span className="text-slate-500"> · {formatAgo(data.lastSuccessAt)}</span>
        </p>
        {data.lastSync?.agentVersion && <span className="text-slate-500 text-xs">agent {data.lastSync.agentVersion}</span>}
      </div>
      {warnings.map((w) => (
        <p key={w} className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/5 border border-amber-900/50 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}
        </p>
      ))}
    </div>
  );
}

function Stats({ data }: { data: OneCStatus }) {
  const items = [
    { title: "Qarzlar oxirgi o'qilgan", value: when(data.lastDebtsReadAt), sub: formatAgo(data.lastDebtsReadAt) },
    { title: "Eng so'nggi savdo (1C)", value: day(data.sales.newestDate), sub: `jami ${data.sales.count} ta savdo` },
    { title: "Ochiq qarzlar (1C)", value: <Money amount={data.debts.openTotal} />, sub: `${data.debts.openCount} ta mijoz` },
    {
      title: "Kassa va bank",
      value: data.cash.count ? day(data.cash.newestDate) : "—",
      sub: data.cash.count ? `${data.cash.count} ta yozuv` : "ma'lumot hali kelmagan",
    },
    { title: "So'nggi 24 soatda", value: `${data.last24h.syncs} so'rov`, sub: data.last24h.failed ? `${data.last24h.failed} tasi xato` : "xatosiz" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
      {items.map((i) => (
        <div key={i.title} className="bg-slate-800/50 rounded-lg px-3 py-2.5">
          <p className="text-slate-500 text-xs">{i.title}</p>
          <p className="text-slate-100 text-sm font-medium mt-0.5 break-words">{i.value}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">{i.sub}</p>
        </div>
      ))}
    </div>
  );
}

function Changes({ changes }: { changes: OneCChangeRow[] }) {
  return (
    <div>
      <h3 className="text-white text-sm font-semibold mb-2">1C&apos;dan kelgan oxirgi o&apos;zgarishlar</h3>
      {changes.length === 0 ? (
        <p className="text-slate-500 text-sm bg-slate-800/30 rounded-lg px-4 py-5 text-center">
          Hozircha o&apos;zgarish qayd etilmagan. Yangi savdo, qarz o&apos;zgarishi yoki to&apos;lov kelganda shu yerda ko&apos;rinadi.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
          {changes.map((c) => <ChangeItem key={c.id} c={c} />)}
        </ul>
      )}
    </div>
  );
}

function ChangeItem({ c }: { c: OneCChangeRow }) {
  const Icon = KIND_ICON[c.kind];
  const moved = c.previousAmount !== null && c.amount !== null;
  const delta = moved ? c.amount! - c.previousAmount! : 0;
  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 truncate">
          {c.clientId
            ? <Link href={`/crm/clients/${c.clientId}`} className="hover:text-white hover:underline underline-offset-2">{c.title}</Link>
            : c.title}
        </p>
        <p className="text-xs text-slate-500">
          {CHANGE_LABELS[c.kind]}{c.ref ? ` · ${c.ref}` : ""}{c.detail ? ` · ${c.detail}` : ""}
        </p>
      </div>
      <div className="text-right shrink-0">
        {c.amount !== null && (
          <p className="text-sm text-slate-100 tabular-nums">
            {moved && (
              <>
                <span className="text-slate-500"><Money amount={c.previousAmount!} /></span>
                <ArrowRight className="inline h-3 w-3 mx-1 text-slate-600" />
              </>
            )}
            <Money amount={c.amount} />
          </p>
        )}
        {moved && delta !== 0 && (
          <p className={`text-[11px] tabular-nums ${delta > 0 ? "text-amber-400" : "text-green-400"}`}>
            {delta > 0 ? "+" : "−"}<Money amount={Math.abs(delta)} />
          </p>
        )}
        <p className="text-[11px] text-slate-600">{formatAgo(c.createdAt)}</p>
      </div>
    </li>
  );
}
