-- =============================================
-- Migration: Criptografia total das transações
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- 1. Remover constraints de CHECK (valores criptografados não correspondem aos enums)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;

-- 2. Converter amount de DECIMAL para TEXT (para armazenar o valor criptografado)
ALTER TABLE public.transactions ALTER COLUMN amount TYPE text USING amount::text;

-- 3. Converter date de DATE para TEXT (para armazenar a data criptografada)
ALTER TABLE public.transactions ALTER COLUMN date TYPE text USING date::text;

-- 4. Remover o índice por data (não é mais útil com valores criptografados)
DROP INDEX IF EXISTS transactions_user_date_idx;

-- 5. Criar índice por created_at para ordenação das consultas
CREATE INDEX IF NOT EXISTS transactions_user_created_idx
  ON public.transactions (user_id, created_at DESC);
