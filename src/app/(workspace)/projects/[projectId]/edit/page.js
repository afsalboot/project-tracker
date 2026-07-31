import { redirect } from "next/navigation";
export const metadata = { title: "Edit project" };
export default async function EditProjectPage({ params }) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}?edit=1`);
}
