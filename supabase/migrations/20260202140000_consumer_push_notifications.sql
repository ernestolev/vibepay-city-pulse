-- Notificaciones push del demo (Mia) — persisten para pantalla de bloqueo y disparadores.
create table if not exists public.consumer_push_notifications (
  id uuid primary key default gen_random_uuid(),
  consumer_id text not null default 'mia-demo',
  client_notification_id text,
  title text not null,
  subtitle text not null,
  body text,
  merchant_id text,
  merchant_name text,
  created_at timestamptz not null default now()
);

comment on table public.consumer_push_notifications is 'Demo: historial de pushes del consumidor; alimenta lock screen y puede usarse como gatillo.';

create index if not exists consumer_push_notifications_consumer_created_desc
  on public.consumer_push_notifications (consumer_id, created_at desc);

create unique index if not exists consumer_push_notifications_client_dedup
  on public.consumer_push_notifications (consumer_id, client_notification_id)
  where client_notification_id is not null;

alter table public.consumer_push_notifications enable row level security;

drop policy if exists "consumer_push_notifications select demo" on public.consumer_push_notifications;
create policy "consumer_push_notifications select demo"
  on public.consumer_push_notifications for select
  to anon, authenticated
  using (true);

drop policy if exists "consumer_push_notifications insert demo" on public.consumer_push_notifications;
create policy "consumer_push_notifications insert demo"
  on public.consumer_push_notifications for insert
  to anon, authenticated
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.consumer_push_notifications;
exception
  when duplicate_object then
    null;
end $$;
