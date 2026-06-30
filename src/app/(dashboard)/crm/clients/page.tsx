import { Metadata } from "next";
import { Suspense } from "react";
import { ClientsPageContent } from "@/components/crm/clients-page-content";

export const metadata: Metadata = { title: "Mijozlar — CRM" };

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsPageContent />
    </Suspense>
  );
}
