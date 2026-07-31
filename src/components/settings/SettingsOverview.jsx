import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  Eye,
  KeyRound,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { PageIntro } from "@/components/ui";

const sections = [
  {
    href: "/settings/workspace",
    title: "Workspace",
    description: "Edit the workspace name and choose Personal, Organization, or Team mode.",
    icon: Building2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/settings/users",
    title: "Users",
    description: "Add users, assign saved roles, and manage existing access.",
    icon: Users,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    href: "/settings/display",
    title: "Team & Dashboard",
    description: "Choose highlighted Team roles and the roles included in Dashboard allocation analytics.",
    icon: ChartNoAxesCombined,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    href: "/settings/roles",
    title: "Roles & permissions",
    description: "Create roles and configure module access, record actions, and administration.",
    icon: KeyRound,
    tone: "bg-violet-50 text-violet-700",
  },
];

const levels = [
  [Eye, "Module Access", "Control which application modules a role can open."],
  [Wrench, "Record Permissions", "Set View, Create, Edit, Archive, Delete, and Manage actions under Project, Task, and User."],
  [ShieldCheck, "Administration", "Protect workspace configuration and role administration."],
];

export default function SettingsOverview({ user }) {
  const hasPermission = (permission) =>
    user.role === "owner" ||
    user.workspace?.roles
      ?.find((role) => role.key === user.role)
      ?.permissions?.includes(permission);
  const visibleSections = sections.filter(({ href }) => {
    if (href === "/settings/workspace") return hasPermission("workspace.manage");
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
        description="Workspace configuration, users, roles, and permissions now live on separate pages."
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

      <section className="card mt-5 p-5 sm:p-6">
        <h3 className="font-semibold">Permission levels</h3>
        <p className="mt-1 text-sm text-neutral-500">Each saved role can have a different combination from these three groups.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {levels.map(([Icon, title, description]) => (
            <div className="flex gap-3 rounded-xl border border-neutral-200 p-4" key={title}>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600"><Icon size={17} /></span>
              <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
