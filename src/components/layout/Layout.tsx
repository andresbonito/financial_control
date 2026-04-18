import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomNav } from '../BottomNav'

interface LayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}

export function Layout({ children, title, subtitle, action }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar — desktop only */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop for mobile sidebar (when sidebar is forced open) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main
        className={`flex-1 min-w-0 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-6 lg:pb-6 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-60' : 'lg:ml-0'
        }`}
      >
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Alternar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children}
      </main>

      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  )
}
