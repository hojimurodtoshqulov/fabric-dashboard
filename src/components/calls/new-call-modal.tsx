"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Search, X, Loader2, Music, Users, User } from "lucide-react";
import { CALL_MODE_LABELS, SEGMENT_TEMPLATE_TYPES } from "@/constants";

const PURPOSES = [
  { value: "DEBT_REMINDER", label: "Qarz eslatmasi" },
  { value: "REACTIVATION",  label: "Qayta jalb" },
  { value: "OFFER",         label: "Taklif" },
  { value: "FOLLOW_UP",     label: "Kuzatuv" },
];

const SEGMENTS = [
  { value: "DEBTOR",   label: "Qarzdor mijozlar" },
  { value: "ACTIVE",   label: "Faol mijozlar" },
  { value: "INACTIVE", label: "Eski mijozlar" },
  { value: "ALL",      label: "Barcha mijozlar" },
];

const CALL_MODES = [
  { value: "TEMPLATE",   label: CALL_MODE_LABELS.TEMPLATE },
  { value: "AI_DYNAMIC", label: CALL_MODE_LABELS.AI_DYNAMIC },
];

interface ClientHit { id: string; name: string; phone: string }
interface TemplateSummary { id: string; name: string; type: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialClient?: { id: string; name: string; phone: string };
  initialPurpose?: string;
  initialSegment?: string;
}

export function NewCallModal({ open, onOpenChange, initialClient, initialPurpose, initialSegment }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"single" | "bulk">("single");

  // ── Single tab state ─────────────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [purpose, setPurpose] = useState("DEBT_REMINDER");
  const [callMode, setCallMode] = useState("TEMPLATE");
  const [voiceTemplateId, setVoiceTemplateId] = useState("");
  const [error, setError] = useState("");

  // ── Bulk tab state ───────────────────────────────────────────────────────────
  const [bulkSegment, setBulkSegment] = useState("DEBTOR");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPurpose, setBulkPurpose] = useState("DEBT_REMINDER");
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setTab("single");
    setSelectedClient(initialClient ?? null);
    setPurpose(initialPurpose ?? "DEBT_REMINDER");
    setClientSearch(""); setShowDropdown(false);
    setCallMode("TEMPLATE"); setVoiceTemplateId(""); setError("");
    setSelectedIds(new Set()); setBulkProgress(null); setBulkRunning(false);
    abortRef.current = false;
  }, [open, initialClient, initialPurpose]);

  // ── Templates ────────────────────────────────────────────────────────────────
  const { data: templatesData } = useQuery({
    queryKey: ["voice-templates"],
    queryFn: () => fetch("/api/voice-templates").then((r) => r.json()),
    enabled: open,
    staleTime: 60_000,
  });
  const allowedTypes = initialSegment ? SEGMENT_TEMPLATE_TYPES[initialSegment] : null;
  const templates: TemplateSummary[] = (templatesData?.data?.templates ?? [])
    .filter((t: { isActive: boolean; type: string }) =>
      t.isActive && (!allowedTypes || allowedTypes.includes(t.type))
    );

  // ── Single: client search ────────────────────────────────────────────────────
  const { data: searchData } = useQuery({
    queryKey: ["call-client-search", clientSearch],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`);
      return (await res.json()).data as { clients: ClientHit[] };
    },
    enabled: clientSearch.length >= 2 && !selectedClient && tab === "single",
  });
  const suggestions = searchData?.clients ?? [];

  // ── Bulk: fetch by segment ───────────────────────────────────────────────────
  const { data: bulkClientsRaw, isFetching: bulkLoading } = useQuery({
    queryKey: ["bulk-clients", bulkSegment],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (bulkSegment !== "ALL") params.set("status", bulkSegment);
      const res = await fetch(`/api/clients?${params}`);
      return ((await res.json()).data?.clients ?? []) as ClientHit[];
    },
    enabled: open && tab === "bulk",
    staleTime: 30_000,
  });
  const bulkClients = (bulkClientsRaw ?? []).filter((c) => c.phone);
  const allSelected = bulkClients.length > 0 && selectedIds.size === bulkClients.length;

  function toggleClient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(bulkClients.map((c) => c.id)));
  }

  // ── Single mutation (with 30s timeout so it can't get stuck) ─────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Mijozni tanlang");
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          clientId: selectedClient.id,
          purpose,
          callMode,
          voiceTemplateId: callMode === "TEMPLATE" && voiceTemplateId ? voiceTemplateId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  // ── Bulk calling ─────────────────────────────────────────────────────────────
  async function handleBulkCall() {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    abortRef.current = false;
    setBulkProgress({ done: 0, total: selectedIds.size });
    let done = 0;
    for (const clientId of selectedIds) {
      if (abortRef.current) break;
      try {
        await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            clientId,
            purpose: bulkPurpose,
            callMode: "TEMPLATE",
            voiceTemplateId: bulkTemplateId || undefined,
          }),
        });
      } catch { /* continue even if one fails */ }
      done++;
      setBulkProgress({ done, total: selectedIds.size });
    }
    queryClient.invalidateQueries({ queryKey: ["calls"] });
    setBulkRunning(false);
    if (!abortRef.current) setTimeout(() => handleClose(), 1500);
  }

  function handleClose() {
    abortRef.current = true;
    onOpenChange(false);
    setClientSearch(""); setSelectedClient(null); setShowDropdown(false);
    setPurpose("DEBT_REMINDER"); setCallMode("TEMPLATE"); setVoiceTemplateId(""); setError("");
    setBulkProgress(null); setBulkRunning(false); setSelectedIds(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="p-1.5 bg-purple-500/15 rounded-lg">
              <Phone className="h-4 w-4 text-purple-400" />
            </div>
            Yangi AI Qo&apos;ng&apos;iroq
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {[
            { key: "single", label: "Yakka", icon: User },
            { key: "bulk",   label: "Guruh", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button"
              onClick={() => setTab(key as "single" | "bulk")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                ${tab === key
                  ? "text-purple-400 border-b-2 border-purple-500"
                  : "text-slate-500 hover:text-slate-300"}`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "single" ? (
          /* ── Single tab ─────────────────────────────────────────────── */
          <div className="px-6 py-5 space-y-4">
            {/* Mijoz */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Mijoz <span className="text-red-400 normal-case">*</span>
              </Label>
              <div className="relative">
                {selectedClient ? (
                  <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{selectedClient.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{selectedClient.phone}</p>
                    </div>
                    <button type="button"
                      onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                      className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
                      placeholder="Mijozni qidiring..."
                      className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
                    />
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
                  </>
                )}
              </div>
            </div>

            {/* Rejim */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">Rejim</Label>
              <Select value={callMode} onValueChange={setCallMode}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {CALL_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-white focus:bg-slate-700">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {callMode === "TEMPLATE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Music className="w-3 h-3" /> Ovoz shabloni
                </Label>
                <Select value={voiceTemplateId} onValueChange={setVoiceTemplateId}>
                  <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                    <SelectValue placeholder="Shablon tanlang (ixtiyoriy)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-white focus:bg-slate-700">
                        {t.name}
                      </SelectItem>
                    ))}
                    {templates.length === 0 && (
                      <SelectItem value="none" disabled className="text-slate-500">Faol shablonlar yo&apos;q</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Maqsad */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">Maqsad</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-white focus:bg-slate-700">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        ) : (
          /* ── Bulk tab ────────────────────────────────────────────────── */
          <div className="px-6 py-5 space-y-4">
            {/* Segment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">Segment</Label>
              <Select value={bulkSegment} onValueChange={(v) => { setBulkSegment(v); setSelectedIds(new Set()); }}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white focus:bg-slate-700">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client list */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Mijozlar {!bulkLoading && bulkClients.length > 0 && `(${bulkClients.length} ta)`}
                </Label>
                {bulkClients.length > 0 && !bulkLoading && (
                  <button type="button" onClick={toggleAll}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    {allSelected ? "Barchasini bekor" : "Hammasini tanlash"}
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/40">
                {bulkLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  </div>
                ) : bulkClients.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Mijozlar topilmadi</p>
                ) : (
                  bulkClients.map((c) => {
                    const checked = selectedIds.has(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleClient(c.id)}
                        disabled={bulkRunning}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-b border-slate-700/30 last:border-0 text-left
                          ${checked ? "bg-purple-500/10 hover:bg-purple-500/15" : "hover:bg-slate-700/50"}`}>
                        <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${checked ? "bg-purple-600 border-purple-600" : "border-slate-600"}`}>
                          {checked && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{c.name}</p>
                          <p className="text-slate-500 text-xs font-mono">{c.phone}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedIds.size > 0 && (
                <p className="text-xs text-purple-400">{selectedIds.size} ta tanlandi</p>
              )}
            </div>

            {/* Template */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Music className="w-3 h-3" /> Ovoz shabloni
              </Label>
              <Select value={bulkTemplateId} onValueChange={setBulkTemplateId}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                  <SelectValue placeholder="Shablon tanlang (ixtiyoriy)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-white focus:bg-slate-700">
                      {t.name}
                    </SelectItem>
                  ))}
                  {templates.length === 0 && (
                    <SelectItem value="none" disabled className="text-slate-500">Faol shablonlar yo&apos;q</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Maqsad */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">Maqsad</Label>
              <Select value={bulkPurpose} onValueChange={setBulkPurpose}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-white focus:bg-slate-700">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Progress bar */}
            {bulkProgress && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  {bulkProgress.done < bulkProgress.total ? (
                    <span className="text-slate-300 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Navbatga qo&apos;yilmoqda...
                    </span>
                  ) : (
                    <span className="text-green-400">✓ Hammasi navbatga qo&apos;yildi!</span>
                  )}
                  <span className="text-purple-400 font-medium tabular-nums">
                    {bulkProgress.done}/{bulkProgress.total}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900/30">
          <Button variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9"
            onClick={handleClose}
            disabled={mutation.isPending || bulkRunning}>
            Bekor qilish
          </Button>

          {tab === "single" ? (
            <Button
              onClick={() => { setError(""); mutation.mutate(); }}
              disabled={!selectedClient || mutation.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-5">
              {mutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Navbatga qo&apos;yilmoqda...</>
                : <><Phone className="h-4 w-4 mr-2" />Qo&apos;ng&apos;iroq boshlash</>}
            </Button>
          ) : (
            <Button
              onClick={handleBulkCall}
              disabled={selectedIds.size === 0 || bulkRunning}
              className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-5">
              {bulkRunning
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yuborilmoqda...</>
                : <><Phone className="h-4 w-4 mr-2" />Qo&apos;ng&apos;iroq ({selectedIds.size} ta)</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
