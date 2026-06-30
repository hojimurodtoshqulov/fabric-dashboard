"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, X, PenLine } from "lucide-react";
import { PROVINCE_GROUPS } from "@/lib/provinces";

const STATUSES = [
  { value: "ACTIVE",    label: "Faol" },
  { value: "PROSPECT",  label: "Potensial" },
  { value: "INACTIVE",  label: "Nofaol" },
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
  const [provinceKey, setProvinceKey] = useState("");
  // District select ko'rsatish uchun (form.region dan alohida)
  const [districtSelectVal, setDistrictSelectVal] = useState("");
  const [customRegion, setCustomRegion] = useState(false);
  // Viloyat labeli — region bo'sh bo'lsa fallback sifatida submit da ishlatiladi
  const provinceLabelRef = useRef("");

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const { data: districtData, isLoading: districtsLoading } = useQuery({
    queryKey: ["client-districts", provinceKey],
    queryFn: async () => {
      const res = await fetch(`/api/clients/districts?province=${provinceKey}`);
      const json = await res.json();
      return json.data as { districts: { region: string; count: number }[] };
    },
    enabled: !!provinceKey,
    staleTime: 0,
  });

  const districts = districtData?.districts ?? [];

  function handleProvinceChange(key: string) {
    const province = PROVINCE_GROUPS.find(p => p.key === key);
    provinceLabelRef.current = province?.label ?? "";
    setProvinceKey(key);
    setDistrictSelectVal("");
    setForm(prev => ({ ...prev, region: "" }));
    setCustomRegion(false);
  }

  function handleDistrictChange(value: string) {
    if (value === "__custom__") {
      setCustomRegion(true);
      setDistrictSelectVal("");
    } else {
      setDistrictSelectVal(value);
      setForm(prev => ({ ...prev, region: value }));
      setCustomRegion(false);
    }
  }

  function resetToSelect() {
    setCustomRegion(false);
    setDistrictSelectVal("");
    setForm(prev => ({ ...prev, region: "" }));
  }

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      // Tuman tanlanmagan bo'lsa viloyat labeli fallback sifatida
      const region = data.region.trim() || provinceLabelRef.current || undefined;
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          phone: data.phone.trim(),
          company: data.company.trim() || undefined,
          email: data.email.trim() || undefined,
          region,
          province: provinceKey || undefined,
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
      queryClient.invalidateQueries({ queryKey: ["client-regions"] });
      queryClient.invalidateQueries({ queryKey: ["client-districts"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  function reset() {
    setForm(EMPTY);
    setProvinceKey("");
    setDistrictSelectVal("");
    setCustomRegion(false);
    setError("");
    provinceLabelRef.current = "";
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Ism kiritilishi shart");
    if (!form.phone.trim()) return setError("Telefon kiritilishi shart");
    mutation.mutate(form);
  };

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

            {/* Viloyat + Holat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">Viloyat</Label>
                <Select value={provinceKey} onValueChange={handleProvinceChange}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                    <SelectValue placeholder="Viloyat tanlang..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                    {PROVINCE_GROUPS.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
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

            {/* Tuman / Hudud — viloyat tanlanganda ko'rinadi */}
            {provinceKey && (
              <div>
                <Label className="text-slate-400 text-sm mb-1.5 block">
                  Tuman / Hudud
                  <span className="text-slate-600 font-normal ml-1.5">
                    (tanlanmasa viloyat sifatida saqlanadi)
                  </span>
                </Label>
                {customRegion ? (
                  <div className="flex gap-2">
                    <Input
                      value={form.region}
                      onChange={set("region")}
                      placeholder="Masalan: Yunusobod tumani"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700"
                      onClick={resetToSelect}
                      title="Ro'yxatga qaytish"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={districtSelectVal}
                    onValueChange={handleDistrictChange}
                    disabled={districtsLoading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                      <SelectValue placeholder={
                        districtsLoading
                          ? "Yuklanmoqda..."
                          : districts.length === 0
                          ? "Hududlar yo'q — quyida yozing"
                          : "Tuman tanlang..."
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      {districts.map(d => (
                        <SelectItem key={d.region} value={d.region}>
                          <span className="flex items-center gap-3">
                            <span>{d.region}</span>
                            <span className="text-slate-500 text-xs tabular-nums">{d.count}</span>
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        <span className="flex items-center gap-2 text-indigo-400">
                          <PenLine className="h-3.5 w-3.5" />
                          Yangi hudud kiritish...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

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
