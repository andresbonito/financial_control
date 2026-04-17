import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, monthRange } from '../lib/utils'
import { Transaction, Investment, Goal, isIncome } from '../types'

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

export function Reports() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<{
    transactions: Transaction[]
    investments: Investment[]
    goals: Goal[]
  } | null>(null)

  async function loadPreview() {
    if (!user) return
    setLoading(true)
    const { start, end } = monthRange(year, month)

    const [txRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('investments').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
    ])

    setPreviewData({
      transactions: txRes.data || [],
      investments: invRes.data || [],
      goals: goalRes.data || [],
    })
    setLoading(false)
  }

  async function generatePDF() {
    if (!previewData) return
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const monthName = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })
    const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1)

    const { transactions, investments, goals } = previewData
    const income = transactions.filter((t) => isIncome(t.type))
    const expenses = transactions.filter((t) => !isIncome(t.type))
    const totalIncome = income.reduce((a, t) => a + t.amount, 0)
    const totalExpense = expenses.reduce((a, t) => a + t.amount, 0)
    const balance = totalIncome - totalExpense
    const totalInvested = investments.reduce((a, i) => a + i.invested_amount, 0)
    const currentInvValue = investments.reduce((a, i) => a + (i.current_value ?? i.invested_amount), 0)

    // ——— Capa ———
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageW, 297, 'F')

    // Header bar
    doc.setFillColor(139, 92, 246)
    doc.rect(0, 0, pageW, 50, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Relatório Financeiro', 15, 22)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text(monthNameCap, 15, 33)
    doc.setFontSize(10)
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 43)

    // KPI boxes
    const boxes = [
      { label: 'Receitas', value: formatCurrency(totalIncome), color: [34, 197, 94] as [number, number, number] },
      { label: 'Despesas', value: formatCurrency(totalExpense), color: [239, 68, 68] as [number, number, number] },
      { label: 'Saldo', value: formatCurrency(balance), color: balance >= 0 ? [139, 92, 246] as [number, number, number] : [239, 68, 68] as [number, number, number] },
      { label: 'Investimentos', value: formatCurrency(currentInvValue), color: [245, 158, 11] as [number, number, number] },
    ]
    const boxW = (pageW - 30) / 4
    boxes.forEach((box, i) => {
      const x = 15 + i * (boxW + 2)
      doc.setFillColor(30, 41, 59)
      doc.roundedRect(x, 60, boxW, 28, 3, 3, 'F')
      doc.setFillColor(...box.color)
      doc.roundedRect(x, 60, 3, 28, 1, 1, 'F')
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(box.label, x + 6, 70)
      doc.setTextColor(241, 245, 249)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(box.value, x + 6, 81)
    })

    let y = 100

    // ——— Receitas ———
    if (income.length > 0) {
      doc.setTextColor(34, 197, 94)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Receitas', 15, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor']],
        body: income.map((t) => [
          format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy'),
          t.description,
          t.type === 'pix_in' ? 'PIX' : t.type === 'salary' ? 'Salário' : t.type === 'allowance' ? 'Vale' : 'Receita',
          t.category,
          formatCurrency(t.amount),
        ]),
        foot: [['', '', '', 'Total', formatCurrency(totalIncome)]],
        styles: { fontSize: 9, textColor: [241, 245, 249] as [number,number,number], fillColor: [30, 41, 59] as [number,number,number], lineColor: [51, 65, 85] as [number,number,number], lineWidth: 0.2 },
        headStyles: { fillColor: [22, 80, 40] as [number,number,number], textColor: [134, 239, 172] as [number,number,number], fontStyle: 'bold' },
        footStyles: { fillColor: [20, 70, 35] as [number,number,number], textColor: [134, 239, 172] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [24, 32, 52] as [number,number,number] },
        margin: { left: 15, right: 15 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    if (y > 240) { doc.addPage(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 297, 'F'); y = 15 }

    // ——— Despesas ———
    if (expenses.length > 0) {
      doc.setTextColor(239, 68, 68)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Despesas', 15, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descrição', 'Categoria', 'Pagamento', 'Valor']],
        body: expenses.map((t) => [
          format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy'),
          t.description,
          t.category,
          t.payment_method ? { pix: 'PIX', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro' }[t.payment_method] : '-',
          formatCurrency(t.amount),
        ]),
        foot: [['', '', '', 'Total', formatCurrency(totalExpense)]],
        styles: { fontSize: 9, textColor: [241, 245, 249] as [number,number,number], fillColor: [30, 41, 59] as [number,number,number], lineColor: [51, 65, 85] as [number,number,number], lineWidth: 0.2 },
        headStyles: { fillColor: [90, 25, 25] as [number,number,number], textColor: [252, 165, 165] as [number,number,number], fontStyle: 'bold' },
        footStyles: { fillColor: [80, 20, 20] as [number,number,number], textColor: [252, 165, 165] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [24, 32, 52] as [number,number,number] },
        margin: { left: 15, right: 15 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // ——— Despesas por categoria ———
    const expByCategory = expenses.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
    const catEntries = Object.entries(expByCategory).sort((a, b) => b[1] - a[1])

    if (catEntries.length > 0) {
      if (y > 220) { doc.addPage(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 297, 'F'); y = 15 }
      doc.setTextColor(139, 92, 246)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Despesas por Categoria', 15, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Categoria', 'Total', '% do total']],
        body: catEntries.map(([cat, val]) => [
          cat,
          formatCurrency(val),
          `${totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : '0'}%`,
        ]),
        styles: { fontSize: 9, textColor: [241, 245, 249] as [number,number,number], fillColor: [30, 41, 59] as [number,number,number], lineColor: [51, 65, 85] as [number,number,number], lineWidth: 0.2 },
        headStyles: { fillColor: [55, 35, 100] as [number,number,number], textColor: [200, 180, 255] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [24, 32, 52] as [number,number,number] },
        margin: { left: 15, right: 15 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // ——— Investimentos ———
    if (investments.length > 0) {
      if (y > 220) { doc.addPage(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 297, 'F'); y = 15 }
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Portfólio de Investimentos', 15, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Nome', 'Tipo', 'Corretora', 'Investido', 'Atual', 'Retorno']],
        body: investments.map((inv) => {
          const current = inv.current_value ?? inv.invested_amount
          const ret = current - inv.invested_amount
          const retPct = inv.invested_amount > 0 ? (ret / inv.invested_amount) * 100 : 0
          return [inv.name, inv.type, inv.broker || '-', formatCurrency(inv.invested_amount), formatCurrency(current), `${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%`]
        }),
        foot: [['', '', 'Total', formatCurrency(totalInvested), formatCurrency(currentInvValue), `${totalInvested > 0 ? ((currentInvValue - totalInvested) / totalInvested * 100).toFixed(2) : '0'}%`]],
        styles: { fontSize: 9, textColor: [241, 245, 249] as [number,number,number], fillColor: [30, 41, 59] as [number,number,number], lineColor: [51, 65, 85] as [number,number,number], lineWidth: 0.2 },
        headStyles: { fillColor: [90, 60, 5] as [number,number,number], textColor: [253, 224, 71] as [number,number,number], fontStyle: 'bold' },
        footStyles: { fillColor: [80, 50, 5] as [number,number,number], textColor: [253, 224, 71] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [24, 32, 52] as [number,number,number] },
        margin: { left: 15, right: 15 },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // ——— Metas ———
    if (goals.length > 0) {
      if (y > 220) { doc.addPage(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 297, 'F'); y = 15 }
      doc.setTextColor(20, 184, 166)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Metas Financeiras', 15, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Meta', 'Alvo', 'Atual', 'Progresso', 'Prazo']],
        body: goals.map((g) => [
          g.name,
          formatCurrency(g.target_amount),
          formatCurrency(g.current_amount),
          `${((g.current_amount / g.target_amount) * 100).toFixed(1)}%`,
          g.deadline ? format(new Date(g.deadline + 'T12:00:00'), 'dd/MM/yyyy') : 'Sem prazo',
        ]),
        styles: { fontSize: 9, textColor: [241, 245, 249] as [number,number,number], fillColor: [30, 41, 59] as [number,number,number], lineColor: [51, 65, 85] as [number,number,number], lineWidth: 0.2 },
        headStyles: { fillColor: [10, 70, 65] as [number,number,number], textColor: [94, 234, 212] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [24, 32, 52] as [number,number,number] },
        margin: { left: 15, right: 15 },
      })
    }

    // Footer on all pages
    const pageCount = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 287, pageW, 10, 'F')
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('FinanceApp — Controle Financeiro Pessoal', 15, 293)
      doc.text(`Página ${i} de ${pageCount}`, pageW - 15, 293, { align: 'right' })
    }

    doc.save(`relatorio-financeiro-${year}-${String(month).padStart(2, '0')}.pdf`)
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()) }))
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  const income = previewData?.transactions.filter((t) => isIncome(t.type)) || []
  const expenses = previewData?.transactions.filter((t) => !isIncome(t.type)) || []
  const totalIncome = income.reduce((a, t) => a + t.amount, 0)
  const totalExpense = expenses.reduce((a, t) => a + t.amount, 0)

  const expByCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})
  const pieData = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  return (
    <Layout title="Relatórios" subtitle="Gere relatórios em PDF do seu histórico financeiro">
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Selecionar período</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button onClick={loadPreview} loading={loading} icon={<FileText className="w-4 h-4" />}>
            Visualizar dados
          </Button>
          {previewData && (
            <Button
              variant="secondary"
              onClick={generatePDF}
              icon={<Download className="w-4 h-4" />}
            >
              Baixar PDF
            </Button>
          )}
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {previewData && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Receitas', value: totalIncome, color: 'text-green-400' },
              { label: 'Despesas', value: totalExpense, color: 'text-red-400' },
              { label: 'Saldo', value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-violet-400' : 'text-red-400' },
              { label: 'Investimentos', value: (previewData.investments || []).reduce((a, i) => a + (i.current_value ?? i.invested_amount), 0), color: 'text-amber-400' },
            ].map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Expenses by category */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Despesas por Categoria</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" outerRadius={75} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm text-center py-16">Nenhuma despesa no período</p>
              )}
            </Card>

            {/* Income vs Expense bar */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Resumo do Período</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ label: 'Mês', Receitas: totalIncome, Despesas: totalExpense, Saldo: totalIncome - totalExpense }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saldo" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Transaction Table Preview */}
          <Card>
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300">Todas as Transações do Período ({previewData.transactions.length})</h3>
            </div>
            {previewData.transactions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Nenhuma transação no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700">
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Descrição</th>
                      <th className="px-4 py-3 text-left">Categoria</th>
                      <th className="px-4 py-3 text-left">Pagamento</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-2.5 text-slate-400">{format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-2.5 text-slate-200">{tx.description}</td>
                        <td className="px-4 py-2.5 text-slate-400">{tx.category}</td>
                        <td className="px-4 py-2.5 text-slate-400">{tx.payment_method ? { pix: 'PIX', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro' }[tx.payment_method] : '-'}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${isIncome(tx.type) ? 'text-green-400' : 'text-red-400'}`}>
                          {isIncome(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </Layout>
  )
}
