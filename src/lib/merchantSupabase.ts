import {
  INITIAL_MERCHANTS,
  type GeoPoint,
  type LocalMerchant,
  type MerchantCategory,
  type Occupancy,
  type VibeMatch,
} from "./merchantData";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import type { OfferRule } from "./offerEngine";

/**
 * One row = one `LocalMerchant`. JSON columns match the app types so we can
 * round-trip without a second mapping layer in the offer engine.
 */
export interface MerchantRow {
  id: string;
  name: string;
  category: string;
  position: GeoPoint;
  hours: { open: string; close: string };
  occupancy: string;
  rules: OfferRule[];
  fallback_message: string;
  soft_message: string;
  current_transactions_today: number;
  low_traffic_threshold: number;
  daily_target_reached: boolean;
  vibes_match: string[];
  signature: string;
  updated_at?: string;
}

const ORDER_INDEX = new Map(INITIAL_MERCHANTS.map((m, i) => [m.id, i]));

function orderMerchants(merchants: LocalMerchant[]): LocalMerchant[] {
  return [...merchants].sort(
    (a, b) => (ORDER_INDEX.get(a.id) ?? 999) - (ORDER_INDEX.get(b.id) ?? 999),
  );
}

function asCategory(s: string): MerchantCategory {
  return s as MerchantCategory;
}
function asOccupancy(s: string): Occupancy {
  return s as Occupancy;
}
function asVibes(a: string[]): VibeMatch[] {
  return a as VibeMatch[];
}

export function rowToMerchant(row: MerchantRow): LocalMerchant {
  return {
    id: row.id,
    name: row.name,
    category: asCategory(row.category),
    position: row.position,
    hours: row.hours,
    occupancy: asOccupancy(row.occupancy),
    rules: row.rules,
    fallbackMessage: row.fallback_message,
    softMessage: row.soft_message,
    currentTransactionsToday: row.current_transactions_today,
    lowTrafficThreshold: row.low_traffic_threshold,
    dailyTargetReached: row.daily_target_reached,
    vibesMatch: asVibes(row.vibes_match),
    signature: row.signature,
  };
}

export function merchantToRow(m: LocalMerchant): MerchantRow {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    position: m.position,
    hours: m.hours,
    occupancy: m.occupancy,
    rules: m.rules,
    fallback_message: m.fallbackMessage,
    soft_message: m.softMessage,
    current_transactions_today: m.currentTransactionsToday,
    low_traffic_threshold: m.lowTrafficThreshold,
    daily_target_reached: m.dailyTargetReached,
    vibes_match: m.vibesMatch,
    signature: m.signature,
  };
}

export async function fetchMerchantsFromSupabase(): Promise<LocalMerchant[] | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("merchants").select("*");
  if (error) {
    console.error("[supabase] fetch merchants", error);
    return null;
  }
  if (!data?.length) return [];
  return orderMerchants((data as MerchantRow[]).map(rowToMerchant));
}

/**
 * Fills the `merchants` table when it is empty (first load / demo). Uses
 * one upsert per row so a single bad row does not block the other six, and
 * JSON is round-tripped so jsonb + text[] always serialize for PostgREST.
 */
export async function ensureMerchantsSeeded(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { count, error: countError } = await supabase
    .from("merchants")
    .select("*", { count: "exact", head: true });
  if (countError) {
    console.error("[supabase] count merchants", countError);
    return false;
  }
  if ((count ?? 0) > 0) return true;

  let allOk = true;
  for (const m of INITIAL_MERCHANTS) {
    const row = merchantToRow(m);
    const clean = JSON.parse(JSON.stringify(row)) as MerchantRow;
    const { error } = await supabase.from("merchants").upsert(clean, { onConflict: "id" });
    if (error) {
      allOk = false;
      console.error(
        "[supabase] seed merchant",
        m.id,
        error.message,
        error.code,
        error.details,
        error.hint,
      );
    }
  }
  return allOk;
}

export async function upsertMerchant(m: LocalMerchant): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("merchants").upsert(merchantToRow(m), { onConflict: "id" });
  if (error) console.error("[supabase] upsert merchant", m.id, error);
}

export async function upsertMerchants(merchants: LocalMerchant[]): Promise<void> {
  if (!isSupabaseConfigured() || !merchants.length) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("merchants")
    .upsert(merchants.map(merchantToRow), { onConflict: "id" });
  if (error) console.error("[supabase] upsert merchants", error);
}

export { orderMerchants };
