export default function Loading() {
  return (
    <div className="space-y-5 p-6">
      <div className="skeleton h-9 w-52" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="skeleton h-32" />)}
      </div>
    </div>
  );
}
