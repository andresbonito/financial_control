# FinanceApp — Controle Financeiro Pessoal

Sistema completo de controle financeiro pessoal com análise de IA, investimentos e metas.

## Funcionalidades

- **Dashboard** — visão geral mensal com gráficos de receitas vs despesas
- **Transações** — CRUD completo com categorias, formas de pagamento e filtros
- **Investimentos** — portfólio com gráfico de composição e tracking de retorno
- **Metas** — metas financeiras com progresso visual e deadline
- **Relatórios** — exportação de PDF completo do período selecionado
- **Análise IA** — insights personalizados com Claude AI (score financeiro, alertas, recomendações)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS (tema dark) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Backend | Vercel Serverless Functions |
| Banco de dados | Supabase (PostgreSQL + Auth) |
| IA | Anthropic Claude API |

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com)
- API key da [Anthropic](https://console.anthropic.com)

## Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/andresbonito/financial_control.git
cd financial_control

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Configure o banco de dados
# Execute supabase/schema.sql no SQL Editor do Supabase
# Execute supabase/migrations/rls_policies.sql para habilitar RLS

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

O app ficará disponível em `http://localhost:3000`.

## Variáveis de Ambiente

| Variável | Descrição | Onde usar |
|----------|-----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `.env` (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública Supabase | `.env` (frontend) |
| `SUPABASE_URL` | URL do projeto Supabase | Vercel env vars (API) |
| `SUPABASE_ANON_KEY` | Chave pública Supabase | Vercel env vars (API) |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic | Vercel env vars (nunca no .env) |
| `CLAUDE_MODEL` | Modelo Claude (opcional) | Vercel env vars |
| `ALLOWED_ORIGIN` | Domínio autorizado para CORS | Vercel env vars |

> A `ANTHROPIC_API_KEY` deve ser configurada **apenas** nas variáveis de ambiente da Vercel, nunca no arquivo `.env` local.

## Testes

```bash
# Executar todos os testes
npm test

# Testes com cobertura de código
npm run test:coverage
```

Os testes cobrem:
- `src/lib/encryption.ts` — AES-256-GCM encrypt/decrypt roundtrip
- `src/lib/sanitize.ts` — sanitização para proteção contra prompt injection

## Build e Deploy

```bash
# Verificar se o build passa sem erros
npm run build
```

### Deploy na Vercel

1. Importe o repositório na Vercel
2. Configure todas as variáveis de ambiente no painel (Settings → Environment Variables)
3. O deploy acontece automaticamente a cada push na branch `main`

### Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute `supabase/schema.sql` no SQL Editor
3. Execute `supabase/migrations/rls_policies.sql` para ativar Row Level Security
4. Copie a URL e a chave anônima para as variáveis de ambiente

## Arquitetura

```
financial_control/
├── api/
│   └── analyze.ts          # Serverless function — integração Claude API
├── src/
│   ├── components/
│   │   ├── layout/         # Layout, Sidebar, BottomNav
│   │   └── ui/             # Button, Card, Input, Modal, Skeleton, ConfirmDialog
│   ├── constants/
│   │   └── colors.ts       # Paleta de cores compartilhada
│   ├── contexts/
│   │   └── AuthContext.tsx  # Autenticação global
│   ├── hooks/
│   │   └── usePagination.ts
│   ├── lib/
│   │   ├── encryption.ts   # AES-256-GCM via Web Crypto API
│   │   ├── sanitize.ts     # Proteção contra prompt injection
│   │   ├── supabase.ts     # Cliente Supabase
│   │   └── utils.ts        # Formatadores e helpers de data
│   ├── pages/              # Dashboard, Transactions, Investments, Goals, Reports, AIAnalysis
│   ├── test/               # Testes Vitest
│   └── types/              # Interfaces TypeScript e constantes
├── supabase/
│   ├── schema.sql          # DDL do banco de dados
│   └── migrations/
│       └── rls_policies.sql  # Políticas de Row Level Security
└── .env.example            # Template de variáveis de ambiente
```

## Segurança

- **Autenticação** — Supabase Auth (email/senha com hashing bcrypt no servidor)
- **Row Level Security** — cada usuário acessa apenas seus próprios dados
- **JWT** — endpoint `/api/analyze` valida o token antes de processar
- **Rate Limiting** — máximo de 20 requisições à IA por usuário por hora
- **CORS** — origem configurável via `ALLOWED_ORIGIN`
- **Sanitização** — dados do usuário são sanitizados antes de enviar à IA
- **Criptografia** — módulo AES-256-GCM disponível via Web Crypto API (`src/lib/encryption.ts`)

## Contribuição

1. Crie uma branch: `git checkout -b feat/minha-feature`
2. Faça suas alterações e adicione testes
3. Verifique o build: `npm run build`
4. Execute os testes: `npm test`
5. Abra um Pull Request

## Licença

MIT
