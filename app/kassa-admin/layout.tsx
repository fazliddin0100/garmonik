import "../kassa/kassa.css";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/kassa/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/kassa/login");
  if (session.role !== "ADMIN") redirect("/kassa");

  return <div className="kassa-root h-dvh overflow-hidden">{children}</div>;
}
