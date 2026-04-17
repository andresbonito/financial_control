export type TransactionType = 'pix_in' | 'pix_out' | 'salary' | 'allowance' | 'expense' | 'income'
export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  payment_method: PaymentMethod | null
  date: string
  notes: string | null
  created_at: string
}

export interface Investment {
  id: string
  user_id: string
  name: string
  type: string
  invested_amount: number
  current_value: number | null
  date: string
  broker: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  deadline: string | null
  category: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string | null
  email: string | null
  created_at: string
}

export const TRANSACTION_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Tecnologia',
  'Assinaturas',
  'Restaurantes',
  'Supermercado',
  'Combustível',
  'Farmácia',
  'Pets',
  'Salário',
  'Vale Alimentação',
  'Vale Transporte',
  'Freelance',
  'PIX recebido',
  'PIX enviado',
  'Outros',
] as const

export const INVESTMENT_TYPES = [
  'Ações',
  'Fundos Imobiliários',
  'Tesouro Direto',
  'CDB',
  'LCI/LCA',
  'Criptomoedas',
  'Fundos de Investimento',
  'Previdência Privada',
  'Poupança',
  'Outros',
] as const

export const GOAL_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const

export function isIncome(type: TransactionType): boolean {
  return ['pix_in', 'salary', 'allowance', 'income'].includes(type)
}

export function getTransactionLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    pix_in: 'PIX Recebido',
    pix_out: 'PIX Enviado',
    salary: 'Salário',
    allowance: 'Vale',
    expense: 'Despesa',
    income: 'Receita',
  }
  return labels[type]
}

export function getPaymentMethodLabel(method: PaymentMethod | null): string {
  if (!method) return '-'
  const labels: Record<PaymentMethod, string> = {
    pix: 'PIX',
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
  }
  return labels[method]
}
