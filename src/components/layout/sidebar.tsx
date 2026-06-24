"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Users, ShoppingCart, CreditCard,
  Phone, MessageSquare, BarChart3, Megaphone,
  Globe, CheckSquare, Bell, Settings, Factory,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/overview", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/crm/clients", label: "CRM", icon: Users },
  { href: "/sales/invoices", label: "Savdo", icon: ShoppingCart },
  { href: "/sales/debts", label: "Qarzlar", icon: CreditCard },
  { href: "/ai-calls", label: "AI Qo'ng'iroqlar", icon: Phone },
  { href: "/messages/telegram", label: "Xabarlar", icon: MessageSquare },
  { href: "/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/website", label: "Veb-sayt", icon: Globe },
  { href: "/tasks", label: "Vazifalar", icon: CheckSquare },
  { href: "/notifications", label: "Bildirishnomalar", icon: Bell },
  { href: "/settings", label: "Sozlamalar", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
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
        <div className="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
          <Factory className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Fabric OS</p>
            <p className="text-slate-500 text-xs">Boshqaruv</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/overview" && pathname.startsWith(item.href));
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
