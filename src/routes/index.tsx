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
  Coffee,
  Briefcase,
  TrainFront,
  ShoppingBag,
  Pizza,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { VibeCard } from "@/components/vibe-card";
import { useVibe } from "@/lib/vibe-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibePay — Santander Pulse" },
      {
        name: "description",
        content:
          "VibePay by Santander — a context-aware mobile dashboard that adapts to the city's pulse.",
      },
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

type Tx = {
  name: string;
  sub: string;
  amt: string;
  icon: LucideIcon;
  positive?: boolean;
};

const TRANSACTIONS: Tx[] = [
  { name: "La Central", sub: "Today · 14:02", amt: "-£3.40", icon: Coffee },
  { name: "Salary · Ada Ltd", sub: "Yesterday", amt: "+£2,140.00", icon: Briefcase, positive: true },
  { name: "TfL Travel", sub: "Mon · 09:14", amt: "-£6.80", icon: TrainFront },
  { name: "Gelatto", sub: "Sun · 17:48", amt: "-£4.20", icon: ShoppingBag },
  { name: "Stadium Kiosk", sub: "Sat · 20:31", amt: "-£12.50", icon: Pizza },
];

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
          <button
            className="relative rounded-full bg-white/15 p-2.5"
            aria-label="Notifications"
          >
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
              aria-label="Toggle balance visibility"
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
            <p className="text-xs text-muted-foreground capitalize">
              City Pulse · {vibe}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Vibe Engine
          </span>
        </div>

        <VibeCard vibe={vibe} />

        {/* Recent transactions */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Recent transactions</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Secured by Payone
            </span>
          </div>

          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {TRANSACTIONS.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.li
                  key={t.name + i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        t.positive ? "bg-accent text-primary" : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">{t.sub}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-2.5 w-2.5 text-primary" />
                          Settled via Payone
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.positive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {t.amt}
                  </span>
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Every VibePay transaction is securely settled via{" "}
            <span className="font-semibold text-foreground">Payone</span>.
          </p>
        </section>
      </main>
    </MobileShell>
  );
}
