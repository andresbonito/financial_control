import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-800 border border-slate-700 rounded-xl',
        onClick && 'cursor-pointer hover:border-slate-600 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  iconColor: string
  trend?: { value: number; label: string }
}

export function StatCard({ title, value, subtitle, icon, iconColor, trend }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>{trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%</span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconColor}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
