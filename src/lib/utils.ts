import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy', { locale: ptBR })
}

export function formatMonthShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM/yy', { locale: ptBR })
}

export function currentMonthRange() {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function monthRange(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function last6MonthsLabels(): { label: string; year: number; month: number; start: string; end: string }[] {
  const result = []
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    result.push({
      label: format(date, 'MMM/yy', { locale: ptBR }),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
    })
  }
  return result
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
