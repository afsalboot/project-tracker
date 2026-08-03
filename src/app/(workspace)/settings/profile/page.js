import { getCurrentUser } from "@/lib/auth";
import ProfileSettings from "@/components/settings/ProfileSettings";

export const metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  return <ProfileSettings initialUser={JSON.parse(JSON.stringify(user))} />;
}
