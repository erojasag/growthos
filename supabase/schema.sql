-- GrowthOS Database Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- WORKOUTS
-- ============================================
create table public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null,
  duration_minutes integer,
  calories_burned integer,
  notes text,
  completed_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.workouts enable row level security;

create policy "Users can manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id);

create index idx_workouts_user_date on public.workouts (user_id, completed_at desc);

-- ============================================
-- EXERCISES (within a workout)
-- ============================================
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  name text not null,
  sets integer,
  reps integer,
  weight numeric,
  duration_seconds integer,
  order_index integer default 0 not null
);

alter table public.exercises enable row level security;

create policy "Users can manage exercises in own workouts"
  on public.exercises for all
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

-- ============================================
-- BODY METRICS
-- ============================================
create table public.body_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  weight numeric,
  body_fat_percentage numeric,
  notes text,
  recorded_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.body_metrics enable row level security;

create policy "Users can manage own body metrics"
  on public.body_metrics for all
  using (auth.uid() = user_id);

create index idx_body_metrics_user_date on public.body_metrics (user_id, recorded_at desc);

-- ============================================
-- TRANSACTIONS (finances)
-- ============================================
create type transaction_type as enum ('income', 'expense');

create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  type transaction_type not null,
  category text not null,
  description text,
  currency text default 'CRC' not null,
  date date default current_date not null,
  created_at timestamptz default now() not null
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

create index idx_transactions_user_date on public.transactions (user_id, date desc);

-- ============================================
-- BUDGETS
-- ============================================
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  amount numeric not null,
  month text not null, -- format: YYYY-MM
  created_at timestamptz default now() not null,
  unique (user_id, category, month)
);

alter table public.budgets enable row level security;

create policy "Users can manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id);

-- ============================================
-- HABITS
-- ============================================
create type habit_frequency as enum ('daily', 'weekly');

create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text default 'bg-blue-500' not null,
  icon text default 'Target' not null,
  frequency habit_frequency default 'daily' not null,
  target_count integer default 1 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.habits enable row level security;

create policy "Users can manage own habits"
  on public.habits for all
  using (auth.uid() = user_id);

-- ============================================
-- HABIT ENTRIES (completions)
-- ============================================
create table public.habit_entries (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_at date default current_date not null,
  note text,
  unique (habit_id, completed_at)
);

alter table public.habit_entries enable row level security;

create policy "Users can manage own habit entries"
  on public.habit_entries for all
  using (auth.uid() = user_id);

create index idx_habit_entries_habit_date on public.habit_entries (habit_id, completed_at desc);
create index idx_habit_entries_user_date on public.habit_entries (user_id, completed_at desc);

-- ============================================
-- USER SETTINGS (onboarding, income, currency)
-- ============================================
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  monthly_income numeric default 0 not null,
  income_currency text default 'CRC' not null,
  spending_currency text default 'CRC' not null,
  income_updated_at timestamptz default now() not null,
  setup_completed boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.user_settings enable row level security;

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);

-- ============================================
-- INCOME SOURCES (extra income methods)
-- ============================================
create table public.income_sources (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  frequency text default 'monthly' not null check (frequency in ('monthly', 'one-time')),
  created_at timestamptz default now() not null
);

alter table public.income_sources enable row level security;

create policy "Users can manage own income sources"
  on public.income_sources for all
  using (auth.uid() = user_id);

create index idx_income_sources_user on public.income_sources (user_id);

-- ============================================
-- RECURRING EXPENSES (fixed monthly bills)
-- ============================================
create table public.recurring_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  currency text default 'CRC' not null,
  category text default 'Bills & Utilities' not null,
  created_at timestamptz default now() not null
);

alter table public.recurring_expenses enable row level security;

create policy "Users can manage own recurring expenses"
  on public.recurring_expenses for all
  using (auth.uid() = user_id);

create index idx_recurring_expenses_user on public.recurring_expenses (user_id);

-- ============================================
-- CREDIT CARDS
-- ============================================
create table public.credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  last_four text not null,
  credit_limit numeric not null,
  balance_crc numeric default 0 not null,
  balance_usd numeric default 0 not null,
  billing_date integer not null check (billing_date between 1 and 31),
  due_date integer not null check (due_date between 1 and 31),
  created_at timestamptz default now() not null
);

alter table public.credit_cards enable row level security;

create policy "Users can manage own credit cards"
  on public.credit_cards for all
  using (auth.uid() = user_id);

create index idx_credit_cards_user on public.credit_cards (user_id);

-- ============================================
-- CREDIT CARD PAYMENTS
-- ============================================
create table public.credit_card_payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_id uuid references public.credit_cards(id) on delete cascade not null,
  amount numeric not null,
  currency text not null default 'CRC',
  paid_at date default current_date not null,
  created_at timestamptz default now() not null
);

alter table public.credit_card_payments enable row level security;

create policy "Users can manage own card payments"
  on public.credit_card_payments for all
  using (auth.uid() = user_id);

create index idx_card_payments_user on public.credit_card_payments (user_id);

-- ============================================
-- INVESTMENTS (tracked separately from expenses)
-- ============================================
create table public.investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  notes text,
  invested_at date default current_date not null,
  created_at timestamptz default now() not null
);

alter table public.investments enable row level security;

create policy "Users can manage own investments"
  on public.investments for all
  using (auth.uid() = user_id);

create index idx_investments_user_date on public.investments (user_id, invested_at desc);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
