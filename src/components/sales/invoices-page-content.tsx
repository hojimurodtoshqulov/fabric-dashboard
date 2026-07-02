"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoicesTable } from "./invoices-table";
import { NewInvoiceModal } from "./new-invoice-modal";

export function InvoicesPageContent() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hisob-fakturalar</h1>
          <p className="text-slate-400 text-sm mt-1">
            Barcha fakturalarni boshqarish
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Yangi faktura
        </Button>
      </div>

      <InvoicesTable />

      <NewInvoiceModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
