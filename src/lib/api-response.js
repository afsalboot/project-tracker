import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok(data = {}, message = "Success", status = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export function fail(message, status = 400, errors = {}) {
  return NextResponse.json(
    { success: false, message, errors },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export function handleApiError(error) {
  if (error instanceof ZodError) {
    const errors = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join("."), issue.message]),
    );
    return fail("Please correct the highlighted fields.", 422, errors);
  }
  if (error?.code === 11000) {
    return fail("A record with these details already exists.", 409);
  }
  if (process.env.NODE_ENV !== "production") console.error(error);
  return fail("Something went wrong. Please try again.", 500);
}
