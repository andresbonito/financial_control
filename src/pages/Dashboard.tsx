import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { StatCard, Card } from '../components/ui/Card'
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton'
import { supabase } from '../lib/supabase'
import { generateUserKey, safeDecrypt } from '../lib/encryption'
import type { TransactionType, PaymentMethod } from '../types'
import { useAuth } from '../contexts/AuthContext'
import {
  formatCurrency, formatDate, last6MonthsLabels, currentMonthRange,
} from '../lib/utils'
import { Transaction, Investment, Goal, isIncome } from '../types'
import { CHART_COLORS } from '../constants/colors'

interface MonthData {
  label: string
  income: number
  expense: number
}

export function Dashboard() {
  const { user } = useAuth()
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!user) { setCryptoKey(null); return }
    generateUserKey(user.id, 'financeapp-v1').then(setCryptoKey)
  }, [user])

  const fetchAll = useCallback(async () => {
    if (!user || !cryptoKey) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)

    const months = last6MonthsLabels()

    const [txRes, invRes, goalRes] = await Promise.all([
      // Date is encrypted — fetch all and filter client-side after decryption
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('investments').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
    ])

    const rawTxs: Transaction[] = txRes.data || []
    const txs = await Promise.all(rawTxs.map(async (tx) => ({
      ...tx,
      type: ((await safeDecrypt(tx.type, cryptoKey)) ?? tx.type) as TransactionType,
      amount: parseFloat((await safeDecrypt(String(tx.amount), cryptoKey)) ?? String(tx.amount)),
      description: (await safeDecrypt(tx.description, cryptoKey)) ?? tx.description,
      category: (await safeDecrypt(tx.category, cryptoKey)) ?? tx.category,
      payment_method: tx.payment_method
        ? ((await safeDecrypt(tx.payment_method, cryptoKey)) as PaymentMethod)
        : null,
      date: (await safeDecrypt(tx.date, cryptoKey)) ?? tx.date,
      notes: await safeDecrypt(tx.notes, cryptoKey),
    })))
    setTransactions(txs)
    setInvestments(invRes.data || [])
    setGoals(goalRes.data || [])

    const md: MonthData[] = months.map(({ label, start, end }) => {
      const month_txs = txs.filter((t) => t.date >= start && t.date <= end)
      return {
        label,
        income: month_txs.filter((t) => isIncome(t.type)).reduce((a, t) => a + t.amount, 0),
        expense: month_txs.filter((t) => !isIncome(t.type)).reduce((a, t) => a + t.amount, 0),
      }
    })
    setMonthlyData(md)
    setLoading(false)
  }, [user, cryptoKey])

  useEffect(() => {
    fetchAll()
    return () => { abortRef.current?.abort() }
  }, [fetchAll])

  const { start, end } = currentMonthRange()
  const currentTxs = transactions.filter((t) => t.date >= start && t.date <= end)
  const monthIncome = currentTxs.filter((t) => isIncome(t.type)).reduce((a, t) => a + t.amount, 0)
  const monthExpense = currentTxs.filter((t) => !isIncome(t.type)).reduce((a, t) => a + t.amount, 0)
  const balance = monthIncome - monthExpense
  const totalInvested = investments.reduce((a, i) => a + i.invested_amount, 0)
  const currentInvValue = investments.reduce((a, i) => a + (i.current_value ?? i.invested_amount), 0)

  const expenseByCategory = currentTxs
    .filter((t) => !isIncome(t.type))
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
  const pieData = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  const recentTxs = transactions.slice(0, 5)

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2 p-5">
            <div className="h-4 w-48 bg-slate-700 rounded animate-pulse mb-4" />
            <SkeletonChart />
          </Card>
          <Card className="p-5">
            <div className="h-4 w-36 bg-slate-700 rounded animate-pulse mb-4" />
            <SkeletonChart />
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard" subtitle="Visão geral do mês atual">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency(balance)}
          icon={<Wallet className="w-5 h-5 text-white" />}
          iconColor={balance >= 0 ? 'bg-violet-600' : 'bg-red-600'}
        />
        <StatCard
          title="Receitas"
          value={formatCurrency(monthIncome)}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          iconColor="bg-green-600"
        />
        <StatCard
          title="Despesas"
          value={formatCurrency(monthExpense)}
          icon={<TrendingDown className="w-5 h-5 text-white" />}
          iconColor="bg-red-600"
        />
        <StatCard
          title="Investimentos"
          value={formatCurrency(currentInvValue)}
          subtitle={`Investido: ${formatCurrency(totalInvested)}`}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          iconColor="bg-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 md:mb-6">
        {/* Area Chart */}
        <Card className="lg:col-span-2 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Receitas x Despesas (6 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card className="p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Despesas por Categoria</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={65} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 10 }}>{value}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Nenhuma despesa este mês
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Transações Recentes</h3>
            <Link to="/transacoes" className="text-xs text-violet-400 hover:text-violet-300">Ver todas</Link>
          </div>
          {recentTxs.length > 0 ? (
            <div className="space-y-3">
              {recentTxs.map((tx) => {
                const income = isIncome(tx.type)
                return (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${income ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {income
                        ? <ArrowUpRight className="w-4 h-4 text-green-400" />
                        : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-500">{tx.category} · {formatDate(tx.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${income ? 'text-green-400' : 'text-red-400'}`}>
                      {income ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">Nenhuma transação ainda.</p>
          )}
        </Card>

        {/* Goals */}
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Metas Financeiras</h3>
            <Link to="/metas" className="text-xs text-violet-400 hover:text-violet-300">Ver todas</Link>
          </div>
          {goals.length > 0 ? (
            <div className="space-y-4">
              {goals.slice(0, 4).map((goal) => {
                const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="w-3.5 h-3.5 shrink-0" style={{ color: goal.color }} />
                        <span className="text-sm text-slate-200 truncate">{goal.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">{formatCurrency(goal.current_amount)}</span>
                      <span className="text-xs text-slate-500">{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Target className="w-8 h-8 text-slate-600" />
              <p className="text-slate-500 text-sm">Nenhuma meta criada.</p>
              <Link to="/metas" className="text-xs text-violet-400 hover:text-violet-300">Criar primeira meta</Link>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
