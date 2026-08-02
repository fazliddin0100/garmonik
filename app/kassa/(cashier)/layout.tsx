import { redirect } from "next/navigation";
import { getSession } from "@/lib/kassa/auth";

export default async function KassaCashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/kassa");

  return children;
}
