'use client';

import AdminsPanel from '@/components/admins/AdminsPanel';
import DoctorsPanel from '@/components/doctors/DoctorsPanel';
import LaboratoryStaffPanel from '@/components/laboratory-staff/LaboratoryStaffPanel';
import NursesPanel from '@/components/nurses/NursesPanel';
import PharmacistsPanel from '@/components/pharmacists/PharmacistsPanel';
import { usePortalNav } from '@/components/portal/PortalNavContext';
import ReceptionStaffPanel from '@/components/reception/ReceptionStaffPanel';
import StaffUsersOverview from '@/components/users/StaffUsersOverview';
import UsersHubPanel from '@/components/users/UsersHubPanel';

export default function UsersWorkspace() {
  const { usersView } = usePortalNav();

  switch (usersView) {
    case 'hub':
      return <UsersHubPanel />;
    case 'admins':
      return <AdminsPanel />;
    case 'doctors':
      return (
        <div className="space-y-5">
          <DoctorsPanel />
        </div>
      );
    case 'nurses':
      return (
        <div className="space-y-5">
          <NursesPanel />
        </div>
      );
    case 'laboratory':
      return (
        <div className="space-y-5">
          <LaboratoryStaffPanel />
        </div>
      );
    case 'reception':
      return (
        <div className="space-y-5">
          <ReceptionStaffPanel />
        </div>
      );
    case 'pharmacists':
      return (
        <div className="space-y-5">
          <PharmacistsPanel />
        </div>
      );
    case 'staff':
      return <StaffUsersOverview />;
    default:
      return <UsersHubPanel />;
  }
}
