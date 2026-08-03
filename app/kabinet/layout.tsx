'use client';

import StaffPortalLayout from '@/components/staff/StaffPortalLayout';
import type { ReactNode } from 'react';

export default function KabinetLayout({ children }: { children: ReactNode }) {
  return (
    <StaffPortalLayout
      allowedRoles={['kabinet']}
      allowAdminRouteGroups={['office', 'reception']}
      showPatientsNav={false}
      showServicesNav={false}
      showOnlineNavbatBadge
      showCardsNav
      shellBasePath="/kabinet"
      title="Kabinet / qabul">
      {children}
    </StaffPortalLayout>
  );
}
