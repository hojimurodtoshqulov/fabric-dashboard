"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Search, X, Loader2, Music } from "lucide-react";
import { CALL_MODE_LABELS, SEGMENT_TEMPLATE_TYPES } from "@/constants";

const PURPOSES = [
  { value: "DEBT_REMINDER", label: "Qarz eslatmasi" },
  { value: "REACTIVATION",  label: "Qayta jalb" },
  { value: "OFFER",         label: "Taklif" },
  { value: "FOLLOW_UP",     label: "Kuzatuv" },
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

const CALL_MODES = [
  { value: "TEMPLATE",   label: CALL_MODE_LABELS.TEMPLATE },
  { value: "AI_DYNAMIC", label: CALL_MODE_LABELS.AI_DYNAMIC },
];

export function NewCallModal({ open, onOpenChange, initialClient, initialPurpose, initialSegment }: Props) {
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [purpose, setPurpose] = useState("DEBT_REMINDER");
  const [callMode, setCallMode] = useState("TEMPLATE");
  const [voiceTemplateId, setVoiceTemplateId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedClient(initialClient ?? null);
    setPurpose(initialPurpose ?? "DEBT_REMINDER");
    setClientSearch("");
    setShowDropdown(false);
    setCallMode("TEMPLATE");
    setVoiceTemplateId("");
    setError("");
  }, [open, initialClient, initialPurpose]);

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

  const { data: searchData } = useQuery({
    queryKey: ["call-client-search", clientSearch],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`);
      const json = await res.json();
      return json.data as { clients: ClientHit[] };
    },
    enabled: clientSearch.length >= 2 && !selectedClient,
  });
  const suggestions = searchData?.clients ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Mijozni tanlang");
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  function handleClose() {
    onOpenChange(false);
    setClientSearch("");
    setSelectedClient(null);
    setShowDropdown(false);
    setPurpose("DEBT_REMINDER");
    setCallMode("TEMPLATE");
    setVoiceTemplateId("");
    setError("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="p-1.5 bg-purple-500/15 rounded-lg">
              <Phone className="h-4 w-4 text-purple-400" />
            </div>
            Yangi AI Qo'ng'iroq
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Client search */}
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

          {/* Call mode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
              Rejim
            </Label>
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

          {/* Template selector (only for TEMPLATE mode) */}
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
                    <SelectItem value="none" disabled className="text-slate-500">
                      Faol shablonlar yo'q
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
              Maqsad
            </Label>
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

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900/30">
          <Button variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9"
            onClick={handleClose} disabled={mutation.isPending}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => { setError(""); mutation.mutate(); }}
            disabled={mutation.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-5">
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Navbatga qo'yilmoqda...</>
            ) : (
              <><Phone className="h-4 w-4 mr-2" />Qo'ng'iroq boshlash</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
