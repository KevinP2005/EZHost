export default function TodayStaysLoading() {
  return (
    <div className="space-y-5" aria-label="Loading today's stays">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="min-h-52 animate-pulse rounded-lg border border-border bg-card p-4">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-16 rounded-md bg-muted" />
              <div className="h-16 rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
