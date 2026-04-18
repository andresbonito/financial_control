import type { CSSProperties } from 'react'

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`bg-slate-700 rounded animate-pulse ${className ?? ''}`}
      style={style}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-9 w-9 rounded-xl" />
      </div>
      <Shimmer className="h-7 w-36" />
      <Shimmer className="h-3 w-20" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Shimmer className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-3 w-32" />
          </div>
          <Shimmer className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 50, 90, 70, 85].map((h, i) => (
          <Shimmer key={i} className="flex-1 rounded-t" style={{ height: `${h}%` } as React.CSSProperties} />
        ))}
      </div>
      <div className="flex justify-between">
        {[...Array(6)].map((_, i) => (
          <Shimmer key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  )
}
