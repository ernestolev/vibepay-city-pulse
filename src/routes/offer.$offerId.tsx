import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Clock,
  BadgeCheck,
  ShieldCheck,
  Store,
  CalendarClock,
  Eye,
  Activity,
  Share2,
  Pencil,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { VIBES } from "@/lib/vibe";
import { useVibe } from "@/lib/vibe-context";
import { OFFER_CONVERSION, formatCurrency } from "@/lib/business-data";

export const Route = createFileRoute("/offer/$offerId")({
  head: ({ params }) => {
    const offer = Object.values(VIBES).find((o) => o.id === params.offerId);
    return {
      meta: [
        { title: offer ? `${offer.title} — VibePay` : "Offer — VibePay" },
        {
          name: "description",
          content: offer?.description ?? "Redeem your VibePay offer.",
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold">Offer not found</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary">Go home</Link>
      </div>
    </div>
  ),
  component: OfferPage,
});

function OfferPage() {
  const { offerId } = Route.useParams();
  const { businessOffers } = useVibe();
  const personalOffer = Object.values(VIBES).find((item) => item.id === offerId);
  const businessOffer = businessOffers.find((item) => item.id === offerId);

  if (!personalOffer && !businessOffer) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-semibold">Offer not found</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (businessOffer) {
    const conversionRate =
      OFFER_CONVERSION.views > 0 ? (OFFER_CONVERSION.redeemed / OFFER_CONVERSION.views) * 100 : 0;
    const estimatedRevenue = OFFER_CONVERSION.redeemed * 9.2;

    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
          <header className="px-5 pt-12 pb-3">
            <div className="flex items-center justify-between">
              <Link
                to="/offers"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Business offer
              </span>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
                aria-label="Share offer"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="px-5 pb-6">
            <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-80">{businessOffer.merchant}</p>
                  <h1 className="mt-1 text-2xl font-bold leading-tight break-words">
                    {businessOffer.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary">
                      {businessOffer.discount}
                    </span>
                    <span className="rounded-full border border-white/30 px-3 py-1 text-[11px] uppercase tracking-wide">
                      {businessOffer.status}
                    </span>
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-primary-foreground">
                  <Store className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-primary-foreground/90">
                {businessOffer.description}
              </p>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <InfoTile icon={Clock} title="Starts at" value={businessOffer.startsAt} />
              <InfoTile icon={CalendarClock} title="Duration" value={`${businessOffer.durationHours}h`} />
              <InfoTile icon={MapPin} title="Visibility" value={businessOffer.distance} />
              <InfoTile icon={Activity} title="Ends" value={businessOffer.expires.replace("Ends ", "")} />
            </section>

            <section className="mt-5 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Performance so far</h2>
              <p className="text-xs text-muted-foreground">Live metrics for this campaign</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <PerfStat label="Views" value={`${OFFER_CONVERSION.views}`} icon={Eye} />
                <PerfStat label="Redeemed" value={`${OFFER_CONVERSION.redeemed}`} icon={BadgeCheck} />
                <PerfStat label="Conversion" value={`${conversionRate.toFixed(0)}%`} icon={Activity} />
              </div>
              <div className="mt-4 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                Estimated revenue from this offer:{" "}
                <span className="font-semibold text-foreground">{formatCurrency(estimatedRevenue)}</span>
              </div>
            </section>

            <div className="mt-6 space-y-2">
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.99]">
                <Pencil className="h-4 w-4" /> Edit offer
              </button>
              <Link
                to="/offers"
                className="block w-full rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold"
              >
                Back to offers
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const offer = personalOffer;
  const Icon = offer.icon;
  const code = `VIBE-${offer.id.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return (
    <div data-vibe={offer.vibe} className="min-h-screen bg-surface">
      <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
        {/* Vibe-themed header */}
        <motion.header
          layout
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="vibe-glass relative overflow-hidden rounded-b-[2rem] px-5 pb-8 pt-12 text-[color:var(--vibe-text)]"
        >
          <div className="absolute inset-0 vibe-pattern-dots opacity-40" />
          <div className="relative flex items-center justify-between">
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
              Vibe Redemption
            </span>
            <div className="h-10 w-10" />
          </div>

          <div className="relative mt-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[color:var(--vibe-muted)]">{offer.merchant}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{offer.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[color:var(--vibe-bg-to)]">
                  {offer.discount}
                </span>
                <span className="rounded-full border border-white/25 px-3 py-1 text-xs">
                  {offer.cashback}
                </span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon className="h-7 w-7" />
            </div>
          </div>
        </motion.header>

        <main className="px-5">
          {/* QR card */}
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="-mt-6 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5"
          >
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Show this at the till
            </p>
            <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow-inner ring-1 ring-border">
              <QRCodeSVG
                value={code}
                size={196}
                bgColor="#ffffff"
                fgColor="#111111"
                level="M"
                marginSize={0}
              />
            </div>
            <p className="mt-4 text-center font-mono text-sm font-semibold tracking-widest">
              {code}
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secure single-use code · Refreshes in 5:00
            </div>
          </motion.section>

          {/* Details */}
          <section className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm leading-relaxed">{offer.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoTile icon={MapPin} title="Location" value={offer.distance} />
              <InfoTile icon={Clock} title="Valid for" value={offer.expires} />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Cashback automatic</p>
                <p className="text-xs text-muted-foreground">
                  Credited to your Santander Edge account within 24h.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="mt-6 space-y-2">
            <button className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.99]">
              I'm at the merchant
            </button>
            <Link
              to="/"
              className="block w-full rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold"
            >
              Save for later
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof MapPin;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function PerfStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background py-3">
      <div className="flex items-center justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
