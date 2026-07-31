import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import DisplaySettings from "@/components/settings/DisplaySettings";

export const metadata = { title: "Team and Dashboard display" };

export default async function DisplaySettingsPage() {
  const user = await getCurrentUser();
  if (user.workspace?.type === "personal" || !hasWorkspacePermission(user.workspace, user.role, "team.display.manage")) {
    redirect("/settings");
  }
  return <DisplaySettings />;
}
