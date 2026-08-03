'use client';

import PortalGate from '@/components/auth/PortalGate';
import AppointmentRequestsPanel from '@/components/appointment-requests/AppointmentRequestsPanel';
import PatientsPanel from '@/components/patients/PatientsPanel';
import ReportsFinancialPanel from '@/components/reports/ReportsFinancialPanel';
import QueueLivePanel from '@/components/queue/QueueLivePanel';
import ServicesPricingCatalog from '@/components/services/ServicesPricingCatalog';
import ClinicSettingsPanel from '@/components/settings/ClinicSettingsPanel';
import UsersWorkspace from '@/components/users/UsersWorkspace';
import { usePortalNav } from '@/components/portal/PortalNavContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PORTAL_SECTION_META } from '@/lib/portal/sections';

export default function PortalWorkspace() {
  const { mainSection } = usePortalNav();
  const meta = PORTAL_SECTION_META[mainSection];

  const content = (() => {
    switch (mainSection) {
      case 'users':
        return <UsersWorkspace />;
      case 'patients':
        return (
          <div className="space-y-5">
            <PatientsPanel />
          </div>
        );
      case 'appointments':
        return (
          <Tabs defaultValue="queue" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap gap-1">
              <TabsTrigger value="queue" className="flex-1 sm:flex-none">Navbat</TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 sm:flex-none">Instagram arizalari</TabsTrigger>
            </TabsList>
            <TabsContent value="queue">
              <QueueLivePanel />
            </TabsContent>
            <TabsContent value="requests">
              <AppointmentRequestsPanel />
            </TabsContent>
          </Tabs>
        );
      case 'services':
        return <ServicesPricingCatalog />;
      case 'reports':
        return <ReportsFinancialPanel />;
      case 'settings':
        return <ClinicSettingsPanel />;
      default:
        return null;
    }
  })();

  return (
    <PortalGate
      allowedAdminRouteGroups={meta.gate.allowedAdminRouteGroups}
      deniedAdminRouteGroups={meta.gate.deniedAdminRouteGroups}>
      {content}
    </PortalGate>
  );
}
