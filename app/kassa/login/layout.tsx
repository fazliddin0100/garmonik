import { redirect } from "next/navigation";
import { getSession } from "@/lib/kassa/auth";

export default async function KassaLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/kassa-admin" : "/kassa");
  }

  return children;
}
