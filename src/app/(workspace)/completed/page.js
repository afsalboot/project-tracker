import CompletedView from "@/components/completed/CompletedView";
import { requirePagePermission } from "@/lib/page-access";
export const metadata = { title: "Completed Work" };
export default async function CompletedPage() {
  await requirePagePermission("completed.view");
  return <CompletedView />;
}
