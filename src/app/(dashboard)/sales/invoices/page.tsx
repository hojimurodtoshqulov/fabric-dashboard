import { Metadata } from "next";
import { InvoicesPageContent } from "@/components/sales/invoices-page-content";

export const metadata: Metadata = { title: "Hisob-fakturalar — Savdo" };

export default function InvoicesPage() {
  return <InvoicesPageContent />;
}
