import DashboardView from "@/components/dashboard/DashboardView";
import { requirePagePermission } from "@/lib/page-access";
export const metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  await requirePagePermission("dashboard.view");
  return <DashboardView />;
}
