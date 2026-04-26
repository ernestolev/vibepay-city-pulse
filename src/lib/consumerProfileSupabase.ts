import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import type { GeoPoint } from "./merchantData";
import { MIA_HOME } from "./merchantData";
import type { Locale } from "./i18n/types";
import { MIA_VIBEPAY_PREFERENCE_TAGS } from "./miaConsumerProfile";

export const DEMO_CONSUMER_ID = "mia-demo";

export async function upsertConsumerLocation(point: GeoPoint, displayName = "Mia Berg"): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("consumer_profiles").upsert(
    {
      id: DEMO_CONSUMER_ID,
      display_name: displayName,
      last_known_lat: point.lat,
      last_known_lng: point.lng,
      preference_tags: MIA_VIBEPAY_PREFERENCE_TAGS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) console.error("[supabase] upsert consumer profile", error.message);
}

/** Persists Profile language switch (column `preferred_locale` — run latest migration if missing). */
export async function upsertConsumerPreferredLocale(locale: Locale): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("consumer_profiles")
    .update({ preferred_locale: locale, updated_at: now })
    .eq("id", DEMO_CONSUMER_ID);
  if (!updateErr) return;

  const { error: insertErr } = await supabase.from("consumer_profiles").upsert(
    {
      id: DEMO_CONSUMER_ID,
      display_name: "Mia Berg",
      last_known_lat: MIA_HOME.lat,
      last_known_lng: MIA_HOME.lng,
      preference_tags: MIA_VIBEPAY_PREFERENCE_TAGS,
      preferred_locale: locale,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (insertErr) console.error("[supabase] consumer preferred_locale", insertErr.message);
}
