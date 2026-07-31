import { connectDb } from "@/lib/db";
import PlatformConfiguration from "@/models/PlatformConfiguration";
import User from "@/models/User";

function configuredEmails() {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isPlatformAdmin(userId) {
  if (!userId) return false;
  await connectDb();
  const configured = configuredEmails();
  if (configured.size) {
    const user = await User.findById(userId).select("email").lean();
    return Boolean(user && configured.has(user.email.toLowerCase()));
  }

  let configuration;
  try {
    configuration = await PlatformConfiguration.findOneAndUpdate(
      { _id: "platform" },
      { $setOnInsert: { adminUserId: userId } },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();
  } catch (error) {
    // Two first logins can race to create the singleton. The unique _id makes
    // only one of them the administrator, so the loser only needs to re-read.
    if (error?.code !== 11000) throw error;
    configuration = await PlatformConfiguration.findById("platform").lean();
  }

  return String(configuration?.adminUserId || "") === String(userId);
}

export async function platformAdminUserIds() {
  await connectDb();
  const ids = [];
  const emails = [...configuredEmails()];
  if (emails.length) {
    ids.push(...await User.find({ email: { $in: emails } }).distinct("_id"));
  }
  const configuration = await PlatformConfiguration.findById("platform")
    .select("adminUserId")
    .lean();
  if (configuration?.adminUserId) ids.push(configuration.adminUserId);
  return [...new Map(ids.map((id) => [String(id), id])).values()];
}
