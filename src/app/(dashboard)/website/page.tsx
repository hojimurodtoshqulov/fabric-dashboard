import { Metadata } from "next";
import { WebsiteControl } from "@/components/website/website-control";

export const metadata: Metadata = { title: "Veb-sayt boshqaruvi" };

export default function WebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Veb-sayt boshqaruvi</h1>
        <p className="text-slate-400 text-sm mt-1">Mahsulotlar, bannerlar va chegirmalarni boshqarish</p>
      </div>
      <WebsiteControl />
    </div>
  );
}
