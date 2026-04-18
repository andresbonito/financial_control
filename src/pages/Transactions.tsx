import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SkeletonTable } from '../components/ui/Skeleton'
import { Pagination } from '../components/Pagination'
import { PeriodSelector } from '../components/PeriodSelector'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, todayString } from '../lib/utils'
import { usePagination } from '../hooks/usePagination'
import {
  Transaction, TransactionType, PaymentMethod, TRANSACTION_CATEGORIES,
  isIncome, getTransactionLabel, getPaymentMethodLabel,
} from '../types'

const PAGE_SIZE = 20

const TYPE_OPTIONS = [
  { value: 'pix_in', label: 'PIX Recebido' },
  { value: 'pix_out', label: 'PIX Enviado' },
  { value: 'salary', label: 'Salário' },
  { value: 'allowance', label: 'Vale' },
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
]

const PAYMENT_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Dinheiro' },
]

const CATEGORY_OPTIONS = TRANSACTION_CATEGORIES.map((c) => ({ value: c, label: c }))

interface TxForm {
  type: TransactionType
  amount: string
  description: string
  category: string
  payment_method: PaymentMethod | ''
  date: string
  notes: string
}

export function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { page, from, to, nextPage, prevPage, resetPage } = usePagination(PAGE_SIZE)
  const abortRef = useRef<AbortController | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TxForm>({
    defaultValues: { date: todayString(), type: 'expense', payment_method: '' },
  })

  const watchType = watch('type')
  const needsPayment = ['expense', 'pix_out'].includes(watchType)

  const fetchTransactions = useCallback(async () => {
    if (!user) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    const [year, month] = filterMonth.split('-')
    const start = `${year}-${month}-01`
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .range(from, to)

    if (filterType) query = query.eq('type', filterType)
    if (search) query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%`)

    const { data, count } = await query
    setTransactions(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [user, filterMonth, filterType, search, from, to])

  useEffect(() => {
    fetchTransactions()
    return () => { abortRef.current?.abort() }
  }, [fetchTransactions])

  // Reset to page 0 when filters change
  useEffect(() => { resetPage() }, [filterMonth, filterType, search, resetPage])

  function openAdd() {
    setEditing(null)
    reset({ date: todayString(), type: 'expense', payment_method: '', description: '', category: '', amount: '', notes: '' })
    setModalOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditing(tx)
    reset({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description,
      category: tx.category,
      payment_method: tx.payment_method || '',
      date: tx.date,
      notes: tx.notes || '',
    })
    setModalOpen(true)
  }

  async function onSubmit(data: TxForm) {
    if (!user) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      type: data.type,
      amount: parseFloat(data.amount.replace(',', '.')),
      description: data.description,
      category: data.category,
      payment_method: data.payment_method || null,
      date: data.date,
      notes: data.notes || null,
    }

    const { error } = editing
      ? await supabase.from('transactions').update(payload).eq('id', editing.id)
      : await supabase.from('transactions').insert(payload)

    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar transação.')
      return
    }

    toast.success(editing ? 'Transação atualizada!' : 'Transação adicionada!')
    setModalOpen(false)
    fetchTransactions()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget)
    setDeleteTarget(null)
    if (error) { toast.error('Erro ao excluir transação.'); return }
    toast.success('Transação excluída.')
    fetchTransactions()
  }

  // Summary computed from server total — use loaded page data for displayed amounts
  const totalIncome = transactions.filter((t) => isIncome(t.type)).reduce((a, t) => a + t.amount, 0)
  const totalExpense = transactions.filter((t) => !isIncome(t.type)).reduce((a, t) => a + t.amount, 0)

  return (
    <Layout
      title="Transações"
      subtitle="Gerencie suas receitas e despesas"
      action={
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />} size="sm">
          <span className="hidden sm:inline">Nova transação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-1">Receitas</p>
          <p className="text-lg md:text-xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-1">Despesas</p>
          <p className="text-lg md:text-xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-1">Saldo</p>
          <p className={`text-lg md:text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <PeriodSelector value={filterMonth} onChange={setFilterMonth} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Todos os tipos</option>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <SkeletonTable rows={5} />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Filter className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500">Nenhuma transação encontrada.</p>
            <Button size="sm" onClick={openAdd} icon={<Plus className="w-3.5 h-3.5" />}>Adicionar transação</Button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-700">
              {transactions.map((tx) => {
                const income = isIncome(tx.type)
                return (
                  <div key={tx.id} className="flex items-center gap-3 md:gap-4 p-4 hover:bg-slate-700/30 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${income ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {income
                        ? <ArrowUpRight className="w-4 h-4 text-green-400" />
                        : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{tx.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{tx.category}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-violet-400 hidden sm:inline">
                          {getTransactionLabel(tx.type)}
                        </span>
                        {tx.payment_method && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-amber-400 hidden md:inline">
                            {getPaymentMethodLabel(tx.payment_method)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm md:text-base font-bold shrink-0 ${income ? 'text-green-400' : 'text-red-400'}`}>
                      {income ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tx.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPrev={prevPage}
              onNext={nextPage}
            />
          </>
        )}
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Transação' : 'Nova Transação'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Tipo"
            options={TYPE_OPTIONS}
            error={errors.type?.message}
            {...register('type', { required: 'Obrigatório' })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Valor (R$)</label>
              <input
                inputMode="decimal"
                placeholder="0,00"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
                {...register('amount', {
                  required: 'Obrigatório',
                  pattern: { value: /^\d+([.,]\d{1,2})?$/, message: 'Valor inválido' },
                })}
              />
              {errors.amount && <span className="text-xs text-red-400 mt-1 block">{errors.amount.message}</span>}
            </div>
            <Input
              label="Data"
              type="date"
              error={errors.date?.message}
              {...register('date', { required: 'Obrigatório' })}
            />
          </div>
          <Input
            label="Descrição"
            placeholder="Ex: Conta de luz, Salário..."
            error={errors.description?.message}
            {...register('description', { required: 'Obrigatório', maxLength: { value: 200, message: 'Máx. 200 caracteres' } })}
          />
          <Select
            label="Categoria"
            options={CATEGORY_OPTIONS}
            placeholder="Selecione..."
            error={errors.category?.message}
            {...register('category', { required: 'Obrigatório' })}
          />
          {needsPayment && (
            <Select
              label="Forma de pagamento"
              options={PAYMENT_OPTIONS}
              placeholder="Selecione..."
              {...register('payment_method')}
            />
          )}
          <Input
            label="Observações (opcional)"
            placeholder="Notas adicionais..."
            {...register('notes', { maxLength: { value: 500, message: 'Máx. 500 caracteres' } })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir transação"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}
