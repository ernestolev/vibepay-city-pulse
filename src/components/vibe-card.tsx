import { motion } from "framer-motion";
import { ChevronRight, MapPin, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { VIBES, type VibeKey } from "@/lib/vibe";

const patternClass: Record<string, string> = {
  dots: "vibe-pattern-dots",
  rain: "vibe-pattern-rain",
  stars: "vibe-pattern-stars",
  confetti: "vibe-pattern-confetti",
};

export function VibeCard({ vibe }: { vibe: VibeKey }) {
  const offer = VIBES[vibe];
  const Icon = offer.icon;
  const Weather = offer.weatherIcon;

  return (
    <motion.div
      key={vibe}
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <div className="vibe-glass relative overflow-hidden rounded-3xl p-6 text-[color:var(--vibe-text)]">
        <div className={`absolute inset-0 opacity-60 ${patternClass[offer.pattern]}`} />

        {/* Floating accent blob */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--vibe-accent) 70%, transparent)" }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
            <Weather className="h-3.5 w-3.5" />
            <span>{offer.weatherLabel}</span>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
            Vibe Card
          </div>
        </div>

        <p className="relative z-10 mt-5 text-sm font-medium text-[color:var(--vibe-muted)]">
          {offer.tagline}
        </p>

        <div className="relative z-10 mt-2 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold leading-tight tracking-tight">{offer.title}</h3>
            <p className="mt-1 text-sm text-[color:var(--vibe-muted)]">{offer.merchant}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[color:var(--vibe-bg-to)]">
            {offer.discount}
          </span>
          <span className="rounded-full border border-white/25 px-3 py-1 text-xs font-medium">
            {offer.cashback}
          </span>
        </div>

        <div className="relative z-10 mt-5 flex items-center justify-between text-xs text-[color:var(--vibe-muted)]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {offer.distance}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {offer.expires}
          </span>
        </div>

        <Link
          to="/offer/$offerId"
          params={{ offerId: offer.id }}
          className="relative z-10 mt-5 flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-[color:var(--vibe-bg-to)] shadow-lg shadow-black/10 transition active:scale-[0.98]"
        >
          <span>Redeem now</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
