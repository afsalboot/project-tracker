import { clearSession, getSession } from "@/lib/auth";
import { ok } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import User from "@/models/User";

export async function POST() {
  const session = await getSession();
  if (session?.sub) {
    await connectDb();
    await User.updateOne({ _id: session.sub }, { $inc: { sessionVersion: 1 } });
  }
  await clearSession();
  return ok({}, "You have been logged out.");
}
