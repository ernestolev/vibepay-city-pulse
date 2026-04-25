import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Eye,
  EyeOff,
  Plus,
  Send,
  ArrowDownLeft,
  QrCode,
  Sparkles,
  X,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileShell } from "@/components/mobile-shell";
import { getContextualOffer } from "@/lib/vibeEngine";
import { getCityVibe, type CityVibe } from "@/lib/tavilyService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibePay — Home" },
      { name: "description", content: "Your VibePay dashboard with live, context-aware offers." },
    ],
  }),
  component: HomePage,
});

const QUICK = [
  { label: "Send", icon: Send },
  { label: "Request", icon: ArrowDownLeft },
  { label: "Top up", icon: Plus },
  { label: "Pay QR", icon: QrCode },
] as const;

function HomePage() {
  const DEFAULT_PDF_PULSE: CityVibe = {
    city: "Stuttgart, Germany",
    weather: "cloudy",
    temperatureC: 11,
    topEvent: "No major nearby event detected",
    cafeName: "Kaffeehaus Altstadt",
    recommendation:
      "Cold vibe detected (11°C overcast): prioritize a warm and cozy coffee journey near Stuttgart Old Town.",
  };

  const [currentVibe, setCurrentVibe] = useState("clear");
  const [showBalance, setShowBalance] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isScanningPulse, setIsScanningPulse] = useState(true);
  const [pulseEvent, setPulseEvent] = useState<string | null>(null);
  const [cityPulse, setCityPulse] = useState<CityVibe>(DEFAULT_PDF_PULSE);
  const offer = getContextualOffer(currentVibe);
  const vibeVisual = {
    clear: {
      borderColor: "#8FA8C7",
      accentText: "Warm & Cozy | Stuttgart Old Town",
    },
    rainy: {
      borderColor: "#1EA7FF",
      accentText: "Vibe: Lluvia | Café -15%",
    },
    sunny: {
      borderColor: "#FFD84D",
      accentText: "Vibe: Sol | Cashback Activo",
    },
    event: {
      borderColor: "#EC0000",
      accentText: "Vibe: Evento | Acceso VIP",
    },
  } as const;
  const activeVibe = (currentVibe in vibeVisual ? currentVibe : "clear") as keyof typeof vibeVisual;
  const qrCells = Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const finder =
      (row < 3 && col < 3) ||
      (row < 3 && col > 5) ||
      (row > 5 && col < 3);
    const pattern = (row * 3 + col * 5 + currentVibe.length) % 4 === 0;
    return finder || pattern;
  });
  const activeCardStyle = {
    borderColor: vibeVisual[activeVibe].borderColor,
    boxShadow:
      activeVibe === "clear"
        ? "0 10px 26px rgba(120, 146, 178, 0.24)"
        : isQrOpen
          ? `0 8px 24px color-mix(in srgb, ${vibeVisual[activeVibe].borderColor} 20%, transparent)`
          : "none",
  };

  useEffect(() => {
    let isMounted = true;

    const syncCityPulse = async () => {
      setIsScanningPulse(true);
      const cityPulse = await getCityVibe("Stuttgart, Germany", "cold");
      if (!isMounted) return;

      const hasEvent =
        cityPulse.topEvent &&
        cityPulse.topEvent.toLowerCase() !== "no major nearby event detected";

      if (hasEvent) {
        setCurrentVibe("event");
      } else if (cityPulse.weather === "rainy") {
        setCurrentVibe("rainy");
      } else if (cityPulse.weather === "sunny") {
        setCurrentVibe("sunny");
      } else {
        setCurrentVibe("clear");
      }

      setCityPulse(cityPulse);
      setPulseEvent(cityPulse.topEvent);
      setIsScanningPulse(false);
    };

    void syncCityPulse();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MobileShell>
      <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-4 mt-4 rounded-3xl border border-border bg-surface px-5 pb-8 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
              <Waves className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mia&apos;s Wallet</p>
              <p className="text-sm font-semibold text-foreground">Marketing Professional | Stuttgart</p>
            </div>
          </div>
          <button className="relative rounded-full border border-border bg-surface p-2.5">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Current balance</span>
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="Toggle balance"
            >
              {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
              {showBalance ? "€4,287.50" : "€ ••••••"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">•••• 4421 · VibePay</p>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {QUICK.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-[11px] font-medium transition hover:bg-muted active:scale-95"
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pb-28 pt-6">
        {isScanningPulse ? (
          <div className="mb-4 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs text-primary shadow-[0_0_12px_rgba(34,197,94,0.18)]">
            Scanning City Pulse via Tavily AI...
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">For you, right now</h2>
            <p className="text-xs text-muted-foreground">Context: {currentVibe}</p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{ color: vibeVisual[activeVibe].borderColor }}
          >
            <Sparkles className="h-3 w-3" /> Vibe Engine
          </span>
        </div>

        <button
          onClick={() => setIsQrOpen(true)}
          className="w-full rounded-3xl border bg-surface p-5 text-left text-foreground transition-all duration-300"
          style={activeCardStyle}
          aria-label="Open offer QR code"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            VibePay Pulse Offer
          </p>
          <h3 className="mt-2 text-xl font-bold leading-tight">{offer.title}</h3>
          {activeVibe === "clear" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Stuttgart Old Town Special: Freshly brewed Coffee at {cityPulse.cafeName} - 20% off for the next
              15 mins. (Redeem via Payone)
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>
          )}
          <div
            className="mt-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold"
            style={{ color: vibeVisual[activeVibe].borderColor }}
          >
            {vibeVisual[activeVibe].accentText}
          </div>
          {activeVibe === "clear" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {cityPulse.city} | {cityPulse.temperatureC}°C | Overcast (Cold Vibe)
            </p>
          ) : null}
          {pulseEvent ? <p className="mt-3 text-xs text-muted-foreground">Live event: {pulseEvent}</p> : null}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Verified context via Tavily Search &amp; Settled via Payone Riel
          </p>
        </button>

        <section className="mt-7 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Activity</h2>
          </div>

          <ul className="divide-y divide-border">
            {[
              { name: "Warm Winter Scarf", amount: "-€22.00", meta: "Today" },
              { name: "Design Bookshelf", amount: "-€45.00", meta: "Yesterday" },
              { name: "Local Bakery", amount: "-€6.50", meta: "Yesterday" },
            ].map((tx, i) => (
              <motion.li
                key={tx.name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.meta}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-foreground">{tx.amount}</span>
                  <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                    Settled via Payone Riel
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>

          <div className="border-t border-border px-4 py-3">
            <p className="rounded-lg border border-primary/25 bg-muted px-3 py-2 text-[12px] text-foreground">
              Insight: Mia, it&apos;s 11°C and you&apos;re moving slowly through Old Town. A café 80m away just
              brewed fresh coffee and is currently quiet. Want to warm up?
            </p>
          </div>

          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            System: Optimization successful. Payone settled €3.50 in rewards this week.
          </p>
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-surface p-2">
          <div className="flex items-center justify-center gap-2 py-1">
            <button
              onClick={() => setCurrentVibe("sunny")}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                currentVibe === "sunny" ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Set sunny vibe"
            >
              [ SUN ]
            </button>
            <button
              onClick={() => setCurrentVibe("rainy")}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                currentVibe === "rainy" ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Set rainy vibe"
            >
              [ RAIN ]
            </button>
            <button
              onClick={() => setCurrentVibe("event")}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                currentVibe === "event" ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Set event vibe"
            >
              [ EVENT ]
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isQrOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4"
            onClick={() => setIsQrOpen(false)}
          >
            <motion.section
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Scan to redeem</p>
                <button
                  onClick={() => setIsQrOpen(false)}
                  className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:text-foreground"
                  aria-label="Close QR modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mx-auto mb-4 grid w-48 grid-cols-9 gap-1 rounded-2xl bg-white p-3">
                {qrCells.map((filled, idx) => (
                  <div key={idx} className={`h-4 w-4 rounded-[2px] ${filled ? "bg-black" : "bg-white"}`} />
                ))}
              </div>

              <p className="text-center text-sm font-medium text-foreground">
                Pay with VibePay at {offer.merchantName} to redeem your {offer.discount}.
              </p>

              <div className="mt-5 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3 w-3" />
                  Simulated by Payone
                </span>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </MobileShell>
  );
}
