"use client";

import { useState } from "react";
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
import { UserPlus, Loader2 } from "lucide-react";

const STATUSES = [
  { value: "ACTIVE",    label: "Faol" },
  { value: "PROSPECT",  label: "Potensial" },
  { value: "INACTIVE",  label: "Nofaol" },
];

const REGIONS = [
  "Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona",
  "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy",
  "Xorazm", "Qoraqalpog'iston",
];

interface FormState {
  name: string;
  phone: string;
  company: string;
  email: string;
  region: string;
  status: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "", phone: "", company: "", email: "",
  region: "", status: "ACTIVE", notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          phone: data.phone.trim(),
          company: data.company.trim() || undefined,
          email: data.email.trim() || undefined,
          region: data.region || undefined,
          status: data.status,
          notes: data.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik yuz berdi");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setForm(EMPTY);
      setError("");
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Ism kiritilishi shart");
    if (!form.phone.trim()) return setError("Telefon kiritilishi shart");
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm(EMPTY); setError(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            Yangi mijoz qo'shish
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">
                  Ism familiya <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Ahmadov Jasur"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">
                  Telefon <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+998901234567"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono"
                />
              </div>
            </div>

            {/* Company + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Kompaniya</Label>
                <Input
                  value={form.company}
                  onChange={set("company")}
                  placeholder="Kompaniya nomi"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="email@example.com"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Region + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Viloyat</Label>
                <Select
                  value={form.region}
                  onValueChange={(v) => setForm(p => ({ ...p, region: v }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                    <SelectValue placeholder="Tanlang..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
                    {REGIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Holat</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-slate-400 text-sm mb-1.5 block">Izohlar</Label>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                placeholder="Qo'shimcha ma'lumotlar..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" /> Saqlash</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
