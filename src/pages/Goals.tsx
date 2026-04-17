import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, Target, Calendar, TrendingUp } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/utils'
import { Goal, GOAL_COLORS } from '../types'

interface GoalForm {
  name: string
  description: string
  target_amount: string
  current_amount: string
  deadline: string
  category: string
  color: string
}

interface UpdateForm {
  current_amount: string
}

export function Goals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [updateModal, setUpdateModal] = useState<Goal | null>(null)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<GoalForm>({
    defaultValues: { color: '#8b5cf6' },
  })
  const updateForm = useForm<UpdateForm>()
  const watchColor = watch('color')

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  function openAdd() {
    setEditing(null)
    reset({ color: '#8b5cf6', name: '', description: '', target_amount: '', current_amount: '0', deadline: '', category: '' })
    setModalOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditing(goal)
    reset({
      name: goal.name,
      description: goal.description || '',
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline || '',
      category: goal.category || '',
      color: goal.color,
    })
    setModalOpen(true)
  }

  async function onSubmit(data: GoalForm) {
    if (!user) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      name: data.name,
      description: data.description || null,
      target_amount: parseFloat(data.target_amount.replace(',', '.')),
      current_amount: parseFloat(data.current_amount.replace(',', '.') || '0'),
      deadline: data.deadline || null,
      category: data.category || null,
      color: data.color,
    }

    if (editing) {
      await supabase.from('goals').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('goals').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchGoals()
  }

  async function onUpdateProgress(data: UpdateForm) {
    if (!updateModal) return
    setSaving(true)
    await supabase.from('goals').update({
      current_amount: parseFloat(data.current_amount.replace(',', '.')),
    }).eq('id', updateModal.id)
    setSaving(false)
    setUpdateModal(null)
    fetchGoals()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Excluir esta meta?')) return
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  function getDaysRemaining(deadline: string | null): number | null {
    if (!deadline) return null
    return differenceInDays(parseISO(deadline), new Date())
  }

  return (
    <Layout
      title="Metas"
      subtitle="Acompanhe seus objetivos financeiros"
      action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Nova meta</Button>}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">Nenhuma meta criada</h3>
          <p className="text-slate-500 text-sm mb-4">Crie metas para acompanhar seus objetivos financeiros</p>
          <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Criar primeira meta</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
            const remaining = goal.target_amount - goal.current_amount
            const daysLeft = getDaysRemaining(goal.deadline)
            const monthlyNeeded = daysLeft && daysLeft > 0 ? (remaining / (daysLeft / 30)) : null

            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '33' }}>
                      <Target className="w-4 h-4" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm">{goal.name}</h3>
                      {goal.category && <p className="text-xs text-slate-500">{goal.category}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {goal.description && (
                  <p className="text-xs text-slate-500 mb-3">{goal.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{formatCurrency(goal.current_amount)}</span>
                    <span className="font-medium" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
                    <span className="text-slate-400">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Faltam {formatCurrency(Math.max(remaining, 0))}
                  </p>
                </div>

                {/* Info */}
                <div className="flex gap-3 text-xs text-slate-500 mb-4">
                  {daysLeft !== null && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className={daysLeft < 30 ? 'text-amber-400' : ''}>
                        {daysLeft > 0 ? `${daysLeft} dias` : 'Prazo vencido'}
                      </span>
                    </div>
                  )}
                  {monthlyNeeded && monthlyNeeded > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{formatCurrency(monthlyNeeded)}/mês</span>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    updateForm.reset({ current_amount: String(goal.current_amount) })
                    setUpdateModal(goal)
                  }}
                >
                  Atualizar progresso
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Meta' : 'Nova Meta'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome da meta"
            placeholder="Ex: Reserva de emergência"
            error={errors.name?.message}
            {...register('name', { required: 'Obrigatório' })}
          />
          <Input
            label="Descrição (opcional)"
            placeholder="Descreva o objetivo..."
            {...register('description')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor alvo (R$)"
              placeholder="0,00"
              error={errors.target_amount?.message}
              {...register('target_amount', { required: 'Obrigatório' })}
            />
            <Input
              label="Valor atual (R$)"
              placeholder="0,00"
              {...register('current_amount')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prazo (opcional)"
              type="date"
              {...register('deadline')}
            />
            <Input
              label="Categoria (opcional)"
              placeholder="Ex: Viagem, Carro..."
              {...register('category')}
            />
          </div>
          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" value={c} className="sr-only" {...register('color')} />
                  <div
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      transform: watchColor === c ? 'scale(1.25)' : 'scale(1)',
                      outline: watchColor === c ? `2px solid white` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editing ? 'Salvar' : 'Criar meta'}</Button>
          </div>
        </form>
      </Modal>

      {/* Update Progress Modal */}
      <Modal isOpen={!!updateModal} onClose={() => setUpdateModal(null)} title="Atualizar Progresso" size="sm">
        {updateModal && (
          <form onSubmit={updateForm.handleSubmit(onUpdateProgress)} className="space-y-4">
            <p className="text-sm text-slate-400">Meta: <span className="text-slate-200 font-medium">{updateModal.name}</span></p>
            <p className="text-sm text-slate-400">Alvo: <span className="text-slate-200">{formatCurrency(updateModal.target_amount)}</span></p>
            <Input
              label="Valor atual (R$)"
              placeholder="0,00"
              {...updateForm.register('current_amount', { required: 'Obrigatório' })}
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setUpdateModal(null)}>Cancelar</Button>
              <Button type="submit" className="flex-1" loading={saving}>Atualizar</Button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  )
}
