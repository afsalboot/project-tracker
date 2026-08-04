"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsSectionNav from "@/components/settings/SettingsSectionNav";

export default function SettingsLayoutFrame({ user, children }) {
  const path = usePathname();
  if (path === "/settings") return <div className="min-w-0">{children}</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <SettingsSectionNav user={user} />
      <div className="min-w-0">
        <Link href="/settings" className="btn btn-secondary mb-4 w-fit md:hidden"><ArrowLeft size={16} />Back to settings</Link>
        {children}
      </div>
    </div>
  );
}
