"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, Download, CheckCircle,
  AlertTriangle, X, Loader2, ChevronRight,
} from "lucide-react";

interface ParsedRow {
  name: string;
  phone: string;
  company: string;
  email: string;
  region: string;
  status: string;
  notes: string;
  _rowNum: number;
  _error?: string;
}

// Excel ustun nomlarini normalize qilish
const COL_MAP: Record<string, keyof Omit<ParsedRow, "_rowNum" | "_error">> = {
  "ism": "name", "ism familiya": "name", "name": "name", "fullname": "name", "mijoz": "name",
  "telefon": "phone", "phone": "phone", "tel": "phone", "raqam": "phone",
  "kompaniya": "company", "company": "company", "tashkilot": "company", "firma": "company",
  "email": "email", "pochta": "email",
  "viloyat": "region", "region": "region", "shahar": "region", "hududlar": "region",
  "holat": "status", "status": "status",
  "izoh": "notes", "notes": "notes", "eslatma": "notes",
};

function normalizeHeader(h: string): keyof Omit<ParsedRow, "_rowNum" | "_error"> | null {
  const key = h.toLowerCase().trim();
  return COL_MAP[key] ?? null;
}

function parseSheet(wb: XLSX.WorkBook): ParsedRow[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (!raw.length) return [];

  const headerMap: Record<string, keyof Omit<ParsedRow, "_rowNum" | "_error">> = {};
  const firstRow = raw[0];
  for (const key of Object.keys(firstRow)) {
    const mapped = normalizeHeader(key);
    if (mapped) headerMap[key] = mapped;
  }

  return raw.map((row, i) => {
    const parsed: ParsedRow = {
      name: "", phone: "", company: "", email: "",
      region: "", status: "ACTIVE", notes: "", _rowNum: i + 2,
    };
    for (const [col, field] of Object.entries(headerMap)) {
      const val = String(row[col] ?? "").trim();
      if (val) (parsed as unknown as Record<string, unknown>)[field] = val;
    }
    if (!parsed.name) parsed._error = "Ism bo'sh";
    else if (!parsed.phone) parsed._error = "Telefon bo'sh";
    return parsed;
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Step = "upload" | "preview" | "done";

export function ImportClientsModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: Array<{ row: number; message: string }> } | null>(null);

  const validRows = rows.filter(r => !r._error);
  const invalidRows = rows.filter(r => r._error);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const parseFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Faqat .xlsx, .xls yoki .csv fayl qabul qilinadi");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const parsed = parseSheet(wb);
        setRows(parsed);
        setStep("preview");
      } catch {
        alert("Faylni o'qib bo'lmadi. Format to'g'ri ekanligini tekshiring.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
      return json.data as { created: number; skipped: number; errors: Array<{ row: number; message: string }> };
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Ism familiya", "Telefon", "Kompaniya", "Email", "Viloyat", "Holat", "Izoh"],
      ["Ahmadov Jasur", "+998901234567", "Alfa Tekstil", "jasur@gmail.com", "Toshkent", "ACTIVE", "VIP mijoz"],
      ["Karimova Malika", "+998911234567", "", "", "Samarqand", "PROSPECT", ""],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mijozlar");
    XLSX.writeFile(wb, "mijozlar_namuna.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
            Exceldan mijozlarni yuklash
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2">
          {/* Steps */}
          <div className="flex items-center gap-2 mb-5 text-xs">
            {(["upload", "preview", "done"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? "bg-indigo-600 text-white" : i < (["upload","preview","done"].indexOf(step)) ? "bg-green-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                  {i < (["upload","preview","done"].indexOf(step)) ? "✓" : i + 1}
                </div>
                <span className={step === s ? "text-white" : "text-slate-500"}>
                  {s === "upload" ? "Fayl yuklash" : s === "preview" ? "Tekshirish" : "Natija"}
                </span>
                {i < 2 && <ChevronRight className="h-3 w-3 text-slate-700" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-900/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">Faylni bu yerga tashlang</p>
                <p className="text-slate-500 text-sm mt-1">yoki bosing va tanlang</p>
                <p className="text-slate-600 text-xs mt-3">.xlsx, .xls, .csv — max 1000 qator</p>
                <input
                  ref={inputRef} type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Namuna shablon</p>
                  <p className="text-slate-400 text-xs">To'g'ri format: Ism, Telefon, Kompaniya, Email, Viloyat, Holat, Izoh</p>
                </div>
                <Button size="sm" variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0"
                  onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Yuklab olish
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{fileName}</p>
                    <p className="text-slate-400 text-xs">{rows.length} ta qator topildi</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {validRows.length > 0 && (
                    <Badge variant="outline" className="border-green-800 text-green-400">
                      {validRows.length} yaroqli
                    </Badge>
                  )}
                  {invalidRows.length > 0 && (
                    <Badge variant="outline" className="border-red-800 text-red-400">
                      {invalidRows.length} xato
                    </Badge>
                  )}
                </div>
              </div>

              {importMutation.isError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {(importMutation.error as Error).message}
                </p>
              )}

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                    <tr>
                      {["#", "Ism", "Telefon", "Kompaniya", "Viloyat", "Holat", ""].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._rowNum} className={`border-b border-slate-800/50 ${row._error ? "bg-red-900/10" : "hover:bg-slate-800/20"}`}>
                        <td className="px-3 py-2 text-slate-500">{row._rowNum}</td>
                        <td className="px-3 py-2 text-white">{row.name || <span className="text-red-400 italic">bo'sh</span>}</td>
                        <td className="px-3 py-2 text-slate-300 font-mono">{row.phone || <span className="text-red-400 italic">bo'sh</span>}</td>
                        <td className="px-3 py-2 text-slate-400">{row.company || "—"}</td>
                        <td className="px-3 py-2 text-slate-400">{row.region || "—"}</td>
                        <td className="px-3 py-2 text-slate-400">{row.status || "ACTIVE"}</td>
                        <td className="px-3 py-2">
                          {row._error
                            ? <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{row._error}</span>
                            : <CheckCircle className="h-3 w-3 text-green-500" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validRows.length === 0 && (
                <p className="text-yellow-400 text-sm text-center py-2">
                  Barcha qatorlarda xato bor. Faylni tekshirib qayta yuklang.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === "done" && result && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-400" />
                <p className="text-white text-lg font-semibold">Yuklash yakunlandi!</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-center">
                  <p className="text-green-400 text-2xl font-bold">{result.created}</p>
                  <p className="text-slate-400 text-xs mt-1">Yaratildi</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-slate-300 text-2xl font-bold">{result.skipped}</p>
                  <p className="text-slate-400 text-xs mt-1">Mavjud (o'tkazib yuborildi)</p>
                </div>
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
                  <p className="text-red-400 text-2xl font-bold">{invalidRows.length + (result.errors?.length ?? 0)}</p>
                  <p className="text-slate-400 text-xs mt-1">Xato</p>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="text-xs text-slate-400 space-y-1 max-h-24 overflow-y-auto border border-slate-800 rounded-lg p-2">
                  {result.errors.map((e, i) => (
                    <p key={i}><span className="text-red-400">Qator {e.row}:</span> {e.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onOpenChange(false)}>
              Yopish
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={reset}>
                <X className="h-4 w-4 mr-1.5" /> Qayta
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || validRows.length === 0}
                className="bg-green-700 hover:bg-green-600 text-white"
              >
                {importMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yuklanmoqda...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {validRows.length} ta mijoz yuklash</>
                )}
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={reset}>
                Yana yuklash
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => onOpenChange(false)}>
                Yopish
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
