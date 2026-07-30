'use client';



import StaffPortalLayout from '@/components/staff/StaffPortalLayout';

import type { ReactNode } from 'react';



export default function LaboratoryLayout({ children }: { children: ReactNode }) {

  return (

    <StaffPortalLayout

      allowedRoles={['laboratory']}

      allowAdminRouteGroup="laboratory"

      title="Laboratoriya kabineti"

      shellBasePath="/labaratoriya"

      patientsMode="laboratory"

      showServicesNav={false}

      showQueueNav={true}

      defaultView="bemorlar">

      {children}

    </StaffPortalLayout>

  );

}

