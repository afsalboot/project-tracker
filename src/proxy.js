import { NextResponse } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_API_BODY_BYTES = 256 * 1024;

export function proxy(request) {
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_API_BODY_BYTES) {
    return NextResponse.json(
      { success: false, message: "Request body is too large.", errors: {} },
      { status: 413 },
    );
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json(
      { success: false, message: "Cross-site request rejected.", errors: {} },
      { status: 403 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json(
          { success: false, message: "Request origin rejected.", errors: {} },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, message: "Request origin rejected.", errors: {} },
        { status: 403 },
      );
    }
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentLength > 0 && !contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { success: false, message: "Content-Type must be application/json.", errors: {} },
      { status: 415 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
