import PortalGate from '@/components/auth/PortalGate';
import DashboardLayout from '@/components/layout';
import SupplyWorkspace from '@/components/supply/SupplyWorkspace';

export default function TaminotPage() {
  return (
    <PortalGate allowedAdminRouteGroups={['admin_only', 'supply']}>
      <DashboardLayout title="Ta'minot va xarid">
        <SupplyWorkspace />
      </DashboardLayout>
    </PortalGate>
  );
}
