import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, pageSize, total, onPrev, onNext }: PaginationProps) {
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  const hasPrev = page > 0
  const hasNext = to < total

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
      <p className="text-sm text-slate-400">
        {from}–{to} de {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-2 text-sm text-slate-400 flex items-center">
          {page + 1}
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
