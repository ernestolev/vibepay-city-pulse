import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { useAppContext } from "@/lib/app-context";
import { useMerchants } from "@/lib/merchant-rules-context";
import {
  buildOfferContext,
  evaluateOffer,
  type ActivationState,
  type EvaluatedOffer,
} from "@/lib/offerEngine";
import type { LocalMerchant } from "@/lib/merchantData";
import { useVibe } from "@/lib/vibe-context";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "VibePay — Offers" },
      {
        name: "description",
        content:
          "Live merchant offers gated by Payone settlement traffic — only surfaces when shops actually need a boost.",
      },
    ],
  }),
  component: OffersPage,
});

interface MerchantOfferRow {
  merchant: LocalMerchant;
  offer: EvaluatedOffer;
}

function OffersPage() {
  const merchants = useMerchants();
  const { simulatedTime } = useAppContext();
  const { vibe } = useVibe();

  const rows = useMemo<MerchantOfferRow[]>(() => {
    return merchants.map((m) => {
      const ctx = buildOfferContext({
        weatherVibe: vibe === "rainy" ? "rainy" : vibe === "sunny" ? "sunny" : "cloudy",
        isCold: vibe === "rainy" || vibe === "nighttime",
        simulatedTime,
        occupancy: m.occupancy,
      });
      return { merchant: m, offer: evaluateOffer(m, ctx) };
    });
  }, [merchants, simulatedTime, vibe]);

  const liveOffers = rows.filter((r) => r.offer.activationState === "low_traffic");
  const steady = rows.filter((r) => r.offer.activationState === "normal");
  const closed = rows.filter((r) => r.offer.activationState === "target_reached");

  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Live offers</h1>
          <PayoneSeal variant="chip" tone="live" label="Live traffic" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gated by real-time Payone settlements — only shops that need traffic surface here.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            <Zap className="h-2.5 w-2.5" /> {liveOffers.length} live now
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
            <Sparkles className="h-2.5 w-2.5" /> {steady.length} steady
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            <Trophy className="h-2.5 w-2.5" /> {closed.length} day done
          </span>
        </div>
      </header>

      <main className="space-y-6 px-5 pb-6">
        <Section
          title="Live now · low traffic"
          subtitle="These shops are below today's threshold and have asked Mia for a boost."
          tone="live"
          rows={liveOffers}
          empty="Every shop is busy or done for the day — VibePay won't push promos right now."
          showCta
        />

        <Section
          title="Quiet but steady"
          subtitle="Above the threshold but still serving — just a soft greeting, no aggressive promo."
          tone="normal"
          rows={steady}
          empty="No shops in steady mode."
        />

        <Section
          title="Day's goal reached"
          subtitle="These shops already hit their daily target. Mia just sends a hello."
          tone="closed"
          rows={closed}
          empty="No shops have reached their target yet."
        />

        <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3 text-[11px] leading-snug text-muted-foreground">
          <p>
            Live traffic gate keeps the AI quiet when shops don't need help — only the ones below
            their daily threshold surface here.
          </p>
          <div className="mt-2 flex justify-end">
            <PayoneSeal variant="wordmark" />
          </div>
        </div>
      </main>
    </MobileShell>
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  tone: "live" | "normal" | "closed";
  rows: MerchantOfferRow[];
  empty: string;
  showCta?: boolean;
}

const TONE_STYLES: Record<SectionProps["tone"], { border: string; chip: string }> = {
  live: {
    border: "border-emerald-200",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  normal: {
    border: "border-sky-200",
    chip: "border-sky-300 bg-sky-50 text-sky-800",
  },
  closed: {
    border: "border-amber-200",
    chip: "border-amber-300 bg-amber-50 text-amber-800",
  },
};

function Section({ title, subtitle, tone, rows, empty, showCta = false }: SectionProps) {
  const styles = TONE_STYLES[tone];
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ merchant, offer }) => (
            <li key={merchant.id}>
              <OfferRow merchant={merchant} offer={offer} styles={styles} showCta={showCta} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface OfferRowProps {
  merchant: LocalMerchant;
  offer: EvaluatedOffer;
  styles: (typeof TONE_STYLES)[SectionProps["tone"]];
  showCta: boolean;
}

function OfferRow({ merchant, offer, styles, showCta }: OfferRowProps) {
  const stateLabel = STATE_LABEL[offer.activationState];
  return (
    <div className={`block rounded-2xl border bg-card p-3 ${styles.border}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{offer.headline}</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.chip}`}
            >
              {stateLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {merchant.name} · {merchant.signature}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-foreground/80">
            {offer.message}
          </p>
        </div>
        {showCta ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{offer.transactionSummary}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-semibold text-foreground">
          {offer.discount}
        </span>
      </div>
    </div>
  );
}

const STATE_LABEL: Record<ActivationState, string> = {
  low_traffic: "Live · low traffic",
  normal: "Steady",
  target_reached: "Day done",
};
