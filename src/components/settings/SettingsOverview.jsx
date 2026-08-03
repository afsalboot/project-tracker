import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  KeyRound,
  Palette,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { PageIntro } from "@/components/ui";

const sections = [
  {
    href: "/settings/profile",
    title: "Profile",
    description: "View your account, choose a username, edit profile details, and change your password.",
    icon: UserRound,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/settings/workspace",
    title: "Workspace",
    description: "Edit the workspace name and choose Personal, Organization, or Team mode.",
    icon: Building2,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.workspace",
  },
  {
    href: "/settings/users",
    title: "Users",
    description: "Add users, assign saved roles, and manage existing access.",
    icon: Users,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.users",
  },
  {
    href: "/settings/project-customization",
    title: "Project & Task Setup",
    description: "Manage stages, statuses, environments, templates, types, and platforms used in forms.",
    icon: SlidersHorizontal,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.project_customization",
  },
  {
    href: "/settings/appearance",
    title: "Appearance",
    description: "Choose the shared color theme used throughout the workspace.",
    icon: Palette,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.appearance",
  },
  {
    href: "/settings/display",
    title: "Team & Dashboard",
    description: "Choose highlighted Team roles and the roles included in Dashboard allocation analytics.",
    icon: ChartNoAxesCombined,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.display",
  },
  {
    href: "/settings/roles",
    title: "Roles & permissions",
    description: "Create roles and configure module access, record actions, and administration.",
    icon: KeyRound,
    tone: "bg-emerald-50 text-emerald-700",
    tabPermission: "settings.roles",
  },
];

export default function SettingsOverview({ user }) {
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
      return ["members.view", "members.create", "members.manage"].some(
        hasPermission,
      );
    }
    if (href === "/settings/display") return user.workspace?.type !== "personal" && hasPermission("team.display.manage");
    return true;
  });

  return (
    <>
      <PageIntro
        eyebrow="Administration"
        title="Settings"
        description={user.workspace?.type === "personal" ? "Manage your personal workspace and customize project and task fields." : "Workspace configuration, users, roles, and permissions now live on separate pages."}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleSections.map(({ href, title, description, icon: Icon, tone }) => (
          <Link className="card group flex min-h-52 flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md" href={href} key={href}>
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
            <h3 className="mt-5 font-semibold">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-neutral-500">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              Open <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
            </span>
          </Link>
        ))}
      </div>

    </>
  );
}
