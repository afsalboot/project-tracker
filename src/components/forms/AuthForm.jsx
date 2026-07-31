"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, PanelsTopLeft } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, registerSchema } from "@/lib/validations";
import Dropdown from "@/components/ui/Dropdown";

export default function AuthForm() {
  const router = useRouter();
  const [setup, setSetup] = useState(false);
  const schema = setup ? registerSchema : loginSchema;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", workspaceName: "", workspaceType: "personal" },
  });

  async function submit(values) {
    const response = await fetch(`/api/auth/${setup ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden bg-[#173f32] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10"><PanelsTopLeft size={20} /></span>
          Project 1 Workspace
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-emerald-200">A focused workspace for every project</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Know what to build, test, and deploy next.</h1>
          <p className="mt-4 max-w-lg leading-7 text-emerald-50/70">General projects, Zoho customizations, tasks, blockers and deadlines in one private workspace.</p>
        </div>
        <p className="text-xs text-emerald-50/50">Private workspaces for individuals and teams</p>
      </section>
      <section className="flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><LockKeyhole size={21} /></span>
          <h2 className="mt-6 text-2xl font-semibold">{setup ? "Create your workspace" : "Welcome back"}</h2>
          <p className="mt-2 text-sm text-neutral-500">{setup ? "Create a private workspace. You will be its owner and can invite your team later." : "Sign in to continue to your project workspace."}</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(submit)}>
            {setup && <><Field label="Name" error={errors.name?.message}><input className="field" autoComplete="name" {...register("name")} /></Field><Field label="Workspace type" error={errors.workspaceType?.message}><Controller control={control} name="workspaceType" render={({ field }) => <Dropdown value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={[["personal", "Personal"], ["organization", "Organization"], ["team", "Team"]]} />} /></Field><Field label="Workspace name" error={errors.workspaceName?.message}><input className="field" placeholder="My workspace" {...register("workspaceName")} /></Field></>}
            <Field label="Email" error={errors.email?.message}><input className="field" type="email" autoComplete="email" {...register("email")} /></Field>
            <Field label="Password" error={errors.password?.message}><input className="field" type="password" autoComplete={setup ? "new-password" : "current-password"} {...register("password")} /></Field>
            <button className="btn btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : setup ? "Create workspace" : "Sign in"}</button>
          </form>
          <button className="mt-5 text-sm font-medium text-emerald-700 hover:underline" onClick={() => setSetup((value) => !value)}>
            {setup ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }) {
  return <label className="block"><span className="label">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
