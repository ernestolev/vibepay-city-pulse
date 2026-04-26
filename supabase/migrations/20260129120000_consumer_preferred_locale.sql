-- UI language for consumer demo profile (synced from app language switch).
alter table public.consumer_profiles
  add column if not exists preferred_locale text not null default 'en';

comment on column public.consumer_profiles.preferred_locale is 'VibePay UI: en | de | es — set from Profile language switch.';
