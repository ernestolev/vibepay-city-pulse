import {
  INITIAL_MERCHANTS,
  type GeoPoint,
  type LocalMerchant,
  type MerchantCategory,
  type MerchantProduct,
  type Occupancy,
  type VibeMatch,
  parseFlashOffersFromJson,
  syncLegacyFieldsFromFlashOffers,
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
  is_offer_active?: boolean;
  active_offer_title?: string | null;
  active_offer_description?: string | null;
  active_offer_discount_pct?: number | null;
  active_offer_ends_at?: string | null;
  product_inventory?: MerchantProduct[];
  active_offer_product_tags?: string[] | null;
  active_offer_product_id?: string | null;
  flash_offers?: unknown;
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
  const initial = INITIAL_MERCHANTS.find((m) => m.id === row.id);
  const endsRaw = row.active_offer_ends_at;
  const endsMs =
    endsRaw && typeof endsRaw === "string" && endsRaw.length > 0
      ? Date.parse(endsRaw)
      : null;
  const invFromRow = Array.isArray(row.product_inventory) ? row.product_inventory : [];
  const productInventory =
    invFromRow.length > 0 ? invFromRow : initial?.productInventory ?? [];
  let flashOffers = parseFlashOffersFromJson(row.flash_offers);
  const now = Date.now();
  if (
    flashOffers.length === 0 &&
    (row.is_offer_active ?? false) &&
    endsMs != null &&
    !Number.isNaN(endsMs) &&
    endsMs > now &&
    (row.active_offer_description?.length ?? 0) > 0
  ) {
    flashOffers = [
      {
        id: "legacy-single",
        title: row.active_offer_title ?? "",
        description: row.active_offer_description!,
        discountPct: row.active_offer_discount_pct ?? 30,
        endsAt: endsMs,
        productId: row.active_offer_product_id ?? null,
        productTags: Array.isArray(row.active_offer_product_tags)
          ? [...row.active_offer_product_tags]
          : null,
      },
    ];
  }
  const base: LocalMerchant = {
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
    isOfferActive: row.is_offer_active ?? false,
    activeOfferTitle: row.active_offer_title ?? null,
    activeOfferDescription: row.active_offer_description ?? null,
    activeOfferDiscountPct: row.active_offer_discount_pct ?? null,
    activeOfferEndsAt: endsMs != null && !Number.isNaN(endsMs) ? endsMs : null,
    productInventory,
    activeOfferProductTags: row.active_offer_product_tags ?? null,
    activeOfferProductId: row.active_offer_product_id ?? null,
    flashOffers,
  };
  return syncLegacyFieldsFromFlashOffers(base);
}

export function merchantToRow(m: LocalMerchant): MerchantRow {
  const synced = syncLegacyFieldsFromFlashOffers(m);
  const endsIso =
    synced.activeOfferEndsAt != null && synced.activeOfferEndsAt > 0
      ? new Date(synced.activeOfferEndsAt).toISOString()
      : null;
  const flashClean = JSON.parse(JSON.stringify(m.flashOffers ?? [])) as MerchantRow["flash_offers"];
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
    is_offer_active: synced.isOfferActive,
    active_offer_title: synced.activeOfferTitle,
    active_offer_description: synced.activeOfferDescription,
    active_offer_discount_pct: synced.activeOfferDiscountPct,
    active_offer_ends_at: endsIso,
    product_inventory: m.productInventory,
    active_offer_product_tags: synced.activeOfferProductTags,
    active_offer_product_id: synced.activeOfferProductId,
    flash_offers: flashClean,
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

/**
 * Bumped after a successful remote write so other browser tabs (Mia vs dueño)
 * can refetch without relying only on Realtime.
 */
export const MERCHANTS_CROSS_TAB_SYNC_KEY = "vibepay-merchants-sync";

function isMissingFlashOffersColumn(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (msg.includes("flash_offers") && (msg.includes("schema cache") || msg.includes("could not find")))
  );
}

/** PostgREST error when `flash_offers` was never migrated on this Supabase project. */
function logFlashOffersMigrationHint(): void {
  console.warn(
    "[VibePay] Tu proyecto Supabase no tiene la columna `flash_offers` en `public.merchants`.\n" +
      "Supabase → SQL Editor → New query → Run:\n\n" +
      "alter table public.merchants\n" +
      "  add column if not exists flash_offers jsonb not null default '[]'::jsonb;\n\n" +
      "Mismo contenido que: supabase/migrations/20260128120000_merchant_flash_offers_json.sql\n" +
      "Tras ejecutar, espera unos segundos y vuelve a publicar (el caché de esquema se actualiza solo).",
  );
}

function bumpMerchantsCrossTabSync(): void {
  try {
    localStorage.setItem(MERCHANTS_CROSS_TAB_SYNC_KEY, String(Date.now()));
  } catch {
    /* private mode / quota */
  }
}

export async function upsertMerchant(m: LocalMerchant): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("merchants").upsert(merchantToRow(m), { onConflict: "id" });
  if (error) {
    if (isMissingFlashOffersColumn(error)) logFlashOffersMigrationHint();
    console.error(
      "[supabase] upsert merchant",
      m.id,
      error.message,
      error.code ?? "",
      error.details ?? "",
      error.hint ? `hint: ${error.hint}` : "",
    );
    return false;
  }
  bumpMerchantsCrossTabSync();
  return true;
}

export async function upsertMerchants(merchants: LocalMerchant[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !merchants.length) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from("merchants")
    .upsert(merchants.map(merchantToRow), { onConflict: "id" });
  if (error) {
    if (isMissingFlashOffersColumn(error)) logFlashOffersMigrationHint();
    console.error(
      "[supabase] upsert merchants",
      error.message,
      error.code ?? "",
      error.details ?? "",
      error.hint ? `hint: ${error.hint}` : "",
    );
    return false;
  }
  bumpMerchantsCrossTabSync();
  return true;
}

export { orderMerchants };
