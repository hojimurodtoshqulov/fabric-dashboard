"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, MessageSquare, Eye, Search, Filter, Pencil } from "lucide-react";
import Link from "next/link";
import type { ClientStatus } from "@/constants";
import { EditClientModal, type ClientData } from "@/components/crm/edit-client-modal";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE:     { label: "Faol",         className: "bg-green-500/10 text-green-400 border-green-800" },
  INACTIVE:   { label: "Nofaol",       className: "bg-slate-500/10 text-slate-400 border-slate-700" },
  LOST:       { label: "Yo'qotilgan",  className: "bg-red-500/10 text-red-400 border-red-800" },
  DEBTOR:     { label: "Qarzdor",      className: "bg-yellow-500/10 text-yellow-400 border-yellow-800" },
  PROSPECT:   { label: "Potensial",    className: "bg-indigo-500/10 text-indigo-400 border-indigo-800" },
  COMPETITOR: { label: "Raqib",        className: "bg-pink-500/10 text-pink-400 border-pink-800" },
  RISK:       { label: "Xavfli",       className: "bg-orange-500/10 text-orange-400 border-orange-800" },
};

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  email: string | null;
  region: string | null;
  status: ClientStatus;
  notes?: string | null;
  segment: { name: string; color: string } | null;
  assignedTo: { name: string } | null;
  lastActivity: string | null;
  _count: { invoices: number; tasks: number };
};

interface ClientsTableProps {
  provinceKey?: string;
  exactRegion?: string;
}

export function ClientsTable({ provinceKey, exactRegion }: ClientsTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editClient, setEditClient] = useState<ClientData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", page, search, status, provinceKey, exactRegion],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (exactRegion) params.set("region", exactRegion);
      else if (provinceKey) params.set("province", provinceKey);
      const res = await fetch(`/api/clients?${params}`);
      const json = await res.json();
      return json.data as {
        clients: ClientRow[];
        total: number;
        totalPages: number;
      };
    },
  });

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-300">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Holat" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">Barcha</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Mijoz</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Telefon</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Holat</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Hudud</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Faktura</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Mas'ul</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 bg-slate-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : data?.clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Mijozlar topilmadi
                    </td>
                  </tr>
                ) : (
                  data?.clients.map((client) => (
                    <tr key={client.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{client.name}</p>
                        {client.company && (
                          <p className="text-slate-500 text-xs">{client.company}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                        {client.phone}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_CONFIG[client.status]?.className}>
                          {STATUS_CONFIG[client.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{client.region || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{client._count.invoices}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {client.assignedTo?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-400"
                            title="Tahrirlash"
                            onClick={() => setEditClient({
                              id: client.id,
                              name: client.name,
                              phone: client.phone,
                              company: client.company,
                              email: client.email,
                              region: client.region,
                              status: client.status,
                              notes: client.notes,
                            })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                            <a href={`tel:${client.phone}`}>
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" asChild>
                            <Link href={`/crm/clients/${client.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-slate-500 text-sm">Jami: {data.total} ta</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
                  disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Oldingi
                </Button>
                <span className="text-slate-400 text-sm py-1.5 px-2">{page} / {data.totalPages}</span>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
                  disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditClientModal
        client={editClient}
        open={editClient !== null}
        onOpenChange={(v) => { if (!v) setEditClient(null); }}
      />
    </>
  );
}
