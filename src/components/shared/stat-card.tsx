import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "indigo" | "green" | "red" | "yellow" | "blue" | "purple";
  className?: string;
  /** Makes the whole card a link to the page behind the figure. */
  href?: string;
}

const colorMap = {
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", icon: "text-indigo-400" },
  green: { bg: "bg-green-500/10", text: "text-green-400", icon: "text-green-400" },
  red: { bg: "bg-red-500/10", text: "text-red-400", icon: "text-red-400" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: "text-yellow-400" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", icon: "text-purple-400" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "indigo",
  className,
  href,
}: StatCardProps) {
  const colors = colorMap[color];

  const card = (
    <div
      className={cn(
        "bg-slate-900 border border-slate-800 rounded-xl p-5",
        href && "h-full transition-colors group-hover:border-slate-600 group-hover:bg-slate-800/40",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {/* wraps instead of truncating — "6 mlrd 440 mln so'm" must be readable in full */}
          <p className="text-2xl font-bold text-white mt-1 leading-tight break-words">{value}</p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend.value >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", colors.bg)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
      {card}
    </Link>
  ) : card;
}
