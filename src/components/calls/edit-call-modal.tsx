"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2, XCircle, Trash2 } from "lucide-react";

const PURPOSES = [
  { value: "DEBT_REMINDER", label: "Qarz eslatmasi" },
  { value: "REACTIVATION",  label: "Qayta jalb" },
  { value: "OFFER",         label: "Taklif" },
  { value: "FOLLOW_UP",     label: "Kuzatuv" },
];

const EDITABLE_STATUSES = ["PENDING", "DIALING"];

interface CallRow {
  id: string;
  status: string;
  purpose: string;
  client: { name: string; phone: string };
}

interface Props {
  call: CallRow | null;
  onClose: () => void;
}

export function EditCallModal({ call, onClose }: Props) {
  const queryClient = useQueryClient();
  const [purpose, setPurpose] = useState("DEBT_REMINDER");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (call) { setPurpose(call.purpose); setConfirmDelete(false); }
  }, [call]);

  const canEdit = call ? EDITABLE_STATUSES.includes(call.status) : false;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${call!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${call!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${call!.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Xatolik");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const isPending = saveMutation.isPending || cancelMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={!!call} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="p-1.5 bg-indigo-500/15 rounded-lg">
              <Pencil className="h-4 w-4 text-indigo-400" />
            </div>
            Qo'ng'iroqni tahrirlash
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {call && (
            <div className="bg-slate-800/50 rounded-xl px-4 py-3">
              <p className="text-white text-sm font-medium">{call.client.name}</p>
              <p className="text-slate-500 text-xs font-mono mt-0.5">{call.client.phone}</p>
            </div>
          )}

          {!canEdit && (
            <div className="text-sm text-amber-400 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
              Bu qo'ng'iroq allaqachon boshlanган yoki yakunlangan — faqat maqsadni ko'rish mumkin.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
              Maqsad
            </Label>
            <Select value={purpose} onValueChange={setPurpose} disabled={!canEdit}>
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

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 space-y-3">
          {/* Destructive row — faqat PENDING/DIALING uchun */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-1.5 h-8"
                onClick={() => { setError(""); cancelMutation.mutate(); }}
                disabled={isPending}>
                {cancelMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <XCircle className="h-3.5 w-3.5" />}
                Bekor qilish
              </Button>

              {!confirmDelete ? (
                <Button variant="ghost" size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-1.5 h-8"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                  O'chirish
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-red-950/50 border border-red-700/60 rounded-lg px-3 py-1.5">
                  <span className="text-red-300 text-xs font-medium">Ishonchingiz komilmi?</span>
                  <button
                    className="text-white bg-red-600 hover:bg-red-500 text-xs font-semibold px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                    onClick={() => { setError(""); deleteMutation.mutate(); }}
                    disabled={isPending}>
                    {deleteMutation.isPending ? "..." : "Ha"}
                  </button>
                  <button
                    className="text-slate-400 hover:text-slate-200 text-xs transition-colors"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}>
                    Yo'q
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex justify-end gap-2">
            <Button variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9"
              onClick={onClose} disabled={isPending}>
              Yopish
            </Button>
            {canEdit && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 px-5"
                onClick={() => { setError(""); saveMutation.mutate(); }}
                disabled={isPending || purpose === call?.purpose}>
                {saveMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</>
                  : "Saqlash"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
