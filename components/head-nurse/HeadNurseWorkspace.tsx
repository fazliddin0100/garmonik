'use client';

import HeadNurseDashboard from '@/components/head-nurse/HeadNurseDashboard';
import HomeMonitoringPanel from '@/components/head-nurse/HomeMonitoringPanel';
import InpatientPanel from '@/components/head-nurse/InpatientPanel';
import PendingAdmissionsPanel from '@/components/head-nurse/PendingAdmissionsPanel';
import HeadNurseRoomsPanel from '@/components/head-nurse/HeadNurseRoomsPanel';
import { useHeadNurseView } from '@/components/head-nurse/HeadNurseViewContext';
import { useHeadNurseData } from '@/components/head-nurse/useHeadNurseData';

export default function HeadNurseWorkspace() {
  const { view } = useHeadNurseView();
  const data = useHeadNurseData();

  switch (view) {
    case 'yotqizish':
      return (
        <PendingAdmissionsPanel
          data={data}
          roomPayments={data.roomPayments}
          paymentsLoading={data.paymentsLoading}
        />
      );
    case 'statsionar':
      return <InpatientPanel data={data} />;
    case 'kuzatuv':
      return <HomeMonitoringPanel data={data} />;
    case 'xonalar':
      return <HeadNurseRoomsPanel data={data} />;
    default:
      return <HeadNurseDashboard data={data} />;
  }
}
