'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Ban,
  CalendarRange,
  Check,
  Ellipsis,
  KeyRound,
  RefreshCcw,
  ShieldAlert,
  UserCog,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type DeniedLog = {
  _id: string;
  actorKind: string;
  actorLogin?: string;
  actorRole?: string;
  routeGroup?: string;
  resourceKey: string;
  method: string;
  ip?: string;
  reason: string;
  createdAt: string;
};

type SecurityEvent = {
  _id: string;
  eventType: string;
  actorKind: string;
  actorLogin?: string;
  actorRole?: string;
  target?: string;
  ip?: string;
  createdAt: string;
};

type BlockedIp = {
  _id: string;
  ip: string;
  reason?: string;
  createdByLogin?: string;
  createdAt: string;
};

type AdminRow = {
  _id: string;
  login: string;
  roleLabel?: string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  age?: number;
  phone?: string;
};

type StaffRow = {
  _id: string;
  login: string;
  authEmail?: string;
  fullName: string;
  role: string;
  isActive: boolean;
  department?: string;
};

export default function SecurityCenterPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorKind, setActorKind] = useState('');
  const [ipFilter, setIpFilter] = useState('');

  const [denied, setDenied] = useState<DeniedLog[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [blocked, setBlocked] = useState<BlockedIp[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  const [newBlockedIp, setNewBlockedIp] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingUser, setSavingUser] = useState('');
  const [deletingUser, setDeletingUser] = useState('');
  const [adminQuery, setAdminQuery] = useState('');
  const [staffQuery, setStaffQuery] = useState('');

  const [adminEdit, setAdminEdit] = useState<
    Record<string, Partial<AdminRow> & { password?: string }>
  >({});
  const [staffEdit, setStaffEdit] = useState<
    Record<string, Partial<StaffRow> & { password?: string }>
  >({});

  async function loadAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      if (actorKind) qs.set('actorKind', actorKind);
      if (ipFilter) qs.set('ip', ipFilter);

      const [logsRes, blockedRes, usersRes] = await Promise.all([
        fetch(`/api/security/logs?${qs.toString()}`, {
          credentials: 'include',
        }),
        fetch('/api/security/blocked-ips', { credentials: 'include' }),
        fetch('/api/security/users', { credentials: 'include' }),
      ]);

      if (!logsRes.ok || !blockedRes.ok || !usersRes.ok) {
        throw new Error('Security maʼlumotlarini olishda xatolik');
      }
      const logsJson = (await logsRes.json()) as {
        denied?: DeniedLog[];
        events?: SecurityEvent[];
      };
      const blockedJson = (await blockedRes.json()) as { items?: BlockedIp[] };
      const usersJson = (await usersRes.json()) as {
        admins?: AdminRow[];
        staff?: StaffRow[];
      };

      setDenied(logsJson.denied ?? []);
      setEvents(logsJson.events ?? []);
      setBlocked(blockedJson.items ?? []);
      setAdmins(usersJson.admins ?? []);
      setStaff(usersJson.staff ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetch('/api/admin/touch-login', {
      method: 'POST',
      credentials: 'include',
    });
  }, []);

  async function blockIp() {
    if (!newBlockedIp.trim()) return;
    const res = await fetch('/api/security/blocked-ips', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: newBlockedIp.trim(),
        reason: newBlockedReason.trim(),
      }),
    });
    if (!res.ok) {
      toast.error('IP bloklab bo‘lmadi');
      return;
    }
    setNewBlockedIp('');
    setNewBlockedReason('');
    toast.success('IP bloklandi');
    void loadAll();
  }

  async function unblockIp(ip: string) {
    const res = await fetch('/api/security/blocked-ips', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    if (!res.ok) {
      toast.error('IP ochib bo‘lmadi');
      return;
    }
    toast.success('IP blokdan chiqarildi');
    void loadAll();
  }

  async function saveUser(kind: 'admin' | 'staff', id: string) {
    setSavingUser(`${kind}:${id}`);
    const source = kind === 'admin' ? adminEdit[id] : staffEdit[id];
    if (!source) {
      setSavingUser('');
      return;
    }
    const res = await fetch('/api/security/users', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        id,
        ...source,
      }),
    });
    if (!res.ok) {
      let message = 'Saqlashda xatolik';
      try {
        const json = (await res.json()) as { error?: string };
        if (json?.error) message = json.error;
      } catch {
        // ignore parse error
      }
      toast.error(message);
      setSavingUser('');
      return;
    }
    toast.success('Foydalanuvchi yangilandi');
    if (kind === 'admin') {
      setAdminEdit((prev) => ({ ...prev, [id]: {} }));
    } else {
      setStaffEdit((prev) => ({ ...prev, [id]: {} }));
    }
    setSavingUser('');
    void loadAll();
  }

  async function deleteUser(kind: 'admin' | 'staff', id: string) {
    if (!confirm('Rostdan ham o‘chirmoqchimisiz?')) return;
    setDeletingUser(`${kind}:${id}`);
    const res = await fetch('/api/security/users', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    });
    if (!res.ok) {
      let message = 'O‘chirishda xatolik';
      try {
        const json = (await res.json()) as { error?: string };
        if (json?.error) message = json.error;
      } catch {
        // ignore parse error
      }
      toast.error(message);
      setDeletingUser('');
      return;
    }
    toast.success('Foydalanuvchi o‘chirildi');
    setDeletingUser('');
    void loadAll();
  }

  const filteredAdmins = useMemo(() => {
    const q = adminQuery.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      [a.login, a.roleLabel, a.firstName, a.lastName, a.phone].join(' ').toLowerCase().includes(q),
    );
  }, [admins, adminQuery]);

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => [s.login, s.fullName, s.role, s.department].join(' ').toLowerCase().includes(q));
  }, [staff, staffQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
              Super Admin
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Security Center
            </h2>
            <p className="text-sm text-slate-500">
              Login voqealari, ruxsat rad etishlar, IP block va tezkor
              credential boshqaruvi.
            </p>
          </div>
          <Button
            onClick={() => void loadAll()}
            disabled={loading}
            className="gap-2">
            <RefreshCcw className="size-4" />
            Yangilash
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">Denied Attempts</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {denied.length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">Auth Events</p>
          <p className="mt-2 text-2xl font-bold text-indigo-600">
            {events.length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">Blocked IPs</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {blocked.length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">Managed Accounts</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {admins.length + staff.length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarRange className="size-4 text-violet-600" />
          <h3 className="font-semibold">Log Filter</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            placeholder="actorKind: admin/staff"
            value={actorKind}
            onChange={(e) => setActorKind(e.target.value)}
          />
          <Input
            placeholder="IP filter"
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={() => void loadAll()}>
            Filterni qo‘llash
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="size-4 text-red-600" />
            <h3 className="font-semibold">API Denied Audit</h3>
          </div>
          <div className="max-h-96 overflow-auto text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-slate-500">
                  <th className="py-1">#</th>
                  <th className="py-1">Vaqt</th>
                  <th>Kim</th>
                  <th>Key</th>
                  <th>IP</th>
                  <th>Sabab</th>
                </tr>
              </thead>
              <tbody>
                {denied.map((r, index) => (
                  <tr key={r._id} className="border-t">
                    <td className="py-1 text-slate-400">{index + 1}</td>
                    <td className="py-1">
                      {new Date(r.createdAt).toLocaleString('uz-UZ')}
                    </td>
                    <td>
                      {r.actorKind}:{r.actorLogin || '-'}
                    </td>
                    <td>
                      {r.method} {r.resourceKey}
                    </td>
                    <td>{r.ip || '-'}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="size-4 text-indigo-600" />
            <h3 className="font-semibold">Auth / Action Events</h3>
          </div>
          <div className="max-h-96 overflow-auto text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-slate-500">
                  <th className="py-1">#</th>
                  <th className="py-1">Vaqt</th>
                  <th>Event</th>
                  <th>Kim</th>
                  <th>IP</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {events.map((r, index) => (
                  <tr key={r._id} className="border-t">
                    <td className="py-1 text-slate-400">{index + 1}</td>
                    <td className="py-1">
                      {new Date(r.createdAt).toLocaleString('uz-UZ')}
                    </td>
                    <td>{r.eventType}</td>
                    <td>
                      {r.actorKind}:{r.actorLogin || '-'}
                    </td>
                    <td>{r.ip || '-'}</td>
                    <td>{r.target || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Ban className="size-4 text-amber-600" />
            <h3 className="font-semibold">IP Block List</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="IP (masalan 192.168.1.1)"
              value={newBlockedIp}
              onChange={(e) => setNewBlockedIp(e.target.value)}
            />
            <Input
              placeholder="Sabab"
              value={newBlockedReason}
              onChange={(e) => setNewBlockedReason(e.target.value)}
            />
            <Button onClick={() => void blockIp()}>Block</Button>
          </div>
          <div className="mt-3 max-h-64 overflow-auto text-xs">
            {blocked.map((b) => (
              <div
                key={b._id}
                className="mb-2 flex items-center justify-between rounded-lg border p-2">
                <div>
                  <p className="font-mono">{b.ip}</p>
                  <p className="text-slate-500">
                    {b.reason || '—'} · {b.createdByLogin || '-'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void unblockIp(b.ip)}>
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="size-4 text-emerald-600" />
            <h3 className="font-semibold">User Credential Management</h3>
          </div>
          <p className="text-xs text-slate-500">
            Bu yerda login, role va parollarni tahrirlashingiz yoki userni
            o‘chirishingiz mumkin.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <UserCog className="size-4 text-violet-600" />
          Adminlar (tahrirlash / o‘chirish)
        </h3>
        <Input
          value={adminQuery}
          onChange={(e) => setAdminQuery(e.target.value)}
          placeholder="Admin qidirish..."
          className="mb-3 max-w-md"
        />
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-225 text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500">
                <th className="py-2">#</th>
                <th className="py-2">Login</th>
                <th>RoleLabel</th>
                <th>Ism</th>
                <th>Familiya</th>
                <th>Otasining ismi</th>
                <th>Yosh</th>
                <th>Telefon</th>
                <th>Yangi parol</th>
                <th className="text-center" />
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((a, index) => {
                const e = adminEdit[a._id] ?? {};
                return (
                  <tr key={a._id} className="border-t">
                    <td className="py-1 text-slate-400">{index + 1}</td>
                    <td className="py-1">
                      <Input
                        value={e.login ?? a.login ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], login: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.roleLabel ?? a.roleLabel ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: {
                              ...p[a._id],
                              roleLabel: ev.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.firstName ?? a.firstName ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: {
                              ...p[a._id],
                              firstName: ev.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.lastName ?? a.lastName ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], lastName: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.fatherName ?? a.fatherName ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: {
                              ...p[a._id],
                              fatherName: ev.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        value={String(e.age ?? a.age ?? '')}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: {
                              ...p[a._id],
                              age:
                                ev.target.value.trim() === '' ?
                                  undefined
                                : (Number.parseInt(ev.target.value, 10) || 0),
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.phone ?? a.phone ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], phone: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="password"
                        placeholder="ixtiyoriy"
                        value={e.password ?? ''}
                        onChange={(ev) =>
                          setAdminEdit((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], password: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="text-center">
                      <Check className="mx-auto size-4 text-emerald-600" />
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={savingUser === `admin:${a._id}`}
                            onClick={() => void saveUser('admin', a._id)}>
                            Saqlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-rose-600"
                            disabled={deletingUser === `admin:${a._id}`}
                            onClick={() => void deleteUser('admin', a._id)}>
                            O‘chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <UserCog className="size-4 text-emerald-600" />
          Staff userlar (tahrirlash / o‘chirish)
        </h3>
        <Input
          value={staffQuery}
          onChange={(e) => setStaffQuery(e.target.value)}
          placeholder="Staff qidirish..."
          className="mb-3 max-w-md"
        />
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-225 text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500">
                <th className="py-2">#</th>
                <th className="py-2">Login</th>
                <th>Auth email</th>
                <th>F.I.SH</th>
                <th>Role</th>
                <th>Department</th>
                <th />
                <th>Yangi parol</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s, index) => {
                const e = staffEdit[s._id] ?? {};
                return (
                  <tr key={s._id} className="border-t">
                    <td className="py-1 text-slate-400">{index + 1}</td>
                    <td className="py-1">
                      <Input
                        value={e.login ?? s.login ?? ''}
                        onChange={(ev) =>
                          setStaffEdit((p) => ({
                            ...p,
                            [s._id]: { ...p[s._id], login: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <p className="px-3 py-2 text-slate-700">
                        {s.authEmail?.trim() || '-'}
                      </p>
                    </td>
                    <td>
                      <Input
                        value={e.fullName ?? s.fullName ?? ''}
                        onChange={(ev) =>
                          setStaffEdit((p) => ({
                            ...p,
                            [s._id]: { ...p[s._id], fullName: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.role ?? s.role ?? ''}
                        onChange={(ev) =>
                          setStaffEdit((p) => ({
                            ...p,
                            [s._id]: { ...p[s._id], role: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={e.department ?? s.department ?? ''}
                        onChange={(ev) =>
                          setStaffEdit((p) => ({
                            ...p,
                            [s._id]: {
                              ...p[s._id],
                              department: ev.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="text-center">
                      {(e.isActive ?? s.isActive) ? (
                        <Check className="mx-auto size-4 text-emerald-600" />
                      ) : (
                        <X className="mx-auto size-4 text-amber-500" />
                      )}
                    </td>
                    <td>
                      <Input
                        type="password"
                        placeholder="ixtiyoriy"
                        value={e.password ?? ''}
                        onChange={(ev) =>
                          setStaffEdit((p) => ({
                            ...p,
                            [s._id]: { ...p[s._id], password: ev.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setStaffEdit((p) => ({
                                ...p,
                                [s._id]: {
                                  ...p[s._id],
                                  isActive: !(p[s._id]?.isActive ?? s.isActive),
                                },
                              }))
                            }>
                            {(e.isActive ?? s.isActive) ? 'Deaktiv qilish' : 'Aktiv qilish'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={savingUser === `staff:${s._id}`}
                            onClick={() => void saveUser('staff', s._id)}>
                            Saqlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-rose-600"
                            disabled={deletingUser === `staff:${s._id}`}
                            onClick={() => void deleteUser('staff', s._id)}>
                            O‘chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
