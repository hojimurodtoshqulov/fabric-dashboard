"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Play, Pause, Volume2, X, Music, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VOICE_TEMPLATE_LABELS } from "@/constants";
import type { DtmfKey } from "@/types";

const SEGMENT_GROUPS = [
  { label: "Doimiy mijozlar",  types: ["BONUS_OFFER", "NEW_CAMPAIGN", "PAYMENT_CONFIRMATION"] },
  { label: "Qarzdor mijozlar", types: ["DEBT_DUE_SOON", "DEBT_OVERDUE"] },
  { label: "Eski yo'qotilgan", types: ["LOST_CLIENT_REACTIVATION"] },
  { label: "Yangi mijozlar",   types: ["PROSPECT_INTRO"] },
  { label: "Maxsus / Umumiy",  types: ["CUSTOM"] },
];

const DTMF_ACTIONS = [
  { value: "confirm_payment",  label: "To'lovni tasdiqlash" },
  { value: "promise_pay",      label: "To'lashga va'da" },
  { value: "callback",         label: "Qayta qo'ng'iroq" },
  { value: "interested",       label: "Qiziqish bildirdi" },
  { value: "not_interested",   label: "Qiziqmadi" },
  { value: "transfer_manager", label: "Menejerga ulash" },
  { value: "custom",           label: "Boshqa" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: {
    id: string; name: string; type: string; title: string;
    description: string | null; audioFileUrl: string | null;
    isActive: boolean; dtmfConfig?: { keys: DtmfKey[] } | null;
    sendSmsAfterCall?: boolean; smsText?: string | null;
  } | null;
  initialType?: string;
}

// ─── Audio Player ─────────────────────────────────────────────────────────────
function AudioPreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
      <audio
        ref={ref}
        src={url}
        onTimeUpdate={() => setProgress(ref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(ref.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
        <Volume2 className="h-4 w-4 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 truncate">{url.split("/").pop()}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">{fmt(progress)} / {fmt(duration)}</span>
        </div>
      </div>
      <button onClick={toggle}
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors shrink-0">
        {playing
          ? <Pause className="h-3.5 w-3.5 text-white" />
          : <Play  className="h-3.5 w-3.5 text-white ml-0.5" />}
      </button>
      <button onClick={onRemove}
        className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-colors shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
export function VoiceTemplateModal({ open, onOpenChange, template, initialType }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(template);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]           = useState("");
  const [type, setType]           = useState("CUSTOM");
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState("");
  const [dtmfKeys, setDtmfKeys]     = useState<DtmfKey[]>([]);
  const [sendSms, setSendSms]       = useState(false);
  const [smsText, setSmsText]       = useState("");

  const SMS_OFF_TYPES = ["DEBT_DUE_SOON", "DEBT_OVERDUE"];
  const DEFAULT_SMS = "Assalomu alaykum, {name}! Bizning rasmiy saytimiz: https://selxozmash.uz — mahsulotlar bilan tanishing.";

  useEffect(() => {
    if (template) {
      setName(template.name); setType(template.type);
      setTitle(template.title); setDesc(template.description ?? "");
      setAudioUrl(template.audioFileUrl ?? null);
      setDtmfKeys(template.dtmfConfig?.keys ?? []);
      setSendSms(template.sendSmsAfterCall ?? false);
      setSmsText(template.smsText ?? DEFAULT_SMS);
    } else {
      const t = initialType ?? "CUSTOM";
      setName(""); setType(t);
      setTitle(""); setDesc(""); setAudioUrl(null); setDtmfKeys([]);
      setSendSms(!SMS_OFF_TYPES.includes(t));
      setSmsText(DEFAULT_SMS);
    }
    setUploadErr("");
  }, [template, open, initialType]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAudioUrl(json.url);
    } catch (err: any) {
      setUploadErr(err.message ?? "Yuklab bo'lmadi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name, type, title,
        description: description || undefined,
        audioFileUrl: audioUrl ?? null,
        dtmfConfig: dtmfKeys.length > 0 ? { keys: dtmfKeys } : null,
        sendSmsAfterCall: sendSms,
        smsText: sendSms ? smsText : null,
      };
      const url    = isEdit ? `/api/voice-templates/${template!.id}` : "/api/voice-templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Saqlashda xatolik");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["voice-templates"] }); onOpenChange(false); },
  });

  function addDtmfKey() { setDtmfKeys(p => [...p, { key: String(p.length + 1), label: "" }]); }
  function removeDtmfKey(i: number) { setDtmfKeys(p => p.filter((_, idx) => idx !== i)); }
  function updateDtmfKey(i: number, field: keyof DtmfKey, value: string) {
    setDtmfKeys(p => p.map((k, idx) => idx === i ? { ...k, [field]: value } : k));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700/80 text-white max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Shablonni tahrirlash" : "Yangi shablon yaratish"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">

          {/* Nomi + Turi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">Nomi *</Label>
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="Shablon nomi"
                className="bg-slate-800 border-slate-700 focus:border-indigo-500 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">Turi *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 focus:border-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {SEGMENT_GROUPS.map(grp => (
                    <SelectGroup key={grp.label}>
                      <div className="px-2 py-1 text-xs font-semibold text-slate-500 select-none">{grp.label}</div>
                      {grp.types.map(v => (
                        <SelectItem key={v} value={v} className="text-white focus:bg-slate-700">
                          {VOICE_TEMPLATE_LABELS[v] ?? v}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sarlavha */}
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Sarlavha *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Qo'ng'iroq sarlavhasi (mijozga eshittiriladi)"
              className="bg-slate-800 border-slate-700 focus:border-indigo-500 text-white" />
          </div>

          {/* Tavsif */}
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Tavsif</Label>
            <Textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Shablon haqida izoh..."
              rows={2} className="bg-slate-800 border-slate-700 focus:border-indigo-500 text-white resize-none min-h-0 h-16" />
          </div>

          {/* Audio fayl */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-300">Ovoz fayli</Label>
              {!audioUrl && <span className="text-xs text-slate-500">mp3, wav, ogg · max 20MB</span>}
            </div>
            {audioUrl ? (
              <AudioPreview url={audioUrl} onRemove={() => setAudioUrl(null)} />
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-colors disabled:opacity-50">
                {uploading
                  ? <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  : <Music className="h-4 w-4 text-slate-500" />}
                <span className="text-sm text-slate-400">
                  {uploading ? "Yuklanmoqda..." : "Audio fayl yuklash"}
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            {uploadErr && <p className="text-xs text-red-400">{uploadErr}</p>}
          </div>

          {/* SMS after call */}
          <div className="rounded-xl border border-slate-700/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Qo'ng'iroqdan keyin SMS</span>
              </div>
              <button
                type="button"
                onClick={() => setSendSms(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent overflow-hidden transition-colors duration-200 ${sendSms ? "bg-green-600" : "bg-slate-600"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${sendSms ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {sendSms && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-slate-500">
                  Qo'ng'iroq muvaffaqiyatli bo'lganda yuboriladi.{" "}
                  <code className="text-indigo-400">{"{name}"}</code> — mijoz ismi.
                </p>
                <Textarea
                  value={smsText}
                  onChange={e => setSmsText(e.target.value)}
                  rows={2}
                  placeholder="SMS matni..."
                  className="bg-slate-800 border-slate-700 focus:border-indigo-500 text-white text-sm resize-none min-h-0 h-16"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{smsText.length} belgi</span>
                  <button type="button" onClick={() => setSendSms(false)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                    <X className="h-3 w-3" /> O'chirish
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DTMF */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-300">DTMF tugmalari</Label>
              <Button size="sm" variant="ghost"
                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1 h-7 text-xs"
                onClick={addDtmfKey}>
                <Plus className="w-3.5 h-3.5" /> Qo'shish
              </Button>
            </div>

            {dtmfKeys.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">
                Raqam bosganda amal bajarish uchun qo'shing.
              </p>
            ) : (
              <div className="space-y-2">
                {dtmfKeys.map((k, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {k.key}
                    </div>
                    <Input
                      value={k.label}
                      onChange={e => updateDtmfKey(i, "label", e.target.value)}
                      placeholder="Tugma tavsifi"
                      className="bg-slate-700/60 border-slate-600 text-sm flex-1 h-8"
                    />
                    <Select value={k.action ?? "custom"} onValueChange={v => updateDtmfKey(i, "action", v)}>
                      <SelectTrigger className="w-40 bg-slate-700/60 border-slate-600 text-xs h-8">
                        <SelectValue placeholder="Amal" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {DTMF_ACTIONS.map(a => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button onClick={() => removeDtmfKey(i)}
                      className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
          <Button variant="ghost" className="flex-1 border border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
            disabled={!name || !type || !title || save.isPending}
            onClick={() => save.mutate()}>
            {save.isPending ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Yaratish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
