// Shared color palette used across charts and goal cards.
export const CHART_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const

export type ChartColor = (typeof CHART_COLORS)[number]
