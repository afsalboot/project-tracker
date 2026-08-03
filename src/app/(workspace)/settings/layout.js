import { getCurrentUser } from "@/lib/auth";
import SettingsLayoutFrame from "@/components/settings/SettingsLayoutFrame";

export default async function SettingsLayout({ children }) {
  const user = await getCurrentUser();
  return <SettingsLayoutFrame user={JSON.parse(JSON.stringify(user))}>{children}</SettingsLayoutFrame>;
}
