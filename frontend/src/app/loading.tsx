/** Route-level fallback while server data loads (e.g. the free backend waking up). */
export default function Loading() {
  return (
    <div className="flex justify-center py-32" role="status" aria-label="Loading">
      <span className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 animate-bounce rounded-full bg-ink" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
    </div>
  );
}
