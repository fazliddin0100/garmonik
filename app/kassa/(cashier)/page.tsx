import { redirect } from "next/navigation";
import { getSession } from "@/lib/kassa/auth";
import { CashierWorkspace } from "@/components/kassa/cashier-workspace";

export default async function KassaPage() {
  const session = await getSession();
  if (!session) redirect("/kassa/login");

  return (
    <CashierWorkspace
      userName={session.fullName}
      userRole={session.role}
    />
  );
}
