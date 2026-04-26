-- Path simulator: persist walking + destination so Mia (or second client) can read state from DB / realtime.
alter table public.simulator_state
  add column if not exists is_walking boolean not null default false;

alter table public.simulator_state
  add column if not exists mia_destination jsonb;

comment on column public.simulator_state.is_walking is 'True while Path Simulator Play is animating the route.';
comment on column public.simulator_state.mia_destination is 'Lat/lng JSON when a route destination is set; null when idle.';
