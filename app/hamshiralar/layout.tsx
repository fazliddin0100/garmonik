'use client';

import StaffPortalLayout from '@/components/staff/StaffPortalLayout';
import type { ReactNode } from 'react';

export default function NursesLayout({ children }: { children: ReactNode }) {
  return (
    <StaffPortalLayout
      allowedRoles={['nurse']}
      allowAdminRouteGroup="nursing"
      title="Hamshiralar kabineti"
      shellBasePath="/hamshiralar"
      patientsMode="nurse">
      {children}
    </StaffPortalLayout>
  );
}
