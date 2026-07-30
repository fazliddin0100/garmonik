import { cn } from "@/lib/kassa/utils";
import type { LucideIcon } from "lucide-react";

const variants = {
  violet: {
    wrap: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    icon: "bg-violet-500/10 text-violet-600",
    value: "text-violet-700",
  },
  emerald: {
    wrap: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-500/10 text-emerald-600",
    value: "text-emerald-700",
  },
  amber: {
    wrap: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-500/10 text-amber-600",
    value: "text-amber-700",
  },
  rose: {
    wrap: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    icon: "bg-rose-500/10 text-rose-600",
    value: "text-rose-700",
  },
  slate: {
    wrap: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
    icon: "bg-slate-500/10 text-slate-600",
    value: "text-slate-800",
  },
  sky: {
    wrap: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    icon: "bg-sky-500/10 text-sky-600",
    value: "text-sky-700",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = "violet",
  delay = 0,
  negative,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: keyof typeof variants;
  delay?: number;
  negative?: boolean;
}) {
  const v = variants[variant];
  return (
    <div
      className={cn(
        "animate-fade-up group min-w-0 overflow-hidden rounded-2xl border p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5",
        v.wrap
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            v.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase leading-snug tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 break-words text-base font-bold leading-tight tracking-tight tabular-nums sm:text-lg",
              negative ? "text-destructive" : v.value
            )}
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
