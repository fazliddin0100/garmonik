import PortalGate from '@/components/auth/PortalGate';
import SecurityCenterLayout from '@/components/security/SecurityCenterLayout';
import SecurityCenterPanel from '@/components/security/SecurityCenterPanel';

export default function SecurityCenterStandalonePage() {
  return (
    <PortalGate allowedAdminRouteGroups={['superadmin']}>
      <SecurityCenterLayout>
        <SecurityCenterPanel />
      </SecurityCenterLayout>
    </PortalGate>
  );
}
