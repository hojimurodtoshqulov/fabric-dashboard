"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Users, ShoppingCart, CreditCard,
  Phone, MessageSquare, BarChart3, Megaphone,
  Globe, CheckSquare, Bell, Settings, Warehouse,
  ChevronLeft, ChevronRight, Building2, HardHat, Wallet, Receipt, PiggyBank,
} from "lucide-react";
import { canOpen } from "@/lib/auth/access";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";

const NAV_ITEMS = [
  { href: "/overview", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/crm/clients", label: "CRM", icon: Users },
  { href: "/budget-orgs", label: "Budjet tashkilotlari", icon: Building2 },
  { href: "/sales/invoices", label: "Savdo", icon: ShoppingCart },
  { href: "/sales/debts", label: "Qarzlar", icon: CreditCard },
  { href: "/warehouse", label: "Omborxona", icon: Warehouse },
  { href: "/hr", label: "Xodimlar", icon: HardHat },
  { href: "/hr/payroll", label: "Oylik", icon: Wallet },
  { href: "/finance", label: "Xarajatlar", icon: Receipt },
  { href: "/finance/profit", label: "Foyda hisobi", icon: PiggyBank },
  { href: "/ai-calls", label: "AI Qo'ng'iroqlar", icon: Phone },
  { href: "/messages", label: "Xabarlar", icon: MessageSquare },
  { href: "/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/website", label: "Veb-sayt", icon: Globe },
  { href: "/tasks", label: "Vazifalar", icon: CheckSquare },
  { href: "/notifications", label: "Bildirishnomalar", icon: Bell },
  { href: "/settings", label: "Sozlamalar", icon: Settings },
];

export function Sidebar({ role }: { role?: string }) {
  const items = NAV_ITEMS.filter((item) => canOpen(role, item.href));
  const pathname = usePathname();
  // Most specific match wins, so /hr/payroll doesn't also light up /hr
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <Logo size={collapsed ? 32 : 40} priority />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Selxozmash</p>
            <p className="text-slate-500 text-xs">Boshqaruv</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center p-3 border-t border-slate-800 text-slate-500 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
