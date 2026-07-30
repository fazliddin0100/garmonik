'use client';

import {
  dashboardViewFromLegacyPath,
  isDashboardViewId,
  persistDashboardInitialView,
} from '@/lib/dashboard/views';
import {
  mainSectionFromPath,
  persistPortalInitialSection,
  PORTAL_SECTION_ENTRY_PATH,
} from '@/lib/portal/sections';
import {
  persistUsersInitialView,
  usersViewFromLegacyPath,
} from '@/lib/users/views';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

/** Faqat ichki, mavjud bo‘lishi kutiladigan prefikslar — noto‘g‘ri `?next=` 404 bermasligi uchun */
const SAFE_POST_LOGIN_PREFIXES = [
  '/dashboard',
  '/security-center',
  '/users',
  '/kadrlar',
  '/patients',
  '/appointments',
  '/services',
  '/settings',
  '/reports',
  '/doctor',
  '/labaratoriya',
  '/hamshiralar',
  '/bosh-hamshira',
  '/kabinet',
] as const;

function isSafeInternalRedirect(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith('/') || p.startsWith('//')) return false;
  return SAFE_POST_LOGIN_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

function normalizeRedirectFromServer(path: unknown, fallback: string): string {
  if (typeof path !== 'string' || !path.trim()) return fallback;
  const t = path.trim();
  let rel = t;
  try {
    if (t.startsWith('http://') || t.startsWith('https://')) {
      const u = new URL(t);
      rel = `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    return fallback;
  }

  const pathOnly = rel.split('?')[0] ?? rel;

  const dashboardView = dashboardViewFromLegacyPath(pathOnly);
  if (dashboardView && dashboardView !== 'overview') {
    persistDashboardInitialView(dashboardView);
    return '/dashboard';
  }

  const usersView = usersViewFromLegacyPath(pathOnly);
  if (usersView && usersView !== 'hub') {
    persistPortalInitialSection('users');
    persistUsersInitialView(usersView);
    return '/users';
  }

  const portalSection = mainSectionFromPath(pathOnly);
  if (portalSection) {
    persistPortalInitialSection(portalSection);
    return PORTAL_SECTION_ENTRY_PATH[portalSection];
  }

  return isSafeInternalRedirect(rel) ? rel : fallback;
}

function getPostLoginRedirect(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const q = new URLSearchParams(window.location.search);
  const r = q.get('redirect') || q.get('next');
  if (r && isSafeInternalRedirect(r)) return r;
  return '/dashboard';
}

function navigateAfterLogin(path: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(path);
    return;
  }
  // SSR teoretik holat
  void path;
}

interface LoginData {
  login: string;
  password: string;
}

interface LoginError {
  message: string;
  field?: 'login' | 'password' | 'general';
}

interface LoginResponse {
  error?: string;
  message?: string;
  redirect?: string;
  dashboardView?: string;
}

interface StaffLoginJson {
  ok?: boolean;
  redirect?: string;
  error?: string;
}

async function postClinicAdminAuth(data: LoginData): Promise<{
  response: Response;
  result: LoginResponse;
}> {
  let response = await fetch('/api/auth/admin-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  let text = await response.text();

  if (response.status === 404) {
    response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    text = await response.text();
  }

  if (response.status === 404) {
    throw new Error(
      'Login API topilmadi (404). `next dev` ni to‘xtatib qayta ishga tushiring — eski jarayon boshqa loyiha bo‘lishi mumkin.',
    );
  }

  let result: LoginResponse;
  try {
    result = JSON.parse(text) as LoginResponse;
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, ' ');
    throw new Error(
      preview ?
        `Server JSON emas qaytardi (${response.status}). ${preview}…`
      : `Server bo‘sh yoki noto‘g‘ri javob qaytardi (${response.status}).`,
    );
  }

  return { response, result };
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const isSubmitting = useRef(false);

  async function login(data: LoginData) {
    if (isSubmitting.current) return false;

    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const { response, result } = await postClinicAdminAuth(data);

      if (!response.ok) {
        if (response.status === 401) {
          const loginNorm = data.login.trim().toLowerCase();
          if (
            loginNorm === 'admin@klinika' ||
            loginNorm === 'kassir1' ||
            loginNorm.endsWith('@klinika')
          ) {
            setError({
              message:
                "Bu kassa logini. Kassa uchun: /kassa/login (admin@klinika / admin123)",
              field: 'general',
            });
            toast.error('Kassa logini — /kassa/login sahifasidan kiring');
            return false;
          }

          const sr = await fetch('/api/auth/staff-login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              login: data.login,
              password: data.password,
            }),
          });
          let staffJson: StaffLoginJson = {};
          try {
            staffJson = (await sr.json()) as StaffLoginJson;
          } catch {
            /* ignore */
          }
          if (sr.ok && staffJson.ok && staffJson.redirect) {
            toast.success('Xodim kabinetiga muvaffaqiyatli kirdingiz!');
            const dest = normalizeRedirectFromServer(
              staffJson.redirect,
              getPostLoginRedirect(),
            );
            navigateAfterLogin(dest);
            return true;
          }
        }
        setError({
          message: result.error || "Login yoki parol noto'g'ri",
          field: 'general',
        });
        toast.error(result.error || "Login yoki parol noto'g'ri");
        return false;
      }

      toast.success('Tizimga muvaffaqiyatli kirdingiz!');
      if (
        typeof result.dashboardView === 'string' &&
        isDashboardViewId(result.dashboardView) &&
        result.dashboardView !== 'overview'
      ) {
        persistDashboardInitialView(result.dashboardView);
      }
      const dest = normalizeRedirectFromServer(
        result.redirect,
        getPostLoginRedirect(),
      );
      navigateAfterLogin(dest);
      return true;
    } catch (err: unknown) {
      console.error('Login xatoligi:', err);

      const errorMessage =
        err instanceof Error && err.message?.includes('Failed to fetch') ?
          'Tarmoq xatoligi. Internetni tekshiring'
        : err instanceof Error ? err.message
        : "Tarmoq xatoligi. Iltimos qayta urinib ko'ring";

      setError({
        message: errorMessage,
        field: 'general',
      });

      toast.error(errorMessage);
      return false;
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { login, loading, error, clearError };
}
