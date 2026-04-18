import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PeriodSelectorProps {
  value: string
  onChange: (value: string) => void
  monthCount?: number
  className?: string
}

export function PeriodSelector({
  value,
  onChange,
  monthCount = 12,
  className = '',
}: PeriodSelectorProps) {
  const options = Array.from({ length: monthCount }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = format(d, 'yyyy-MM')
    const label = format(d, 'MMMM yyyy', { locale: ptBR })
    return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
