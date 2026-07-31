import { fail } from "@/lib/api-response";
import { createHash } from "node:crypto";
import RateLimit from "@/models/RateLimit";

export function clientAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const value = forwarded || realIp || "unknown";
  return /^[a-f0-9:.]{2,64}$/i.test(value) ? value : "unknown";
}

function persistentKey(request, namespace, identifier, windowMs) {
  const window = Math.floor(Date.now() / windowMs);
  const input = `${namespace}:${clientAddress(request)}:${String(identifier || "").slice(0, 160)}:${window}`;
  return createHash("sha256").update(input).digest("hex");
}

export async function enforcePersistentRateLimit(request, namespace, identifier, { limit, windowMs }) {
  const key = persistentKey(request, namespace, identifier, windowMs);
  const expiresAt = new Date((Math.floor(Date.now() / windowMs) + 1) * windowMs);
  const entry = await RateLimit.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (entry.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  const response = fail("Too many requests. Please wait and try again.", 429);
  response.headers.set("Retry-After", String(retryAfter));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function clearPersistentRateLimit(request, namespace, identifier, windowMs) {
  await RateLimit.deleteOne({ _id: persistentKey(request, namespace, identifier, windowMs) });
}
