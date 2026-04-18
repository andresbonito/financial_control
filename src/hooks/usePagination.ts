import { useState, useCallback } from 'react'

interface UsePaginationResult {
  page: number
  from: number
  to: number
  pageSize: number
  nextPage: () => void
  prevPage: () => void
  resetPage: () => void
  setPage: (p: number) => void
}

export function usePagination(pageSize = 20): UsePaginationResult {
  const [page, setPageState] = useState(0)

  const from = page * pageSize
  const to = from + pageSize - 1

  const nextPage = useCallback(() => setPageState((p) => p + 1), [])
  const prevPage = useCallback(() => setPageState((p) => Math.max(0, p - 1)), [])
  const resetPage = useCallback(() => setPageState(0), [])
  const setPage = useCallback((p: number) => setPageState(p), [])

  return { page, from, to, pageSize, nextPage, prevPage, resetPage, setPage }
}
