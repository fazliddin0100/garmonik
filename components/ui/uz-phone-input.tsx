'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  UZ_PHONE_PREFIX,
  formatUzPhoneNational,
  uzNationalDigits,
  uzPhoneE164FromNational,
} from '@/lib/phone/uz-phone';

type UzPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  className?: string;
};

/** O‘zbekiston telefoni: +998 (XX) XXX-XX-XX */
export function UzPhoneInput({
  id,
  value,
  onChange,
  disabled,
  className,
}: UzPhoneInputProps) {
  const suffix = uzNationalDigits(value);
  const display = formatUzPhoneNational(suffix);

  return (
    <div
      className={cn(
        'flex h-11 w-full max-w-[17.5rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 font-mono text-[15px] tracking-tight transition focus-within:border-violet-400 focus-within:bg-white',
        disabled && 'opacity-60',
        className,
      )}>
      <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-100/90 px-2.5 text-[13px] font-semibold text-slate-700">
        {UZ_PHONE_PREFIX}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        placeholder="(90) 123-45-67"
        value={display}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 9);
          onChange(uzPhoneE164FromNational(d));
        }}
        className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-2.5 py-2 text-[15px] shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
