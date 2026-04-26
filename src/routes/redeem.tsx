import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { buildFlashOfferRedeemUrl, type FlashOfferQrFields } from "@/lib/offerRedemptionQr";

type RedeemSearch = {
  offerId: string;
  merchantId: string;
  expires: number;
  pct: number;
  name: string;
};

function asFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const Route = createFileRoute("/redeem")({
  validateSearch: (raw: Record<string, unknown>): RedeemSearch => ({
    offerId: typeof raw.offerId === "string" ? raw.offerId : "",
    merchantId: typeof raw.merchantId === "string" ? raw.merchantId : "",
    expires: asFiniteNumber(raw.expires),
    pct: asFiniteNumber(raw.pct),
    name: typeof raw.name === "string" ? raw.name : "",
  }),
  head: () => ({
    meta: [{ title: "Redeem — VibePay" }, { name: "description", content: "VibePay offer redemption." }],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  const { offerId, merchantId, expires, pct, name } = Route.useSearch();
  const [qrValue, setQrValue] = useState("");

  const offer: FlashOfferQrFields | null = useMemo(() => {
    if (!offerId || !merchantId || !Number.isFinite(expires)) return null;
    return {
      id: offerId,
      merchantId,
      merchantName: name || "Merchant",
      endsAt: expires,
      discountPct: Number.isFinite(pct) ? pct : 0,
    };
  }, [offerId, merchantId, expires, pct, name]);

  useEffect(() => {
    if (!offer || typeof window === "undefined") return;
    setQrValue(buildFlashOfferRedeemUrl(offer, window.location.origin));
  }, [offer]);

  const expired = offer ? Date.now() > offer.endsAt : true;
  const displayName = name || merchantId || "Merchant";

  return (
    <div className="min-h-screen bg-surface px-5 pb-10 pt-12 text-foreground">
      <header className="mx-auto flex max-w-md items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          aria-label="Home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VibePay</p>
          <h1 className="text-lg font-bold tracking-tight">Offer redemption</h1>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-md space-y-5">
        {!offer ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Missing or invalid offer parameters. Open an offer from the app and scan the QR again.
          </p>
        ) : (
          <>
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{displayName}</p>
              <p className="mt-1 text-2xl font-bold">{pct}% off</p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">Offer · {offerId}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${
                    expired
                      ? "bg-amber-100 text-amber-900"
                      : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {expired ? "Expired" : "Valid now"}
                </span>
                {!expired ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                    <BadgeCheck className="h-3 w-3" />
                    Ready for till
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Same QR · Payone Riel
              </p>
              <div className="mx-auto mt-4 flex justify-center rounded-2xl bg-white p-4 ring-1 ring-border">
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={200} bgColor="#ffffff" fgColor="#111111" level="M" marginSize={0} />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-muted" />
                )}
              </div>
              <p className="mt-3 break-all text-center font-mono text-[10px] text-muted-foreground">{qrValue}</p>
            </div>

            <Link
              to="/offers"
              className="block w-full rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground"
            >
              Back to offers
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
