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
import {
  adminCanAccessReportsRoute,
  adminHomePathForRouteGroup,
  adminReportsPathForRouteGroup,
  adminRestrictedNavLinks,
  adminUsesRestrictedShell,
  isAdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import { staffHomePath } from '@/lib/staff-portal/auth';
import { isStaffRole, STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import { ChevronDown, LogOut, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MeJson =
  | { kind: 'none' }
  | {
      kind: 'admin';
      id: string;
      routeGroup?: string;
      login?: string;
      fullName?: string;
      roleLabel?: string;
    }
  | {
      kind: 'staff';
      id: string;
      role: StaffRole;
      login: string;
      fullName: string;
    };

type MenuAction = {
  href: string;
  label: string;
};

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function uniqByHref(items: MenuAction[]): MenuAction[] {
  const seen = new Set<string>();
  const out: MenuAction[] = [];
  for (const it of items) {
    if (seen.has(it.href)) continue;
    seen.add(it.href);
    out.push(it);
  }
  return out;
}

export default function RoleAwareUserMenu() {
  const router = useRouter();
  const [session, setSession] = useState<MeJson>({ kind: 'none' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      const me = (await res.json()) as MeJson;
      setSession(me);
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
    router.replace('/auth/login');
    router.refresh();
  }

  const adminActions = useMemo((): MenuAction[] => {
    if (session.kind !== 'admin') return [];
    if (!session.routeGroup || !isAdminJwtRouteGroup(session.routeGroup)) {
      return [];
    }
    const rg = session.routeGroup;
    if (rg === 'superadmin') {
      return [];
    }
    if (rg === 'admin_only') {
      return [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/users', label: 'Xodimlar' },
        { href: '/settings', label: 'Sozlamalar' },
      ];
    }
    const next: MenuAction[] = [
      { href: adminHomePathForRouteGroup(rg), label: 'Mening sahifam' },
      ...adminRestrictedNavLinks(rg),
    ];
    if (adminCanAccessReportsRoute(rg)) {
      next.push({ href: adminReportsPathForRouteGroup(rg), label: 'Hisobotlar' });
    }
    return uniqByHref(next);
  }, [session]);

  const staffActions = useMemo((): MenuAction[] => {
    if (session.kind !== 'staff') return [];
    if (!isStaffRole(session.role)) return [];
    const home = staffHomePath(session.role);
    if (session.role === 'farmatsevt') {
      return [{ href: home, label: 'Mahsulotlar kabineti' }];
    }
    if (session.role === 'oshpaz') {
      return [{ href: home, label: 'Oshxona kabineti' }];
    }
    return uniqByHref([
      { href: home, label: 'Mening kabinetim' },
      { href: `${home}/hisobotlar`, label: 'Hisobotlar' },
    ]);
  }, [session]);

  if (session.kind === 'none') {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-xl">
        <Link href="/auth/login">Kirish</Link>
      </Button>
    );
  }

  if (session.kind === 'staff') {
    const roleLabel = STAFF_ROLE_LABELS[session.role] ?? 'Xodim';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex max-w-[260px] items-center gap-2 rounded-2xl border border-emerald-200/70 bg-linear-to-r from-emerald-50/90 to-teal-50/70 px-2 py-1.5 text-left shadow-sm outline-none ring-emerald-300 transition hover:border-emerald-300 focus-visible:ring-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
              {initialsFromName(session.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="hidden truncate text-sm font-semibold text-slate-800 sm:block">
                {session.fullName}
              </span>
              <span className="hidden truncate text-[11px] text-slate-500 sm:block">
                {roleLabel} · @{session.login}
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
                {session.fullName}
              </span>
              <span className="text-xs text-slate-500">{roleLabel}</span>
              <span className="font-mono text-[11px] text-slate-400">
                Login: {session.login}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {staffActions.map((a) => (
            <DropdownMenuItem asChild className="rounded-lg" key={a.href}>
              <Link href={a.href} className="cursor-pointer">
                {a.label}
              </Link>
            </DropdownMenuItem>
          ))}
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

  const rg =
    typeof session.routeGroup === 'string' && isAdminJwtRouteGroup(session.routeGroup) ?
      session.routeGroup
    : 'admin_only';
  const adminName = session.fullName?.trim() || 'Foydalanuvchi';
  const roleLabel = session.roleLabel?.trim() || 'Foydalanuvchi';
  const login = session.login?.trim() || '';
  const isRestrictedOffice = adminUsesRestrictedShell(rg);
  const triggerClass = isRestrictedOffice
    ? 'flex max-w-[280px] items-center gap-2 rounded-2xl border border-amber-200/70 bg-linear-to-r from-amber-50/90 to-orange-50/70 px-2 py-1.5 text-left shadow-sm outline-none ring-amber-300 transition hover:border-amber-300 focus-visible:ring-2'
    : 'flex max-w-[280px] items-center gap-2 rounded-2xl border border-violet-200/70 bg-linear-to-r from-violet-50/90 to-indigo-50/80 px-2 py-1.5 text-left shadow-sm outline-none ring-violet-300 transition hover:border-violet-300 focus-visible:ring-2';
  const avatarClass = isRestrictedOffice
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-xs font-bold text-white'
    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClass}>
          <span className={avatarClass}>{initialsFromName(adminName)}</span>
          <span className="min-w-0 flex-1">
            <span className="hidden truncate text-sm font-semibold text-slate-800 sm:block">
              {adminName}
            </span>
            <span className="hidden truncate text-[11px] text-slate-500 sm:block">
              {roleLabel}
              {login ? ` · @${login}` : ''}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {isRestrictedOffice ?
                <UserRound className="size-4 text-amber-600" />
              : <Shield className="size-4 text-violet-600" />}
              {adminName}
            </span>
            <span className="text-xs text-slate-500">{roleLabel}</span>
            {login ?
              <span className="font-mono text-[11px] text-slate-400">
                Login: {login}
              </span>
            : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {adminActions.map((a) => (
          <DropdownMenuItem asChild className="rounded-lg" key={a.href}>
            <Link href={a.href} className="cursor-pointer">
              {a.label}
            </Link>
          </DropdownMenuItem>
        ))}
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
