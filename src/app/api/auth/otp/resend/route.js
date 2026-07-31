import { fail, handleApiError, ok } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import { enforcePersistentRateLimit } from "@/lib/security";
import { issueLoginVerification } from "@/lib/login-verification";
import { resendLoginCodeSchema } from "@/lib/validations";
import LoginVerification from "@/models/LoginVerification";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const input = resendLoginCodeSchema.parse(await request.json());
    const limited = await enforcePersistentRateLimit(
      request,
      "login-otp-resend",
      input.challengeId,
      { limit: 3, windowMs: 15 * 60 * 1000 },
    );
    if (limited) return limited;

    const current = await LoginVerification.findById(input.challengeId).lean();
    if (!current) return fail("This sign-in request has expired. Sign in again.", 410);
    const user = await User.findById(current.userId).select("email status").lean();
    if (!user || user.status === "suspended") return fail("This account is unavailable.", 401);
    const verification = await issueLoginVerification(user, current.purpose);
    return ok({ otpRequired: true, ...verification }, "A new verification code was sent.");
  } catch (error) {
    if (["EMAIL_NOT_CONFIGURED", "EMAIL_DELIVERY_FAILED"].includes(error?.code)) {
      return fail("Email verification is temporarily unavailable.", 503);
    }
    return handleApiError(error);
  }
}
