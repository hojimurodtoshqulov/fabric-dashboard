"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutTemplate, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceTemplateCard } from "@/components/calls/voice-template-card";
import { VoiceTemplateModal } from "@/components/calls/voice-template-modal";

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

export default function VoiceTemplatesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<VoiceTemplate | null>(null);

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: { templates: VoiceTemplate[] } }>({
    queryKey: ["voice-templates"],
    queryFn: () => fetch("/api/voice-templates").then((r) => r.json()),
  });

  const templates = data?.data?.templates ?? [];
  const active    = templates.filter((t) => t.isActive);
  const inactive  = templates.filter((t) => !t.isActive);

  function openEdit(t: VoiceTemplate) {
    setEditing(t);
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ovoz shablonlari</h1>
          <p className="text-slate-400 text-sm mt-1">
            Avtomatik qo'ng'iroqlar uchun oldindan yozilgan audio shablonlar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={openCreate}>
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
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-500 gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Shablon yaratish
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Faol shablonlar ({active.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((t) => (
              <VoiceTemplateCard key={t.id} template={t} onEdit={openEdit} />
            ))}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Nofaol shablonlar ({inactive.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inactive.map((t) => (
              <VoiceTemplateCard key={t.id} template={t} onEdit={openEdit} />
            ))}
          </div>
        </div>
      )}

      <VoiceTemplateModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        template={editing}
      />
    </div>
  );
}
