import { fail, handleApiError, ok } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { enforcePersistentRateLimit } from "@/lib/security";
import { verifyLoginCode } from "@/lib/login-verification";
import { loginCodeSchema } from "@/lib/validations";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const input = loginCodeSchema.parse(await request.json());
    const limited = await enforcePersistentRateLimit(
      request,
      "login-otp-verify",
      input.challengeId,
      { limit: 8, windowMs: 15 * 60 * 1000 },
    );
    if (limited) return limited;

    const result = await verifyLoginCode(input.challengeId, input.code);
    if (result.error === "expired") return fail("This verification code has expired. Sign in again.", 410);
    if (result.error === "attempts") return fail("Too many incorrect codes. Sign in again.", 429);
    if (result.error === "invalid") {
      return fail(`Incorrect code. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} remaining.`, 401);
    }

    if (result.purpose !== "signup") return fail("This verification request is invalid.", 400);
    const user = await User.findByIdAndUpdate(
      result.userId,
      {
        $set: {
          emailVerificationRequired: false,
          emailVerifiedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    ).select("+sessionVersion");
    if (!user || user.status === "suspended") return fail("This account is unavailable.", 401);
    if (!user.workspaceId) return fail("This workspace account is unavailable.", 401);

    await setSession(user);
    return ok(
      {
        destination: "/dashboard",
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      "Email verified. You are signed in.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
