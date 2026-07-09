"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VOICE_TEMPLATE_LABELS } from "@/constants";
import type { DtmfKey } from "@/types";

const TEMPLATE_TYPES = Object.entries(VOICE_TEMPLATE_LABELS);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: {
    id: string;
    name: string;
    type: string;
    title: string;
    description: string | null;
    audioFileUrl: string | null;
    isActive: boolean;
    dtmfConfig?: { keys: DtmfKey[] } | null;
  } | null;
}

export function VoiceTemplateModal({ open, onOpenChange, template }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(template);

  const [name, setName]         = useState("");
  const [type, setType]         = useState("CUSTOM");
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [dtmfKeys, setDtmfKeys] = useState<DtmfKey[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setTitle(template.title);
      setDesc(template.description ?? "");
      setDtmfKeys(template.dtmfConfig?.keys ?? []);
    } else {
      setName(""); setType("CUSTOM"); setTitle(""); setDesc(""); setDtmfKeys([]);
    }
  }, [template, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        type,
        title,
        description: description || undefined,
        dtmfConfig: dtmfKeys.length > 0 ? { keys: dtmfKeys } : null,
      };
      const url    = isEdit ? `/api/voice-templates/${template!.id}` : "/api/voice-templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Saqlashda xatolik");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-templates"] });
      onOpenChange(false);
    },
  });

  function addDtmfKey() {
    setDtmfKeys((prev) => [...prev, { key: String(prev.length + 1), label: "" }]);
  }
  function removeDtmfKey(i: number) {
    setDtmfKeys((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateDtmfKey(i: number, field: keyof DtmfKey, value: string) {
    setDtmfKeys((prev) => prev.map((k, idx) => idx === i ? { ...k, [field]: value } : k));
  }

  const DTMF_ACTIONS = [
    { value: "confirm_payment", label: "To'lovni tasdiqlash" },
    { value: "promise_pay",     label: "To'lashga va'da" },
    { value: "callback",        label: "Qayta qo'ng'iroq" },
    { value: "interested",      label: "Qiziqish bildirdi" },
    { value: "not_interested",  label: "Qiziqmadi" },
    { value: "transfer_manager",label: "Menejerga ulash" },
    { value: "custom",          label: "Boshqa" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Shablonni tahrirlash" : "Yangi shablon yaratish"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nomi *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shablon nomi" className="bg-slate-800 border-slate-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Turi *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TEMPLATE_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Sarlavha *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qo'ng'iroq sarlavhasi" className="bg-slate-800 border-slate-600" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Tavsif</Label>
            <Textarea value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Shablon tavsifi..." rows={2} className="bg-slate-800 border-slate-600 resize-none" />
          </div>

          {/* DTMF Config */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">DTMF tugmalari</Label>
              <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 gap-1 h-7" onClick={addDtmfKey}>
                <Plus className="w-3.5 h-3.5" /> Qo'shish
              </Button>
            </div>
            {dtmfKeys.length === 0 && (
              <p className="text-xs text-slate-500">DTMF tugmalari yo'q. Raqam bosganda muayyan amalni bajarish uchun qo'shing.</p>
            )}
            {dtmfKeys.map((k, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg p-3">
                <div className="w-8 h-8 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {k.key}
                </div>
                <Input
                  value={k.label}
                  onChange={(e) => updateDtmfKey(i, "label", e.target.value)}
                  placeholder="Tugma tavsifi (mijozga eshittiriladi)"
                  className="bg-slate-700 border-slate-600 text-sm flex-1"
                />
                <Select value={k.action ?? "custom"} onValueChange={(v) => updateDtmfKey(i, "action", v)}>
                  <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-xs">
                    <SelectValue placeholder="Amal" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {DTMF_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8" onClick={() => removeDtmfKey(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
          <Button variant="ghost" className="flex-1 border border-slate-600" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-500"
            disabled={!name || !type || !title || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Yaratish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
