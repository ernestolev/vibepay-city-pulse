-- Mia-visible flash offers + Payone traffic fields (maps to app: current_transactions_today / low_traffic_threshold).
alter table public.merchants
  add column if not exists is_offer_active boolean not null default false,
  add column if not exists active_offer_title text,
  add column if not exists active_offer_description text,
  add column if not exists active_offer_discount_pct int,
  add column if not exists active_offer_ends_at timestamptz;

comment on column public.merchants.current_transactions_today is 'Payone settlement count today (Mia-facing: current sales).';
comment on column public.merchants.low_traffic_threshold is 'Sales threshold for low-traffic / Co-Pilot logic (Mia-facing: sales threshold).';
