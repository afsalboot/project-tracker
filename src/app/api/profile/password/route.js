import bcrypt from "bcryptjs";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { enforcePersistentRateLimit } from "@/lib/security";
import { requireApiUser } from "@/lib/server";
import { passwordChangeSchema } from "@/lib/validations";
import User from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const limited = await enforcePersistentRateLimit(request, "password-change", auth.userId, { limit: 8, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const input = passwordChangeSchema.parse(await request.json());
    const user = await User.findById(auth.userId).select("+password +sessionVersion");
    if (!user || !(await bcrypt.compare(input.currentPassword, user.password))) {
      return fail("Current password is incorrect.", 400);
    }
    user.password = await bcrypt.hash(input.newPassword, 12);
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    await setSession(user);
    return ok({}, "Password changed successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
