import { useState } from 'react'
import { Sparkles, TrendingDown, AlertCircle, CheckCircle2, Lightbulb, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, last6MonthsLabels } from '../lib/utils'
import { sanitizeForPrompt, truncatePromptInput } from '../lib/sanitize'
import { Transaction, isIncome } from '../types'

interface AnalysisResult {
  resumo: string
  score: number
  pontos_positivos: string[]
  alertas: string[]
  categorias_para_cortar: { categoria: string; gasto: string; sugestao: string; economia_potencial: string }[]
  recomendacoes: string[]
  meta_sugerida: { nome: string; valor: string; prazo: string }
}

export function AIAnalysis() {
  const { user, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [selectedMonths, setSelectedMonths] = useState(3)

  async function analyze() {
    if (!user || !session) return
    setLoading(true)
    setError('')
    setResult(null)

    const months = last6MonthsLabels().slice(6 - selectedMonths)
    const earliest = months[0].start

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', earliest)
      .order('date', { ascending: false })

    const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id)

    const txs: Transaction[] = transactions || []

    const monthlySummaries = months.map(({ label, start, end }) => {
      const monthTxs = txs.filter((t) => t.date >= start && t.date <= end)
      const income = monthTxs.filter((t) => isIncome(t.type)).reduce((a, t) => a + t.amount, 0)
      const expense = monthTxs.filter((t) => !isIncome(t.type)).reduce((a, t) => a + t.amount, 0)
      const byCategory = monthTxs
        .filter((t) => !isIncome(t.type))
        .reduce<Record<string, number>>((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount
          return acc
        }, {})
      return { mes: label, receitas: income, despesas: expense, saldo: income - expense, por_categoria: byCategory }
    })

    const totalByCategory = txs
      .filter((t) => !isIncome(t.type))
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {})

    // Sanitize all user-supplied string data before sending to the AI
    const safeSummary = monthlySummaries
      .map((m) => `- ${sanitizeForPrompt(m.mes)}: Receitas ${formatCurrency(m.receitas)}, Despesas ${formatCurrency(m.despesas)}, Saldo ${formatCurrency(m.saldo)}`)
      .join('\n')

    const safeCategories = Object.entries(totalByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => `- ${sanitizeForPrompt(cat)}: ${formatCurrency(val)}`)
      .join('\n') || 'Nenhuma despesa'

    const safeGoals = goals
      ?.map((g) => `- ${sanitizeForPrompt(truncatePromptInput(g.name, 100))}: ${formatCurrency(g.current_amount)} / ${formatCurrency(g.target_amount)} (${((g.current_amount / g.target_amount) * 100).toFixed(0)}%)`)
      .join('\n') || 'Nenhuma meta cadastrada'

    const prompt = `Analise os dados financeiros abaixo dos últimos ${selectedMonths} meses e forneça uma análise detalhada em JSON.

## Resumo Mensal:
${safeSummary}

## Despesas por Categoria (total do período):
${safeCategories}

## Metas Atuais:
${safeGoals}

## Formato de resposta
Responda APENAS com JSON válido (sem markdown, sem texto fora do JSON):
{
  "resumo": "parágrafo de 2-3 frases",
  "score": 75,
  "pontos_positivos": ["ponto 1", "ponto 2", "ponto 3"],
  "alertas": ["alerta 1", "alerta 2"],
  "categorias_para_cortar": [{"categoria":"nome","gasto":"R$ valor","sugestao":"sugestão","economia_potencial":"R$ valor"}],
  "recomendacoes": ["rec 1", "rec 2", "rec 3", "rec 4"],
  "meta_sugerida": {"nome":"nome","valor":"R$ valor","prazo":"X meses"}
}`

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Erro ao conectar com a IA')
      }

      const data = await response.json()
      setResult(data.result)
      toast.success('Análise concluída!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setError(msg)
      toast.error('Falha na análise. Verifique a configuração da API.')
    }

    setLoading(false)
  }

  const scoreColor = result
    ? result.score >= 75 ? 'text-green-400' : result.score >= 50 ? 'text-amber-400' : 'text-red-400'
    : ''
  const scoreBg = result
    ? result.score >= 75 ? 'bg-green-500/20' : result.score >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'
    : ''

  return (
    <Layout title="Análise com IA" subtitle="Insights inteligentes sobre seus gastos com Claude AI">
      {/* Config */}
      <Card className="p-4 md:p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Período de análise</label>
            <select
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
            >
              <option value={1}>Último mês</option>
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
            </select>
          </div>
          <Button onClick={analyze} loading={loading} icon={<Sparkles className="w-4 h-4" />}>
            {loading ? 'Analisando...' : 'Analisar meus gastos'}
          </Button>
          {result && (
            <Button variant="ghost" size="sm" onClick={analyze} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Reanalisar
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-4 mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Erro na análise</p>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
              <p className="text-xs text-slate-500 mt-2">
                Verifique se a variável{' '}
                <code className="bg-slate-700 px-1 rounded">ANTHROPIC_API_KEY</code> está configurada no Vercel.
              </p>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <Card className="p-12 text-center">
          <Sparkles className="w-10 h-10 text-violet-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-300 font-medium">Analisando seus dados financeiros...</p>
          <p className="text-slate-500 text-sm mt-2">O Claude está processando seu histórico. Aguarde alguns segundos.</p>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Score + Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className={`p-5 flex flex-col items-center justify-center ${scoreBg}`}>
              <p className="text-xs text-slate-400 mb-2">Score Financeiro</p>
              <p className={`text-5xl font-black ${scoreColor}`}>{result.score}</p>
              <p className={`text-sm font-medium mt-1 ${scoreColor}`}>
                {result.score >= 75 ? 'Excelente' : result.score >= 50 ? 'Regular' : 'Atenção'}
              </p>
              <div className="w-full mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${result.score}%`,
                    backgroundColor: result.score >= 75 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </Card>
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-2">Resumo da Análise</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{result.resumo}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Positivos + Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-slate-300">Pontos Positivos</h3>
              </div>
              <ul className="space-y-2">
                {result.pontos_positivos.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5 border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-300">Alertas</h3>
              </div>
              <ul className="space-y-2">
                {result.alertas.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Categorias para cortar */}
          {result.categorias_para_cortar.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-slate-300">Categorias para Otimizar</h3>
              </div>
              <div className="space-y-3">
                {result.categorias_para_cortar.map((cat, i) => (
                  <div key={i} className="p-3 bg-slate-700/40 rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-200">{cat.categoria}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-red-400">Gasto: {cat.gasto}</span>
                        <span className="text-green-400">Economia: {cat.economia_potencial}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{cat.sugestao}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recomendações */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-300">Recomendações Personalizadas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.recomendacoes.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-700/40 rounded-lg">
                  <span className="w-5 h-5 bg-violet-600/30 text-violet-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300">{r}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Meta sugerida */}
          {result.meta_sugerida && (
            <Card className="p-5 border-violet-500/30 bg-violet-500/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-violet-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-medium mb-1">Meta Sugerida pela IA</p>
                  <p className="text-sm font-semibold text-slate-100">{result.meta_sugerida.nome}</p>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <span className="text-xs text-slate-400">Valor: <span className="text-slate-200">{result.meta_sugerida.valor}</span></span>
                    <span className="text-xs text-slate-400">Prazo: <span className="text-slate-200">{result.meta_sugerida.prazo}</span></span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-violet-600/40 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">Análise Inteligente de Gastos</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            O Claude AI irá analisar suas transações, identificar padrões de gastos, sugerir economias e recomendar metas personalizadas.
          </p>
        </Card>
      )}
    </Layout>
  )
}
