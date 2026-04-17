import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Layout } from '../components/layout/Layout'
import { Card, StatCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, todayString } from '../lib/utils'
import { Investment, INVESTMENT_TYPES } from '../types'

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']
const TYPE_OPTIONS = INVESTMENT_TYPES.map((t) => ({ value: t, label: t }))

interface InvForm {
  name: string
  type: string
  invested_amount: string
  current_value: string
  date: string
  broker: string
  notes: string
}

export function Investments() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvForm>({
    defaultValues: { date: todayString() },
  })

  const fetchInvestments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('investments').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setInvestments(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchInvestments() }, [fetchInvestments])

  function openAdd() {
    setEditing(null)
    reset({ date: todayString(), name: '', type: '', invested_amount: '', current_value: '', broker: '', notes: '' })
    setModalOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditing(inv)
    reset({
      name: inv.name,
      type: inv.type,
      invested_amount: String(inv.invested_amount),
      current_value: inv.current_value != null ? String(inv.current_value) : '',
      date: inv.date,
      broker: inv.broker || '',
      notes: inv.notes || '',
    })
    setModalOpen(true)
  }

  async function onSubmit(data: InvForm) {
    if (!user) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      name: data.name,
      type: data.type,
      invested_amount: parseFloat(data.invested_amount.replace(',', '.')),
      current_value: data.current_value ? parseFloat(data.current_value.replace(',', '.')) : null,
      date: data.date,
      broker: data.broker || null,
      notes: data.notes || null,
    }

    if (editing) {
      await supabase.from('investments').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('investments').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchInvestments()
  }

  async function deleteInvestment(id: string) {
    if (!confirm('Excluir este investimento?')) return
    await supabase.from('investments').delete().eq('id', id)
    fetchInvestments()
  }

  const totalInvested = investments.reduce((a, i) => a + i.invested_amount, 0)
  const totalCurrent = investments.reduce((a, i) => a + (i.current_value ?? i.invested_amount), 0)
  const totalReturn = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  // Portfolio by type
  const byType = investments.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + (inv.current_value ?? inv.invested_amount)
    return acc
  }, {})
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }))

  return (
    <Layout
      title="Investimentos"
      subtitle="Acompanhe seu portfólio"
      action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Novo investimento</Button>}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Investido"
          value={formatCurrency(totalInvested)}
          icon={<Building2 className="w-5 h-5 text-white" />}
          iconColor="bg-blue-600"
        />
        <StatCard
          title="Valor Atual"
          value={formatCurrency(totalCurrent)}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          iconColor="bg-violet-600"
        />
        <StatCard
          title="Retorno Total"
          value={formatCurrency(totalReturn)}
          subtitle={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
          icon={totalReturn >= 0 ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
          iconColor={totalReturn >= 0 ? 'bg-green-600' : 'bg-red-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Pie Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Composição do Portfólio</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-500 text-sm">
              Nenhum investimento
            </div>
          )}
        </Card>

        {/* List */}
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Building2 className="w-10 h-10 text-slate-600" />
              <p className="text-slate-500">Nenhum investimento cadastrado.</p>
              <Button size="sm" onClick={openAdd} icon={<Plus className="w-3.5 h-3.5" />}>Adicionar</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {/* Header */}
              <div className="grid grid-cols-5 px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="col-span-2">Nome</span>
                <span>Investido</span>
                <span>Atual</span>
                <span>Retorno</span>
              </div>
              {investments.map((inv) => {
                const current = inv.current_value ?? inv.invested_amount
                const ret = current - inv.invested_amount
                const retPct = inv.invested_amount > 0 ? (ret / inv.invested_amount) * 100 : 0
                return (
                  <div key={inv.id} className="grid grid-cols-5 items-center px-4 py-3 hover:bg-slate-700/30 transition-colors">
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-slate-100">{inv.name}</p>
                      <p className="text-xs text-slate-500">{inv.type}{inv.broker ? ` · ${inv.broker}` : ''}</p>
                    </div>
                    <span className="text-sm text-slate-300">{formatCurrency(inv.invested_amount)}</span>
                    <span className="text-sm text-slate-300">{formatCurrency(current)}</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ret >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(inv)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-100 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteInvestment(inv.id)} className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Investimento' : 'Novo Investimento'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome do investimento"
            placeholder="Ex: Tesouro IPCA+ 2029"
            error={errors.name?.message}
            {...register('name', { required: 'Obrigatório' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={TYPE_OPTIONS}
              placeholder="Selecione..."
              error={errors.type?.message}
              {...register('type', { required: 'Obrigatório' })}
            />
            <Input
              label="Data da aplicação"
              type="date"
              {...register('date', { required: 'Obrigatório' })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor investido (R$)"
              placeholder="0,00"
              error={errors.invested_amount?.message}
              {...register('invested_amount', { required: 'Obrigatório' })}
            />
            <Input
              label="Valor atual (R$)"
              placeholder="0,00 (opcional)"
              {...register('current_value')}
            />
          </div>
          <Input
            label="Corretora / Banco"
            placeholder="Ex: XP, Nubank..."
            {...register('broker')}
          />
          <Input
            label="Observações"
            placeholder="Notas adicionais..."
            {...register('notes')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
