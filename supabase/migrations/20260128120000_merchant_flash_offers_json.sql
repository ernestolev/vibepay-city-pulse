-- Concurrent flash offers per merchant (Mia sees filtered + ranked subset).
alter table public.merchants
  add column if not exists flash_offers jsonb not null default '[]'::jsonb;

comment on column public.merchants.flash_offers is 'Array of { id, title, description, discountPct, endsAt, productId, productTags } — legacy active_offer_* mirror primary slot.';
