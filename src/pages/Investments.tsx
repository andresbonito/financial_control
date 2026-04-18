import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { Card, StatCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SkeletonTable } from '../components/ui/Skeleton'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, todayString } from '../lib/utils'
import { Investment, INVESTMENT_TYPES } from '../types'
import { CHART_COLORS } from '../constants/colors'

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvForm>({
    defaultValues: { date: todayString() },
  })

  const fetchInvestments = useCallback(async () => {
    if (!user) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    setInvestments(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchInvestments()
    return () => { abortRef.current?.abort() }
  }, [fetchInvestments])

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

    const { error } = editing
      ? await supabase.from('investments').update(payload).eq('id', editing.id)
      : await supabase.from('investments').insert(payload)

    setSaving(false)
    if (error) { toast.error('Erro ao salvar investimento.'); return }
    toast.success(editing ? 'Investimento atualizado!' : 'Investimento adicionado!')
    setModalOpen(false)
    fetchInvestments()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('investments').delete().eq('id', deleteTarget)
    setDeleteTarget(null)
    if (error) { toast.error('Erro ao excluir investimento.'); return }
    toast.success('Investimento excluído.')
    fetchInvestments()
  }

  const totalInvested = investments.reduce((a, i) => a + i.invested_amount, 0)
  const totalCurrent = investments.reduce((a, i) => a + (i.current_value ?? i.invested_amount), 0)
  const totalReturn = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const byType = investments.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + (inv.current_value ?? inv.invested_amount)
    return acc
  }, {})
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }))

  return (
    <Layout
      title="Investimentos"
      subtitle="Acompanhe seu portfólio"
      action={
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />} size="sm">
          <span className="hidden sm:inline">Novo investimento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
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
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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

        {/* Table */}
        <Card className="lg:col-span-2">
          {loading ? (
            <SkeletonTable rows={4} />
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Building2 className="w-10 h-10 text-slate-600" />
              <p className="text-slate-500">Nenhum investimento cadastrado.</p>
              <Button size="sm" onClick={openAdd} icon={<Plus className="w-3.5 h-3.5" />}>Adicionar</Button>
            </div>
          ) : (
            /* Responsive: table on md+, cards on mobile */
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[480px] divide-y divide-slate-700">
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
                            <button onClick={() => setDeleteTarget(inv.id)} className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-700">
                {investments.map((inv) => {
                  const current = inv.current_value ?? inv.invested_amount
                  const ret = current - inv.invested_amount
                  const retPct = inv.invested_amount > 0 ? (ret / inv.invested_amount) * 100 : 0
                  return (
                    <div key={inv.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{inv.name}</p>
                          <p className="text-xs text-slate-500">{inv.type}{inv.broker ? ` · ${inv.broker}` : ''}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(inv)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 min-w-[36px] min-h-[36px] flex items-center justify-center">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(inv.id)} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 min-w-[36px] min-h-[36px] flex items-center justify-center">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Investido: </span>
                          <span className="text-slate-300">{formatCurrency(inv.invested_amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Atual: </span>
                          <span className="text-slate-300">{formatCurrency(current)}</span>
                        </div>
                        <div>
                          <span className={`font-medium ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {ret >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Investimento' : 'Novo Investimento'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome do investimento"
            placeholder="Ex: Tesouro IPCA+ 2029"
            error={errors.name?.message}
            {...register('name', { required: 'Obrigatório', maxLength: { value: 200, message: 'Máx. 200 caracteres' } })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={TYPE_OPTIONS}
              placeholder="Selecione..."
              error={errors.type?.message}
              {...register('type', { required: 'Obrigatório' })}
            />
            <Input label="Data da aplicação" type="date" {...register('date', { required: 'Obrigatório' })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Valor investido (R$)</label>
              <input
                inputMode="decimal"
                placeholder="0,00"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
                {...register('invested_amount', { required: 'Obrigatório' })}
              />
              {errors.invested_amount && <span className="text-xs text-red-400 mt-1 block">{errors.invested_amount.message}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Valor atual (R$)</label>
              <input
                inputMode="decimal"
                placeholder="0,00 (opcional)"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
                {...register('current_value')}
              />
            </div>
          </div>
          <Input label="Corretora / Banco" placeholder="Ex: XP, Nubank..." {...register('broker')} />
          <Input label="Observações" placeholder="Notas adicionais..." {...register('notes', { maxLength: { value: 500, message: 'Máx. 500 caracteres' } })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir investimento"
        message="Esta ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}
