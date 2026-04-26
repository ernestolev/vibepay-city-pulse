-- Global simulator prefs (vibe, time, presentation, Mia origin) — shared across devices for the demo.
create table if not exists public.simulator_state (
  id text primary key,
  vibe text not null default 'sunny',
  simulated_time text,
  is_presentation_mode boolean not null default false,
  mia_origin jsonb not null default '{"lat": 48.7758, "lng": 9.1829}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.simulator_state (id) values ('global') on conflict (id) do nothing;

create or replace function public.set_simulator_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_simulator_state_updated_at on public.simulator_state;
create trigger tr_simulator_state_updated_at
  before update on public.simulator_state
  for each row
  execute function public.set_simulator_state_updated_at();

alter table public.simulator_state enable row level security;

drop policy if exists "simulator state select demo" on public.simulator_state;
create policy "simulator state select demo"
  on public.simulator_state for select
  to anon, authenticated
  using (true);

drop policy if exists "simulator state insert demo" on public.simulator_state;
create policy "simulator state insert demo"
  on public.simulator_state for insert
  to anon, authenticated
  with check (true);

drop policy if exists "simulator state update demo" on public.simulator_state;
create policy "simulator state update demo"
  on public.simulator_state for update
  to anon, authenticated
  using (true)
  with check (true);

do $pub$
begin
  alter publication supabase_realtime add table public.simulator_state;
exception
  when sqlstate '42710' then
    null; -- already a member of supabase_realtime
end;
$pub$;
