import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function WorkspaceLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={JSON.parse(JSON.stringify(user))}>{children}</AppShell>;
}
