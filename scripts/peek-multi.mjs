import * as XLSX from "xlsx";
import { readFileSync } from "fs";

for (const name of ["чиноз", "алмалик", "охангарон"]) {
  const wb = XLSX.read(readFileSync(`D:\\тошкент\\${name}.xlsx`));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const regionVals = [...new Set(rows.slice(1).map(r => String(r[4] ?? "").trim()).filter(Boolean))];
  console.log(`${name}.xlsx → Регион ustuni: ${JSON.stringify(regionVals)}`);
}
