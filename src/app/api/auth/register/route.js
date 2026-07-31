import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { handleApiError, fail, ok } from "@/lib/api-response";
import { registerSchema } from "@/lib/validations";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { enforcePersistentRateLimit } from "@/lib/security";
import { issueLoginVerification } from "@/lib/login-verification";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const limited = await enforcePersistentRateLimit(request, "registration", "", { limit: 5, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const input = registerSchema.parse(await request.json());
    const existing = await User.findOne({ email: input.email })
      .select("emailVerificationRequired")
      .lean();
    if (existing) {
      return fail(
        existing.emailVerificationRequired
          ? "This account is waiting for email verification. Sign in with its password to request a new code."
          : "An account with this email already exists. Sign in instead.",
        409,
      );
    }
    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        [user] = await User.create([{
          name: input.name,
          email: input.email,
          password: await bcrypt.hash(input.password, 12),
          emailVerificationRequired: true,
          role: "owner",
        }], { session });
        const [workspace] = await Workspace.create([{
          name: input.workspaceName || `${input.name}'s Workspace`,
          type: input.workspaceType,
          ownerId: user._id,
        }], { session });
        user.workspaceId = workspace._id;
        await user.save({ session });
      });
    } finally {
      await session.endSession();
    }
    const verification = await issueLoginVerification(user, "signup");
    return ok(
      {
        otpRequired: true,
        ...verification,
      },
      "Account created. Check your email to verify it and finish setup.",
      202,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail("An account with this email already exists. Sign in instead.", 409);
    }
    if (["EMAIL_NOT_CONFIGURED", "EMAIL_DELIVERY_FAILED"].includes(error?.code)) {
      return fail("Your account was created, but the verification email could not be sent. Try signing in after email delivery is configured.", 503);
    }
    return handleApiError(error);
  }
}
