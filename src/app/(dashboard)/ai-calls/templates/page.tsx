"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, LayoutTemplate, RefreshCw,
  Building2, AlertCircle, TrendingDown, Sparkles, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceTemplateCard } from "@/components/calls/voice-template-card";
import { VoiceTemplateModal } from "@/components/calls/voice-template-modal";
import { TEMPLATE_TYPE_SEGMENT } from "@/constants";

interface VoiceTemplate {
  id: string;
  name: string;
  type: string;
  title: string;
  description: string | null;
  audioFileUrl: string | null;
  isActive: boolean;
  dtmfConfig?: { keys: import("@/types").DtmfKey[] } | null;
  _count?: { calls: number };
}

const SEGMENT_META = [
  {
    key:   "doimiy",
    label: "Doimiy mijozlar",
    desc:  "Faol xaridorlarga taklif va eslatma shablonlari",
    Icon:  Building2,
    head:  "text-indigo-300",
    pill:  "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300",
    btn:   "border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10",
    defaultType: "BONUS_OFFER",
  },
  {
    key:   "qarzdor",
    label: "Qarzdor mijozlar",
    desc:  "Qarz eslatma va to'lovga undash shablonlari",
    Icon:  AlertCircle,
    head:  "text-amber-300",
    pill:  "bg-amber-500/10 border border-amber-500/20 text-amber-300",
    btn:   "border-amber-500/30 text-amber-300 hover:bg-amber-500/10",
    defaultType: "DEBT_OVERDUE",
  },
  {
    key:   "yoqotilgan",
    label: "Eski yo'qotilgan",
    desc:  "Bir vaqtlar xaridor bo'lgan, hozir aktiv emas",
    Icon:  TrendingDown,
    head:  "text-red-300",
    pill:  "bg-red-500/10 border border-red-500/20 text-red-300",
    btn:   "border-red-500/30 text-red-300 hover:bg-red-500/10",
    defaultType: "LOST_CLIENT_REACTIVATION",
  },
  {
    key:   "yangi",
    label: "Yangi mijozlar",
    desc:  "Hech qachon xaridor bo'lmagan, jalb qilish uchun",
    Icon:  Sparkles,
    head:  "text-emerald-300",
    pill:  "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300",
    btn:   "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10",
    defaultType: "PROSPECT_INTRO",
  },
  {
    key:   "umumiy",
    label: "Maxsus / Umumiy",
    desc:  "Istalgan segmentda ishlatish mumkin bo'lgan shablonlar",
    Icon:  Layers,
    head:  "text-slate-300",
    pill:  "bg-slate-700 border border-slate-600 text-slate-300",
    btn:   "border-slate-600 text-slate-300 hover:bg-slate-700",
    defaultType: "CUSTOM",
  },
] as const;

export default function VoiceTemplatesPage() {
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<VoiceTemplate | null>(null);
  const [initialType, setInitialType] = useState<string | undefined>();

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: { templates: VoiceTemplate[] } }>({
    queryKey: ["voice-templates"],
    queryFn: () => fetch("/api/voice-templates").then((r) => r.json()),
  });

  const templates = data?.data?.templates ?? [];

  function openEdit(t: VoiceTemplate) {
    setEditing(t);
    setInitialType(undefined);
    setModalOpen(true);
  }

  function openCreate(type?: string) {
    setEditing(null);
    setInitialType(type);
    setModalOpen(true);
  }

  const grouped = SEGMENT_META.map((seg) => ({
    ...seg,
    templates: templates.filter((t) => (TEMPLATE_TYPE_SEGMENT[t.type] ?? "umumiy") === seg.key),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ovoz shablonlari</h1>
          <p className="text-slate-400 text-sm mt-1">
            Segment bo'yicha guruhlangan avtomatik qo'ng'iroq shablonlari
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={() => openCreate()}>
            <Plus className="w-4 h-4" /> Shablon yaratish
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-400">Shablonlar yo'q</p>
          <p className="text-sm mt-1">Birinchi shablon yarating</p>
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={() => openCreate()}>
            <Plus className="w-4 h-4" /> Shablon yaratish
          </Button>
        </div>
      )}

      {!isLoading && templates.length > 0 && grouped.map((seg) => (
        <div key={seg.key}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <seg.Icon className={`w-4 h-4 ${seg.head}`} />
              <h2 className={`text-sm font-semibold ${seg.head}`}>{seg.label}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${seg.pill}`}>
                {seg.templates.length} ta
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 h-7 text-xs ${seg.btn}`}
              onClick={() => openCreate(seg.defaultType)}>
              <Plus className="w-3 h-3" /> Qo'shish
            </Button>
          </div>

          {seg.templates.length === 0 ? (
            <div className="border border-dashed border-slate-700/60 rounded-xl py-8 text-center">
              <p className="text-sm text-slate-600">{seg.desc} uchun shablon yo'q</p>
              <button
                onClick={() => openCreate(seg.defaultType)}
                className={`mt-2 text-xs ${seg.head} hover:underline`}>
                + Birinchi shablonni yarating
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {seg.templates.map((t) => (
                <VoiceTemplateCard key={t.id} template={t} onEdit={openEdit} />
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
