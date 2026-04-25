import { createFileRoute } from "@tanstack/react-router";
import { Bell, Eye, EyeOff, Plus, Send, ArrowDownLeft, QrCode, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { MobileShell } from "@/components/mobile-shell";
import { VibeCard } from "@/components/vibe-card";
import { useVibe } from "@/lib/vibe-context";

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
  const { vibe } = useVibe();
  const [showBalance, setShowBalance] = useState(true);

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

      <main className="px-5 pt-6">
        {/* Vibe Card section */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">For you, right now</h2>
            <p className="text-xs text-muted-foreground">Context: {vibe}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase text-accent-foreground">
            <Sparkles className="h-3 w-3" /> GenUI
          </span>
        </div>

        <VibeCard vibe={vibe} />

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
    </MobileShell>
  );
}
