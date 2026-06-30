import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const file = "D:\\тошкент\\алмазар.xlsx";
const wb = XLSX.read(readFileSync(file));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log("Ustunlar:", rows[0]);
console.log("1-qator:", rows[1]);
console.log("2-qator:", rows[2]);
