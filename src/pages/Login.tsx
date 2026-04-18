import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Ao menos 1 letra maiúscula')
  .regex(/[a-z]/, 'Ao menos 1 letra minúscula')
  .regex(/[0-9]/, 'Ao menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Ao menos 1 caractere especial')

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: passwordSchema,
})

type LoginForm = z.infer<typeof loginSchema>

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Fraca', color: 'bg-red-500' }
  if (score <= 4) return { score, label: 'Média', color: 'bg-amber-500' }
  return { score, label: 'Forte', color: 'bg-green-500' }
}

export function Login() {
  const { user, signIn } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  if (user) return <Navigate to="/" replace />

  async function handleLogin(data: LoginForm) {
    setApiError('')
    const { error } = await signIn(data.email, data.password)
    if (error) setApiError('E-mail ou senha incorretos.')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">FinanceApp</h1>
          <p className="text-slate-400 text-sm mt-1">Controle Financeiro Pessoal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">Entrar</h2>

          {apiError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {passwordValue && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 2 ? 'text-red-400' :
                    strength.score <= 4 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    Senha {strength.label}
                  </p>
                </div>
              )}

              {errors.password && (
                <span className="text-xs text-red-400">{errors.password.message}</span>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Entrar
            </Button>
          </form>

          <p className="text-xs text-slate-500 mt-4 text-center">
            A senha deve ter 8+ caracteres, maiúscula, minúscula, número e símbolo.
          </p>
        </div>
      </div>
    </div>
  )
}
