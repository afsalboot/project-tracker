import TeamView from "@/components/team/TeamView";
import { getCurrentUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/page-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requirePagePermission("members.view");
  const user = await getCurrentUser();
  if (user.workspace?.type === "personal") redirect("/dashboard");
  return <TeamView />;
}
