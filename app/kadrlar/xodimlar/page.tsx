import PortalGate from '@/components/auth/PortalGate';
import KadrlarEmployeesListPage from '@/components/kadrlar/KadrlarEmployeesListPage';
import DashboardLayout from '@/components/layout';

export default function KadrlarEmployeesPage() {
  return (
    <PortalGate allowedAdminRouteGroups={['admin_only', 'hr']}>
      <DashboardLayout title="Xodimlar ro‘yxati">
        <KadrlarEmployeesListPage />
      </DashboardLayout>
    </PortalGate>
  );
}
