-- VibePay: merchants as single source for Mia + owner UIs. Run in Supabase SQL Editor
-- or via CLI. Enable Realtime for this table in Dashboard → Realtime (or use alter publication below).

create table if not exists public.merchants (
  id text primary key,
  name text not null,
  category text not null,
  position jsonb not null,
  hours jsonb not null,
  occupancy text not null,
  rules jsonb not null default '[]'::jsonb,
  fallback_message text not null,
  soft_message text not null,
  current_transactions_today int not null default 0,
  low_traffic_threshold int not null,
  daily_target_reached boolean not null default false,
  vibes_match text[] not null,
  signature text not null,
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on any write (optional but handy for debug)
create or replace function public.set_merchants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_merchants_updated_at on public.merchants;
create trigger tr_merchants_updated_at
  before update on public.merchants
  for each row
  execute function public.set_merchants_updated_at();

alter table public.merchants enable row level security;

-- Demo / hackathon: allow anon to read+write. Replace with real auth policies for production.
drop policy if exists "merchants select demo" on public.merchants;
create policy "merchants select demo"
  on public.merchants for select
  to anon, authenticated
  using (true);

drop policy if exists "merchants insert demo" on public.merchants;
create policy "merchants insert demo"
  on public.merchants for insert
  to anon, authenticated
  with check (true);

drop policy if exists "merchants update demo" on public.merchants;
create policy "merchants update demo"
  on public.merchants for update
  to anon, authenticated
  using (true)
  with check (true);

-- Realtime: idempotent (re-ejecutar el script no falla si la tabla ya está en la publicación)
do $pub$
begin
  alter publication supabase_realtime add table public.merchants;
exception
  when sqlstate '42710' then
    null; -- already a member of supabase_realtime
end;
$pub$;
