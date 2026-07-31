import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { connectDb } from "@/lib/db";
import { sendLoginCodeEmail } from "@/lib/email";
import LoginVerification from "@/models/LoginVerification";

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

function codeDigest(challengeId, code, purpose) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`${challengeId}:${code}:${purpose}`)
    .digest("hex");
}

function createCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function maskEmail(email) {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function issueLoginVerification(user, purpose) {
  await connectDb();
  const challengeId = randomUUID();
  const code = createCode();
  const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MS);
  await LoginVerification.deleteMany({ userId: user._id, purpose });
  await LoginVerification.create({
    _id: challengeId,
    userId: user._id,
    purpose,
    codeHash: codeDigest(challengeId, code, purpose),
    expiresAt,
  });
  const verification = {
    challengeId,
    emailHint: maskEmail(user.email),
    expiresInSeconds: Math.floor(LOGIN_CODE_TTL_MS / 1000),
  };
  try {
    await sendLoginCodeEmail({
      to: user.email,
      code,
      deliveryId: randomUUID(),
    });
  } catch (error) {
    error.verification = verification;
    throw error;
  }
  return verification;
}

export async function verifyLoginCode(challengeId, code) {
  await connectDb();
  const challenge = await LoginVerification.findById(challengeId)
    .select("+codeHash")
    .lean();
  if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
    if (challenge) await LoginVerification.deleteOne({ _id: challengeId });
    return { error: "expired" };
  }
  if (challenge.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    await LoginVerification.deleteOne({ _id: challengeId });
    return { error: "attempts" };
  }
  const expected = Buffer.from(challenge.codeHash, "hex");
  const received = Buffer.from(codeDigest(challengeId, code, challenge.purpose), "hex");
  const valid = expected.length === received.length && timingSafeEqual(expected, received);
  if (!valid) {
    const updated = await LoginVerification.findOneAndUpdate(
      { _id: challengeId, attempts: { $lt: LOGIN_CODE_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).lean();
    if (!updated || updated.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
      await LoginVerification.deleteOne({ _id: challengeId });
      return { error: "attempts" };
    }
    return { error: "invalid", attemptsRemaining: LOGIN_CODE_MAX_ATTEMPTS - updated.attempts };
  }
  const consumed = await LoginVerification.findOneAndDelete({
    _id: challengeId,
    codeHash: challenge.codeHash,
  }).lean();
  if (!consumed) return { error: "expired" };
  return { userId: challenge.userId, purpose: challenge.purpose };
}
