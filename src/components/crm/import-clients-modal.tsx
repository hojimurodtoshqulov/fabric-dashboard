"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, FileSpreadsheet, Download, CheckCircle,
  AlertTriangle, X, Loader2, ChevronRight, Wand2, MapPin, Building2,
} from "lucide-react";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import type { ProvinceGroup } from "@/lib/provinces";

// Faqat viloyat NOMLARI bo'yicha tekshiradi (district keywordlarini emas)
const PROVINCE_FILE_NAMES: { key: string; names: string[] }[] = [
  { key: "andijon",      names: ["andijon", "андижон", "андижон вилояти"] },
  { key: "buxoro",       names: ["buxoro", "bukhara", "бухоро", "бухара", "бухоро вилояти"] },
  { key: "fargona",      names: ["farg'ona", "fargona", "fergana", "фаргона", "фарғона", "фергана", "фаргона вилояти"] },
  { key: "jizzax",       names: ["jizzax", "жиззах", "жиззах вилояти"] },
  { key: "xorazm",       names: ["xorazm", "хорезм", "хоразм", "хоразм вилояти"] },
  { key: "namangan",     names: ["namangan", "наманган", "наманган вилояти"] },
  { key: "navoiy",       names: ["navoiy", "навои", "навой", "навоий", "навоий вилояти"] },
  { key: "qashqadaryo",  names: ["qashqadaryo", "kashkadarya", "кашкадарья", "кашкадарё", "қашқадарё", "қашқадарё вилояти"] },
  { key: "samarqand",    names: ["samarqand", "самарканд", "самарқанд", "самарқанд вилояти"] },
  { key: "sirdaryo",     names: ["sirdaryo", "сирдарё", "сирдарья", "сырдарья", "сирдарё вилояти"] },
  { key: "surxondaryo",  names: ["surxondaryo", "сурхандарья", "сурхондарё", "сурхандарьё", "сурхондарё вилояти"] },
  { key: "toshkent_vil", names: ["toshkent viloyati", "toshkent vil", "toshkent oblast", "ташкент вилояти", "тошкент вилояти"] },
  { key: "toshkent_sh",  names: ["toshkent shahri", "toshkent city", "ташкент шахри", "ташкент шахар", "тошкент шахри", "тошкент"] },
  { key: "qoraqalp",     names: ["qoraqalp", "qoraqalpog'iston", "каракалп", "коракалп", "қорақалп", "қорақалпоғистон"] },
];

function detectProvinceFromFilename(filename: string): ProvinceGroup | null {
  const lower = filename.toLowerCase().trim();
  // 1. Province label bilan to'liq yoki qisman moslik
  for (const p of PROVINCE_GROUPS) {
    const label = p.label.toLowerCase();
    if (lower === label || lower.startsWith(label)) return p;
  }
  // 2. Viloyat nomlari variantlari (faqat asosiy nomlar, hudud nomlar emas)
  for (const entry of PROVINCE_FILE_NAMES) {
    if (entry.names.some(n => lower === n || lower.startsWith(n + " ") || lower.startsWith(n + "_"))) {
      return PROVINCE_GROUPS.find(p => p.key === entry.key) ?? null;
    }
  }
  return null;
}

// ── Field definitions ─────────────────────────────────────────────────────────
type FieldKey = "name" | "phone" | "company" | "email" | "region" | "status" | "notes";

const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: "name",    label: "Ism familiya", required: true },
  { key: "phone",   label: "Telefon",      required: true },
  { key: "company", label: "Kompaniya",    required: false },
  { key: "email",   label: "Email",        required: false },
  { key: "region",  label: "Hudud",        required: false },
  { key: "status",  label: "Holat",        required: false },
  { key: "notes",   label: "Izoh / Manzil", required: false },
];

const KEYWORDS: Record<FieldKey, string[]> = {
  name:    ["ism", "name", "fullname", "full_name", "fio", "f.i.o", "mijoz", "client", "xaridor", "familiya", "ismi", "название", "наименование", "имя", "клиент", "контрагент", "покупатель"],
  phone:   ["telefon", "phone", "tel", "raqam", "number", "mob", "mobile", "gsm", "контакт", "телефон", "основной телефон", "номер", "мобильный"],
  company: ["kompaniya", "company", "firm", "firma", "tashkilot", "org", "korxona", "компания", "организация", "фирма", "предприятие"],
  email:   ["email", "mail", "pochta", "e-mail", "elektron", "электронная почта"],
  region:  ["viloyat", "region", "shahar", "city", "hudud", "oblast", "регион", "область", "район", "вилоят", "туман"],
  status:  ["holat", "status", "daraja", "статус", "состояние"],
  notes:   ["izoh", "notes", "note", "eslatma", "comment", "info", "description", "manzil", "adres", "address", "адрес", "примечание", "комментарий", "описание"],
};

const SKIP_PATTERNS = [/альтернатив/i, /alternative/i, /alt.name/i, /qo.shimcha nom/i];

function detectField(header: string): FieldKey | null {
  const raw = header.toLowerCase().trim();
  if (SKIP_PATTERNS.some(p => p.test(raw))) return null;
  const h = raw.replace(/[\s_\-\.]+/g, " ");
  for (const [field, keywords] of Object.entries(KEYWORDS) as [FieldKey, string[]][]) {
    if (keywords.some(kw => h === kw || h.includes(kw))) return field;
  }
  return null;
}

function cleanPhone(raw: string): string {
  const match = raw.replace(/[^\d\s\+]/g, "").trim().match(/[\+\d]{9,13}/);
  return match ? match[0] : raw.trim();
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedRow {
  name: string; phone: string; company: string;
  email: string; region: string; status: string; notes: string;
  _rowNum: number; _error?: string;
}

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }
type Step = "upload" | "mapping" | "preview" | "done";

const EMPTY_ROW = (): ParsedRow => ({
  name: "", phone: "", company: "", email: "",
  region: "", status: "ACTIVE", notes: "", _rowNum: 0,
});

export function ImportClientsModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileBaseName, setFileBaseName] = useState("");        // filename without extension
  const [isProvinceFile, setIsProvinceFile] = useState(false); // true if filename = province name
  const [selectedProvinceKey, setSelectedProvinceKey] = useState<string>("none");
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "skip">>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const errorRows  = rows.filter(r => r._error);
  const normalRows = rows.filter(r => !r._error);

  const reset = () => {
    setStep("upload"); setFileName(""); setFileBaseName(""); setHeaders([]); setRawRows([]);
    setMapping({}); setRows([]); setResult(null);
    setIsProvinceFile(false); setSelectedProvinceKey("none");
    if (inputRef.current) inputRef.current.value = "";
  };

  const parseFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Faqat .xlsx, .xls yoki .csv fayl qabul qilinadi"); return;
    }
    setFileName(file.name);

    // Extract base name and detect province from filename
    const baseName = file.name.replace(/\.(xlsx|xls|csv)$/i, "").trim();
    setFileBaseName(baseName);
    const autoProvince = detectProvinceFromFilename(baseName);
    setIsProvinceFile(!!autoProvince);
    setSelectedProvinceKey(autoProvince?.key ?? "none");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (!raw.length) { alert("Fayl bo'sh"); return; }

        const hdrs = Object.keys(raw[0]);
        setHeaders(hdrs);
        setRawRows(raw.map(r => Object.fromEntries(hdrs.map(h => [h, String(r[h] ?? "").trim()]))));

        const autoMap: Record<string, FieldKey | "skip"> = {};
        const usedFields = new Set<FieldKey>();
        for (const h of hdrs) {
          const detected = detectField(h);
          if (detected && !usedFields.has(detected)) {
            autoMap[h] = detected; usedFields.add(detected);
          } else { autoMap[h] = "skip"; }
        }
        setMapping(autoMap);
        setStep("mapping");
      } catch { alert("Faylni o'qib bo'lmadi."); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const applyMapping = () => {
    const selectedProvince = selectedProvinceKey !== "none"
      ? PROVINCE_GROUPS.find(p => p.key === selectedProvinceKey) ?? null
      : null;

    const parsed: ParsedRow[] = rawRows.map((raw, i) => {
      const row = EMPTY_ROW();
      row._rowNum = i + 2;
      for (const [col, field] of Object.entries(mapping)) {
        if (field === "skip") continue;
        let val = raw[col]?.trim();
        if (!val) continue;
        if (field === "phone") val = cleanPhone(val);
        (row as unknown as Record<string, unknown>)[field] = val;
      }

      if (isProvinceFile) {
        // Case 1: viloyat nomi bilan nomlangan fayl
        // Excel ichidagi "region" ustuni → hudud saqlanadi (as-is)
        // Agar region bo'sh bo'lsa → viloyat nomi qo'yamiz
        if (!row.region && selectedProvince) {
          row.region = selectedProvince.label;
        }
      } else {
        // Case 2: hudud (region) nomi bilan nomlangan fayl
        // Fayl nomi → hudud (faqat fayl nomi, viloyat prefiksi yo'q)
        row.region = fileBaseName;
      }

      if (!row.name && !row.phone) row._error = "Ism va telefon yo'q";
      else if (!row.name)  row._error = "Ism ko'rsatilmagan";
      else if (!row.phone) row._error = "Telefon ko'rsatilmagan";
      return row;
    });
    setRows(parsed);
    setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, province: selectedProvinceKey !== "none" ? selectedProvinceKey : undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xatolik");
      return json.data as { created: number; skipped: number };
    },
    onSuccess: (data) => {
      setResult(data as { created: number; updated: number; skipped: number }); setStep("done");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-regions"] });
      queryClient.invalidateQueries({ queryKey: ["client-districts"] });
    },
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Название", "Основной телефон", "Адрес", "Регион"],
      ["Абубакир мед", "998934279181", "Избоскан", "Андижон Избоскан"],
      ["Вита вижон", "998998079110", "Избоскан тумани", "Андижон Избоскан"],
    ]);
    ws["!cols"] = [28, 18, 28, 20].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mijozlar");
    XLSX.writeFile(wb, "namuna_shablon.xlsx");
  };

  const mappedFields = new Set(Object.values(mapping).filter(v => v !== "skip"));
  const hasName  = mappedFields.has("name");
  const hasPhone = mappedFields.has("phone");

  const selectedProvinceLabel = selectedProvinceKey !== "none"
    ? PROVINCE_GROUPS.find(p => p.key === selectedProvinceKey)?.label ?? ""
    : "";

  const STEP_LABELS: Record<Step, string> = {
    upload: "Fayl yuklash", mapping: "Moslashtirish",
    preview: "Tekshirish", done: "Natija",
  };
  const STEPS: Step[] = ["upload", "mapping", "preview", "done"];

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
          <div className="flex items-center gap-1.5 mb-5 text-xs flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s ? "bg-indigo-600 text-white"
                  : STEPS.indexOf(step) > i ? "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-400"
                }`}>
                  {STEPS.indexOf(step) > i ? "✓" : i + 1}
                </div>
                <span className={step === s ? "text-white" : "text-slate-500"}>{STEP_LABELS[s]}</span>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-indigo-500 bg-indigo-900/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">Faylni bu yerga tashlang</p>
                <p className="text-slate-500 text-sm mt-1">yoki bosing va tanlang</p>
                <p className="text-slate-600 text-xs mt-3">.xlsx · .xls · .csv — max 1000 qator</p>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }} />
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium">
                    <Building2 className="h-3.5 w-3.5" /> Viloyat fayli
                  </div>
                  <p className="text-slate-500 text-xs">Fayl nomi viloyat nomi bilan nomlangan bo'lsa — viloyat avtomatik aniqlanadi. Excel ichidagi "hudud" ustuni saqlandi.</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                    <MapPin className="h-3.5 w-3.5" /> Hudud fayli
                  </div>
                  <p className="text-slate-500 text-xs">Fayl nomi hudud nomi bilan nomlangan bo'lsa — 2chi bosqichda viloyatni tanlanadi. Fayl nomi hudud sifatida saqlanadi.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Namuna shablon</p>
                  <p className="text-slate-400 text-xs">Ixtiyoriy ustun nomlarda ham ishlaydi</p>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 shrink-0"
                  onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Namuna
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: MAPPING ── */}
          {step === "mapping" && (
            <div className="space-y-3">
              {/* Province info / selector */}
              {isProvinceFile ? (
                <div className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-800 rounded-xl p-3">
                  <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-indigo-300 text-sm font-medium">Viloyat fayli — avtomatik aniqlandi</p>
                    <p className="text-indigo-400/70 text-xs mt-0.5">
                      Fayl nomi: <span className="font-mono">{fileBaseName}</span> → <span className="font-semibold">{selectedProvinceLabel}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-white text-sm font-medium">Viloyatni tanlang</p>
                    <span className="text-amber-400 text-xs">(majburiy)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedProvinceKey} onValueChange={setSelectedProvinceKey}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-300 flex-1">
                        <SelectValue placeholder="Viloyatni tanlang..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="none">— Tanlang</SelectItem>
                        {PROVINCE_GROUPS.map(p => (
                          <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono whitespace-nowrap shrink-0">
                      Hudud: <span className="text-white">{fileBaseName}</span>
                    </div>
                  </div>
                  {selectedProvinceKey !== "none" && (
                    <p className="text-slate-400 text-xs">
                      Barcha mijozlar <span className="text-white font-medium">{selectedProvinceLabel} — {fileBaseName}</span> sifatida saqlanadi
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-indigo-400" />
                  <p className="text-white text-sm font-medium">{fileName} · {rawRows.length} ta qator</p>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium w-1/2">Excelda ustun nomi</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium w-1/4">Namuna</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium w-1/4">Maydon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h) => {
                      const sampleVal = rawRows[0]?.[h] ?? "";
                      const isAuto = mapping[h] !== "skip";
                      return (
                        <tr key={h} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="px-4 py-2.5">
                            <span className={`text-sm font-mono ${isAuto ? "text-white" : "text-slate-500"}`}>{h}</span>
                            {isAuto && <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded">auto</span>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-25">{sampleVal || "—"}</td>
                          <td className="px-4 py-2.5">
                            <Select value={mapping[h] || "skip"}
                              onValueChange={(v) => setMapping(prev => ({ ...prev, [h]: v as FieldKey | "skip" }))}>
                              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-300 w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="skip" className="text-slate-500">— O'tkazib yuborish</SelectItem>
                                {FIELDS.map(f => (
                                  <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 text-xs">
                <span className={`flex items-center gap-1 ${hasName ? "text-green-400" : "text-red-400"}`}>
                  {hasName ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  Ism familiya
                </span>
                <span className={`flex items-center gap-1 ${hasPhone ? "text-green-400" : "text-yellow-400"}`}>
                  {hasPhone ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {hasPhone ? "Telefon" : "Telefon yo'q — xatolilar INACTIVE sifatida qo'shiladi"}
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{rows.length} ta qator</p>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded border border-green-800 text-green-400">
                    {normalRows.length} normal
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded border border-yellow-800 text-yellow-400">
                      {errorRows.length} xatoli → INACTIVE
                    </span>
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
                      {["#", "Ism", "Telefon", "Hudud", "Holat", ""].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._rowNum}
                        className={`border-b border-slate-800/50 ${row._error ? "bg-yellow-900/10" : "hover:bg-slate-800/20"}`}>
                        <td className="px-3 py-2 text-slate-500">{row._rowNum}</td>
                        <td className="px-3 py-2 text-white">{row.name || <span className="text-slate-500 italic">Noma'lum</span>}</td>
                        <td className="px-3 py-2 text-slate-300 font-mono">{row.phone || <span className="text-slate-500 italic">yo'q</span>}</td>
                        <td className="px-3 py-2 text-slate-400 max-w-32 truncate">{row.region || "—"}</td>
                        <td className="px-3 py-2">
                          {row._error
                            ? <span className="text-yellow-400 text-[10px] bg-yellow-900/20 px-1.5 py-0.5 rounded">INACTIVE</span>
                            : <span className="text-green-400 text-[10px] bg-green-900/20 px-1.5 py-0.5 rounded">ACTIVE</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row._error
                            ? <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            : <CheckCircle className="h-3 w-3 text-green-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 4: DONE ── */}
          {step === "done" && result && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-400" />
                <p className="text-white text-lg font-semibold">Yuklash yakunlandi!</p>
              </div>
              <div className={`grid gap-3 ${result.updated > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-center">
                  <p className="text-green-400 text-2xl font-bold">{result.created}</p>
                  <p className="text-slate-400 text-xs mt-1">Yaratildi</p>
                </div>
                {result.updated > 0 && (
                  <div className="bg-indigo-900/20 border border-indigo-800 rounded-xl p-4 text-center">
                    <p className="text-indigo-400 text-2xl font-bold">{result.updated}</p>
                    <p className="text-slate-400 text-xs mt-1">Region yangilandi</p>
                  </div>
                )}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-slate-300 text-2xl font-bold">{result.skipped}</p>
                  <p className="text-slate-400 text-xs mt-1">O'tkazildi (mavjud)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onOpenChange(false)}>
              Yopish
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={reset}>
                <X className="h-4 w-4 mr-1.5" /> Qayta
              </Button>
              <Button
                onClick={applyMapping}
                disabled={!hasName || (!isProvinceFile && selectedProvinceKey === "none")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4 mr-1.5" /> Davom etish
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setStep("mapping")}>
                <X className="h-4 w-4 mr-1.5" /> Orqaga
              </Button>
              <Button onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || rows.length === 0}
                className="bg-green-700 hover:bg-green-600 text-white">
                {importMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yuklanmoqda...</>
                  : <><Upload className="h-4 w-4 mr-2" /> {rows.length} ta mijoz yuklash</>}
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={reset}>Yana yuklash</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => onOpenChange(false)}>Yopish</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
