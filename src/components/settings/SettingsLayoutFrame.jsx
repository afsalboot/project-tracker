"use client";

import { usePathname } from "next/navigation";
import SettingsSectionNav from "@/components/settings/SettingsSectionNav";

export default function SettingsLayoutFrame({ user, children }) {
  const path = usePathname();
  if (path === "/settings") return <div className="min-w-0">{children}</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <SettingsSectionNav user={user} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
