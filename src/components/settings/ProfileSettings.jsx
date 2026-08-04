"use client";

import { useState } from "react";
import { AtSign, KeyRound, Mail, MoreHorizontal, Pencil, ShieldCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageIntro } from "@/components/ui";
import FieldError from "@/components/ui/FieldError";
import { getFieldErrors, passwordFormSchema, profileSchema } from "@/lib/validations";

function Dialog({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="card max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto shadow-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
          <div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p></div>
          <button className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" type="button" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function ProfileSettings({ initialUser }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialUser);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: initialUser.name, username: initialUser.username || "", email: initialUser.email });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  async function saveProfile(event) {
    event.preventDefault();
    const validation = getFieldErrors(profileSchema, profileForm);
    if (!validation.data) return setProfileErrors(validation.errors);
    setProfileErrors({});
    setSaving(true);
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      const conflictField = /username/i.test(result.message) ? "username" : /email/i.test(result.message) ? "email" : null;
      setProfileErrors({ ...(result.errors || {}), ...(conflictField ? { [conflictField]: result.message } : { form: result.message }) });
      return toast.error(result.message);
    }
    setProfile((current) => ({ ...current, ...result.data.user }));
    setDialog(null);
    toast.success(result.message);
    router.refresh();
  }

  async function changePassword(event) {
    event.preventDefault();
    const validation = getFieldErrors(passwordFormSchema, passwordForm);
    if (!validation.data) return setPasswordErrors(validation.errors);
    setPasswordErrors({});
    setSaving(true);
    const response = await fetch("/api/profile/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: validation.data.currentPassword, newPassword: validation.data.newPassword }) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      const field = /current password/i.test(result.message) ? "currentPassword" : null;
      setPasswordErrors({ ...(result.errors || {}), ...(field ? { [field]: result.message } : { form: result.message }) });
      return toast.error(result.message);
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setDialog(null);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <PageIntro eyebrow="Settings / Profile" title="Your profile" description="View your account details and manage how teammates identify and mention you." />
      <section className="card overflow-visible">
        <div className="flex items-start gap-4 border-b border-neutral-100 p-5 sm:p-6">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-700">{profile.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{profile.name}</h3><p className="mt-1 text-sm font-medium text-emerald-700">{profile.username ? `@${profile.username}` : "Username not set"}</p></div>
          <details className="relative" data-action-menu>
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Profile actions"><MoreHorizontal size={18} /></summary>
            <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
              <button className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-neutral-50" type="button" onClick={() => setDialog("profile")}><Pencil size={15} />Edit profile</button>
              <button className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-neutral-50" type="button" onClick={() => setDialog("password")}><KeyRound size={15} />Change password</button>
            </div>
          </details>
        </div>
        <dl className="grid gap-px bg-neutral-100 sm:grid-cols-2">
          <div className="flex gap-3 bg-white p-5"><Mail className="mt-0.5 text-neutral-400" size={17} /><div><dt className="text-xs font-semibold text-neutral-500">Email</dt><dd className="mt-1 break-all text-sm">{profile.email}</dd></div></div>
          <div className="flex gap-3 bg-white p-5"><AtSign className="mt-0.5 text-neutral-400" size={17} /><div><dt className="text-xs font-semibold text-neutral-500">Mention username</dt><dd className="mt-1 text-sm">{profile.username ? `@${profile.username}` : "Not configured"}</dd></div></div>
          <div className="flex gap-3 bg-white p-5"><ShieldCheck className="mt-0.5 text-neutral-400" size={17} /><div><dt className="text-xs font-semibold text-neutral-500">Workspace role</dt><dd className="mt-1 text-sm capitalize">{profile.role}</dd></div></div>
          <div className="flex gap-3 bg-white p-5"><UserRound className="mt-0.5 text-neutral-400" size={17} /><div><dt className="text-xs font-semibold text-neutral-500">Account status</dt><dd className="mt-1 text-sm capitalize">{profile.status || "active"}</dd></div></div>
        </dl>
      </section>

      <section className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h3 className="font-semibold">Password</h3><p className="mt-1 text-sm text-neutral-500">Use your current password to securely choose a new one.</p></div>
        <button className="btn btn-secondary" type="button" onClick={() => setDialog("password")}><KeyRound size={16} />Change password</button>
      </section>

      {dialog === "profile" && <Dialog title="Edit profile" description="Your username is the handle teammates will see when they mention you." onClose={() => setDialog(null)}><form className="space-y-4 p-5" onSubmit={saveProfile}>
        <label><span className="label">Full name</span><input className="field" aria-invalid={Boolean(profileErrors.name)} value={profileForm.name} onChange={(event) => { setProfileForm({ ...profileForm, name: event.target.value }); setProfileErrors((current) => ({ ...current, name: undefined, form: undefined })); }} /><FieldError message={profileErrors.name} /></label>
        <label><span className="label">Username</span><div className="relative"><AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><input className="field !pl-9" aria-invalid={Boolean(profileErrors.username)} placeholder="your.username" value={profileForm.username} onChange={(event) => { setProfileForm({ ...profileForm, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }); setProfileErrors((current) => ({ ...current, username: undefined, form: undefined })); }} /></div><FieldError message={profileErrors.username} /><span className="mt-1 block text-xs text-neutral-500">Lowercase letters, numbers, dots, hyphens, and underscores.</span></label>
        <label><span className="label">Email address</span><input className="field" aria-invalid={Boolean(profileErrors.email)} type="email" value={profileForm.email} onChange={(event) => { setProfileForm({ ...profileForm, email: event.target.value }); setProfileErrors((current) => ({ ...current, email: undefined, form: undefined })); }} /><FieldError message={profileErrors.email} /></label>
        <FieldError message={profileErrors.form} />
        <div className="flex justify-end gap-2 pt-1"><button className="btn btn-secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
      </form></Dialog>}

      {dialog === "password" && <Dialog title="Change password" description="Changing your password signs out other sessions while keeping this session active." onClose={() => setDialog(null)}><form className="space-y-4 p-5" onSubmit={changePassword}>
        <label><span className="label">Current password</span><input className="field" aria-invalid={Boolean(passwordErrors.currentPassword)} type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => { setPasswordForm({ ...passwordForm, currentPassword: event.target.value }); setPasswordErrors((current) => ({ ...current, currentPassword: undefined, form: undefined })); }} /><FieldError message={passwordErrors.currentPassword} /></label>
        <label><span className="label">New password</span><input className="field" aria-invalid={Boolean(passwordErrors.newPassword)} type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => { setPasswordForm({ ...passwordForm, newPassword: event.target.value }); setPasswordErrors((current) => ({ ...current, newPassword: undefined, form: undefined })); }} /><FieldError message={passwordErrors.newPassword} /><span className="mt-1 block text-xs text-neutral-500">At least 8 characters with uppercase, lowercase, and a number.</span></label>
        <label><span className="label">Confirm new password</span><input className="field" aria-invalid={Boolean(passwordErrors.confirmPassword)} type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => { setPasswordForm({ ...passwordForm, confirmPassword: event.target.value }); setPasswordErrors((current) => ({ ...current, confirmPassword: undefined, form: undefined })); }} /><FieldError message={passwordErrors.confirmPassword} /></label>
        <FieldError message={passwordErrors.form} />
        <div className="flex justify-end gap-2 pt-1"><button className="btn btn-secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? "Changing…" : "Change password"}</button></div>
      </form></Dialog>}
    </>
  );
}
