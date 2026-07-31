"use client";

import { useState } from "react";
import { KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginCodeForm({ challenge, onChallenge, onCancel, onVerified }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify(event) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, code }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.message);
      toast.success(result.message);
      onVerified(result.data.destination);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    try {
      const response = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.message);
      setCode("");
      onChallenge(result.data);
      toast.success(result.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MailCheck size={21} /></span>
      <h2 className="mt-6 text-2xl font-semibold">Check your email</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">Enter the six-digit code sent to <strong className="font-semibold text-neutral-700">{challenge.emailHint}</strong>. The code expires in 10 minutes.</p>
      <form className="mt-7 space-y-4" onSubmit={verify}>
        <label className="block">
          <span className="label">Verification code</span>
          <span className="relative block"><KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input className="field search-field text-center font-mono text-lg tracking-[.35em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required aria-label="Six-digit verification code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></span>
        </label>
        <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and sign in"}</button>
      </form>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <button type="button" className="font-medium text-neutral-500 hover:text-neutral-900" onClick={onCancel}>Use another account</button>
        <button type="button" className="font-medium text-emerald-700 hover:underline" disabled={resending} onClick={resend}>{resending ? "Sending…" : "Resend code"}</button>
      </div>
    </div>
  );
}
