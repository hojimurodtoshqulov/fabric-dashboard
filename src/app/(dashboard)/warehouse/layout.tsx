"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { href: "/warehouse",            label: "Dashboard"        },
  { href: "/warehouse/items",      label: "Mahsulotlar"      },
  { href: "/warehouse/movements",  label: "Harakatlar"       },
  { href: "/warehouse/production", label: "Ishlab chiqarish" },
  { href: "/warehouse/suppliers",  label: "Yetkazuvchilar"   },
  { href: "/warehouse/reports",    label: "Hisobotlar"       },
];

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/warehouse" ? pathname === "/warehouse" : pathname.startsWith(href);

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/15 rounded-xl">
              <Factory className="h-5 w-5 text-orange-400" />
            </div>
            Omborxona
          </h1>
          <p className="text-slate-400 text-sm mt-1">Ombor holati va harakatlar</p>
        </div>
        <Link href="/warehouse/movements">
          <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2 h-9">
            <Plus className="h-4 w-4" /> Kirim / Chiqim
          </Button>
        </Link>
      </div>

      {/* Tab nav */}
      <nav className="flex gap-1 border-b border-slate-800 mb-6">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive(tab.href)
                ? "border-orange-500 text-orange-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
