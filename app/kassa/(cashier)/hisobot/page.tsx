import { redirect } from "next/navigation";

export default function CashierReportRedirect() {
  redirect("/kassa?view=report");
}
