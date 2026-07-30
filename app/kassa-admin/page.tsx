import { redirect } from "next/navigation";
import { getSession } from "@/lib/kassa/auth";
import { AdminWorkspace } from "@/components/kassa/admin/admin-workspace";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/kassa/login");
  if (session.role !== "ADMIN") redirect("/kassa");

  return <AdminWorkspace userName={session.fullName} userId={session.id} />;
}
