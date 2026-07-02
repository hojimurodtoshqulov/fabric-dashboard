"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, FileText, Search, X } from "lucide-react";

interface InvoiceItem {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface ClientHit {
  id: string;
  name: string;
  phone: string;
}

function makeItem(): InvoiceItem {
  return {
    key: Math.random().toString(36).slice(2),
    name: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewInvoiceModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([makeItem()]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: searchData } = useQuery({
    queryKey: ["invoice-client-search", clientSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`
      );
      const json = await res.json();
      return json.data as { clients: ClientHit[] };
    },
    enabled: clientSearch.length >= 2 && !selectedClient,
  });

  const suggestions = searchData?.clients ?? [];

  const subtotal = items.reduce(
    (s, it) => s + it.quantity * it.unitPrice * (1 - it.discount / 100),
    0
  );
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = ((subtotal - discountAmount) * tax) / 100;
  const total = subtotal - discountAmount + taxAmount;

  function updateItem<K extends keyof InvoiceItem>(
    key: string,
    field: K,
    value: InvoiceItem[K]
  ) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, [field]: value } : it))
    );
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Mijozni tanlang");
      const validItems = items.filter(
        (it) => it.name.trim() && it.unitPrice > 0
      );
      if (!validItems.length)
        throw new Error("Kamida bitta mahsulot kiriting (nomi va narxi)");

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          items: validItems.map(({ key, ...rest }) => rest),
          discount,
          tax,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Server xatosi");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleClose() {
    onOpenChange(false);
    setClientSearch("");
    setSelectedClient(null);
    setShowDropdown(false);
    setItems([makeItem()]);
    setDiscount(0);
    setTax(0);
    setDueDate("");
    setNotes("");
    setError("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2.5 text-white text-lg">
            <div className="p-1.5 bg-indigo-500/15 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-400" />
            </div>
            Yangi Hisob-Faktura
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Mijoz + Muddat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Mijoz <span className="text-red-400 normal-case">*</span>
              </Label>
              <div className="relative">
                {selectedClient ? (
                  <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-tight truncate">
                        {selectedClient.name}
                      </p>
                      <p className="text-slate-500 text-xs font-mono mt-0.5">
                        {selectedClient.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setClientSearch("");
                      }}
                      className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none z-10" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 160)
                      }
                      placeholder="Mijozni qidiring..."
                      className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-10"
                    />
                    {showDropdown && suggestions.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl z-50 shadow-2xl overflow-hidden">
                        {suggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              setSelectedClient(c);
                              setClientSearch("");
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-700/80 transition-colors border-b border-slate-700/30 last:border-0"
                          >
                            <p className="text-white text-sm font-medium">
                              {c.name}
                            </p>
                            <p className="text-slate-500 text-xs font-mono">
                              {c.phone}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                To'lov muddati
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-800/60 border-slate-700 text-white h-10 scheme-dark"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
              Mahsulotlar / Xizmatlar
            </Label>
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              {/* Table header */}
              <div className="grid bg-slate-800/70 border-b border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: "1fr 80px 110px 72px 90px 32px" }}>
                <span>Nomi</span>
                <span className="text-right">Miqdor</span>
                <span className="text-right">Narx (so'm)</span>
                <span className="text-right">Ch%</span>
                <span className="text-right">Jami</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-800/60">
                {items.map((item) => {
                  const rowTotal =
                    item.quantity * item.unitPrice * (1 - item.discount / 100);
                  return (
                    <div
                      key={item.key}
                      className="grid items-center px-3 py-2 gap-2 hover:bg-slate-800/20"
                      style={{ gridTemplateColumns: "1fr 80px 110px 72px 90px 32px" }}
                    >
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateItem(item.key, "name", e.target.value)
                        }
                        placeholder="Nomi..."
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updateItem(
                            item.key,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-slate-800/50 border-slate-700 text-white text-right h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateItem(
                            item.key,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-slate-800/50 border-slate-700 text-white text-right h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount || ""}
                        onChange={(e) =>
                          updateItem(
                            item.key,
                            "discount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="bg-slate-800/50 border-slate-700 text-white text-right h-8 text-sm"
                      />
                      <p className="text-right text-white text-sm font-mono tabular-nums pr-1">
                        {rowTotal > 0
                          ? rowTotal.toLocaleString("uz-UZ")
                          : "—"}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          items.length > 1 &&
                          setItems((prev) =>
                            prev.filter((it) => it.key !== item.key)
                          )
                        }
                        disabled={items.length === 1}
                        className="flex items-center justify-center text-slate-600 hover:text-red-400 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, makeItem()])}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors py-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Qator qo'shish
            </button>
          </div>

          {/* Bottom: Notes + Totals */}
          <div className="grid grid-cols-2 gap-6 pt-1">
            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
                Izohlar
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Qo'shimcha izoh..."
                className="w-full rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Chegirma + QQS + Jami */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
                    Chegirma %
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discount || ""}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="bg-slate-800/60 border-slate-700 text-white h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-400 uppercase tracking-wide block">
                    QQS %
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tax || ""}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-slate-800/60 border-slate-700 text-white h-10"
                  />
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 font-mono tabular-nums">
                    {subtotal.toLocaleString("uz-UZ")} so'm
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">
                      Chegirma ({discount}%)
                    </span>
                    <span className="text-red-400 font-mono tabular-nums">
                      −{discountAmount.toLocaleString("uz-UZ")} so'm
                    </span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">QQS ({tax}%)</span>
                    <span className="text-amber-400 font-mono tabular-nums">
                      +{taxAmount.toLocaleString("uz-UZ")} so'm
                    </span>
                  </div>
                )}
                <div className="h-px bg-slate-700/60" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold text-sm">
                    JAMI
                  </span>
                  <span className="text-indigo-400 font-bold font-mono tabular-nums text-lg leading-none">
                    {total.toLocaleString("uz-UZ")}
                    <span className="text-sm font-normal text-indigo-400/70 ml-1">
                      so'm
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2.5">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900/30">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Bekor qilish
          </Button>
          <Button
            onClick={() => {
              setError("");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 px-5"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Faktura yaratish
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
