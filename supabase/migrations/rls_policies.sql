-- RLS Policies for financial_control
-- Each user can only access their own data (auth.uid() = user_id).
-- Run this in the Supabase SQL editor or via `supabase db push`.

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users view only their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profile is created automatically by a DB trigger on auth.users insert.
-- No INSERT policy is needed for the client.

-- ============================================================
-- TRANSACTIONS
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INVESTMENTS
-- ============================================================
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investments_select_own" ON investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "investments_insert_own" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investments_update_own" ON investments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "investments_delete_own" ON investments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- GOALS
-- ============================================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON goals
  FOR DELETE USING (auth.uid() = user_id);
