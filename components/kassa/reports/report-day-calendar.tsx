"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import {
  formatUzDateRangeLabel,
  getLocalDateString,
  isDateInRange,
  normalizeDateRange,
} from "@/lib/kassa/date";
import { cn } from "@/lib/kassa/utils";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const lastDay = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  const mm = String(month).padStart(2, "0");

  for (let day = 1; day <= lastDay; day++) {
    cells.push(`${year}-${mm}-${String(day).padStart(2, "0")}`);
  }

  return cells;
}

type ReportDayCalendarProps = {
  mode?: "single" | "range";
  selected: string;
  rangeTo?: string;
  onSelect?: (date: string) => void;
  onRangeChange?: (from: string, to: string) => void;
  activityDates?: Set<string>;
  onViewMonthChange?: (monthKey: string) => void;
  title?: string;
  hint?: string;
  activityHint?: string;
  activityDotClassName?: string;
};

export function ReportDayCalendar({
  mode = "single",
  selected,
  rangeTo,
  onSelect,
  onRangeChange,
  activityDates,
  onViewMonthChange,
  title = "Kun tanlash",
  hint,
  activityHint = "— ma'lumot bor kunlar",
  activityDotClassName = "bg-emerald-500",
}: ReportDayCalendarProps) {
  const today = getLocalDateString();
  const isRangeMode = mode === "range";
  const effectiveTo = isRangeMode ? (rangeTo ?? selected) : selected;
  const [rangeFrom, rangeEnd] = normalizeDateRange(selected, effectiveTo);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  const [viewYear, setViewYear] = useState(() => Number(selected.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selected.slice(5, 7)));

  useEffect(() => {
    setViewYear(Number(selected.slice(0, 4)));
    setViewMonth(Number(selected.slice(5, 7)));
  }, [selected]);

  useEffect(() => {
    const mm = String(viewMonth).padStart(2, "0");
    onViewMonthChange?.(`${viewYear}-${mm}`);
  }, [viewYear, viewMonth, onViewMonthChange]);

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const defaultHint = isRangeMode
    ? "Birinchi kuni bosing, keyin oxirgi kuni — oralig'dagi ma'lumotlar ko'rsatiladi."
    : "Kalendardan kunni tanlang — o'sha kunga tegishli ma'lumotlar ko'rsatiladi.";

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function handleDayClick(dateStr: string) {
    if (!isRangeMode) {
      onSelect?.(dateStr);
      return;
    }

    if (!rangeAnchor) {
      setRangeAnchor(dateStr);
      onRangeChange?.(dateStr, dateStr);
      return;
    }

    const [from, to] = normalizeDateRange(rangeAnchor, dateStr);
    onRangeChange?.(from, to);
    setRangeAnchor(null);
  }

  function resetRange() {
    setRangeAnchor(null);
    const todayStr = getLocalDateString();
    if (isRangeMode) {
      onRangeChange?.(todayStr, todayStr);
    } else {
      onSelect?.(todayStr);
    }
  }

  return (
    <Card className="border-violet-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftMonth(-1)}
              aria-label="Oldingi oy"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9rem] text-center text-sm font-semibold">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftMonth(1)}
              aria-label="Keyingi oy"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isRangeMode && (
          <p className="text-sm font-medium text-violet-900">
            {formatUzDateRangeLabel(rangeFrom, rangeEnd)}
            {rangeFrom !== rangeEnd && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({Math.round((new Date(`${rangeEnd}T12:00:00+05:00`).getTime() - new Date(`${rangeFrom}T12:00:00+05:00`).getTime()) / 86400000) + 1} kun)
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((dateStr, index) => {
            if (!dateStr) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayNum = Number(dateStr.slice(8, 10));
            const isToday = dateStr === today;
            const hasActivity = activityDates?.has(dateStr);

            let isSelected = false;
            let isRangeStart = false;
            let isRangeEnd = false;
            let isInRange = false;
            let isAnchor = false;

            if (isRangeMode) {
              isAnchor = rangeAnchor === dateStr;
              isInRange = isDateInRange(dateStr, rangeFrom, rangeEnd);
              isRangeStart = dateStr === rangeFrom;
              isRangeEnd = dateStr === rangeEnd;
              isSelected = isRangeStart || isRangeEnd || isAnchor;
            } else {
              isSelected = dateStr === selected;
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center text-sm transition-colors",
                  isRangeMode && isInRange && !isSelected && "bg-violet-100 text-violet-900",
                  isRangeMode && isRangeStart && isRangeEnd && "rounded-lg bg-violet-600 font-semibold text-white shadow-md",
                  isRangeMode && isRangeStart && !isRangeEnd && "rounded-l-lg bg-violet-600 font-semibold text-white shadow-md",
                  isRangeMode && isRangeEnd && !isRangeStart && "rounded-r-lg bg-violet-600 font-semibold text-white shadow-md",
                  isRangeMode && isAnchor && rangeFrom === rangeEnd && "rounded-lg bg-violet-600 font-semibold text-white shadow-md",
                  !isRangeMode && isSelected && "rounded-lg bg-violet-600 font-semibold text-white shadow-md",
                  !isSelected && !isInRange && "rounded-lg hover:bg-violet-50",
                  isToday && !isSelected && !isInRange && "ring-2 ring-violet-300 ring-offset-1",
                  !isSelected && !isInRange && "text-slate-700"
                )}
              >
                {dayNum}
                {hasActivity && (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1 w-1 rounded-full",
                      isSelected ? "bg-white" : activityDotClassName
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {hint ?? defaultHint}
            {activityDates && activityDates.size > 0 && (
              <span className="ml-1 inline-flex items-center gap-1">
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", activityDotClassName)} />
                {activityHint}
              </span>
            )}
          </p>
          {isRangeMode && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={resetRange}>
              Bugun
            </Button>
          )}
        </div>
        {isRangeMode && rangeAnchor && (
          <p className="mt-1 text-xs font-medium text-violet-700">
            Oxirgi kuni tanlang…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
