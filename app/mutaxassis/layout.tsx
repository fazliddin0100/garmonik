'use client';

import StaffPortalLayout from '@/components/staff/StaffPortalLayout';
import type { ReactNode } from 'react';

export default function SpecialistLayout({ children }: { children: ReactNode }) {
  return (
    <StaffPortalLayout
      allowedRoles={['specialist']}
      title="Tor mutaxassis kabineti"
      shellBasePath="/mutaxassis"
      patientsMode="specialist"
      showServicesNav={false}
      showQueueNav={false}
      defaultView="bemorlar">
      {children}
    </StaffPortalLayout>
  );
}
