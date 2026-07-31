import SettingsOverview from "@/components/settings/SettingsOverview";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return <SettingsOverview user={user} />;
}
