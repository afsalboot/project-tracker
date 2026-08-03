"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  AtSign,
  ChevronsLeft,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  PanelsTopLeft,
  Settings,
  SquareKanban,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sidebarTheme } from "@/constants/appearance";
import FloatingDateTime from "@/components/layout/FloatingDateTime";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard, "dashboard.view"],
  ["/team", "Team", UsersRound, "members.view", true],
  ["/tasks", "My Tasks", ListTodo, "tasks.view"],
  ["/projects", "Projects", FolderKanban, "projects.view"],
  ["/task-board", "Task Board", SquareKanban, "tasks.view"],
  ["/completed", "Completed Work", BadgeCheck, "completed.view"],
  ["/mentions", "Mentions", AtSign, null],
  ["/settings", "Settings", Settings, null],
];

export default function AppShell({ user, children }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState(false);
  const theme = sidebarTheme(user.workspace?.sidebarTheme);
  const themeStyles = useMemo(() => ({
    "--sidebar": theme.background,
    "--accent": theme.accent,
    "--accent-hover": theme.accentHover,
  }), [theme.accent, theme.accentHover, theme.background]);
  useEffect(() => {
    const root = document.documentElement;
    const previous = Object.fromEntries(
      Object.entries(themeStyles).map(([property]) => [property, root.style.getPropertyValue(property)]),
    );
    Object.entries(themeStyles).forEach(([property, value]) => root.style.setProperty(property, value));
    return () => {
      Object.entries(previous).forEach(([property, value]) => {
        if (value) root.style.setProperty(property, value);
        else root.style.removeProperty(property);
      });
    };
  }, [themeStyles]);
  useEffect(() => {
    function closeOutside(event) {
      document.querySelectorAll("details[data-action-menu][open]").forEach((menu) => {
        if (!menu.contains(event.target)) menu.removeAttribute("open");
      });
    }
    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      document.querySelectorAll("details[data-action-menu][open]").forEach((menu) => menu.removeAttribute("open"));
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
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
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 shadow-inner shadow-white/5"><PanelsTopLeft size={19} /></span>
        {!collapsed && <span className="font-semibold tracking-[-0.02em]">Project 1 Workspace</span>}
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
              "sidebar-nav-item flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background,color,box-shadow] duration-200",
              path.startsWith(href) && "sidebar-nav-item-active",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon size={19} />{!collapsed && label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        {!collapsed && <div className="mb-2 px-3 py-2"><p className="truncate text-sm font-semibold">{user.workspace?.name || "My Workspace"}</p><p className="truncate text-xs capitalize text-emerald-50/55">{user.workspace?.type || "Personal"} · {user.name}</p></div>}
        <button onClick={logout} title={collapsed ? "Log out" : undefined} className={cn("sidebar-nav-item flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors", collapsed && "justify-center px-0")}><LogOut size={18} />{!collapsed && "Log out"}</button>
        <button onClick={() => setCollapsed((value) => !value)} className="sidebar-nav-item mt-1 hidden min-h-10 w-full items-center justify-center rounded-xl transition-colors md:flex" aria-label="Toggle sidebar"><ChevronsLeft className={cn("transition-transform", collapsed && "rotate-180")} size={18} /></button>
      </div>
    </>
  );

  return (
    <div className="workspace-theme min-h-screen" style={themeStyles}>
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col bg-[var(--sidebar)] text-white shadow-[12px_0_36px_rgba(17,24,39,.08)] transition-[width,background] md:flex", collapsed ? "w-[72px]" : "w-[224px]")}>{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[268px] flex-col bg-[var(--sidebar)] text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div>}
      <div className={cn("min-w-0 transition-[padding] md:pl-[224px]", collapsed && "md:pl-[72px]")}>
        <button className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl border border-[var(--brand-200)] bg-white text-[var(--accent)] shadow-sm transition hover:bg-[var(--accent-soft)] md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <FloatingDateTime />
        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 pb-24 pt-20 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
