"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditClientModal, type ClientData } from "@/components/crm/edit-client-modal";
import {
  ArrowLeft, Pencil, Phone, Mail, Building2, MapPin,
  FileText, PhoneCall, CheckSquare, AlertTriangle,
  Calendar, TrendingUp,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE:     { label: "Faol",         className: "bg-green-500/10 text-green-400 border-green-800" },
  INACTIVE:   { label: "Nofaol",       className: "bg-slate-500/10 text-slate-400 border-slate-700" },
  LOST:       { label: "Yo'qotilgan",  className: "bg-red-500/10 text-red-400 border-red-800" },
  DEBTOR:     { label: "Qarzdor",      className: "bg-yellow-500/10 text-yellow-400 border-yellow-800" },
  PROSPECT:   { label: "Potensial",    className: "bg-indigo-500/10 text-indigo-400 border-indigo-800" },
  COMPETITOR: { label: "Raqib",        className: "bg-pink-500/10 text-pink-400 border-pink-800" },
  RISK:       { label: "Xavfli",       className: "bg-orange-500/10 text-orange-400 border-orange-800" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Qoralama",         color: "text-slate-400" },
  SENT:      { label: "Yuborilgan",        color: "text-blue-400" },
  PAID:      { label: "To'langan",         color: "text-green-400" },
  PARTIAL:   { label: "Qisman",           color: "text-yellow-400" },
  OVERDUE:   { label: "Muddati o'tgan",   color: "text-red-400" },
  CANCELLED: { label: "Bekor",            color: "text-slate-500" },
};

const TASK_PRIORITY: Record<string, string> = {
  LOW: "text-slate-400", MEDIUM: "text-blue-400",
  HIGH: "text-orange-400", URGENT: "text-red-400",
};

interface Invoice {
  id: string; number: string; status: string;
  total: string | number; paid: string | number;
  dueDate: string | null; createdAt: string;
}
interface Call {
  id: string; status: string; purpose: string;
  duration: number | null; createdAt: string;
}
interface Task {
  id: string; title: string; status: string;
  priority: string; dueDate: string | null;
  assignedTo: { name: string } | null;
}
interface Debt {
  id: string; status: string;
  amount: string | number; paidAmount: string | number; dueDate: string;
}

interface Client {
  id: string; name: string; phone: string;
  company: string | null; email: string | null;
  region: string | null; status: string;
  notes: string | null; createdAt: string;
  segment: { name: string; color: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { invoices: number; tasks: number; calls: number; messages: number };
}

interface Props {
  client: Client;
  invoices: Invoice[];
  calls: Call[];
  tasks: Task[];
  debts: Debt[];
}

export function ClientDetailView({ client, invoices, calls, tasks, debts }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const totalDebt = debts
    .filter(d => d.status !== "PAID" && d.status !== "WRITTEN_OFF")
    .reduce((s, d) => s + Number(d.amount) - Number(d.paidAmount), 0);

  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);

  const editData: ClientData = {
    id: client.id, name: client.name, phone: client.phone,
    company: client.company, email: client.email,
    region: client.region, status: client.status, notes: client.notes,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white truncate">{client.name}</h1>
            <Badge variant="outline" className={STATUS_CONFIG[client.status]?.className}>
              {STATUS_CONFIG[client.status]?.label}
            </Badge>
            {client.segment && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${client.segment.color}20`, color: client.segment.color, border: `1px solid ${client.segment.color}60` }}>
                {client.segment.name}
              </span>
            )}
          </div>
          {client.company && <p className="text-slate-400 text-sm mt-0.5">{client.company}</p>}
        </div>
        <Button onClick={() => setEditOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0">
          <Pencil className="h-4 w-4 mr-2" /> Tahrirlash
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Jami faktura", value: `${totalInvoiced.toLocaleString()} so'm`, icon: FileText, color: "text-blue-400", bg: "bg-blue-900/20" },
          { label: "To'langan", value: `${totalPaid.toLocaleString()} so'm`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-900/20" },
          { label: "Qarz", value: totalDebt > 0 ? `${totalDebt.toLocaleString()} so'm` : "Yo'q", icon: AlertTriangle, color: totalDebt > 0 ? "text-red-400" : "text-slate-500", bg: totalDebt > 0 ? "bg-red-900/20" : "bg-slate-800/50" },
          { label: "Qo'ng'iroqlar", value: String(client._count.calls), icon: PhoneCall, color: "text-purple-400", bg: "bg-purple-900/20" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-slate-400 text-xs">{stat.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Contact info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4">Aloqa ma'lumotlari</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-500 shrink-0" />
              <a href={`tel:${client.phone}`} className="text-indigo-400 hover:text-indigo-300 font-mono text-sm">
                {client.phone}
              </a>
            </div>
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                <a href={`mailto:${client.email}`} className="text-slate-300 text-sm truncate hover:text-white">
                  {client.email}
                </a>
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="text-slate-300 text-sm">{client.company}</span>
              </div>
            )}
            {client.region && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="text-slate-300 text-sm">{client.region}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-slate-500 text-xs">
                Qo'shildi: {new Date(client.createdAt).toLocaleDateString("uz-UZ")}
              </span>
            </div>
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-500 text-xs mb-1">Izoh</p>
              <p className="text-slate-300 text-sm leading-relaxed">{client.notes}</p>
            </div>
          )}
          {client.assignedTo && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-500 text-xs mb-1">Mas'ul xodim</p>
              <p className="text-slate-300 text-sm">{client.assignedTo.name}</p>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" /> Fakturalar
            </h3>
            <span className="text-slate-500 text-xs">Jami: {client._count.invoices}</span>
          </div>
          {invoices.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-6">Fakturalar yo'q</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-indigo-400 text-xs font-mono">{inv.number}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("uz-UZ") : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">{Number(inv.total).toLocaleString()} so'm</p>
                    <p className={`text-xs ${INVOICE_STATUS[inv.status]?.color}`}>
                      {INVOICE_STATUS[inv.status]?.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-yellow-400" /> Vazifalar
            </h3>
            <span className="text-slate-500 text-xs">Jami: {client._count.tasks}</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">Vazifalar yo'q</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start justify-between p-2.5 bg-slate-800/50 rounded-lg gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${task.status === "DONE" ? "line-through text-slate-500" : "text-white"}`}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(task.dueDate).toLocaleDateString("uz-UZ")}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs shrink-0 ${TASK_PRIORITY[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-purple-400" /> AI Qo'ng'iroqlar
            </h3>
            <span className="text-slate-500 text-xs">Jami: {client._count.calls}</span>
          </div>
          {calls.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">Qo'ng'iroqlar yo'q</p>
          ) : (
            <div className="space-y-2">
              {calls.map(call => (
                <div key={call.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-slate-300 text-xs">{call.purpose.replace(/_/g, " ")}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(call.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${call.status === "COMPLETED" ? "text-green-400" : call.status === "FAILED" ? "text-red-400" : "text-slate-400"}`}>
                      {call.status}
                    </p>
                    {call.duration && (
                      <p className="text-slate-500 text-xs">{call.duration}s</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditClientModal
        client={editData}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
