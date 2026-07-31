"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronsLeft,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  PanelsTopLeft,
  Plus,
  Settings,
  SquareKanban,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard, "dashboard.view"],
  ["/team", "Team", UsersRound, "members.view", true],
  ["/tasks", "My Tasks", ListTodo, "tasks.view"],
  ["/projects", "Projects", FolderKanban, "projects.view"],
  ["/task-board", "Task Board", SquareKanban, "tasks.view"],
  ["/completed", "Completed Work", BadgeCheck, "completed.view"],
  ["/settings", "Settings", Settings, "settings.view"],
];

export default function AppShell({ user, children }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState(false);
  const hasPermission = (permission) =>
    user.role === "owner" ||
    user.workspace?.roles
      ?.find((role) => role.key === user.role)
      ?.permissions?.includes(permission);
  const visibleNav = nav.filter(([, , , permission, sharedOnly]) =>
    (!permission || hasPermission(permission)) &&
    (!sharedOnly || user.workspace?.type !== "personal"),
  );
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("You have been logged out.");
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10"><PanelsTopLeft size={19} /></span>
        {!collapsed && <span className="font-semibold">Project 1 Workspace</span>}
        <button aria-label="Close menu" className="ml-auto md:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
        {visibleNav.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-50/70 hover:bg-white/8 hover:text-white",
              path.startsWith(href) && "bg-white/12 text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon size={19} />{!collapsed && label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        {!collapsed && <div className="mb-2 px-3 py-2"><p className="truncate text-sm font-semibold">{user.workspace?.name || "My Workspace"}</p><p className="truncate text-xs capitalize text-emerald-50/55">{user.workspace?.type || "Personal"} · {user.name}</p></div>}
        <button onClick={logout} title={collapsed ? "Log out" : undefined} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-emerald-50/70 hover:bg-white/8 hover:text-white", collapsed && "justify-center px-0")}><LogOut size={18} />{!collapsed && "Log out"}</button>
        <button onClick={() => setCollapsed((value) => !value)} className="mt-1 hidden min-h-10 w-full items-center justify-center rounded-xl text-emerald-50/60 hover:bg-white/8 md:flex" aria-label="Toggle sidebar"><ChevronsLeft className={cn("transition-transform", collapsed && "rotate-180")} size={18} /></button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#173f32] text-white transition-[width] md:flex", collapsed ? "w-[72px]" : "w-[224px]")}>{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/35 md:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[268px] flex-col bg-[#173f32] text-white" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div>}
      <div className={cn("min-w-0 transition-[padding] md:pl-[224px]", collapsed && "md:pl-[72px]")}>
        <button className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        {hasPermission("projects.create") && <button
          className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#176b4d] text-white shadow-[0_10px_28px_rgba(23,107,77,.3)] md:hidden"
          aria-label="Create project"
          onClick={() => {
            if (path === "/projects") {
              window.dispatchEvent(new CustomEvent("open-project-create"));
            } else {
              router.push("/projects?create=1");
            }
          }}
        >
          <Plus size={24} />
        </button>}
        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 pb-24 pt-20 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
