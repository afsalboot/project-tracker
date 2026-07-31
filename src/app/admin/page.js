import { redirect } from "next/navigation";
import AdminPortal from "@/components/admin/AdminPortal";
import AdminShell from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import User from "@/models/User";

export const metadata = { title: "Website administration" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.sub) redirect("/admin/login");

  await connectDb();
  const user = await User.findById(session.sub)
    .select("name email status +sessionVersion")
    .lean();
  if (
    session.admin !== true ||
    !user ||
    user.status === "suspended" ||
    Number(session.ver || 0) !== Number(user.sessionVersion || 0) ||
    !(await isPlatformAdmin(user._id))
  ) {
    redirect("/admin/login");
  }

  return (
    <AdminShell user={JSON.parse(JSON.stringify(user))}>
      <AdminPortal />
    </AdminShell>
  );
}
