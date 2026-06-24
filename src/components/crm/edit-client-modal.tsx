"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2, Trash2 } from "lucide-react";

const STATUSES = [
  { value: "ACTIVE",     label: "Faol" },
  { value: "PROSPECT",   label: "Potensial" },
  { value: "INACTIVE",   label: "Nofaol" },
  { value: "LOST",       label: "Yo'qotilgan" },
  { value: "DEBTOR",     label: "Qarzdor" },
  { value: "COMPETITOR", label: "Raqib" },
  { value: "RISK",       label: "Xavfli" },
];

const REGIONS = [
  "Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona",
  "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy",
  "Xorazm", "Qoraqalpog'iston",
];

export interface ClientData {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  email: string | null;
  region: string | null;
  status: string;
  notes?: string | null;
}

interface Props {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EditClientModal({ client, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", company: "", email: "", region: "", status: "ACTIVE", notes: "" });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        phone: client.phone,
        company: client.company ?? "",
        email: client.email ?? "",
        region: client.region ?? "",
        status: client.status,
        notes: client.notes ?? "",
      });
      setError("");
      setConfirmDelete(false);
    }
  }, [client]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${client!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          company: form.company.trim() || null,
          email: form.email.trim() || null,
          region: form.region || null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik yuz berdi");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${client!.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "O'chirib bo'lmadi");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Ism kiritilishi shart");
    if (!form.phone.trim()) return setError("Telefon kiritilishi shart");
    updateMutation.mutate();
  };

  const isPending = updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-indigo-400" />
            Mijozni tahrirlash
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">
                  Ism familiya <span className="text-red-400">*</span>
                </Label>
                <Input value={form.name} onChange={set("name")}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">
                  Telefon <span className="text-red-400">*</span>
                </Label>
                <Input value={form.phone} onChange={set("phone")}
                  className="bg-slate-800 border-slate-700 text-white font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Kompaniya</Label>
                <Input value={form.company} onChange={set("company")}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Email</Label>
                <Input type="email" value={form.email} onChange={set("email")}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Viloyat</Label>
                <Select value={form.region} onValueChange={v => setForm(p => ({ ...p, region: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                    <SelectValue placeholder="Tanlang..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
                    <SelectItem value=" ">—</SelectItem>
                    {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Holat</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-400 text-sm mb-1.5 block">Izohlar</Label>
              <textarea value={form.notes} onChange={set("notes")} rows={2}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 space-y-2">
                <p className="text-red-300 text-sm font-medium">Rostdan ham o'chirilsinmi?</p>
                <p className="text-red-400/70 text-xs">
                  Bu amalni qaytarib bo'lmaydi. Mijozga bog'liq barcha ma'lumotlar o'chib ketishi mumkin.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button type="button" size="sm" variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={() => setConfirmDelete(false)}>
                    Bekor
                  </Button>
                  <Button type="button" size="sm"
                    className="bg-red-700 hover:bg-red-600 text-white"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}>
                    {deleteMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : "Ha, o'chirish"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mr-auto"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending || confirmDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" /> O'chirish
            </Button>
            <Button type="button" variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => onOpenChange(false)} disabled={isPending}>
              Bekor
            </Button>
            <Button type="submit" disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {updateMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saqlanmoqda...</>
                : <><Pencil className="h-4 w-4 mr-2" /> Saqlash</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
