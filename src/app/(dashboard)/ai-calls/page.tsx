"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Building2, AlertCircle, TrendingDown, Sparkles, Layers,
  Plus, Music, LayoutTemplate, Pencil, Trash2, ToggleLeft, ToggleRight,
  Upload, Play, Pause, Phone, BarChart3,
} from "lucide-react";
import { SegmentDrillDown } from "@/components/calls/segment-drill-down";
import { NewCallModal } from "@/components/calls/new-call-modal";
import { CallResultsStats } from "@/components/calls/call-results-stats";
import { VoiceTemplateModal } from "@/components/calls/voice-template-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATE_TYPE_SEGMENT, VOICE_TEMPLATE_LABELS } from "@/constants";
import type { DtmfKey } from "@/types";

type VoiceTemplate = {
  id: string;
  name: string;
  type: string;
  title: string;
  description: string | null;
  audioFileUrl: string | null;
  isActive: boolean;
  dtmfConfig?: { keys: DtmfKey[] } | null;
  _count?: { calls: number };
};

const SEGMENT_META = [
  { key: "doimiy",     label: "Doimiy mijozlar",  Icon: Building2,  head: "text-indigo-300",  pill: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",  btn: "border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10",  defaultType: "BONUS_OFFER"            },
  { key: "qarzdor",    label: "Qarzdor mijozlar",  Icon: AlertCircle, head: "text-amber-300",   pill: "bg-amber-500/10 border-amber-500/20 text-amber-300",   btn: "border-amber-500/30 text-amber-300 hover:bg-amber-500/10",   defaultType: "DEBT_OVERDUE"           },
  { key: "yoqotilgan", label: "Eski yo'qotilgan",  Icon: TrendingDown,head: "text-red-300",     pill: "bg-red-500/10 border-red-500/20 text-red-300",         btn: "border-red-500/30 text-red-300 hover:bg-red-500/10",         defaultType: "LOST_CLIENT_REACTIVATION"},
  { key: "yangi",      label: "Yangi mijozlar",    Icon: Sparkles,   head: "text-emerald-300", pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",btn:"border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10",defaultType: "PROSPECT_INTRO"        },
  { key: "umumiy",     label: "Maxsus / Umumiy",   Icon: Layers,     head: "text-slate-300",   pill: "bg-slate-700 border-slate-600 text-slate-300",          btn: "border-slate-600 text-slate-300 hover:bg-slate-700",          defaultType: "CUSTOM"                },
] as const;

export default function AICallsPage() {
  const [callModalOpen, setCallModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Qo'ng'iroqlar</h1>
          <p className="text-slate-400 text-sm mt-1">Hybrid ovozli avtomatlashtirish tizimi</p>
        </div>
        <Button onClick={() => setCallModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
          <Phone className="mr-2 h-4 w-4" /> Qo'ng'iroq boshlash
        </Button>
      </div>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="calls" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <Phone className="w-3.5 h-3.5" /> Barcha qo'ng'iroqlar
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <LayoutTemplate className="w-3.5 h-3.5" /> Ovoz shablonlari
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Natijalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="mt-0">
          <SegmentDrillDown />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <InlineTemplateManager />
        </TabsContent>

        <TabsContent value="results" className="mt-0">
          <CallResultsStats />
        </TabsContent>
      </Tabs>

      <NewCallModal open={callModalOpen} onOpenChange={setCallModalOpen} />
    </div>
  );
}

// ── Inline template manager ─────────────────────────────────────────────────

function InlineTemplateManager() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<VoiceTemplate | null>(null);
  const [initialType, setInitialType] = useState<string | undefined>();

  const { data, isLoading } = useQuery<{ success: boolean; data: { templates: VoiceTemplate[] } }>({
    queryKey: ["voice-templates"],
    queryFn:  () => fetch("/api/voice-templates").then((r) => r.json()),
  });

  const templates = data?.data?.templates ?? [];

  const grouped = SEGMENT_META.map((seg) => ({
    ...seg,
    templates: templates.filter((t) => (TEMPLATE_TYPE_SEGMENT[t.type] ?? "umumiy") === seg.key),
  }));

  function openCreate(type?: string) {
    setEditing(null);
    setInitialType(type);
    setModalOpen(true);
  }

  function openEdit(t: VoiceTemplate) {
    setEditing(t);
    setInitialType(undefined);
    setModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={() => openCreate()}>
          <Plus className="w-4 h-4" /> Shablon yaratish
        </Button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-400">Shablonlar yo'q</p>
          <p className="text-sm mt-1">Har bir segment uchun ovoz shabloni yarating</p>
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={() => openCreate()}>
            <Plus className="w-4 h-4" /> Birinchi shablonni yaratish
          </Button>
        </div>
      )}

      {grouped.map((seg) => (
        <div key={seg.key}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <seg.Icon className={`w-4 h-4 ${seg.head}`} />
              <h2 className={`text-sm font-semibold ${seg.head}`}>{seg.label}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${seg.pill}`}>
                {seg.templates.length} ta
              </span>
            </div>
            <Button size="sm" variant="outline"
              className={`gap-1.5 h-7 text-xs border ${seg.btn}`}
              onClick={() => openCreate(seg.defaultType)}>
              <Plus className="w-3 h-3" /> Qo'shish
            </Button>
          </div>

          {seg.templates.length === 0 ? (
            <button
              onClick={() => openCreate(seg.defaultType)}
              className="w-full border border-dashed border-slate-700/60 rounded-xl py-6 text-slate-600 hover:text-slate-400 hover:border-slate-600 transition-colors text-sm">
              + {seg.label} uchun shablon qo'shish
            </button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {seg.templates.map((t) => (
                <MiniTemplateCard key={t.id} template={t} onEdit={openEdit} qc={qc} />
              ))}
            </div>
          )}
        </div>
      ))}

      <VoiceTemplateModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) { setEditing(null); setInitialType(undefined); } }}
        template={editing}
        initialType={initialType}
      />
    </div>
  );
}

// ── Mini template card ──────────────────────────────────────────────────────

function MiniTemplateCard({
  template, onEdit, qc,
}: {
  template: VoiceTemplate;
  onEdit: (t: VoiceTemplate) => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [playing, setPlaying]     = useState(false);
  const audioRef                  = useRef<HTMLAudioElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const toggleActive = useMutation({
    mutationFn: () =>
      fetch(`/api/voice-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voice-templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: () => fetch(`/api/voice-templates/${template.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voice-templates"] }),
  });

  function handlePlay() {
    if (!template.audioFileUrl) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      const audio = new Audio(template.audioFileUrl);
      audioRef.current = audio;
      audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  }

  async function handleUpload(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("audio", f);
    await fetch(`/api/voice-templates/${template.id}/upload`, { method: "POST", body: fd });
    qc.invalidateQueries({ queryKey: ["voice-templates"] });
    setUploading(false);
  }

  return (
    <div className={`bg-slate-800 rounded-xl border p-4 flex flex-col gap-3 transition-all ${template.isActive ? "border-slate-700" : "border-slate-700/40 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">{template.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{VOICE_TEMPLATE_LABELS[template.type] ?? template.type}</p>
          </div>
        </div>
        <Badge className={`shrink-0 ${template.isActive ? "bg-emerald-500/20 text-emerald-300 border-0" : "bg-slate-700 text-slate-400 border-0"}`}>
          {template.isActive ? "Faol" : "Nofaol"}
        </Badge>
      </div>

      {template.title && <p className="text-xs text-slate-400 leading-snug">{template.title}</p>}

      <div className="flex items-center gap-1.5 flex-wrap">
        {template.audioFileUrl ? (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1 h-7 text-xs" onClick={handlePlay}>
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? "To'xtat" : "Tinglash"}
          </Button>
        ) : (
          <label className="cursor-pointer">
            <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
            <span className={`inline-flex items-center gap-1 text-xs h-7 px-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="w-3 h-3" /> {uploading ? "Yuklanmoqda..." : "Audio yuklash"}
            </span>
          </label>
        )}
      </div>

      {template._count && (
        <p className="text-xs text-slate-600">{template._count.calls} ta qo'ng'iroqda ishlatilgan</p>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-slate-700">
        <button onClick={() => onEdit(template)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors">
          <Pencil className="w-3 h-3" /> Tahrirlash
        </button>
        <button onClick={() => toggleActive.mutate()} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors">
          {template.isActive
            ? <><ToggleRight className="w-3 h-3 text-emerald-400" /> O'chirish</>
            : <><ToggleLeft className="w-3 h-3" /> Yoqish</>}
        </button>
        <button
          onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteTemplate.mutate(); }}
          className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-3 h-3" /> O'chirish
        </button>
      </div>
    </div>
  );
}
