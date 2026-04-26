import type { ReactNode } from "react";

/**
 * Single source of truth for the Payone (DSV Gruppe) wordmark in the app.
 * Use this anywhere you'd otherwise type "Powered by Payone" by hand —
 * keeps colour, weight and spacing consistent for the demo's narrative.
 */

export type PayoneSealVariant = "chip" | "wordmark" | "rail";
export type PayoneSealTone = "default" | "muted" | "live";

interface PayoneSealProps {
  variant?: PayoneSealVariant;
  tone?: PayoneSealTone;
  label?: string;
  showDsv?: boolean;
  trailing?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

const TONE_CLASSES: Record<PayoneSealTone, string> = {
  default: "border-emerald-300 bg-emerald-50 text-emerald-900",
  muted: "border-border bg-muted/60 text-muted-foreground",
  live: "border-emerald-400 bg-emerald-100 text-emerald-900",
};

export function PayoneSeal({
  variant = "chip",
  tone = "default",
  label,
  showDsv = true,
  trailing,
  className = "",
  ariaLabel,
}: PayoneSealProps) {
  if (variant === "wordmark") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground ${className}`}
        aria-label={ariaLabel ?? "Powered by Payone, a DSV Gruppe service"}
      >
        <PayoneDot tone={tone} />
        <span>{label ?? "Built on"}</span>
        <span className="font-bold tracking-[0.22em] text-foreground">PAYONE</span>
        {showDsv ? (
          <span className="text-muted-foreground/80">· DSV Gruppe</span>
        ) : null}
      </span>
    );
  }

  if (variant === "rail") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
        aria-label={ariaLabel ?? "Settled via Payone Riel"}
      >
        <PayoneDot tone={tone} />
        <span className="font-bold tracking-[0.18em]">PAYONE</span>
        <span className="opacity-80">Riel</span>
        {trailing ? <span className="opacity-90">· {trailing}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
      aria-label={ariaLabel ?? "Powered by Payone"}
    >
      <PayoneDot tone={tone} />
      {label ?? "Powered by Payone"}
      {showDsv ? <span className="font-medium opacity-80">· DSV Gruppe</span> : null}
    </span>
  );
}

function PayoneDot({ tone }: { tone: PayoneSealTone }) {
  const dotColor = tone === "muted" ? "bg-muted-foreground" : "bg-emerald-500";
  return (
    <span className="relative flex h-1.5 w-1.5" aria-hidden>
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColor}`}
      />
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`}
      />
    </span>
  );
}
