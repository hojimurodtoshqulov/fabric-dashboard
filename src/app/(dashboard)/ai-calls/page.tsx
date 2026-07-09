"use client";

import { useState } from "react";
import Link from "next/link";
import { CallsTable } from "@/components/calls/calls-table";
import { NewCallModal } from "@/components/calls/new-call-modal";
import { CallResultsStats } from "@/components/calls/call-results-stats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, LayoutTemplate, BarChart3 } from "lucide-react";

export default function AICallsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Qo'ng'iroqlar</h1>
          <p className="text-slate-400 text-sm mt-1">
            Hybrid ovozli avtomatlashtirish tizimi
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          <Phone className="mr-2 h-4 w-4" /> Qo'ng'iroq boshlash
        </Button>
      </div>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="calls" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <Phone className="w-3.5 h-3.5" /> Barcha qo'ng'iroqlar
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <LayoutTemplate className="w-3.5 h-3.5" /> Ovoz shablonlari
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Natijalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="mt-0">
          <CallsTable />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">Faol va nofaol ovoz shablonlari</p>
            <Link href="/dashboard/ai-calls/templates">
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" /> Shablonlarni boshqarish
              </Button>
            </Link>
          </div>
          {/* Inline mini-preview of templates */}
          <TemplatesPreview />
        </TabsContent>

        <TabsContent value="results" className="mt-0">
          <CallResultsStats />
        </TabsContent>
      </Tabs>

      <NewCallModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function TemplatesPreview() {
  const [data, setData] = useState<{ templates: Array<{ id: string; name: string; type: string; isActive: boolean; _count?: { calls: number } }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch("/api/voice-templates")
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  });

  if (loading) return <div className="py-8 text-center text-slate-500 text-sm">Yuklanmoqda...</div>;

  const templates = data?.templates ?? [];
  if (templates.length === 0) {
    return (
      <div className="py-12 text-center">
        <LayoutTemplate className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-400 text-sm">Shablonlar yo'q</p>
        <Link href="/dashboard/ai-calls/templates">
          <Button className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-sm" size="sm">
            Birinchi shablonni yaratish
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.slice(0, 6).map((t) => (
        <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t._count?.calls ?? 0} ta qo'ng'iroq</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-500"}`}>
            {t.isActive ? "Faol" : "Nofaol"}
          </span>
        </div>
      ))}
      {templates.length > 6 && (
        <Link href="/dashboard/ai-calls/templates" className="bg-slate-800/50 border border-dashed border-slate-700 rounded-lg px-4 py-3 flex items-center justify-center text-slate-400 text-sm hover:bg-slate-800 transition-colors">
          +{templates.length - 6} ta ko'proq →
        </Link>
      )}
    </div>
  );
}
