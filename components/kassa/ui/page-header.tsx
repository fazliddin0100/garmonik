import { cn } from "@/lib/kassa/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  accent = "violet",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: "violet" | "emerald" | "amber" | "sky" | "rose";
  className?: string;
}) {
  const accents = {
    violet: "from-violet-500 to-indigo-600 shadow-violet-500/30",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/30",
    sky: "from-sky-500 to-blue-600 shadow-sky-500/30",
    rose: "from-rose-500 to-pink-600 shadow-rose-500/30",
  };

  return (
    <div className={cn("animate-fade-up mb-8 flex items-start gap-4", className)}>
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
          accents[accent]
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
        )}
      </div>
    </div>
  );
}
