import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, MapPin, Shield, X, Clock } from "lucide-react";
import type { VibeOffer } from "@/lib/vibe";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: VibeOffer;
};

const patternClass: Record<string, string> = {
  dots: "vibe-pattern-dots",
  rain: "vibe-pattern-rain",
  confetti: "vibe-pattern-confetti",
};

export function QrModal({ open, onOpenChange, offer }: Props) {
  const Icon = offer.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            aria-hidden
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Redeem ${offer.title} at ${offer.merchant}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border">
              {/* Branded header */}
              <div
                className={`vibe-glass relative overflow-hidden p-5 text-[color:var(--vibe-text)]`}
              >
                <div className={`absolute inset-0 opacity-60 ${patternClass[offer.pattern]}`} />
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
                  style={{ background: "color-mix(in oklab, var(--vibe-accent) 70%, transparent)" }}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--vibe-muted)]">
                        {offer.brand}
                      </p>
                      <h2 className="text-xl font-bold leading-tight">{offer.title}</h2>
                      <p className="text-xs text-[color:var(--vibe-muted)]">at {offer.merchant}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="rounded-full bg-white/20 p-2 text-[color:var(--vibe-text)] backdrop-blur transition active:scale-95"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* QR + meta */}
              <div className="bg-card p-5">
                <div className="mx-auto flex w-full max-w-[260px] flex-col items-center">
                  <div className="relative rounded-3xl bg-background p-4 ring-1 ring-border shadow-sm">
                    <QRCodeSVG
                      value={offer.redemptionCode}
                      size={208}
                      level="H"
                      includeMargin={false}
                      bgColor="transparent"
                      fgColor="oklch(0.18 0.01 270)"
                      imageSettings={{
                        src:
                          "data:image/svg+xml;utf8," +
                          encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%23EC0000'/><text x='32' y='40' text-anchor='middle' font-family='Inter, system-ui, sans-serif' font-weight='800' font-size='22' fill='white'>VP</text></svg>`,
                          ),
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-center text-[11px] font-mono tracking-tight text-muted-foreground break-all">
                    {offer.redemptionCode}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{offer.distance}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{offer.expires}</span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {offer.description}
                </p>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Settled via Payone</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Encrypted
                  </span>
                </div>

                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-5 w-full rounded-2xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition active:scale-[0.99]"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
