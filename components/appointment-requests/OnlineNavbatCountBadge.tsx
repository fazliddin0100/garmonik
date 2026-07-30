import { cn } from '@/lib/utils';

type OnlineNavbatCountBadgeProps = {
  count: number;
  active?: boolean;
  className?: string;
};

export default function OnlineNavbatCountBadge({
  count,
  active = false,
  className,
}: OnlineNavbatCountBadgeProps) {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={cn(
        'ml-auto inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
        active ? 'bg-white/25 text-white' : 'bg-sky-500 text-white',
        className,
      )}
      title={`${label} ta yangi onlayn ariza`}
      aria-label={`${label} ta yangi onlayn ariza`}>
      {label}
    </span>
  );
}
