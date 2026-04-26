-- Wallet balances, checkout sessions (QR → pay flow), ledger, atomic settlement.

alter table public.consumer_profiles
  add column if not exists wallet_balance_cents int not null default 428750;

comment on column public.consumer_profiles.wallet_balance_cents is 'Demo Mia wallet (euros × 100). Default €4,287.50.';

alter table public.merchants
  add column if not exists wallet_balance_cents int not null default 0;

comment on column public.merchants.wallet_balance_cents is 'Demo business wallet credited on Payone-settled checkouts.';

update public.merchants
set wallet_balance_cents = 184260
where id = 'baeckerei-treiber' and wallet_balance_cents = 0;

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  consumer_id text not null,
  merchant_id text not null,
  offer_id text not null,
  merchant_name text not null,
  subtotal_cents int not null,
  discount_pct int not null,
  amount_cents int not null,
  line_items jsonb not null default '[]'::jsonb,
  status text not null default 'pending_pay'
    check (status in ('pending_pay', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checkout_sessions is 'Merchant scans Mia QR → Mia pays; statuses drive Realtime navigation.';

drop trigger if exists tr_checkout_sessions_updated_at on public.checkout_sessions;
create trigger tr_checkout_sessions_updated_at
  before update on public.checkout_sessions
  for each row execute function public.set_merchants_updated_at();

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  consumer_id text not null,
  merchant_id text not null,
  merchant_name text not null,
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,
  amount_cents int not null,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.wallet_ledger is 'Completed Payone-style settlements; feeds Activity for Mia + merchant.';

alter table public.checkout_sessions enable row level security;
alter table public.wallet_ledger enable row level security;

drop policy if exists "checkout_sessions select demo" on public.checkout_sessions;
create policy "checkout_sessions select demo"
  on public.checkout_sessions for select
  to anon, authenticated
  using (true);

drop policy if exists "checkout_sessions insert demo" on public.checkout_sessions;
create policy "checkout_sessions insert demo"
  on public.checkout_sessions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "checkout_sessions update demo" on public.checkout_sessions;
create policy "checkout_sessions update demo"
  on public.checkout_sessions for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "wallet_ledger select demo" on public.wallet_ledger;
create policy "wallet_ledger select demo"
  on public.wallet_ledger for select
  to anon, authenticated
  using (true);

-- Inserts only via complete_checkout (security definer); block direct client inserts.
drop policy if exists "wallet_ledger insert demo" on public.wallet_ledger;
create policy "wallet_ledger insert demo"
  on public.wallet_ledger for insert
  to anon, authenticated
  with check (false);

do $pub$
begin
  alter publication supabase_realtime add table public.checkout_sessions;
exception
  when sqlstate '42710' then null;
end;
$pub$;

create or replace function public.complete_checkout(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  bal int;
begin
  select * into s from public.checkout_sessions where id = p_session_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if s.status <> 'pending_pay' then
    return jsonb_build_object('ok', false, 'error', 'bad_status', 'status', s.status);
  end if;

  select wallet_balance_cents into bal from public.consumer_profiles where id = s.consumer_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_consumer');
  end if;
  if bal < s.amount_cents then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds');
  end if;

  update public.consumer_profiles
  set wallet_balance_cents = wallet_balance_cents - s.amount_cents,
      updated_at = now()
  where id = s.consumer_id;

  update public.merchants
  set wallet_balance_cents = wallet_balance_cents + s.amount_cents,
      updated_at = now()
  where id = s.merchant_id;

  insert into public.wallet_ledger (
    consumer_id, merchant_id, merchant_name, checkout_session_id, amount_cents, line_items
  ) values (
    s.consumer_id, s.merchant_id, s.merchant_name, p_session_id, s.amount_cents, s.line_items
  );

  update public.checkout_sessions
  set status = 'completed', updated_at = now()
  where id = p_session_id;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.complete_checkout(uuid) is 'Atomically debits consumer, credits merchant, writes ledger, closes session.';

grant execute on function public.complete_checkout(uuid) to anon;
grant execute on function public.complete_checkout(uuid) to authenticated;
