import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import { requireSuperadminApiSession } from '@/lib/server/require-superadmin-api';
import {
  deletePortalAuthUser,
  loadAppUserEmailsByIds,
  updatePortalAuthPassword,
} from '@/lib/auth/portal-session';
import {
  findProfileInClinic,
  listProfilesByClinic,
  updatePortalProfile,
} from '@/lib/db/portal-profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const profiles = await listProfilesByClinic(session.clinicId);
  const authEmailByUserId = await loadAppUserEmailsByIds(
    profiles.map((p) => p.user_id).filter(Boolean),
  );

  const admins = profiles
    .filter((p) => p.account_kind === 'admin')
    .map((p) => ({
      _id: p.user_id,
      login: p.staff_login || p.auth_email || authEmailByUserId.get(p.user_id) || '',
      roleLabel: p.role_label,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      fatherName: p.father_name ?? '',
      age: p.age ?? undefined,
      phone: p.phone ?? '',
    }));

  const staff = profiles
    .filter((p) => p.account_kind === 'staff')
    .map((p) => ({
      _id: p.user_id,
      externalId: p.legacy_external_id || p.user_id,
      login: p.staff_login || p.auth_email || authEmailByUserId.get(p.user_id) || '',
      authEmail: p.auth_email || authEmailByUserId.get(p.user_id) || '',
      fullName: p.display_name,
      role: p.staff_role,
      department: p.department ?? '',
      isActive: p.is_active,
    }));

  return NextResponse.json({ admins, staff });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || (kind !== 'admin' && kind !== 'staff')) {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 });
  }

  if (kind === 'admin') {
    const existing = await findProfileInClinic(session.clinicId, id, 'admin');
    if (!existing) {
      return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.login === 'string' && body.login.trim()) {
      patch.staff_login = body.login.trim().toLowerCase();
    }
    if (typeof body.roleLabel === 'string') {
      patch.role_label = body.roleLabel.trim();
    }
    if (typeof body.firstName === 'string') {
      patch.first_name = body.firstName.trim();
    }
    if (typeof body.lastName === 'string') {
      patch.last_name = body.lastName.trim();
    }
    if (typeof body.fatherName === 'string') {
      patch.father_name = body.fatherName.trim();
    }
    if (typeof body.age === 'number' && Number.isFinite(body.age)) {
      patch.age = Math.max(0, Math.floor(body.age));
    }
    if (typeof body.phone === 'string') {
      patch.phone = body.phone.trim();
    }
    if (
      typeof patch.first_name === 'string' ||
      typeof patch.last_name === 'string' ||
      typeof patch.father_name === 'string'
    ) {
      const parts = [
        (patch.first_name as string | undefined)?.trim() ?? '',
        (patch.last_name as string | undefined)?.trim() ?? '',
        (patch.father_name as string | undefined)?.trim() ?? '',
      ].filter(Boolean);
      patch.display_name = parts.join(' ');
    }
    if (typeof body.roleLabel === 'string') {
      const loginKey =
        typeof body.login === 'string' && body.login.trim() ?
          body.login.trim().toLowerCase()
        : (existing.staff_login || existing.auth_email);
      patch.admin_route_group = adminRoleLabelToJwtRouteGroup(
        patch.role_label as string,
        loginKey,
      );
    }
    if (typeof body.password === 'string' && body.password.length >= 6) {
      await updatePortalAuthPassword(id, body.password);
    }
    if (Object.keys(patch).length > 0) {
      await updatePortalProfile(session.clinicId, id, patch);
    }
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.login === 'string' && body.login.trim()) {
    patch.staff_login = body.login.trim().toLowerCase();
  }
  if (typeof body.fullName === 'string') patch.display_name = body.fullName.trim();
  if (typeof body.role === 'string') patch.staff_role = body.role.trim();
  if (typeof body.department === 'string') patch.department = body.department.trim();
  if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    await updatePortalAuthPassword(id, body.password);
  }
  if (Object.keys(patch).length > 0) {
    await updatePortalProfile(session.clinicId, id, patch);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || (kind !== 'admin' && kind !== 'staff')) {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 });
  }
  if (kind === 'admin' && id === session.id) {
    return NextResponse.json(
      { error: 'Joriy super adminni o‘chirib bo‘lmaydi' },
      { status: 400 },
    );
  }

  const targetProfile = await findProfileInClinic(session.clinicId, id);
  if (!targetProfile) {
    return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
  }

  await deletePortalAuthUser(id);
  return NextResponse.json({ ok: true });
}
