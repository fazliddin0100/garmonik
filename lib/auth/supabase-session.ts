/** @deprecated `@/lib/auth/portal-session` ishlating */
export {
  authenticatePortalCredentials,
  createPortalAuthUser,
  deletePortalAuthUser,
  fetchPortalProfileByUserId,
  loadAppUserEmailsByIds,
  loadVerifiedSessionFromUserId,
  profileToVerifiedSession,
  updatePortalAuthPassword,
  verifyPortalAuthPassword,
  type PortalProfileRow,
} from '@/lib/auth/portal-session';

export {
  fetchPortalProfileByUserId as fetchPortalProfile,
  loadVerifiedSessionFromUserId as loadVerifiedSessionFromSupabaseUser,
} from '@/lib/auth/portal-session';
