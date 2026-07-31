const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendLoginCodeEmail({ to, code, deliveryId }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    const error = new Error("Email verification is not configured.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": deliveryId,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Project 1 Workspace sign-in code",
      text: `Your verification code is ${code}. It expires in 10 minutes. Use it to verify your email and finish creating your Project 1 Workspace account. If you did not create this account, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    const error = new Error("The verification email could not be sent.");
    error.code = "EMAIL_DELIVERY_FAILED";
    error.status = response.status;
    throw error;
  }
}
