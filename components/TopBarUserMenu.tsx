'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { staffHomePath } from '@/lib/staff-portal/auth';
import { isStaffRole, STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import { ChevronDown, LogOut, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function shortId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

type MeJson =
  | { kind: 'none' }
  | { kind: 'admin'; id: string }
  | {
      kind: 'staff';
      id: string;
      role: StaffRole;
      login: string;
      fullName: string;
    };

type SessionState =
  | { kind: 'admin'; userId: string }
  | { kind: 'staff'; login: string; fullName: string; role: StaffRole }
  | { kind: 'none' };

function meToSession(me: MeJson): SessionState {
  if (me.kind === 'admin') return { kind: 'admin', userId: me.id };
  if (me.kind === 'staff') {
    const r = me.role;
    if (typeof r === 'string' && isStaffRole(r)) {
      return {
        kind: 'staff',
        login: me.login,
        fullName: me.fullName,
        role: r,
      };
    }
  }
  return { kind: 'none' };
}

export default function TopBarUserMenu() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ kind: 'none' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const me = (await res.json()) as MeJson;
      setSession(meToSession(me));
    } catch {
      setSession({ kind: 'none' });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* ignore */
    }
    setSession({ kind: 'none' });
    router.push('/auth/login');
    router.refresh();
  }

  if (session.kind === 'none') {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 shrink-0 rounded-xl border-violet-200/80 bg-white/90 text-slate-700 shadow-sm">
        <Link href="/auth/login">Kirish</Link>
      </Button>
    );
  }

  if (session.kind === 'admin') {
    const title = 'Administrator';
    const subtitle = `Tizim admini · ${shortId(session.userId)}`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex max-w-[220px] items-center gap-2 rounded-2xl border border-violet-200/70 bg-linear-to-r from-violet-50/90 to-indigo-50/80 px-2 py-1.5 text-left shadow-sm outline-none ring-violet-300 transition hover:border-violet-300 focus-visible:ring-2 sm:px-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white">
              {initialsFromName('Admin')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="hidden truncate text-sm font-semibold text-slate-800 sm:block">
                {title}
              </span>
              <span className="hidden truncate text-[11px] text-slate-500 sm:block">
                {subtitle}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Shield className="size-4 text-violet-600" />
                {title}
              </span>
              <span className="text-xs text-slate-500">Boshqaruv paneli — to‘liq huquq</span>
              <span className="font-mono text-[11px] text-slate-400">ID: {session.userId}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg">
            <Link href="/settings" className="cursor-pointer">
              Sozlamalar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-lg">
            <Link href="/kadrlar" className="cursor-pointer">
              Kadrlar bo‘limi
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer rounded-lg"
            onClick={() => void logout()}>
            <LogOut className="size-4" />
            Tizimdan chiqish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const st = session;
  const roleLabel = STAFF_ROLE_LABELS[st.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[240px] items-center gap-2 rounded-2xl border border-emerald-200/70 bg-linear-to-r from-emerald-50/90 to-teal-50/70 px-2 py-1.5 text-left shadow-sm outline-none ring-emerald-300 transition hover:border-emerald-300 focus-visible:ring-2 sm:px-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
            {initialsFromName(st.fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="hidden truncate text-sm font-semibold text-slate-800 sm:block">
              {st.fullName}
            </span>
            <span className="hidden truncate text-[11px] text-slate-500 sm:block">
              {roleLabel} · @{st.login}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <UserRound className="size-4 text-emerald-600" />
              {st.fullName}
            </span>
            <span className="text-xs text-slate-500">{roleLabel}</span>
            <span className="font-mono text-[11px] text-slate-400">Login: {st.login}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg">
          <Link href="/reports" className="cursor-pointer">
            Hisobotlar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg">
          <Link href={staffHomePath(st.role)} className="cursor-pointer">
            Xodim kabineti
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer rounded-lg"
          onClick={() => void logout()}>
          <LogOut className="size-4" />
          Tizimdan chiqish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
