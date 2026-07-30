import DashboardLayoutShell from "@/components/DashboardLayoutShell";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  title: string;
  children: ReactNode;
};

export default function DashboardLayout({
  title,
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardLayoutShell title={title}>
      {children}
    </DashboardLayoutShell>
  );
}
