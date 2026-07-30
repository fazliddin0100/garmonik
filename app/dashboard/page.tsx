import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import DashboardLayout from "@/components/layout";

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      <DashboardWorkspace />
    </DashboardLayout>
  );
}
