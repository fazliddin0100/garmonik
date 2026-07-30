import {
  createAppUser,
  deleteAppUser,
  findAppUserById,
  updateAppUserPassword,
  verifyAppUserPassword,
} from '@/lib/db/app-users';
import type { PortalProfileRow } from '@/lib/db/portal-profiles';
import {
  fetchPortalProfileByUserId,
  profileToVerifiedSession,
} from '@/lib/db/portal-profiles';
import type { VerifiedSession } from './session-jwt';

export type { PortalProfileRow };

export async function loadVerifiedSessionFromUserId(
  userId: string,
): Promise<VerifiedSession | null> {
  const profile = await fetchPortalProfileByUserId(userId);
  if (!profile) return null;
  return profileToVerifiedSession(profile);
}

export async function authenticatePortalCredentials(
  profile: PortalProfileRow,
  password: string,
): Promise<VerifiedSession | null> {
  const user = await findAppUserById(profile.user_id);
  if (!user) return null;
  const ok = await verifyAppUserPassword(user, password);
  if (!ok) return null;
  return profileToVerifiedSession(profile);
}

export {
  fetchPortalProfileByUserId,
  profileToVerifiedSession,
};

export async function createPortalAuthUser(input: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string }> {
  const user = await createAppUser(input);
  return { id: user.id, email: user.email };
}

export async function deletePortalAuthUser(userId: string): Promise<void> {
  await deleteAppUser(userId);
}

export async function updatePortalAuthPassword(
  userId: string,
  password: string,
): Promise<void> {
  await updateAppUserPassword(userId, password);
}

export async function verifyPortalAuthPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const user = await findAppUserById(userId);
  if (!user) return false;
  return verifyAppUserPassword(user, password);
}

export async function loadAppUserEmailsByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const { query } = await import('@/lib/db/query');
  const result = await query<{ id: string; email: string }>(
    `select id, email from public.app_users where id = any($1::uuid[])`,
    [userIds],
  );
  return new Map(result.rows.map((r) => [r.id, r.email]));
}
