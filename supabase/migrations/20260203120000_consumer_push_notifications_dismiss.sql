-- Permitir descartar notificaciones en la pantalla de bloqueo (swipe / dismiss).
alter table public.consumer_push_notifications
  add column if not exists dismissed_at timestamptz;

comment on column public.consumer_push_notifications.dismissed_at is 'Cuando no es null, la fila no se muestra en lock screen.';

drop policy if exists "consumer_push_notifications update demo" on public.consumer_push_notifications;
create policy "consumer_push_notifications update demo"
  on public.consumer_push_notifications for update
  to anon, authenticated
  using (true)
  with check (true);
