"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  CreditCard,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Qoralama",        className: "border-slate-700 text-slate-400 bg-slate-800/50" },
  SENT:      { label: "Yuborilgan",      className: "border-blue-800 text-blue-400 bg-blue-950/40" },
  PAID:      { label: "To'langan",       className: "border-green-800 text-green-400 bg-green-950/40" },
  PARTIAL:   { label: "Qisman to'langan", className: "border-yellow-800 text-yellow-400 bg-yellow-950/40" },
  OVERDUE:   { label: "Muddati o'tgan", className: "border-red-800 text-red-400 bg-red-950/40" },
  CANCELLED: { label: "Bekor qilingan", className: "border-slate-700 text-slate-500 bg-slate-800/30" },
};

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Naqd",
  CARD:     "Karta",
  TRANSFER: "O'tkazma",
  OTHER:    "Boshqa",
};

interface InvoiceDetail {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  client: { id: string; name: string; phone: string; address: string | null };
  createdBy: { name: string };
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    createdAt: string;
  }>;
}

function fmt(n: number) {
  return Number(n).toLocaleString("uz-UZ");
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json.data as InvoiceDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-3">
        <p className="text-slate-400">Faktura topilmadi</p>
        <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.back()}>
          Orqaga
        </Button>
      </div>
    );
  }

  const inv = data;
  const remaining = Number(inv.total) - Number(inv.paid);
  const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">
                {inv.number}
              </h1>
              <Badge variant="outline" className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Yaratildi: {fmtDate(inv.createdAt)} · {inv.createdBy.name}
            </p>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Client */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Mijoz
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-white text-sm font-medium">{inv.client.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-slate-300 text-sm font-mono">{inv.client.phone}</span>
            </div>
            {inv.client.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="text-slate-400 text-sm">{inv.client.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Sanalar
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Calendar className="h-4 w-4" />
                Yaratilgan
              </div>
              <span className="text-white text-sm">{fmtDate(inv.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Calendar className="h-4 w-4" />
                Muddat
              </div>
              <span className={`text-sm font-medium ${inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "PAID" ? "text-red-400" : "text-white"}`}>
                {fmtDate(inv.dueDate)}
              </span>
            </div>
            {inv.paidAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  To'langan
                </div>
                <span className="text-green-400 text-sm">{fmtDate(inv.paidAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Moliya
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-200 font-mono tabular-nums">{fmt(inv.subtotal)} so'm</span>
            </div>
            {Number(inv.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Chegirma ({Number(inv.discount)}%)</span>
                <span className="text-red-400 font-mono tabular-nums">
                  −{fmt(Number(inv.subtotal) * Number(inv.discount) / 100)} so'm
                </span>
              </div>
            )}
            {Number(inv.tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">QQS ({Number(inv.tax)}%)</span>
                <span className="text-amber-400 font-mono tabular-nums">
                  +{fmt(Number(inv.total) - Number(inv.subtotal) * (1 - Number(inv.discount) / 100))} so'm
                </span>
              </div>
            )}
            <div className="h-px bg-slate-800 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-sm">Jami</span>
              <span className="text-indigo-400 font-bold font-mono tabular-nums">{fmt(inv.total)} so'm</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">To'langan</span>
              <span className="text-green-400 font-mono tabular-nums">{fmt(inv.paid)} so'm</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-red-400">Qoldiq</span>
                <span className="text-red-400 font-mono tabular-nums">{fmt(remaining)} so'm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="text-white font-medium text-sm">Mahsulotlar</h2>
          <span className="ml-auto text-slate-500 text-xs">{inv.items.length} ta qator</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40">
              <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Nomi</th>
              <th className="text-right px-4 py-2.5 text-slate-400 font-medium w-24">Miqdor</th>
              <th className="text-right px-4 py-2.5 text-slate-400 font-medium w-32">Narx</th>
              <th className="text-right px-4 py-2.5 text-slate-400 font-medium w-20">Ch%</th>
              <th className="text-right px-4 py-2.5 text-slate-400 font-medium w-32">Jami</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20">
                <td className="px-4 py-3">
                  <p className="text-white">{item.name}</p>
                  {item.description && (
                    <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                  {Number(item.quantity).toLocaleString("uz-UZ")}
                </td>
                <td className="px-4 py-3 text-right text-slate-300 font-mono tabular-nums">
                  {fmt(item.unitPrice)} so'm
                </td>
                <td className="px-4 py-3 text-right text-slate-400">
                  {Number(item.discount) > 0 ? `${Number(item.discount)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-white font-mono font-medium tabular-nums">
                  {fmt(item.total)} so'm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payments */}
      {inv.payments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <h2 className="text-white font-medium text-sm">To'lovlar</h2>
            <span className="ml-auto text-slate-500 text-xs">{inv.payments.length} ta</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40">
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Sana</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Usul</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Izoh</th>
                <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Summa</th>
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((pay) => (
                <tr key={pay.id} className="border-b border-slate-800/40 last:border-0">
                  <td className="px-4 py-3 text-slate-400">{fmtDate(pay.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-300">{METHOD_LABELS[pay.method] ?? pay.method}</td>
                  <td className="px-4 py-3 text-slate-500">{pay.reference || pay.notes || "—"}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-mono font-medium tabular-nums">
                    {fmt(pay.amount)} so'm
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {inv.notes && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Izoh</p>
          <p className="text-slate-300 text-sm">{inv.notes}</p>
        </div>
      )}
    </div>
  );
}
