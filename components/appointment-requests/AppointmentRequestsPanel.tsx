'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  APPOINTMENT_REQUEST_STATUS_LABELS,
  appointmentRequestFullName,
  isOnlineQueueVisibleStatus,
  type AppointmentRequestStatus,
} from '@/lib/appointment-requests/types';
import { notifyAppointmentRequestsChanged } from '@/lib/appointment-requests/client-events';
import AppointmentRequestCreateDialog, {
  type AppointmentRequestCreatePayload,
} from '@/components/appointment-requests/AppointmentRequestCreateDialog';
import AppointmentRequestIntakeDialog, {
  type IntakeDialogRequest,
  type IntakeDialogSubmitPayload,
} from '@/components/appointment-requests/AppointmentRequestIntakeDialog';
import { formatUzPhoneDisplay } from '@/lib/phone/uz-phone';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Inbox,
  Plus,
  RefreshCw,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type ApiItem = {
  id: string;
  queue_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  disease_type: string;
  preferred_time: string | null;
  status: AppointmentRequestStatus;
  created_at: string;
};

type AppointmentRequestsPanelProps = {
  /** Admin panel yoki qabul kabineti ko‘rinishi */
  variant?: 'admin' | 'kabinet';
};

const PANEL_COPY = {
  admin: {
    title: 'Instagram arizalari',
    description:
      'Onlayn forma orqali kelgan arizalar. «Qabul qilindi» — bemor navbatga tushadi.',
    showFormLink: true,
  },
  kabinet: {
    title: 'Onlayn navbat',
    description:
      'Onlayn arizalar va klinikaga o‘zi kelgan bemorlar. «Qabul qilindi» — bemor asosiy navbatga o‘tadi.',
    showFormLink: false,
  },
} as const;

const STATUS_BADGE_CLASS: Record<AppointmentRequestStatus, string> = {
  new: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  confirmed: 'bg-amber-100 text-amber-900 hover:bg-amber-100',
  received: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  cancelled: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
};

const STATUS_ACTIONS: {
  status: AppointmentRequestStatus;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    status: 'new',
    label: 'Yangi',
    icon: Inbox,
    activeClass: 'bg-sky-600 text-white ring-2 ring-sky-200',
    idleClass:
      'border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800',
  },
  {
    status: 'confirmed',
    label: 'Tasdiqlandi',
    icon: CheckCircle2,
    activeClass: 'bg-amber-500 text-white ring-2 ring-amber-200',
    idleClass:
      'border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800',
  },
  {
    status: 'received',
    label: 'Qabul qilindi',
    icon: UserRoundCheck,
    activeClass: 'bg-emerald-600 text-white ring-2 ring-emerald-200',
    idleClass:
      'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800',
  },
  {
    status: 'cancelled',
    label: 'Bekor qilindi',
    icon: Ban,
    activeClass: 'bg-slate-600 text-white ring-2 ring-slate-300',
    idleClass:
      'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  },
];

function AppointmentRequestStatusActions({
  currentStatus,
  disabled,
  onSelect,
  onRequestReceive,
}: {
  currentStatus: AppointmentRequestStatus;
  disabled: boolean;
  onSelect: (status: AppointmentRequestStatus) => void;
  onRequestReceive?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {STATUS_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isActive = currentStatus === action.status;
        const isReceive = action.status === 'received';
        return (
          <Tooltip key={action.status}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled || isActive}
                aria-label={action.label}
                aria-pressed={isActive}
                onClick={() => {
                  if (isReceive && onRequestReceive) {
                    onRequestReceive();
                    return;
                  }
                  onSelect(action.status);
                }}
                className={cn(
                  'size-8 shrink-0 rounded-lg border',
                  isActive ? action.activeClass : action.idleClass,
                )}>
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{action.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildListQuery(statusFilter: string): string {
  if (statusFilter === 'online') return '?activeOnly=1';
  if (statusFilter !== 'all') {
    return `?status=${encodeURIComponent(statusFilter)}`;
  }
  return '';
}

function itemMatchesFilter(
  status: AppointmentRequestStatus,
  statusFilter: string,
): boolean {
  if (statusFilter === 'online') return isOnlineQueueVisibleStatus(status);
  if (statusFilter === 'all') return true;
  return status === statusFilter;
}

export default function AppointmentRequestsPanel({
  variant = 'admin',
}: AppointmentRequestsPanelProps) {
  const copy = PANEL_COPY[variant];
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    variant === 'kabinet' ? 'online' : 'all',
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [intakeRequest, setIntakeRequest] = useState<IntakeDialogRequest | null>(
    null,
  );
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildListQuery(statusFilter);
      const res = await fetch(`/api/appointment-requests${q}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as { items?: ApiItem[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'Yuklab bo‘lmadi');
      setItems(Array.isArray(json.items) ? json.items : []);
      notifyAppointmentRequestsChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const newCount = useMemo(
    () => items.filter((i) => i.status === 'new').length,
    [items],
  );

  async function updateStatus(
    id: string,
    status: AppointmentRequestStatus,
    intake?: IntakeDialogSubmitPayload,
  ): Promise<boolean> {
    const existing = items.find((row) => row.id === id);
    if (existing?.status === status) return false;

    setUpdatingId(id);
    try {
      const res = await fetch('/api/appointment-requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          ...(intake ?
            {
              intake: {
                ...intake,
                age: Number.parseInt(intake.age, 10),
              },
            }
          : {}),
        }),
      });
      const json = (await res.json()) as { item?: ApiItem; error?: string };
      if (!res.ok || !json.item) {
        throw new Error(json.error || 'Yangilanmadi');
      }
      setItems((prev) => {
        const updated = json.item!;
        if (!itemMatchesFilter(updated.status, statusFilter)) {
          return prev.filter((row) => row.id !== id);
        }
        return prev.map((row) =>
          row.id === id ? { ...row, ...updated } : row,
        );
      });
      notifyAppointmentRequestsChanged();
      toast.success(
        status === 'received' ?
          'Bemor klinikaga qabul qilindi va asosiy navbatga qo‘shildi'
        : status === 'cancelled' ?
          'Ariza bekor qilindi va onlayn navbatdan olindi'
        : `Holat: ${APPOINTMENT_REQUEST_STATUS_LABELS[status]}`,
      );
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  async function submitIntake(payload: IntakeDialogSubmitPayload) {
    if (!intakeRequest) return;
    setIntakeSaving(true);
    const ok = await updateStatus(intakeRequest.id, 'received', payload);
    setIntakeSaving(false);
    if (ok) setIntakeRequest(null);
  }

  async function createWalkIn(payload: AppointmentRequestCreatePayload) {
    setCreateSaving(true);
    try {
      const res = await fetch('/api/appointment-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        item?: ApiItem;
        queueNumber?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || 'Saqlanmadi');

      const created = json.item;
      if (created && itemMatchesFilter(created.status, statusFilter)) {
        setItems((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
      }
      notifyAppointmentRequestsChanged();
      toast.success(
        json.message ||
          `Bemor qo‘shildi${json.queueNumber ? `: ${json.queueNumber}` : ''}`,
      );
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setCreateSaving(false);
    }
  }

  return (
    <TooltipProvider>
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <AppointmentRequestCreateDialog
        open={createOpen}
        saving={createSaving}
        onOpenChange={setCreateOpen}
        onSubmit={createWalkIn}
      />
      <AppointmentRequestIntakeDialog
        request={intakeRequest}
        open={intakeRequest !== null}
        saving={intakeSaving || updatingId === intakeRequest?.id}
        onOpenChange={(open) => {
          if (!open && !intakeSaving) setIntakeRequest(null);
        }}
        onSubmit={submitIntake}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-pink-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {copy.title}
            </h2>
            {newCount > 0 ?
              <Badge className="bg-sky-600 hover:bg-sky-600">{newCount} yangi</Badge>
            : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={createSaving}>
            <Plus className="size-4" />
            Yangi bemor
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Holat" />
            </SelectTrigger>
            <SelectContent>
              {variant === 'kabinet' ?
                <>
                  <SelectItem value="online">Faol onlayn</SelectItem>
                  <SelectItem value="new">Yangi</SelectItem>
                  <SelectItem value="confirmed">Tasdiqlandi</SelectItem>
                  <SelectItem value="received">Qabul qilindi (arxiv)</SelectItem>
                  <SelectItem value="cancelled">Bekor qilindi</SelectItem>
                </>
              : <>
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="online">Faol onlayn</SelectItem>
                  <SelectItem value="new">Yangi</SelectItem>
                  <SelectItem value="confirmed">Tasdiqlandi</SelectItem>
                  <SelectItem value="received">Qabul qilindi</SelectItem>
                  <SelectItem value="cancelled">Bekor qilindi</SelectItem>
                </>
              }
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Yangilash">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navbat №</TableHead>
              <TableHead>Bemor</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Sabab</TableHead>
              <TableHead>Qulay vaqt</TableHead>
              <TableHead>Vaqt</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="min-w-[11rem] text-right">Amal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ?
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            : items.length === 0 ?
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                  {statusFilter === 'online' ?
                    'Faol onlayn ariza yo‘q'
                  : 'Hozircha ariza yo‘q'}
                </TableCell>
              </TableRow>
            : items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm font-semibold text-violet-800">
                    {row.queue_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">
                      {appointmentRequestFullName(row)}
                    </div>
                    <div className="text-xs text-slate-500">{row.address}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatUzPhoneDisplay(row.phone)}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-slate-700">
                    {row.disease_type}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {row.preferred_time || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE_CLASS[row.status]}>
                      {APPOINTMENT_REQUEST_STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AppointmentRequestStatusActions
                      currentStatus={row.status}
                      disabled={updatingId === row.id}
                      onSelect={(status) => void updateStatus(row.id, status)}
                      onRequestReceive={() =>
                        setIntakeRequest({
                          id: row.id,
                          queue_number: row.queue_number,
                          first_name: row.first_name,
                          last_name: row.last_name,
                          phone: row.phone,
                          address: row.address,
                          disease_type: row.disease_type,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {copy.showFormLink ?
        <p className="text-xs text-slate-500">
          Ochiq forma manzili:{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">/ariza</code> — Instagram
          profiliga shu havolani qo‘ying.
        </p>
      : null}
    </div>
    </TooltipProvider>
  );
}
