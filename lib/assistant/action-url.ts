import type { AssistantAction } from '@/lib/assistant/types';
import { dashboardViewPath } from '@/lib/dashboard/views';
import { PORTAL_SECTION_ENTRY_PATH } from '@/lib/portal/sections';
import { usersViewPath, type UsersViewId } from '@/lib/users/views';

export function resolveAssistantActionHref(action: AssistantAction): string {
  switch (action.type) {
    case 'navigate':
      return action.href;
    case 'dashboard_view':
      return dashboardViewPath(action.view);
    case 'portal_section':
      return PORTAL_SECTION_ENTRY_PATH[action.section];
    case 'users_view':
      return usersViewPath(action.view as UsersViewId);
  }
}
