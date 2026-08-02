'use client';

import DashboardAnalyticsPanel from '@/components/dashboard/DashboardAnalyticsPanel';
import ContractsPanel from '@/components/contracts/ContractsPanel';
import EndocrineDepartmentsPanel from '@/components/departments/EndocrineDepartmentsPanel';
import PartnersPanel from '@/components/partners/PartnersPanel';
import PharmacyProductsPanel from '@/components/pharmacy/PharmacyProductsPanel';
import RoomsOccupancyPanel from '@/components/rooms/RoomsOccupancyPanel';
import ServiceTypesPanel from '@/components/service-types/ServiceTypesPanel';
import ReportsFinancialPanel from '@/components/reports/ReportsFinancialPanel';
import { useDashboardView } from '@/components/dashboard/DashboardViewContext';

export default function DashboardWorkspace() {
  const { view } = useDashboardView();

  switch (view) {
    case 'overview':
      return <DashboardAnalyticsPanel />;
    case 'departments':
      return (
        <div className="space-y-5">
          <EndocrineDepartmentsPanel />
        </div>
      );
    case 'rooms':
      return (
        <div className="space-y-5">
          <RoomsOccupancyPanel />
        </div>
      );
    case 'service-types':
      return (
        <div className="space-y-5">
          <ServiceTypesPanel />
        </div>
      );
    case 'products':
      return (
        <div className="space-y-5">
          <PharmacyProductsPanel />
        </div>
      );
    case 'partners':
      return (
        <div className="space-y-5">
          <PartnersPanel />
        </div>
      );
    case 'contracts':
      return (
        <div className="space-y-5">
          <ContractsPanel />
        </div>
      );
    case 'reports':
      return (
        <div className="space-y-5">
          <ReportsFinancialPanel />
        </div>
      );
    default:
      return <DashboardAnalyticsPanel />;
  }
}
