create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default '',
  is_preset boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.merchant_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword citext not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  merchant text not null,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  source text not null check (source in ('web','chat','sms')),
  raw_input text,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_uncat_idx on public.transactions (user_id) where category_id is null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  limit_cents integer not null check (limit_cents > 0),
  month date not null check (extract(day from month) = 1),
  unique (user_id, category_id, month)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount_cents integer not null check (amount_cents > 0),
  due_day int not null check (due_day between 1 and 31),
  category_id uuid references public.categories(id) on delete set null,
  recurrence text not null default 'monthly' check (recurrence = 'monthly'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reminders_log (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  due_date date not null,
  lead_days int not null,
  channel text not null check (channel in ('email','whatsapp','sms')),
  sent_at timestamptz not null default now(),
  status text not null default 'pending',
  unique (bill_id, due_date, lead_days, channel)
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.merchant_keywords enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.reminders_log enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own keywords" on public.merchant_keywords
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own budgets" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own bills" on public.bills
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own reminder log" on public.reminders_log
  for all using (exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid()));
