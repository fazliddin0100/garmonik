import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/kassa/prisma';
import type { SessionUser } from '@/lib/kassa/unified-session';

/** Asosiy login → /kassa ga ulanadigan portal rollar */
export function isKassirRoleLabel(roleLabel: string | null | undefined): boolean {
  return isKassaPortalRole(roleLabel);
}

export function isKassaPortalRole(roleLabel: string | null | undefined): boolean {
  const t = (roleLabel || '').trim().toLowerCase();
  if (!t) return false;
  if (t.includes('buxgalter') || t.includes('moliya')) return true;
  return (
    t === 'kassir' ||
    t === 'kassa' ||
    t.includes('kassir') ||
    t.includes('kassa xodim')
  );
}

export function isKassaPortalRouteGroup(
  rg: string | null | undefined,
): boolean {
  return rg === 'finance' || rg === 'kassa';
}

/** Portal «Kassir» xodimini kassa.users jadvali bilan sinxronlaydi. */
export async function ensureKassaCashierUser(input: {
  login: string;
  password: string;
  fullName: string;
}): Promise<SessionUser> {
  const login = input.login.trim().toLowerCase();
  const fullName = input.fullName.trim() || login;
  const password = input.password;
  if (!login) throw new Error('Login majburiy');
  if (!password || password.length < 6) {
    throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst({
    where: { login: { equals: login, mode: 'insensitive' } },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        login,
        fullName,
        passwordHash,
        role: 'CASHIER',
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    return {
      id: updated.id,
      login: updated.login,
      fullName: updated.fullName,
      role: updated.role,
    };
  }

  const created = await prisma.user.create({
    data: {
      login,
      fullName,
      passwordHash,
      role: 'CASHIER',
      isActive: true,
    },
  });

  return {
    id: created.id,
    login: created.login,
    fullName: created.fullName,
    role: created.role,
  };
}

export async function syncKassaCashierPassword(input: {
  login: string;
  password: string;
  fullName?: string;
}): Promise<void> {
  const login = input.login.trim().toLowerCase();
  if (!login || input.password.length < 6) return;
  const existing = await prisma.user.findFirst({
    where: { login: { equals: login, mode: 'insensitive' } },
  });
  if (!existing) return;
  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      passwordHash,
      ...(input.fullName?.trim() ? { fullName: input.fullName.trim() } : {}),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

export async function deactivateKassaCashierByLogin(login: string): Promise<void> {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return;
  const existing = await prisma.user.findFirst({
    where: { login: { equals: normalized, mode: 'insensitive' } },
  });
  if (!existing) return;
  await prisma.user.update({
    where: { id: existing.id },
    data: { isActive: false },
  });
}
