import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/components/forms/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm />;
}
