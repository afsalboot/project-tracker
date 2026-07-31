import { getCurrentUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Authentication required.", 401);
    return ok({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspace: {
          id: user.workspace?._id,
          name: user.workspace?.name,
          type: user.workspace?.type,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
