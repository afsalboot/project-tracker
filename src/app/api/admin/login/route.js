import bcrypt from "bcryptjs";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { clearPersistentRateLimit, enforcePersistentRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validations";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const windowMs = 15 * 60 * 1000;
    const ipLimit = await enforcePersistentRateLimit(
      request,
      "admin-login-ip",
      "",
      { limit: 20, windowMs },
    );
    if (ipLimit) return ipLimit;

    const input = loginSchema.parse(await request.json());
    const accountLimit = await enforcePersistentRateLimit(
      request,
      "admin-login-account",
      input.email,
      { limit: 5, windowMs },
    );
    if (accountLimit) return accountLimit;

    const user = await User.findOne({ email: input.email })
      .select("+password +sessionVersion");
    const passwordHash =
      user?.password || await bcrypt.hash("invalid-admin-password-placeholder", 12);
    const passwordValid = await bcrypt.compare(input.password, passwordHash);
    if (
      !user ||
      !passwordValid ||
      user.status === "suspended" ||
      !(await isPlatformAdmin(user._id))
    ) {
      return fail("Invalid website administrator credentials.", 401);
    }

    await clearPersistentRateLimit(
      request,
      "admin-login-account",
      input.email,
      windowMs,
    );
    await setSession(user, { admin: true });
    return ok(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          platformAdmin: true,
        },
      },
      "Website administrator access granted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
