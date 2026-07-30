'use client';

import StaffPortalLayout from '@/components/staff/StaffPortalLayout';
import type { ReactNode } from 'react';

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <StaffPortalLayout
      allowedRoles={['doctor', 'shifokor']}
      allowAdminRouteGroup="clinical"
      title="Shifokor kabineti"
      shellBasePath="/doctor"
      patientsMode="doctor"
      showServicesNav={false}>
      {children}
    </StaffPortalLayout>
  );
}
