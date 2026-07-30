'use client';



import KabinetCardsPanel from '@/components/kabinet/KabinetCardsPanel';

import KabinetHomePanel from '@/components/kabinet/KabinetHomePanel';

import KabinetQueuePanel from '@/components/kabinet/KabinetQueuePanel';

import { useStaffPortalView } from '@/components/staff/StaffPortalViewContext';



export default function KabinetPortalWorkspace() {

  const { view } = useStaffPortalView();



  switch (view) {

    case 'home':

      return <KabinetHomePanel />;

    case 'kartalar':

      return <KabinetCardsPanel />;

    case 'navbat':

      return <KabinetQueuePanel />;

    case 'hisobotlar':

      return <KabinetHomePanel />;

    default:

      return <KabinetHomePanel />;

  }

}

