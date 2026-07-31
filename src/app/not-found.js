import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <p className="text-sm font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page is not here</h1>
        <p className="mt-2 text-sm text-neutral-500">The record may have moved or you may not have access.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">Back to dashboard</Link>
      </div>
    </main>
  );
}
