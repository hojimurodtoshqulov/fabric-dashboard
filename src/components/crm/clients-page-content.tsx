"use client";

import { useState } from "react";
import { ClientsTable } from "@/components/crm/clients-table";
import { AddClientModal } from "@/components/crm/add-client-modal";
import { ImportClientsModal } from "@/components/crm/import-clients-modal";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet } from "lucide-react";

export function ClientsPageContent() {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mijozlar</h1>
          <p className="text-slate-400 text-sm mt-1">Barcha mijozlarni boshqarish</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-400" />
            Exceldan yuklash
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Yangi mijoz
          </Button>
        </div>
      </div>

      <ClientsTable />

      <AddClientModal open={addOpen} onOpenChange={setAddOpen} />
      <ImportClientsModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
