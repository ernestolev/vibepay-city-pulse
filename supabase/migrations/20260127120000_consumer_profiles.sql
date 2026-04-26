-- Perfil del usuario consumidor (demo: Mia) — última ubicación para pulso / Tavily y preferencias.
create table if not exists public.consumer_profiles (
  id text primary key,
  display_name text,
  last_known_lat double precision not null,
  last_known_lng double precision not null,
  preference_tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

comment on table public.consumer_profiles is 'Demo: un fila por consumidor; lat/lng alimentan búsquedas de contexto (Tavily) junto al simulador.';

drop trigger if exists tr_consumer_profiles_updated_at on public.consumer_profiles;
create trigger tr_consumer_profiles_updated_at
  before update on public.consumer_profiles
  for each row execute function public.set_merchants_updated_at();

alter table public.consumer_profiles enable row level security;

drop policy if exists "consumer_profiles select demo" on public.consumer_profiles;
create policy "consumer_profiles select demo"
  on public.consumer_profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "consumer_profiles upsert demo" on public.consumer_profiles;
create policy "consumer_profiles upsert demo"
  on public.consumer_profiles for insert
  to anon, authenticated
  with check (true);

drop policy if exists "consumer_profiles update demo" on public.consumer_profiles;
create policy "consumer_profiles update demo"
  on public.consumer_profiles for update
  to anon, authenticated
  using (true)
  with check (true);
