-- Product catalogue (JSON) + optional targeting metadata for Mia-facing flash offers.
alter table public.merchants
  add column if not exists product_inventory jsonb not null default '[]'::jsonb,
  add column if not exists active_offer_product_tags text[],
  add column if not exists active_offer_product_id text;

comment on column public.merchants.product_inventory is 'Merchant POS/catalog JSON array: { id, name, tags[] } for AI offer proposals.';
comment on column public.merchants.active_offer_product_tags is 'Tags from the promoted SKU; used with Mia preference tags to filter visibility.';
comment on column public.merchants.active_offer_product_id is 'SKU id of the promoted article (optional analytics).';
