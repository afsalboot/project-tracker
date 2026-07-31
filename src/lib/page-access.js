import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/workspace";

export async function requirePagePermission(permission) {
  const user = await getCurrentUser();
  if (!hasWorkspacePermission(user?.workspace, user?.role, permission)) {
    redirect("/access-denied");
  }
  return user;
}
