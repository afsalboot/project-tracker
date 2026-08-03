import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser } from "@/lib/server";
import { profileSchema } from "@/lib/validations";
import User from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    const input = profileSchema.parse(await request.json());

    const duplicate = await User.findOne({
      _id: { $ne: auth.userId },
      $or: [
        { email: input.email },
        ...(input.username ? [{ username: input.username }] : []),
      ],
    }).select("email username").lean();
    if (duplicate?.email === input.email) return fail("That email address is already in use.", 409);
    if (input.username && duplicate?.username === input.username) return fail("That username is already in use.", 409);

    const update = {
      $set: { name: input.name, email: input.email },
      ...(input.username ? { $set: { name: input.name, email: input.email, username: input.username } } : { $unset: { username: 1 } }),
    };
    const user = await User.findByIdAndUpdate(auth.userId, update, {
      returnDocument: "after",
      runValidators: true,
    }).select("name username email role status createdAt").lean();
    return ok({ user }, "Profile updated.");
  } catch (error) {
    if (error?.code === 11000) return fail("That email address or username is already in use.", 409);
    return handleApiError(error);
  }
}
