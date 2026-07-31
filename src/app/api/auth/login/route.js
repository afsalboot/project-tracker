import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { loginSchema } from "@/lib/validations";
import { setSession } from "@/lib/auth";
import User from "@/models/User";
import { clearPersistentRateLimit, enforcePersistentRateLimit } from "@/lib/security";
import { issueLoginVerification } from "@/lib/login-verification";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const windowMs = 15 * 60 * 1000;
    const ipLimit = await enforcePersistentRateLimit(request, "login-ip", "", { limit: 30, windowMs });
    if (ipLimit) return ipLimit;
    const input = loginSchema.parse(await request.json());
    const accountLimit = await enforcePersistentRateLimit(request, "login-account", input.email, { limit: 7, windowMs });
    if (accountLimit) return accountLimit;
    const user = await User.findOne({ email: input.email }).select("+password +sessionVersion");
    const passwordHash = user?.password || await bcrypt.hash("invalid-password-placeholder", 12);
    if (
      !user ||
      user.status === "suspended" ||
      !(await bcrypt.compare(input.password, passwordHash)) ||
      !user.workspaceId
    ) {
      return fail("Invalid email or password.", 401);
    }
    await clearPersistentRateLimit(request, "login-account", input.email, windowMs);
    if (user.emailVerificationRequired) {
      const verification = await issueLoginVerification(user, "signup");
      return ok(
        { otpRequired: true, ...verification },
        "Verify your email to finish creating this account.",
        202,
      );
    }
    await setSession(user);
    return ok(
      {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      "Welcome back.",
    );
  } catch (error) {
    if (["EMAIL_NOT_CONFIGURED", "EMAIL_DELIVERY_FAILED"].includes(error?.code)) {
      if (error.verification) {
        return ok(
          { otpRequired: true, deliveryFailed: true, ...error.verification },
          "Open the verification screen, then resend after the email sender is fixed.",
          202,
        );
      }
      return fail("Email verification is temporarily unavailable.", 503);
    }
    return handleApiError(error);
  }
}
