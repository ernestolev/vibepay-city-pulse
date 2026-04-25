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
  Sun,
  CloudRain,
  Trophy,
  Moon,
  X,
} from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileShell } from "@/components/mobile-shell";
import { getContextualOffer } from "@/lib/vibeEngine";

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
  const [currentVibe, setCurrentVibe] = useState("sunny");
  const [showBalance, setShowBalance] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const offer = getContextualOffer(currentVibe);
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

  return (
    <MobileShell>
      {/* Header */}
      <header className="bg-primary px-5 pb-10 pt-12 text-primary-foreground rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              AM
            </div>
            <div>
              <p className="text-xs/4 opacity-80">Good afternoon,</p>
              <p className="text-sm font-semibold">Alex Morgan</p>
            </div>
          </div>
          <button className="relative rounded-full bg-white/15 p-2.5">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white" />
          </button>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <span>Current balance</span>
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label="Toggle balance"
            >
              {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {showBalance ? "£4,287.50" : "£ ••••••"}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80">•••• 4421 · Santander Edge</p>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {QUICK.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/12 px-2 py-3 text-[11px] font-medium backdrop-blur transition active:scale-95"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pb-28 pt-6">
        {/* Vibe Card section */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">For you, right now</h2>
            <p className="text-xs text-muted-foreground">Context: {currentVibe}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase text-accent-foreground">
            <Sparkles className="h-3 w-3" /> GenUI
          </span>
        </div>

        <button
          onClick={() => setIsQrOpen(true)}
          className="rounded-3xl p-5 text-white shadow-lg transition-colors duration-500"
          style={{ backgroundColor: offer.themeColor }}
          aria-label="Open offer QR code"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
            Santander Pulse Offer
          </p>
          <h3 className="mt-2 text-xl font-bold leading-tight">{offer.title}</h3>
          <p className="mt-2 text-sm text-white/90">{offer.description}</p>
          <div className="mt-4 inline-flex items-center rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            {offer.discount}
          </div>
        </button>

        {/* Recent activity preview */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Recent activity</h2>
            <button className="text-xs font-semibold text-primary">See all</button>
          </div>

          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {[
              { name: "Cafe X", sub: "Today · 14:02", amt: "-£3.40", warm: true },
              { name: "Salary · Ada Ltd", sub: "Yesterday", amt: "+£2,140.00", warm: false },
              { name: "TfL Travel", sub: "Mon · 09:14", amt: "-£6.80", warm: true },
            ].map((t, i) => (
              <motion.li
                key={t.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold">
                    {t.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.sub}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    t.warm ? "text-foreground" : "text-primary"
                  }`}
                >
                  {t.amt}
                </span>
              </motion.li>
            ))}
          </ul>
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-2 shadow-xl backdrop-blur">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Simulate City Pulse
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setCurrentVibe("sunny")}
              className={`flex items-center justify-center rounded-xl py-2 transition ${
                currentVibe === "sunny" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
              aria-label="Set sunny vibe"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentVibe("rainy")}
              className={`flex items-center justify-center rounded-xl py-2 transition ${
                currentVibe === "rainy" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
              aria-label="Set rainy vibe"
            >
              <CloudRain className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentVibe("event")}
              className={`flex items-center justify-center rounded-xl py-2 transition ${
                currentVibe === "event" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
              aria-label="Set event vibe"
            >
              <Trophy className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentVibe("night")}
              className={`flex items-center justify-center rounded-xl py-2 transition ${
                currentVibe === "night" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
              aria-label="Set night vibe"
            >
              <Moon className="h-4 w-4" />
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
              className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Scan to redeem</p>
                <button
                  onClick={() => setIsQrOpen(false)}
                  className="rounded-full bg-muted p-2 text-muted-foreground transition hover:text-foreground"
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
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Simulated by Payone
                </span>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MobileShell>
  );
}
