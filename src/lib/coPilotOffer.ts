import type { LocalMerchant, MerchantCategory, MerchantFlashOfferSlot } from "./merchantData";
import { activeFlashSlots } from "./merchantData";
import type { EvaluatedOffer } from "./offerEngine";
import type { VibeKey } from "./vibe";
import type { TimeBucket } from "./vibeEngine";
import type { Locale, MiaPulseWeather } from "./i18n/types";
import { pickMiaOpeningLineI18n, stablePickIndex } from "./i18n/mia-opening-rules";
import { translate } from "./i18n/translate";

export type { MiaPulseWeather };

export interface CoPilotApprovedOffer {
  id: string;
  merchantId: string;
  merchantName: string;
  category: MerchantCategory;
  discountPct: number;
  durationMinutes: number;
  /** Human, conversational copy for Mia — no internal metrics. */
  friendlyMessage: string;
  /** Short headline e.g. "30% OFF en Lattes" — from Supabase active_offer_title. */
  offerTitle?: string | null;
  /** When Mia's preference tags overlap the promoted SKU tags. */
  preferenceMatchNote?: string | null;
  launchedAt: number;
  endsAt: number;
}

export interface MiaFlashListContext {
  miaPreferenceTags?: string[];
  /** Inferred city pulse (aligns with Tavily search / simulator). */
  pulseWeather?: MiaPulseWeather;
  /** Simulator clock — enriches “por la noche / por la mañana” in taste copy. */
  timeBucket?: TimeBucket;
  /** UI language for Mia offer copy. */
  locale?: Locale;
}

function preferenceOverlapScore(tags: string[] | null | undefined, miaTags: string[]): number {
  if (!tags?.length || !miaTags.length) return 0;
  return tags.filter((t) => miaTags.includes(t)).length;
}

function pulseAffinityBonus(
  pulse: MiaPulseWeather,
  tags: string[] | null | undefined,
): number {
  if (!pulse || !tags?.length) return 0;
  const t = tags.map((x) => x.toLowerCase());
  const has = (s: string) => t.some((x) => x.includes(s));
  if (pulse === "rainy" && (has("warm") || has("coffee") || has("pastry") || has("food"))) return 2;
  if (pulse === "sunny" && (has("gelato") || has("sweet") || has("ice"))) return 2;
  if (pulse === "nighttime" && (has("wine") || has("food"))) return 1;
  return 0;
}

/**
 * SKU-targeted promos: Mia only sees offers whose tags intersect her taste graph,
 * or untagged / broadcast slots. Then ranked by tag overlap + Tavily pulse fit.
 */
export function flashSlotEligibleForMia(
  slot: MerchantFlashOfferSlot,
  miaPreferenceTags?: string[],
): boolean {
  if (!miaPreferenceTags?.length) return true;
  const offerTags = slot.productTags;
  if (!offerTags?.length) return true;
  return offerTags.some((t) => miaPreferenceTags.includes(t));
}

function rankSlotForMia(
  slot: MerchantFlashOfferSlot,
  miaPreferenceTags: string[] | undefined,
  pulseWeather: MiaPulseWeather,
): number {
  const tags = miaPreferenceTags ?? [];
  return (
    preferenceOverlapScore(slot.productTags, tags) * 4 +
    pulseAffinityBonus(pulseWeather, slot.productTags) +
    (slot.productTags?.length ? 0 : 1)
  );
}

function preferenceMatchNote(
  slot: MerchantFlashOfferSlot,
  miaPreferenceTags: string[] | undefined,
  locale: Locale,
): string | null {
  if (!miaPreferenceTags?.length || !slot.productTags?.length) return null;
  const overlap = slot.productTags.filter((t) => miaPreferenceTags.includes(t));
  if (!overlap.length) return null;
  return translate(locale, "mia.prefNote");
}

function buildMiaCtaI18n(
  merchantName: string,
  discountPct: number,
  seed: string,
  locale: Locale,
): string {
  const idx = stablePickIndex(`${seed}-cta`, 3);
  return translate(locale, `mia.cta.${idx}`, { name: merchantName, pct: discountPct });
}

function trimOwnerBlurb(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function buildMiaPersonalizedMessageI18n(params: {
  overlappingTags: string[];
  timeBucket?: TimeBucket;
  pulseWeather?: MiaPulseWeather;
  merchantName: string;
  discountPct: number;
  slotDescription: string;
  variantSeed: string;
  locale: Locale;
}): string | null {
  const opening = pickMiaOpeningLineI18n(
    params.overlappingTags,
    params.timeBucket,
    params.pulseWeather,
    params.variantSeed,
    params.locale,
  );
  if (!opening) return null;

  const cta = buildMiaCtaI18n(
    params.merchantName,
    params.discountPct,
    params.variantSeed,
    params.locale,
  );
  const blurb = trimOwnerBlurb(params.slotDescription, 72);
  return blurb ? `${opening} ${cta} ${blurb}` : `${opening} ${cta}`;
}

export function flashSlotToCoPilotCard(
  m: LocalMerchant,
  slot: MerchantFlashOfferSlot,
  miaPreferenceTags?: string[],
  opts?: { pulseWeather?: MiaPulseWeather; timeBucket?: TimeBucket; locale?: Locale },
): CoPilotApprovedOffer {
  const locale = opts?.locale ?? "en";
  let friendlyMessage = slot.description;
  if (miaPreferenceTags?.length && slot.productTags?.length) {
    const overlap = slot.productTags.filter((t) => miaPreferenceTags.includes(t));
    const personalized = buildMiaPersonalizedMessageI18n({
      overlappingTags: overlap,
      timeBucket: opts?.timeBucket,
      pulseWeather: opts?.pulseWeather,
      merchantName: m.name,
      discountPct: slot.discountPct,
      slotDescription: slot.description ?? "",
      variantSeed: `${m.id}:${slot.id}`,
      locale,
    });
    if (personalized) friendlyMessage = personalized;
  }

  return {
    id: `live-${m.id}-${slot.id}`,
    merchantId: m.id,
    merchantName: m.name,
    category: m.category,
    discountPct: slot.discountPct,
    durationMinutes: 0,
    friendlyMessage,
    offerTitle: slot.title,
    preferenceMatchNote: preferenceMatchNote(slot, miaPreferenceTags, locale),
    launchedAt: 0,
    endsAt: slot.endsAt,
  };
}

export function listMiaFlashOffers(
  merchants: LocalMerchant[],
  tagsOrCtx?: string[] | MiaFlashListContext,
  maybeCtx?: MiaFlashListContext,
): CoPilotApprovedOffer[] {
  let miaPreferenceTags: string[] | undefined;
  let pulseWeather: MiaPulseWeather;
  let timeBucket: TimeBucket | undefined;
  let locale: Locale;
  if (Array.isArray(tagsOrCtx)) {
    miaPreferenceTags = tagsOrCtx;
    pulseWeather = maybeCtx?.pulseWeather;
    timeBucket = maybeCtx?.timeBucket;
    locale = maybeCtx?.locale ?? "en";
  } else {
    miaPreferenceTags = tagsOrCtx?.miaPreferenceTags;
    pulseWeather = tagsOrCtx?.pulseWeather ?? maybeCtx?.pulseWeather;
    timeBucket = tagsOrCtx?.timeBucket ?? maybeCtx?.timeBucket;
    locale = tagsOrCtx?.locale ?? maybeCtx?.locale ?? "en";
  }

  const cardOpts = { pulseWeather, timeBucket, locale };
  const cards: { card: CoPilotApprovedOffer; rank: number; endsAt: number }[] = [];

  for (const m of merchants) {
    for (const slot of activeFlashSlots(m)) {
      if ((slot.description?.length ?? 0) === 0) continue;
      if (!flashSlotEligibleForMia(slot, miaPreferenceTags)) continue;
      const rank = rankSlotForMia(slot, miaPreferenceTags, pulseWeather);
      cards.push({
        card: flashSlotToCoPilotCard(m, slot, miaPreferenceTags, cardOpts),
        rank,
        endsAt: slot.endsAt,
      });
    }
  }

  cards.sort((a, b) => b.rank - a.rank || a.endsAt - b.endsAt);
  return cards.map((c) => c.card);
}

export const CATEGORY_RETAIL_LABEL: Record<MerchantCategory, string> = {
  cafe: "coffee & drinks",
  bakery: "bakery & viennoiserie",
  bistro: "bistro plates",
  weinstube: "wine & small plates",
  gelateria: "gelato",
  boutique: "boutique picks",
};

/** Spanish copy for owner dashboard (Payone / Co-Pilot). */
export function buildOwnerCoPilotInsightEs(params: {
  sales: number;
  threshold: number;
  discountPct: number;
  durationMinutes: number;
}): string {
  return `VibePay detectó bajo tráfico (${params.sales}/${params.threshold} ventas). Sugerencia: activa un descuento del ${params.discountPct}% por los próximos ${params.durationMinutes} min para atraer clientes cercanos.`;
}

export function buildOwnerCoPilotInsightI18n(
  locale: Locale,
  params: {
    sales: number;
    threshold: number;
    discountPct: number;
    durationMinutes: number;
  },
): string {
  return translate(locale, "owner.copilotInsight", {
    sales: params.sales,
    threshold: params.threshold,
    pct: params.discountPct,
    duration: params.durationMinutes,
  });
}

export function buildMiaFlashDescriptionEs(params: {
  merchantName: string;
  vibe: VibeKey;
  discountPct: number;
  durationMinutes: number;
}): string {
  const { merchantName, vibe, discountPct, durationMinutes } = params;
  if (vibe === "rainy") {
    return `¡Hola Mia! Se puso a llover y ${merchantName} te ofrece un ${discountPct}% de descuento solo por los próximos ${durationMinutes} min. ¿Pasamos?`;
  }
  return `¡Hola Mia! ${merchantName} te ofrece un ${discountPct}% de descuento solo por los próximos ${durationMinutes} min. ¿Pasamos?`;
}

export function buildMiaFlashDescriptionI18n(
  locale: Locale,
  params: {
    merchantName: string;
    vibe: VibeKey;
    discountPct: number;
    durationMinutes: number;
  },
): string {
  const key = params.vibe === "rainy" ? "mia.flash.rain" : "mia.flash.default";
  return translate(locale, key, {
    name: params.merchantName,
    pct: params.discountPct,
    min: params.durationMinutes,
  });
}

export function buildOwnerCoPilotInsight(params: {
  sales: number;
  threshold: number;
  categoryLabel: string;
  discountPct: number;
  durationMinutes: number;
}): string {
  return `Low sales detected (${params.sales}/${params.threshold}). Suggestion: Launch a ${params.discountPct}% OFF offer in ${params.categoryLabel} for the next ${params.durationMinutes} min to attract nearby customers.`;
}

export function buildMiaFriendlyMessage(params: {
  merchantName: string;
  vibe: VibeKey;
  discountPct: number;
  durationMinutes: number;
}): string {
  const { merchantName, vibe, discountPct, durationMinutes } = params;
  const weatherPhrase =
    vibe === "rainy"
      ? "it just started raining"
      : vibe === "sunny"
        ? "the sun is out"
        : vibe === "nighttime"
          ? "the evening has settled in"
          : "Stuttgart feels a little quieter right now";
  const start = weatherPhrase.charAt(0).toUpperCase() + weatherPhrase.slice(1);
  return `Hi Mia! ${start}, and ${merchantName} has a little treat for you: ${discountPct}% off for just the next ${durationMinutes} minutes.`;
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Copy for proximity push + lock screen: prefer the merchant’s live flash offer
 * (same title/description as Co-Pilot) and Mia’s personalized agent line when tags match.
 */
export function buildProximityPushCopy(params: {
  merchant: LocalMerchant;
  evaluated: EvaluatedOffer;
  timeBucket?: TimeBucket;
  pulseWeather?: MiaPulseWeather;
  locale: Locale;
  miaPreferenceTags?: string[];
}): { title: string; subtitle: string; body: string } {
  const { merchant, evaluated, timeBucket, pulseWeather, locale, miaPreferenceTags } = params;
  const slots = activeFlashSlots(merchant);
  if (slots.length > 0) {
    const slot = slots[0];
    const card = flashSlotToCoPilotCard(merchant, slot, miaPreferenceTags, {
      pulseWeather,
      timeBucket,
      locale,
    });
    const offerTitle =
      (slot.title && slot.title.trim().length > 0 ? slot.title : null) ??
      (card.offerTitle && card.offerTitle.trim().length > 0 ? card.offerTitle : null) ??
      `${slot.discountPct}% off`;
    const title = `${merchant.name} — ${offerTitle}`;
    const tail =
      card.preferenceMatchNote ??
      (trimOwnerBlurb(slot.description ?? "", 56) || merchant.signature);
    const subtitle = `${slot.discountPct}% off · ${tail}`;
    return { title, subtitle, body: card.friendlyMessage };
  }
  return {
    title: `${merchant.name} — ${evaluated.headline}`,
    subtitle: `${evaluated.discount} · ${merchant.signature}`,
    body: evaluated.message,
  };
}
