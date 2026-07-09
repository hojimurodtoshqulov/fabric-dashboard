"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Music, Play, Pause, Pencil, Trash2, Upload, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VOICE_TEMPLATE_LABELS } from "@/constants";

interface VoiceTemplate {
  id: string;
  name: string;
  type: string;
  title: string;
  description: string | null;
  audioFileUrl: string | null;
  isActive: boolean;
  _count?: { calls: number };
}

interface Props {
  template: VoiceTemplate;
  onEdit: (t: VoiceTemplate) => void;
}

export function VoiceTemplateCard({ template, onEdit }: Props) {
  const qc = useQueryClient();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const uploadAudio = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("audio", file);
      return fetch(`/api/voice-templates/${template.id}/upload`, { method: "POST", body: fd }).then((r) => r.json());
    },
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

  return (
    <div className={`bg-slate-800 rounded-xl border p-5 flex flex-col gap-4 transition-all ${template.isActive ? "border-slate-700" : "border-slate-700/40 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{template.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{VOICE_TEMPLATE_LABELS[template.type] ?? template.type}</p>
          </div>
        </div>
        <Badge className={template.isActive ? "bg-emerald-500/20 text-emerald-300 border-0" : "bg-slate-700 text-slate-400 border-0"}>
          {template.isActive ? "Faol" : "Nofaol"}
        </Badge>
      </div>

      {template.title && (
        <p className="text-sm text-slate-300 leading-snug">{template.title}</p>
      )}
      {template.description && (
        <p className="text-xs text-slate-500">{template.description}</p>
      )}

      {/* Audio preview */}
      <div className="flex items-center gap-2">
        {template.audioFileUrl ? (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5" onClick={handlePlay}>
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? "To'xtatish" : "Tinglash"}
          </Button>
        ) : (
          <span className="text-xs text-slate-500 italic">Audio yuklanmagan</span>
        )}
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> Audio yuklash
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/ogg,audio/m4a"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAudio.mutate(f);
          }}
        />
      </div>

      {template._count && (
        <p className="text-xs text-slate-500">{template._count.calls} ta qo'ng'iroqda ishlatilgan</p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1" onClick={() => onEdit(template)}>
          <Pencil className="w-3.5 h-3.5" /> Tahrirlash
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1" onClick={() => toggleActive.mutate()}>
          {template.isActive
            ? <><ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> O'chirish</>
            : <><ToggleLeft className="w-3.5 h-3.5" /> Yoqish</>}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
          onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteTemplate.mutate(); }}
        >
          <Trash2 className="w-3.5 h-3.5" /> O'chirish
        </Button>
      </div>
    </div>
  );
}
