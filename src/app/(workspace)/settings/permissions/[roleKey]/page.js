import RolePermissions from "@/components/settings/RolePermissions";

export const metadata = { title: "Role permissions" };

export default async function RolePermissionsPage({ params }) {
  const { roleKey } = await params;
  return <RolePermissions roleKey={roleKey} />;
}
