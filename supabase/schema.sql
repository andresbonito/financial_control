-- =============================================
-- CONTROLE FINANCEIRO — Schema Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('pix_in', 'pix_out', 'salary', 'allowance', 'expense', 'income')),
  amount decimal(12,2) not null check (amount > 0),
  description text not null,
  category text not null,
  payment_method text check (payment_method in ('pix', 'debit', 'credit', 'cash')),
  date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.transactions enable row level security;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Index para consultas por data
create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- Investments
create table public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  invested_amount decimal(12,2) not null check (invested_amount > 0),
  current_value decimal(12,2),
  date date not null,
  broker text,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.investments enable row level security;
create policy "Users can view own investments" on public.investments for select using (auth.uid() = user_id);
create policy "Users can insert own investments" on public.investments for insert with check (auth.uid() = user_id);
create policy "Users can update own investments" on public.investments for update using (auth.uid() = user_id);
create policy "Users can delete own investments" on public.investments for delete using (auth.uid() = user_id);

-- Goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  target_amount decimal(12,2) not null check (target_amount > 0),
  current_amount decimal(12,2) default 0,
  deadline date,
  category text,
  color text default '#8b5cf6',
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.goals enable row level security;
create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);
