import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Access restricted" };

export default function AccessDeniedPage() {
  return (
    <section className="card mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700"><ShieldAlert size={22} /></span>
      <h1 className="mt-5 text-xl font-semibold">Access restricted</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-500">Your saved role does not include permission to open this module. Ask a workspace administrator to update your role.</p>
      <Link className="btn btn-primary mt-6" href="/">Go to available workspace</Link>
    </section>
  );
}
