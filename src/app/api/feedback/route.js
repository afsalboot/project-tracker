import { connectDb } from "@/lib/db";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { enforcePersistentRateLimit } from "@/lib/security";
import Feedback from "@/models/Feedback";
import { feedbackSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDb();
    const testimonials = await Feedback.find({ status: "approved" })
      .select("name context message rating createdAt")
      .sort({ moderatedAt: -1, createdAt: -1 })
      .limit(18)
      .lean();
    const response = ok({ testimonials });
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    await connectDb();
    const limited = await enforcePersistentRateLimit(request, "public-feedback", "", {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;
    const input = feedbackSchema.parse(await request.json());
    if (input.website) return ok({}, "Thank you. Your feedback was submitted.", 202);
    await Feedback.create({
      name: input.name,
      email: input.email,
      context: input.context,
      message: input.message,
      rating: input.rating,
    });
    return ok({}, "Thank you for sharing your experience.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
