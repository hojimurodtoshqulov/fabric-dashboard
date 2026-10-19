"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Loader2, RefreshCw, Database, FileSpreadsheet, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import { SOURCE_LABELS } from "@/lib/clients/category";
import type { ClientSource } from "@prisma/client";

interface MatchClient {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  inn: string | null;
  province: string | null;
  region: string | null;
  source: ClientSource;
  notes?: string | null;
}

interface Candidate {
  id: string;
  score: number;
  reason: "inn" | "phone" | "name";
  onecClient: MatchClient & { debt: number; _count: { invoices: number } };
  potentialClient: MatchClient;
}

interface ListData {
  candidates: Candidate[];
  total: number;
  merged: number;
  page: number;
  totalPages: number;
}

interface ScanResult {
  onecClients: number;
  autoMerged: number;
  queuedForReview: number;
}

const REASON_LABEL = { inn: "INN bir xil", phone: "Telefon bir xil", name: "Nomi o'xshash" } as const;

const provinceLabel = (key: string | null) =>
  (key && PROVINCE_GROUPS.find((p) => p.key === key)?.label) || null;

const isPlaceholder = (phone: string) => phone.startsWith("+998000") || phone.startsWith("NOPHONE_");

function ClientSide({ client, kind, extra }: { client: MatchClient; kind: "onec" | "potential"; extra?: React.ReactNode }) {
  const Icon = kind === "onec" ? Database : FileSpreadsheet;
  return (
    <div className="flex-1 min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${kind === "onec" ? "text-green-400" : "text-sky-400"}`} />
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {kind === "onec" ? "1C (faol)" : `Potensial · ${SOURCE_LABELS[client.source]}`}
        </span>
      </div>
      <Link href={`/crm/clients/${client.id}`} className="block text-white font-medium hover:text-indigo-300 truncate" title={client.name}>
        {client.name}
      </Link>
      <div className="text-xs text-slate-400 space-y-0.5">
        <p className="font-mono">
          {isPlaceholder(client.phone) ? <span className="text-slate-600 font-sans">telefon yo'q</span> : client.phone}
          {client.phone2 && <span className="text-slate-500"> · {client.phone2}</span>}
        </p>
        <p>{[provinceLabel(client.province), client.region].filter(Boolean).join(" · ") || "Viloyat noma'lum"}</p>
        {client.inn && <p className="text-slate-500">INN {client.inn}</p>}
        {client.notes && <p className="text-slate-500 truncate" title={client.notes}>{client.notes}</p>}
        {extra}
      </div>
    </div>
  );
}

export function DuplicatesReview() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["client-duplicates", page],
    queryFn: async () => {
      const res = await fetch(`/api/clients/duplicates?page=${page}&limit=20`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
      return json.data as ListData;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-duplicates"] });
    qc.invalidateQueries({ queryKey: ["client-duplicates-count"] });
    qc.invalidateQueries({ queryKey: ["client-regions"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const scan = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients/duplicates", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Skanerlashda xatolik");
      return json.data as ScanResult;
    },
    onSuccess: (r) => { setScanResult(r); setError(""); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "merge" | "reject" }) => {
      const res = await fetch(`/api/clients/duplicates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
    },
    onSuccess: () => { setError(""); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const candidates = data?.candidates ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/crm/clients" className="mt-1 text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Dublikatlar</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              1C dagi faol mijozga o'xshash potensial mijozlar. Bir xil bo'lsa — birlashtiring:
              potensial nusxadagi telefon va viloyat 1C mijoziga o'tadi, nusxa esa potensial ro'yxatdan
              o'chadi. Shunda doimiy mijozga "yangi mijoz" xabarlari bormaydi.
            </p>
          </div>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
        >
          {scan.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Solishtirilmoqda…</>
            : <><RefreshCw className="mr-2 h-4 w-4" /> Qayta solishtirish</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-amber-300 text-xl font-bold">{data?.total ?? "—"}</p>
          <p className="text-slate-500 text-xs">Tekshirish kutilmoqda</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-green-400 text-xl font-bold">{data?.merged ?? "—"}</p>
          <p className="text-slate-500 text-xs">Birlashtirilgan (jami)</p>
        </div>
        {scanResult && (
          <div className="bg-indigo-900/20 border border-indigo-800 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-indigo-300 text-sm font-medium">
              {scanResult.autoMerged} ta avtomatik birlashtirildi
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              {scanResult.onecClients} ta 1C mijozi tekshirildi · {scanResult.queuedForReview} ta tekshiruvga
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-2 text-sm text-red-300">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : candidates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center text-slate-500">
          <GitMerge className="h-8 w-8 mx-auto mb-3 text-slate-600" />
          Tekshiriladigan o'xshashlik yo'q
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            const busy = decide.isPending && decide.variables?.id === c.id;
            return (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      c.score >= 0.9 ? "bg-green-500/10 text-green-300 border-green-800"
                      : c.score >= 0.8 ? "bg-amber-500/10 text-amber-300 border-amber-800"
                      : "bg-slate-500/10 text-slate-300 border-slate-700"
                    }>
                      {Math.round(c.score * 100)}% o'xshash
                    </Badge>
                    <span className="text-xs text-slate-500">{REASON_LABEL[c.reason]}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline" disabled={busy}
                      onClick={() => decide.mutate({ id: c.id, action: "reject" })}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Boshqa mijoz
                    </Button>
                    <Button
                      size="sm" disabled={busy}
                      onClick={() => decide.mutate({ id: c.id, action: "merge" })}
                      className="bg-green-700 hover:bg-green-600 text-white"
                    >
                      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                      Bir xil — birlashtirish
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ClientSide
                    client={c.onecClient}
                    kind="onec"
                    extra={
                      <p className="text-slate-500">
                        {c.onecClient._count.invoices} ta faktura
                        {c.onecClient.debt > 0 && <> · <span className="text-yellow-400">qarz {c.onecClient.debt.toLocaleString()} so'm</span></>}
                      </p>
                    }
                  />
                  <div className="w-px bg-slate-800" />
                  <ClientSide client={c.potentialClient} kind="potential" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">Jami: {data.total} ta</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
              disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
            <span className="text-slate-400 text-sm py-1.5 px-2">{page} / {data.totalPages}</span>
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
              disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
