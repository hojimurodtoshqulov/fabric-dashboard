import { Metadata } from "next";
import { DuplicatesReview } from "@/components/crm/duplicates-review";

export const metadata: Metadata = { title: "Dublikatlar — CRM" };

export default function DuplicatesPage() {
  return <DuplicatesReview />;
}
