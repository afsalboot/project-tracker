import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireApiUser, validId } from "@/lib/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import Feedback from "@/models/Feedback";

export const runtime = "nodejs";

const moderationSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser();
    if (auth.response) return auth.response;
    if (!auth.adminSession || !(await isPlatformAdmin(auth.userId))) return fail("Platform administrator access required.", 403);
    const { feedbackId } = await params;
    if (!validId(feedbackId)) return fail("Feedback not found.", 404);
    const { status } = moderationSchema.parse(await request.json());
    const item = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        $set: {
          status,
          moderatedBy: auth.userId,
          moderatedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!item) return fail("Feedback not found.", 404);
    return ok({ item }, status === "approved" ? "Feedback approved." : status === "rejected" ? "Feedback rejected." : "Feedback returned to pending.");
  } catch (error) {
    return handleApiError(error);
  }
}
