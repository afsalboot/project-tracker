import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import User from "@/models/User";

export const metadata = { title: "Website administrator sign in" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.sub && session.admin === true) {
    await connectDb();
    const user = await User.findById(session.sub)
      .select("status +sessionVersion")
      .lean();
    if (
      user &&
      user.status !== "suspended" &&
      Number(session.ver || 0) === Number(user.sessionVersion || 0) &&
      (await isPlatformAdmin(user._id))
    ) {
      redirect("/admin");
    }
  }

  return <AdminLoginForm />;
}
