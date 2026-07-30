"use client";

import { Input } from "@/components/kassa/ui/input";
import { cn } from "@/lib/kassa/utils";
import { extractUzPhoneDigits, formatUzPhoneDisplay } from "@/lib/kassa/phone";

export function PhoneInput({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}) {
  function handleChange(raw: string) {
    onChange(extractUzPhoneDigits(raw));
  }

  return (
    <div className={cn("flex h-10 overflow-hidden rounded-md border border-input bg-white", className)}>
      <span className="flex shrink-0 items-center border-r bg-slate-50 px-3 text-sm font-medium text-slate-600">
        +998
      </span>
      <Input
        id={id}
        value={formatUzPhoneDisplay(value)}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="(90) 123-45-67"
        inputMode="numeric"
        maxLength={15}
        className="border-0 bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
