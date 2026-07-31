import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";
import SettingsSectionNav from "@/components/settings/SettingsSectionNav";

export default async function SettingsLayout({ children }) {
  const user = await getCurrentUser();
  if (!hasWorkspacePermission(user?.workspace, user?.role, "settings.view")) {
    redirect("/dashboard");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <SettingsSectionNav user={JSON.parse(JSON.stringify(user))} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
