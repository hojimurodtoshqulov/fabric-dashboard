"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, AlertCircle, TrendingDown, Sparkles,
  ArrowLeft, Phone, MapPin, Users, Loader2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCallModal } from "@/components/calls/new-call-modal";

type SegmentKey = "doimiy" | "qarzdor" | "yoqotilgan" | "yangi";

const SEGMENTS = [
  {
    key:     "doimiy" as SegmentKey,
    label:   "Doimiy mijozlar",
    desc:    "Faol, faktura amalga oshgan",
    Icon:    Building2,
    border:  "border-indigo-500/20 hover:border-indigo-400/40 cursor-pointer",
    active:  "border-indigo-500 bg-indigo-500/10",
    icon:    "bg-indigo-500/15 text-indigo-400",
    count:   "text-indigo-300",
    purpose: "OFFER",
  },
  {
    key:     "qarzdor" as SegmentKey,
    label:   "Qarzdor mijozlar",
    desc:    "Qarz bor, eslatish kerak",
    Icon:    AlertCircle,
    border:  "border-amber-500/20 hover:border-amber-400/40 cursor-pointer",
    active:  "border-amber-500 bg-amber-500/10",
    icon:    "bg-amber-500/15 text-amber-400",
    count:   "text-amber-300",
    purpose: "DEBT_REMINDER",
  },
  {
    key:     "yoqotilgan" as SegmentKey,
    label:   "Eski yo'qotilgan",
    desc:    "Oldin xaridor, hozir aktiv emas",
    Icon:    TrendingDown,
    border:  "border-red-500/20 hover:border-red-400/40 cursor-pointer",
    active:  "border-red-500 bg-red-500/10",
    icon:    "bg-red-500/15 text-red-400",
    count:   "text-red-300",
    purpose: "REACTIVATION",
  },
  {
    key:     "yangi" as SegmentKey,
    label:   "Yangi mijozlar",
    desc:    "Hech qachon olmagan, jalb qilish",
    Icon:    Sparkles,
    border:  "border-emerald-500/20 hover:border-emerald-400/40 cursor-pointer",
    active:  "border-emerald-500 bg-emerald-500/10",
    icon:    "bg-emerald-500/15 text-emerald-400",
    count:   "text-emerald-300",
    purpose: "OFFER",
  },
] as const;

interface SegmentsData {
  segments: Record<SegmentKey, { total: number; provinces: { name: string; count: number }[] }>;
}

interface ClientRow {
  id:           string;
  name:         string;
  phone:        string;
  province:     string | null;
  lastActivity: string | null;
  debtAmount:   number | null;
  lastInvoice:  { total: number; date: string } | null;
}

interface ClientsData {
  clients:     ClientRow[];
  total:       number;
  page:        number;
  totalPages:  number;
}

interface CallModalState {
  client:  { id: string; name: string; phone: string };
  purpose: string;
}

const LIMIT = 20;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} K`;
  return n.toString();
}

function fmtSum(n: number) {
  return new Intl.NumberFormat("uz-UZ", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SegmentDrillDown() {
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [callModal, setCallModal] = useState<CallModalState | null>(null);

  const segMeta = SEGMENTS.find((s) => s.key === selectedSegment);

  const { data: segData, isLoading: segLoading } = useQuery<{ data: SegmentsData }>({
    queryKey: ["ai-calls-segments"],
    queryFn:  () => fetch("/api/ai-calls/segments").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<{ data: ClientsData }>({
    queryKey: ["ai-calls-clients", selectedSegment, selectedProvince, page],
    queryFn:  () => {
      const params = new URLSearchParams({
        segment:  selectedSegment!,
        province: selectedProvince ?? "all",
        page:     String(page),
        limit:    String(LIMIT),
      });
      return fetch(`/api/ai-calls/clients?${params}`).then((r) => r.json());
    },
    enabled: !!(selectedSegment && selectedProvince !== null),
    staleTime: 30_000,
  });

  const segments = segData?.data?.segments;

  function goBack() {
    if (selectedProvince !== null) {
      setSelectedProvince(null);
      setPage(1);
    } else {
      setSelectedSegment(null);
    }
  }

  function selectSegment(key: SegmentKey) {
    setSelectedSegment(key);
    setSelectedProvince(null);
    setPage(1);
  }

  function selectProvince(name: string) {
    setSelectedProvince(name);
    setPage(1);
  }

  // ── Level 3: Client list ─────────────────────────────────────────────────
  if (selectedSegment && selectedProvince !== null) {
    const clients = clientsData?.data?.clients ?? [];
    const total   = clientsData?.data?.total ?? 0;
    const totalPg = clientsData?.data?.totalPages ?? 1;

    return (
      <>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={goBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="text-white font-medium">{segMeta?.label}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {selectedProvince}
              </span>
            </div>
            {total > 0 && (
              <span className="ml-auto text-xs text-slate-500">
                Jami: <span className="text-slate-300 font-medium">{total}</span> ta
              </span>
            )}
          </div>

          {/* List */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
            {clientsLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Yuklanmoqda...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
                <Users className="h-8 w-8" />
                <p className="text-sm">Mijozlar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/40">
                {clients.map((c) => (
                  <div key={c.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-700/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</p>
                    </div>
                    {selectedSegment === "qarzdor" && c.debtAmount !== null && c.debtAmount > 0 && (
                      <span className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5 shrink-0">
                        {fmtSum(c.debtAmount)}
                      </span>
                    )}
                    {selectedSegment === "doimiy" && c.lastInvoice && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {fmtSum(c.lastInvoice.total)}
                      </span>
                    )}
                    {(selectedSegment === "yoqotilgan" || selectedSegment === "yangi") && (
                      <span className="text-xs text-slate-500 shrink-0">
                        {fmtDate(c.lastActivity)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setCallModal({ client: { id: c.id, name: c.name, phone: c.phone }, purpose: segMeta!.purpose })}
                      className="shrink-0 h-8 px-3 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white transition-colors">
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      Qo'ng'iroq
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPg > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700 h-8">
                ← Oldingi
              </Button>
              <span className="text-slate-500">
                {page} / {totalPg}
              </span>
              <Button variant="outline" size="sm"
                disabled={page >= totalPg}
                onClick={() => setPage((p) => p + 1)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700 h-8">
                Keyingi →
              </Button>
            </div>
          )}
        </div>

        <NewCallModal
          open={!!callModal}
          onOpenChange={(v) => { if (!v) setCallModal(null); }}
          initialClient={callModal?.client}
          initialPurpose={callModal?.purpose}
          initialSegment={selectedSegment ?? undefined}
        />
      </>
    );
  }

  // ── Level 2: Province grid ───────────────────────────────────────────────
  if (selectedSegment && segMeta) {
    const provinces = segments?.[selectedSegment]?.provinces ?? [];
    const total     = segments?.[selectedSegment]?.total ?? 0;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={goBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${segMeta.icon}`}>
              <segMeta.Icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{segMeta.label}</h2>
              <p className="text-xs text-slate-500">Jami: {total} ta mijoz — viloyat tanlang</p>
            </div>
          </div>
        </div>

        {segLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : provinces.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <MapPin className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Bu segmentda mijozlar yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {provinces.map((prov) => (
              <button
                key={prov.name}
                onClick={() => selectProvince(prov.name)}
                className={`text-left bg-slate-800/50 border rounded-xl p-4 transition-all ${segMeta.border} hover:bg-slate-800`}>
                <div className="flex items-start justify-between mb-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                  <span className={`text-xl font-bold ${segMeta.count}`}>{fmt(prov.count)}</span>
                </div>
                <p className="text-sm font-medium text-white leading-tight">{prov.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">ta mijoz</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Level 1: Segment cards ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Mijoz segmenti tanlang</p>

      {segLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEGMENTS.map((seg) => {
            const total = segments?.[seg.key]?.total ?? 0;
            return (
              <button
                key={seg.key}
                onClick={() => selectSegment(seg.key)}
                className={`text-left bg-slate-800/50 border rounded-xl p-5 transition-all ${seg.border} hover:bg-slate-800`}>
                <div className={`inline-flex p-2.5 rounded-lg ${seg.icon} mb-4`}>
                  <seg.Icon className="h-5 w-5" />
                </div>
                <div className={`text-3xl font-bold mb-1 ${seg.count}`}>{fmt(total)}</div>
                <p className="text-sm font-semibold text-white">{seg.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{seg.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-400">
                  <span>Ko'rish</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
