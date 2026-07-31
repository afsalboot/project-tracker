import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { connectDb } from "@/lib/db";
import { ensureWorkspace } from "@/lib/workspace";
import User from "@/models/User";

export const COOKIE_NAME = "zoho_tracker_session";
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  if (new TextEncoder().encode(process.env.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
};

export async function createToken(user, { admin = false } = {}) {
  return new SignJWT({
    ver: Number(user.sessionVersion || 0),
    ...(admin ? { admin: true } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuer("project-tracker")
    .setAudience("project-tracker-web")
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "project-tracker",
      audience: "project-tracker-web",
    });
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(user, options) {
  const store = await cookies();
  store.set(COOKIE_NAME, await createToken(user, options), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
    priority: "high",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.sub) return null;
  await connectDb();
  const context = await ensureWorkspace(session.sub);
  if (!context) return null;
  const sessionVersion = await User.findById(session.sub).select("+sessionVersion").lean();
  if (!sessionVersion || Number(session.ver || 0) !== Number(sessionVersion.sessionVersion || 0)) {
    return null;
  }
  return { ...context.user, workspace: context.workspace };
}
