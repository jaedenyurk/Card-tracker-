// Shimmering placeholders shown while a section's data loads (each dashboard section streams in behind its own Suspense boundary).

export function SummarySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading summary">
      <div className="skeleton h-10 w-72 max-w-full !rounded-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="card p-6">
            <div className="skeleton h-3 w-24 max-w-full" />
            <div className="skeleton mt-4 h-8 w-32 max-w-full" />
            <div className="skeleton mt-3 h-3 w-40 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-6" aria-busy="true" aria-label="Loading chart">
      <div className="skeleton h-5 w-48 max-w-full" />
      <div className="skeleton mt-5 h-[280px] w-full" />
    </div>
  );
}

export function MoversSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading top and bottom performers">
      {[0, 1].map((panel) => (
        <div key={panel} className="card p-6">
          <div className="skeleton h-5 w-40 max-w-full" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, row) => (
              <div key={row} className="skeleton h-14 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic page placeholder for route changes: a header block and one card.
export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div>
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-4 h-10 w-64 max-w-full" />
        <div className="skeleton mt-4 h-4 w-80 max-w-full" />
      </div>
      <div className="card p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
