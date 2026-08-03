import type { DashboardViewId } from '@/lib/dashboard/views';
import type { PortalMainSectionId } from '@/lib/portal/sections';
import type { UsersViewId } from '@/lib/users/views';

export type AssistantPatientHit = {
  id: string;
  fullName: string;
  cardNumber: string;
  phone: string;
};

export type AssistantAction =
  | { type: 'navigate'; href: string; label: string }
  | { type: 'dashboard_view'; view: DashboardViewId; label: string }
  | { type: 'portal_section'; section: PortalMainSectionId; label: string }
  | { type: 'users_view'; view: UsersViewId; label: string };

export type AssistantReply = {
  message: string;
  actions?: AssistantAction[];
  suggestions?: string[];
  /** Admin sahifa ochish — yangi brauzer tab/oynada */
  openInNewTab?: boolean;
};
