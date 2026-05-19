-- Tabla de historial diario de patrimonio neto
create table if not exists public.patrimony_history (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  date           date        not null,
  net_worth_cop  numeric(20,6) not null default 0,
  net_worth_usd  numeric(20,6) not null default 0,
  total_banks    numeric(20,6) not null default 0,
  total_stocks   numeric(20,6) not null default 0,
  total_crypto   numeric(20,6) not null default 0,
  created_at     timestamptz not null default now(),
  constraint patrimony_history_user_date_unique unique (user_id, date)
);

create index if not exists idx_patrimony_history_user_date
  on public.patrimony_history (user_id, date desc);

alter table public.patrimony_history enable row level security;

create policy "Users manage own patrimony history"
  on public.patrimony_history
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
