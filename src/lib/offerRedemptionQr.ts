import type { CoPilotApprovedOffer } from "./coPilotOffer";
import { DEMO_CONSUMER_ID } from "./consumerProfileSupabase";

export type FlashOfferQrFields = Pick<
  CoPilotApprovedOffer,
  "id" | "merchantId" | "merchantName" | "endsAt" | "discountPct"
>;

export type ParsedRedeemQr = {
  offerId: string;
  merchantId: string;
  expires: number;
  discountPct: number;
  merchantName: string;
  consumerId: string;
};

function asFiniteNumber(v: string | null): number {
  if (v == null || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Parse QR text from Mia offer (redeem URL or VIBEPAY v1 pipe). */
export function parseRedeemQrString(raw: string): ParsedRedeemQr | null {
  const t = raw.trim();
  if (!t) return null;

  if (t.startsWith("http://") || t.startsWith("https://")) {
    try {
      const u = new URL(t);
      const pathOk = u.pathname === "/redeem" || u.pathname.endsWith("/redeem");
      if (!pathOk) return null;
      const offerId = u.searchParams.get("offerId") ?? "";
      const merchantId = u.searchParams.get("merchantId") ?? "";
      const expires = asFiniteNumber(u.searchParams.get("expires"));
      const discountPct = asFiniteNumber(u.searchParams.get("pct"));
      const merchantName = u.searchParams.get("name") ?? "";
      const consumerId = u.searchParams.get("cid") ?? DEMO_CONSUMER_ID;
      if (!offerId || !merchantId || !Number.isFinite(expires) || !Number.isFinite(discountPct)) return null;
      return { offerId, merchantId, expires, discountPct, merchantName, consumerId };
    } catch {
      return null;
    }
  }

  const parts = t.split("|");
  if (parts[0] !== "VIBEPAY" || parts[1] !== "1") return null;
  if (parts.length < 6) return null;
  const [, , offerId, merchantId, exp, pct, maybeCid] = parts;
  const expires = Number(exp);
  const discountPct = Number(pct);
  if (!offerId || !merchantId || !Number.isFinite(expires) || !Number.isFinite(discountPct)) return null;
  const consumerId = parts.length >= 7 && maybeCid ? maybeCid : DEMO_CONSUMER_ID;
  return {
    offerId,
    merchantId,
    expires,
    discountPct,
    merchantName: "",
    consumerId,
  };
}

/**
 * Fallback when `origin` is unknown (SSR): pipe-delimited, versioned payload any scanner can read.
 */
export function buildFlashOfferPayloadV1(offer: FlashOfferQrFields, consumerId = DEMO_CONSUMER_ID): string {
  return [
    "VIBEPAY",
    "1",
    offer.id,
    offer.merchantId,
    String(offer.endsAt),
    String(offer.discountPct),
    consumerId,
  ].join("|");
}

/**
 * Preferred QR content: absolute URL to in-app redemption (opens `/redeem` with offer context).
 */
export function buildFlashOfferRedeemUrl(
  offer: FlashOfferQrFields,
  origin: string,
  consumerId = DEMO_CONSUMER_ID,
): string {
  const o = origin.replace(/\/$/, "");
  if (!o) return buildFlashOfferPayloadV1(offer, consumerId);
  const u = new URL("/redeem", o);
  u.searchParams.set("offerId", offer.id);
  u.searchParams.set("merchantId", offer.merchantId);
  u.searchParams.set("expires", String(offer.endsAt));
  u.searchParams.set("pct", String(offer.discountPct));
  u.searchParams.set("cid", consumerId);
  if (offer.merchantName) u.searchParams.set("name", offer.merchantName);
  return u.toString();
}

/** Deep link to a static vibe offer detail page (legacy `offer.$offerId` route). */
export function buildVibeOfferPageUrl(offerId: string, origin: string): string {
  const o = origin.replace(/\/$/, "");
  if (!o) return `vibepay:offer:${offerId}`;
  return new URL(`/offer/${encodeURIComponent(offerId)}`, o).toString();
}
