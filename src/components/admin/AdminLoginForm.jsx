"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.replace("/admin");
      router.refresh();
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-neutral-50 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#102f26] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10 bg-emerald-300/5" />
        <div className="absolute -bottom-40 left-20 size-96 rounded-full border border-white/10 bg-white/[.03]" />
        <div className="relative flex items-center gap-3 text-sm font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10"><PanelsTopLeft size={20} /></span>
          Project 1 Workspace
        </div>
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/[.06] px-3 py-2 text-xs font-semibold text-emerald-100"><ShieldCheck size={15} />Restricted website administration</span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">Control the platform, protect every workspace.</h1>
          <p className="mt-4 max-w-lg leading-7 text-emerald-50/65">Review website activity, manage all accounts and workspaces, and moderate public feedback from one secured console.</p>
        </div>
        <p className="relative text-xs text-emerald-50/45">Access is limited to the designated website administrator.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,.08)] sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole size={22} /></span>
          <p className="mt-7 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Website administration</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Administrator sign in</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Use the credentials of the first registered website account. Workspace Admin credentials do not grant access.</p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="label">Administrator email</span>
              <input className="field" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input className="field" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="btn btn-primary mt-2 w-full" disabled={busy}>{busy ? "Verifying..." : "Open admin portal"}</button>
          </form>
          <a className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:underline" href="/login">Return to workspace sign in</a>
        </div>
      </section>
    </main>
  );
}
