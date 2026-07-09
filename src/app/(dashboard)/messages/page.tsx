"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle, Globe, Camera, Smartphone, MapPin, RefreshCw,
  Clock, Loader2, ChevronRight, ArrowLeft, UserPlus, CheckCircle,
  XCircle, Phone, User, StickyNote, Send, Search, Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

type LeadSource = "ALL" | "TELEGRAM" | "WEBSITE" | "INSTAGRAM";
type LeadStatus = "NEW" | "IN_PROGRESS" | "CLOSED" | "CONVERTED";
type TabKey     = LeadSource | "SMS";

interface Lead {
  id:         string;
  source:     Exclude<LeadSource, "ALL">;
  name:       string | null;
  phone:      string | null;
  province:   string | null;
  message:    string;
  status:     LeadStatus;
  notes:      string | null;
  createdAt:  string;
  client:     { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
}

interface SmsMessage {
  id:        string;
  to:        string;
  body:      string;
  status:    string;
  createdAt: string;
  client:    { name: string; phone: string } | null;
  sentBy:    { name: string } | null;
}

interface Stats {
  provinces:    Record<LeadSource, { name: string; count: number }[]>;
  statusTotals: Record<LeadStatus, number>;
}

// ── Config ───────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; Icon: React.ElementType; color: string }[] = [
  { key: "ALL",       label: "Barchasi",  Icon: MessageCircle, color: "text-slate-300"  },
  { key: "TELEGRAM",  label: "Telegram",  Icon: MessageCircle, color: "text-blue-400"   },
  { key: "WEBSITE",   label: "Website",   Icon: Globe,         color: "text-indigo-400" },
  { key: "INSTAGRAM", label: "Instagram", Icon: Camera,        color: "text-pink-400"   },
  { key: "SMS",       label: "SMS",       Icon: Smartphone,    color: "text-emerald-400"},
];

const STATUS_CFG: Record<LeadStatus, { label: string; cls: string }> = {
  NEW:         { label: "Yangi",     cls: "bg-blue-500/15 text-blue-300 border-blue-500/30"        },
  IN_PROGRESS: { label: "Jarayonda",cls: "bg-amber-500/15 text-amber-300 border-amber-500/30"    },
  CLOSED:      { label: "Yopilgan", cls: "bg-slate-600/50 text-slate-400 border-slate-600"        },
  CONVERTED:   { label: "Mijoz",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"},
};

const SMS_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Kutilmoqda", cls: "bg-slate-700 text-slate-400"           },
  SENT:      { label: "Yuborildi",  cls: "bg-blue-500/20 text-blue-300"          },
  DELIVERED: { label: "Yetkazildi", cls: "bg-emerald-500/20 text-emerald-300"    },
  FAILED:    { label: "Xato",       cls: "bg-red-500/20 text-red-400"            },
  READ:      { label: "O'qildi",    cls: "bg-indigo-500/20 text-indigo-300"      },
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  TELEGRAM:  { label: "Telegram",  cls: "bg-blue-500/15 text-blue-300"    },
  WEBSITE:   { label: "Website",   cls: "bg-indigo-500/15 text-indigo-300" },
  INSTAGRAM: { label: "Instagram", cls: "bg-pink-500/15 text-pink-300"    },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const qc = useQueryClient();
  const [tab,      setTab]      = useState<TabKey>("ALL");
  const [province, setProvince] = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data: statsData } = useQuery<{ data: Stats }>({
    queryKey:  ["leads-stats"],
    queryFn:   () => fetch("/api/leads/stats").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ data: { leads: Lead[]; total: number } }>({
    queryKey:  ["leads", tab, province, search],
    enabled:   tab !== "SMS",
    queryFn:   () => {
      const p = new URLSearchParams({ limit: "50" });
      if (tab !== "ALL") p.set("source", tab);
      if (province)      p.set("province", province);
      if (search)        p.set("search", search);
      return fetch(`/api/leads?${p}`).then((r) => r.json());
    },
    staleTime: 15_000,
  });

  const stats     = statsData?.data;
  const leads     = leadsData?.data?.leads ?? [];
  const total     = leadsData?.data?.total ?? 0;
  const provinces = tab !== "SMS" ? (stats?.provinces[tab as LeadSource] ?? []) : [];

  const updateLead = useMutation({
    mutationFn: ({ id, ...data }: Partial<Lead> & { id: string }) =>
      fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-stats"] });
      setSelected(null);
    },
  });

  function handleTabChange(key: TabKey) {
    setTab(key);
    setProvince(null);
    setSearch("");
    setSelected(null);
  }

  // ── Detail panel ──
  if (selected) {
    return (
      <LeadDetail
        lead={selected}
        onClose={() => setSelected(null)}
        onUpdate={(id, data) => updateLead.mutate({ id, ...data })}
        isPending={updateLead.isPending}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Xabarlar</h1>
          <p className="text-slate-400 text-sm mt-1">
            {tab === "SMS" ? "Mijozlarga yuborilgan SMS xabarlar" : "Telegram, Website va Instagram zayavkalari"}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"
          onClick={() => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["sms-messages"] }); qc.invalidateQueries({ queryKey: ["leads-stats"] }); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status totals — only for leads tabs */}
      {tab !== "SMS" && stats && (
        <div className="grid grid-cols-4 gap-3">
          {(["NEW", "IN_PROGRESS", "CONVERTED", "CLOSED"] as LeadStatus[]).map((s) => (
            <div key={s} className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{STATUS_CFG[s].label}</p>
              <p className="text-2xl font-bold text-white">{stats.statusTotals[s] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const cnt = t.key === "SMS" ? 0 : (stats?.provinces[t.key as LeadSource] ?? []).reduce((s, p) => s + p.count, 0);
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                tab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"
              }`}>
              <t.Icon className={`w-3.5 h-3.5 ${tab === t.key ? t.color : ""}`} />
              {t.label}
              {cnt > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-slate-600 text-slate-200" : "bg-slate-700 text-slate-500"
                }`}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* SMS Panel */}
      {tab === "SMS" && <SmsOutboxPanel qc={qc} />}

      {/* Leads Panel */}
      {tab !== "SMS" && (
        <>
          {/* Province grid */}
          {provinces.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button onClick={() => setProvince(null)}
                className={`text-left rounded-xl border p-3 transition-all ${!province ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Barchasi</span>
                </div>
                <p className="text-xl font-bold text-white">{provinces.reduce((s, p) => s + p.count, 0)}</p>
              </button>
              {provinces.map((prov) => (
                <button key={prov.name} onClick={() => setProvince(prov.name === province ? null : prov.name)}
                  className={`text-left rounded-xl border p-3 transition-all ${province === prov.name ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600"}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs text-slate-400 truncate">{prov.name}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{prov.count}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-700 rounded-xl py-6 text-center text-slate-600 text-sm">
              Bu kanalda hali zayavkalar yo'q
            </div>
          )}

          {/* Search */}
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki xabar bo'yicha qidirish..."
            className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500" />

          {/* Lead list */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/60">
              <p className="text-sm text-slate-400">
                {province ? `${province} — ` : ""}Jami: <span className="text-white font-medium">{total}</span> ta
              </p>
            </div>
            {leadsLoading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Yuklanmoqda...</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="py-16 text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                <p className="text-slate-500 text-sm">Zayavkalar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/40">
                {leads.map((lead) => (
                  <button key={lead.id} onClick={() => setSelected(lead)}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-700/30 transition-colors flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ background: lead.source === "TELEGRAM" ? "#60a5fa" : lead.source === "INSTAGRAM" ? "#f472b6" : "#818cf8" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{lead.name ?? lead.phone ?? "Noma'lum"}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_CFG[lead.status].cls}`}>{STATUS_CFG[lead.status].label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_BADGE[lead.source]?.cls}`}>{SOURCE_BADGE[lead.source]?.label}</span>
                        {lead.province && (
                          <span className="text-xs text-slate-500 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />{lead.province}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{lead.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{fmtDate(lead.createdAt)}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── SMS Outbox Panel ──────────────────────────────────────────────────────────

function SmsOutboxPanel({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [search,      setSearch]      = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const { data, isLoading } = useQuery<{ data: { messages: SmsMessage[]; total: number } }>({
    queryKey:  ["sms-messages", search],
    queryFn:   () => {
      const p = new URLSearchParams({ type: "SMS", limit: "50" });
      if (search) p.set("search", search);
      return fetch(`/api/messages?${p}`).then((r) => r.json());
    },
    staleTime: 15_000,
  });

  const messages = data?.data?.messages ?? [];
  const total    = data?.data?.total ?? 0;

  const sent    = messages.filter((m) => m.status === "SENT" || m.status === "DELIVERED").length;
  const failed  = messages.filter((m) => m.status === "FAILED").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Jami yuborilgan</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Muvaffaqiyatli</p>
          <p className="text-2xl font-bold text-emerald-400">{sent}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Xato</p>
          <p className="text-2xl font-bold text-red-400">{failed}</p>
        </div>
      </div>

      {/* Compose button + search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz yoki xabar qidirish..."
            className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500" />
        </div>
        <Button onClick={() => setShowCompose(true)} className="bg-emerald-600 hover:bg-emerald-500 gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Yangi SMS
        </Button>
      </div>

      {/* Compose modal */}
      {showCompose && <SmsComposeModal onClose={() => setShowCompose(false)} qc={qc} />}

      {/* SMS list */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-medium text-white">SMS tarixi</p>
          <span className="ml-auto text-xs text-slate-500">Jami: {total} ta</span>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <Smartphone className="h-10 w-10 mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">SMS xabarlar topilmadi</p>
            <button onClick={() => setShowCompose(true)}
              className="mt-3 text-xs text-emerald-400 hover:underline">
              + Birinchi SMS yuborish
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {["Mijoz", "Xabar", "Holat", "Yuborildi", "Sana"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{msg.client?.name ?? "—"}</p>
                    <p className="text-slate-500 text-xs font-mono">{msg.client?.phone ?? msg.to}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm max-w-xs">
                    <p className="truncate">{msg.body}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${SMS_STATUS[msg.status]?.cls ?? "bg-slate-700 text-slate-400"}`}>
                      {SMS_STATUS[msg.status]?.label ?? msg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{msg.sentBy?.name ?? "Tizim"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(msg.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── SMS Compose Modal ─────────────────────────────────────────────────────────

function SmsComposeModal({ onClose, qc }: { onClose: () => void; qc: ReturnType<typeof useQueryClient> }) {
  const [clientSearch,    setClientSearch]    = useState("");
  const [selectedClient,  setSelectedClient]  = useState<{ id: string; name: string; phone: string } | null>(null);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [messageText,     setMessageText]     = useState("");
  const [error,           setError]           = useState("");

  const { data: searchData } = useQuery({
    queryKey: ["sms-client-search", clientSearch],
    queryFn:  async () => {
      const r = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`);
      return r.json() as Promise<{ data: { clients: { id: string; name: string; phone: string }[] } }>;
    },
    enabled: clientSearch.length >= 2 && !selectedClient,
  });
  const suggestions = searchData?.data?.clients ?? [];

  const charCount = messageText.length;
  const smsCount  = Math.ceil(charCount / 160) || 1;

  const send = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Mijozni tanlang");
      if (!messageText.trim()) throw new Error("Xabar matnini kiriting");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel:  "SMS",
          msgType:  "NOTIFICATION",
          to:       selectedClient.phone,
          body:     messageText,
          clientId: selectedClient.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-messages"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/15 rounded-lg">
              <Smartphone className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="font-semibold text-white">Yangi SMS</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Client search */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Mijoz <span className="text-red-400">*</span>
            </label>
            {selectedClient ? (
              <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedClient.name}</p>
                  <p className="text-slate-500 text-xs font-mono">{selectedClient.phone}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="text-slate-500 hover:text-slate-300 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <Input value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
                  placeholder="Mijozni qidiring..."
                  className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-10" />
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-2xl overflow-hidden">
                    {suggestions.map((c) => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { setSelectedClient(c); setClientSearch(""); setShowDropdown(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-700/80 transition-colors border-b border-slate-700/30 last:border-0">
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-slate-500 text-xs font-mono">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Xabar matni <span className="text-red-400">*</span>
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              placeholder="SMS matnini kiriting..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{charCount} belgi</span>
              <span>{smsCount} SMS</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={send.isPending}
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 h-9">
            Bekor qilish
          </Button>
          <Button onClick={() => { setError(""); send.mutate(); }} disabled={send.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-9">
            {send.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yuborilmoqda...</>
              : <><Send className="h-4 w-4 mr-2" />Yuborish</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Lead Detail Panel ─────────────────────────────────────────────────────────

function LeadDetail({
  lead, onClose, onUpdate, isPending,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold text-white">Zayavka tafsilotlari</h1>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded border ${STATUS_CFG[lead.status].cls}`}>
          {STATUS_CFG[lead.status].label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${SOURCE_BADGE[lead.source]?.cls}`}>
          {SOURCE_BADGE[lead.source]?.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">Xabar</p>
            <p className="text-slate-200 leading-relaxed">{lead.message}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Izohlar
            </p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Izoh qo'shish..."
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-500" />
            <Button size="sm" variant="outline"
              disabled={isPending || notes === (lead.notes ?? "")}
              onClick={() => onUpdate(lead.id, { notes })}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8">
              Saqlash
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Murojaat qiluvchi</p>
            {lead.name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-500" /><span className="text-white">{lead.name}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-500" />
                <a href={`tel:${lead.phone}`} className="text-indigo-400 hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.province && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-500" /><span className="text-slate-300">{lead.province}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-slate-500" /><span className="text-slate-400">{fmtDate(lead.createdAt)}</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Holat</p>
            {lead.status === "NEW" && (
              <Button className="w-full bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-white h-9 transition-colors"
                disabled={isPending} onClick={() => onUpdate(lead.id, { status: "IN_PROGRESS" })}>
                <Loader2 className="h-4 w-4 mr-2" /> Jarayonga olish
              </Button>
            )}
            {(lead.status === "NEW" || lead.status === "IN_PROGRESS") && lead.phone && (
              <Button className="w-full bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white h-9 transition-colors"
                disabled={isPending} onClick={() => onUpdate(lead.id, { status: "CONVERTED" })}>
                <UserPlus className="h-4 w-4 mr-2" /> Mijozga aylantirish
              </Button>
            )}
            {lead.status !== "CLOSED" && lead.status !== "CONVERTED" && (
              <Button className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-white h-9 transition-colors"
                disabled={isPending} onClick={() => onUpdate(lead.id, { status: "CLOSED" })}>
                <XCircle className="h-4 w-4 mr-2" /> Yopish
              </Button>
            )}
            {lead.status === "CONVERTED" && (
              <div className="flex items-center gap-2 py-2 text-emerald-400 text-sm">
                <CheckCircle className="h-4 w-4" /> Mijozga aylantrilgan
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
