import { Metadata } from "next";
import { CallsTable } from "@/components/calls/calls-table";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export const metadata: Metadata = { title: "AI Qo'ng'iroqlar" };

export default function AICallsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Qo'ng'iroqlar</h1>
          <p className="text-slate-400 text-sm mt-1">Avtomatik qo'ng'iroqlar tarixi va boshqaruvi</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500">
          <Phone className="mr-2 h-4 w-4" /> Qo'ng'iroq boshlash
        </Button>
      </div>
      <CallsTable />
    </div>
  );
}
