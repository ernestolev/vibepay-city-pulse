import { ChevronRight, Clock, Coffee, Croissant, IceCream, Store, Utensils, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CoPilotApprovedOffer } from "@/lib/coPilotOffer";
import { formatCountdown } from "@/lib/coPilotOffer";
import type { MerchantCategory } from "@/lib/merchantData";
import { useOfferCountdown } from "@/hooks/use-offer-countdown";
import { PayoneSeal } from "@/components/payone-seal";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<MerchantCategory, LucideIcon> = {
  cafe: Coffee,
  bakery: Croissant,
  bistro: Utensils,
  weinstube: Wine,
  gelateria: IceCream,
  boutique: Store,
};

const CATEGORY_COLOR: Record<MerchantCategory, string> = {
  cafe: "#7A4E2A",
  bakery: "#C98A4B",
  bistro: "#C84F2E",
  weinstube: "#6B2D5C",
  gelateria: "#E59A4D",
  boutique: "#3E5D7E",
};

interface CoPilotMiaOfferCardProps {
  offer: CoPilotApprovedOffer;
  redeemed?: boolean;
  onRedeem: () => void;
}

export function CoPilotMiaOfferCard({ offer, redeemed = false, onRedeem }: CoPilotMiaOfferCardProps) {
  const { t } = useI18n();
  const secondsLeft = useOfferCountdown(offer.endsAt);
  const Icon = CATEGORY_ICON[offer.category];
  const accent = CATEGORY_COLOR[offer.category];

  return (
    <button
      type="button"
      disabled={redeemed}
      onClick={() => {
        if (!redeemed) onRedeem();
      }}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl border bg-surface p-5 text-left text-foreground transition-all duration-300",
        redeemed && "cursor-not-allowed opacity-[0.72] grayscale-[0.35]",
      )}
      style={{
        borderColor: `${accent}55`,
        background: `linear-gradient(140deg, ${accent}12 0%, var(--surface) 72%)`,
        boxShadow: `0 18px 40px -22px ${accent}44`,
      }}
      aria-label={redeemed ? t("copilot.alreadyUsed") : t("copilot.openQr")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-60 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)` }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("copilot.forYou")}
        </span>
        {redeemed ? (
          <span className="rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-950">
            {t("copilot.alreadyUsed")}
          </span>
        ) : null}
        {!redeemed && offer.preferenceMatchNote ? (
          <span className="rounded-full border border-sky-200 bg-sky-50/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-900">
            {offer.preferenceMatchNote}
          </span>
        ) : null}
        {redeemed ? (
          <span className="inline-flex max-w-[11rem] items-center rounded-full border border-border bg-muted/80 px-2.5 py-1 text-[9px] font-medium leading-snug text-muted-foreground">
            {t("copilot.alreadyUsedHint")}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-emerald-900"
          >
            <Clock className="h-3 w-3 shrink-0" />
            {formatCountdown(secondsLeft)}
          </span>
        )}
      </div>

      <div className="relative mt-4 flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            borderColor: `${accent}55`,
            background: `${accent}18`,
            color: accent,
          }}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground">{offer.merchantName}</p>
          {offer.offerTitle ? (
            <p className="mt-1 text-sm font-bold text-foreground">{offer.offerTitle}</p>
          ) : null}
          <p className="mt-2 text-[15px] font-bold leading-snug text-foreground">{offer.friendlyMessage}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <div
          className="inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-bold tabular-nums"
          style={{
            borderColor: `${accent}66`,
            background: `${accent}14`,
            color: accent,
          }}
        >
          {t("copilot.discountOff", { pct: offer.discountPct })}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {redeemed ? t("copilot.tapQrDisabled") : t("copilot.tapQr")}{" "}
          {!redeemed ? <ChevronRight className="h-3 w-3" /> : null}
        </span>
      </div>

      <div className="relative mt-4 border-t border-border/70 pt-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <PayoneSeal variant="rail" tone="live" trailing="instant" />
            <span className="text-[10px] font-medium text-muted-foreground">{t("copilot.settled")}</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("copilot.powered")}
          </p>
        </div>
      </div>
    </button>
  );
}
