"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Loader2, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, type RoleName } from "@/constants";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role: { name: RoleName; displayName: string };
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [RoleName, { label: string; description: string }][];

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Xatolik");
  return json;
}

export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await (await fetch("/api/users")).json()).data as { users: UserRow[] },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => send(`/api/users/${id}`, "PATCH", body),
    onSuccess: () => { setError(""); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">Foydalanuvchilar va rollar</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Har bir rol faqat o'z bo'limlarini ko'radi. Rol o'zgarsa, xodim qayta kirgach kuchga kiradi.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 shrink-0">
          <UserPlus className="mr-2 h-4 w-4" /> Yangi foydalanuvchi
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-3 py-2 font-medium">Ism</th>
                <th className="text-left px-3 py-2 font-medium">Login</th>
                <th className="text-left px-3 py-2 font-medium">Rol</th>
                <th className="text-left px-3 py-2 font-medium">Holat</th>
                <th className="text-right px-3 py-2 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <tr key={u.id} className={`border-b border-slate-800/50 ${u.isActive ? "" : "opacity-50"}`}>
                    <td className="px-3 py-2 text-white">
                      {u.name}{isMe && <span className="text-slate-500 text-xs"> (siz)</span>}
                      {u.phone && <p className="text-slate-500 text-xs">{u.phone}</p>}
                    </td>
                    <td className="px-3 py-2 text-slate-300 font-mono text-xs">{u.email}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={u.role.name}
                        disabled={isMe || update.isPending}
                        onValueChange={(role) => update.mutate({ id: u.id, body: { role } })}
                      >
                        <SelectTrigger className="w-48 h-8 bg-slate-800 border-slate-700 text-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {ROLE_OPTIONS.map(([key, r]) => (
                            <SelectItem key={key} value={key}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={u.isActive
                        ? "bg-green-500/10 text-green-400 border-green-800"
                        : "bg-slate-500/10 text-slate-400 border-slate-700"}>
                        {u.isActive ? "Faol" : "Bloklangan"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 text-slate-400 hover:text-white"
                          title="Parolni almashtirish" onClick={() => setResetFor(u)}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        {!isMe && (
                          <Button size="sm" variant="ghost"
                            className={`h-8 ${u.isActive ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}`}
                            title={u.isActive ? "Bloklash" : "Blokdan chiqarish"}
                            disabled={update.isPending}
                            onClick={() => update.mutate({ id: u.id, body: { isActive: !u.isActive } })}>
                            {u.isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
        {ROLE_OPTIONS.map(([key, r]) => (
          <div key={key} className="text-xs bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="text-slate-200 font-medium">{r.label}</p>
            <p className="text-slate-500">{r.description}</p>
          </div>
        ))}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const empty = { name: "", email: "", phone: "", password: "", role: "FOREMAN" as RoleName };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => send("/api/users", "POST", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setForm(empty); setError(""); onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const field = (k: "name" | "email" | "phone" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader><DialogTitle>Yangi foydalanuvchi</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div>
            <Label className="text-slate-400 text-sm">Ism familiya</Label>
            <Input value={form.name} onChange={field("name")} className="bg-slate-800 border-slate-700 mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-sm">Login</Label>
              <Input value={form.email} onChange={field("email")} placeholder="masalan: buxgalter"
                className="bg-slate-800 border-slate-700 mt-1" required />
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Telefon</Label>
              <Input value={form.phone} onChange={field("phone")} className="bg-slate-800 border-slate-700 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Parol (kamida 6 belgi)</Label>
            <Input type="text" value={form.password} onChange={field("password")}
              className="bg-slate-800 border-slate-700 mt-1 font-mono" required minLength={6} />
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Rol</Label>
            <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role: role as RoleName }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {ROLE_OPTIONS.map(([key, r]) => <SelectItem key={key} value={key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-slate-500 text-xs mt-1">{ROLE_LABELS[form.role].description}</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yaratish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const reset = useMutation({
    mutationFn: () => send(`/api/users/${user!.id}`, "PATCH", { password }),
    onSuccess: () => { setPassword(""); setError(""); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={user !== null} onOpenChange={(v) => { if (!v) { setPassword(""); setError(""); onClose(); } }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader><DialogTitle>Yangi parol — {user?.name}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); reset.mutate(); }}>
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 border-slate-700 font-mono" minLength={6} required autoFocus />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={reset.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
