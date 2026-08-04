"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Palette,
  ChartNoAxesCombined,
  ChevronRight,
  KeyRound,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
  { href: "/settings/workspace", label: "Workspace", icon: Building2, tabPermission: "settings.workspace" },
  { href: "/settings/project-customization", label: "Project & Task Setup", icon: SlidersHorizontal, tabPermission: "settings.project_customization" },
  { href: "/settings/appearance", label: "Appearance", icon: Palette, tabPermission: "settings.appearance" },
  { href: "/settings/users", label: "Users", icon: Users, tabPermission: "settings.users" },
  { href: "/settings/display", label: "Team & Dashboard", icon: ChartNoAxesCombined, tabPermission: "settings.display" },
  { href: "/settings/roles", label: "Roles & permissions", icon: KeyRound, tabPermission: "settings.roles" },
];

export default function SettingsSectionNav({ user }) {
  const path = usePathname();
  const hasPermission = (permission) =>
    user.role === "owner" ||
    user.workspace?.roles
      ?.find((role) => role.key === user.role)
      ?.permissions?.includes(permission);

  const visibleSections = sections.filter(({ href, tabPermission }) => {
    if (tabPermission && !hasPermission(tabPermission)) return false;
    if (user.workspace?.type === "personal" && ["/settings/users", "/settings/display", "/settings/roles"].includes(href)) return false;
    if (["/settings/workspace", "/settings/appearance", "/settings/project-customization"].includes(href)) return hasPermission("workspace.manage");
    if (href === "/settings/users") {
      return hasPermission("members.view") ||
        hasPermission("members.create") ||
        hasPermission("members.manage");
    }
    if (href === "/settings/display") return user.workspace?.type !== "personal" && hasPermission("team.display.manage");
    return true;
  });

  return (
    <aside className="hidden md:block xl:sticky xl:top-8 xl:self-start">
      <div className="card overflow-hidden p-2">
        <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-neutral-400">
          Settings
        </p>
        <nav className="flex gap-1 overflow-x-auto xl:block xl:space-y-1" aria-label="Settings sections">
          {visibleSections.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href) ||
              (href === "/settings/roles" && path.startsWith("/settings/permissions"));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900",
                  active && "bg-emerald-50 text-emerald-800",
                )}
              >
                <Icon size={17} />
                <span>{label}</span>
                <ChevronRight className="ml-auto hidden xl:block" size={15} />
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
