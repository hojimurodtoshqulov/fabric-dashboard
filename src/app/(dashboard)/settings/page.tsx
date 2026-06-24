import { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata: Metadata = { title: "Sozlamalar" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sozlamalar</h1>
        <p className="text-slate-400 text-sm mt-1">Tizim sozlamalari</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
