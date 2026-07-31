import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { handleApiError, fail, ok } from "@/lib/api-response";
import { registerSchema } from "@/lib/validations";
import { setSession } from "@/lib/auth";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { enforcePersistentRateLimit } from "@/lib/security";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDb();
    const limited = await enforcePersistentRateLimit(request, "registration", "", { limit: 5, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const input = registerSchema.parse(await request.json());
    if (await User.exists({ email: input.email })) {
      return fail("An account with this email already exists. Sign in instead.", 409);
    }
    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        [user] = await User.create([{
          name: input.name,
          email: input.email,
          password: await bcrypt.hash(input.password, 12),
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
    await setSession(user);
    return ok(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Your workspace is ready.",
      201,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail("An account with this email already exists. Sign in instead.", 409);
    }
    return handleApiError(error);
  }
}
