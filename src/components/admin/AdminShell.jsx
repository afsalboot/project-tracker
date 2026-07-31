"use client";

import { useRouter } from "next/navigation";
import { LogOut, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminShell({ user, children }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Administrator session ended.");
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#173f32] text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="grid size-9 place-items-center rounded-xl bg-white/10"><PanelsTopLeft size={18} /></span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">Project 1 Workspace</p><p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-100/60"><ShieldCheck size={11} />Website administration</p></div>
          <div className="ml-auto hidden min-w-0 text-right sm:block"><p className="truncate text-xs font-semibold">{user.name}</p><p className="truncate text-[11px] text-emerald-50/55">{user.email}</p></div>
          <button type="button" className="ml-2 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-emerald-50/75 transition hover:bg-white/10 hover:text-white" onClick={logout}><LogOut size={17} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
