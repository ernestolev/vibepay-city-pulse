import { DEMO_CONSUMER_ID } from "./consumerProfileSupabase";
import { activeFlashSlots, type LocalMerchant, type MerchantFlashOfferSlot } from "./merchantData";
import type { ParsedRedeemQr } from "./offerRedemptionQr";

export type CheckoutLineItem = { name: string; unit_cents: number };

export type CheckoutDraft = {
  consumerId: string;
  merchantId: string;
  offerId: string;
  merchantName: string;
  subtotalCents: number;
  discountPct: number;
  amountCents: number;
  lineItems: CheckoutLineItem[];
};

function findFlashSlot(
  offerId: string,
  merchants: LocalMerchant[],
): { merchant: LocalMerchant; slot: MerchantFlashOfferSlot } | null {
  for (const m of merchants) {
    for (const slot of activeFlashSlots(m)) {
      if (`live-${m.id}-${slot.id}` === offerId) return { merchant: m, slot };
    }
  }
  return null;
}

export function buildCheckoutDraftFromScan(
  parsed: ParsedRedeemQr,
  merchants: LocalMerchant[],
): CheckoutDraft | null {
  const found = findFlashSlot(parsed.offerId, merchants);
  if (!found) return null;
  if (found.merchant.id !== parsed.merchantId) return null;
  if (Date.now() > parsed.expires) return null;

  const { merchant, slot } = found;
  const product = slot.productId
    ? merchant.productInventory.find((p) => p.id === slot.productId)
    : undefined;
  const primaryName = product?.name ?? slot.title;
  const companionName =
    merchant.category === "bakery"
      ? "Filter coffee · small"
      : merchant.category === "cafe"
        ? "Pastry pairing"
        : merchant.category === "gelateria"
          ? "Cone · regular"
          : "Side · chef pick";

  const primaryCents = 520;
  const companionCents = 280;
  const lineItems: CheckoutLineItem[] = [
    { name: primaryName, unit_cents: primaryCents },
    { name: companionName, unit_cents: companionCents },
  ];
  const subtotal = lineItems.reduce((a, b) => a + b.unit_cents, 0);
  const pct = Math.min(100, Math.max(0, parsed.discountPct));
  const amount = Math.round((subtotal * (100 - pct)) / 100);

  return {
    consumerId: parsed.consumerId?.trim() || DEMO_CONSUMER_ID,
    merchantId: merchant.id,
    offerId: parsed.offerId,
    merchantName: parsed.merchantName?.trim() || merchant.name,
    subtotalCents: subtotal,
    discountPct: pct,
    amountCents: Math.max(1, amount),
    lineItems,
  };
}
