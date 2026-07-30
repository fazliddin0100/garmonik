import PortalGate from '@/components/auth/PortalGate';
import DashboardLayout from '@/components/layout';
import KadrlarStaffPanel from '@/components/kadrlar/KadrlarStaffPanel';

export default function KadrlarPage() {
  return (
    <PortalGate allowedAdminRouteGroups={['admin_only', 'hr']}>
      <DashboardLayout title="Kadrlar bo‘limi">
        <KadrlarStaffPanel />
      </DashboardLayout>
    </PortalGate>
  );
}
