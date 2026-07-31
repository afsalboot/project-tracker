"use client";

export default function ErrorPage({ reset }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-neutral-500">The page could not be loaded. Your data has not been changed.</p>
        <button onClick={reset} className="btn btn-primary mt-6">Try again</button>
      </div>
    </main>
  );
}
