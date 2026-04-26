import { createFileRoute } from "@tanstack/react-router";
import { format, isToday } from "date-fns";
import {
  Coffee,
  Croissant,
  IceCream,
  type LucideIcon,
  QrCode,
  ShoppingBag,
  Sparkles,
  Train,
  Utensils,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { useAppContext } from "@/lib/app-context";
import { DEMO_MERCHANT_ID, DEMO_STORE } from "@/lib/merchant-demo-profile";
import { DEMO_CONSUMER_ID } from "@/lib/consumerProfileSupabase";
import {
  fetchConsumerLedger,
  fetchMerchantLedger,
  formatEuroFromCents,
  type WalletLedgerRow,
} from "@/lib/walletSupabase";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "VibePay — Activity" },
      {
        name: "description",
        content: "Mia's settlements via Payone Riel — mostly local Stuttgart SMEs.",
      },
    ],
  }),
  component: ActivityPage,
});

type Category = "local-sme" | "transport" | "income" | "subscription";

interface Tx {
  time: string;
  merchant: string;
  detail: string;
  amount: string;
  type: "out" | "in";
  icon: LucideIcon;
  category: Category;
  aiInsight: string;
}

interface TxGroup {
  day: string;
  hint?: string;
  items: Tx[];
}

const TX: TxGroup[] = [
  {
    day: "Today · Tuesday",
    hint: "Last meal · 08:14",
    items: [
      {
        time: "08:14",
        merchant: "Bäckerei Treiber",
        detail: "Laugenbrezel + Filterkaffee · breakfast",
        amount: "-€4.20",
        type: "out",
        icon: Croissant,
        category: "local-sme",
        aiInsight: "Your usual morning stop — better value than the chain nearby.",
      },
      {
        time: "07:48",
        merchant: "VVS Stuttgart",
        detail: "4-Fahrten-Ticket · Zone 1",
        amount: "-€10.40",
        type: "out",
        icon: Train,
        category: "transport",
        aiInsight: "Your Tue/Thu commute line — a monthly pass could save a bit on Vibe rewards.",
      },
    ],
  },
  {
    day: "Yesterday · Monday",
    items: [
      {
        time: "19:35",
        merchant: "Trattoria Marktplatz",
        detail: "Pasta della casa + Hauswein",
        amount: "-€18.50",
        type: "out",
        icon: Utensils,
        category: "local-sme",
        aiInsight: "Another Monday at your favourite trattoria — same family since 1987.",
      },
      {
        time: "12:48",
        merchant: "Café Weinhalle",
        detail: "Espresso + Quiche · Mittagspause",
        amount: "-€7.20",
        type: "out",
        icon: Coffee,
        category: "local-sme",
        aiInsight: "Light lunch again — you often grab this on busy days like today.",
      },
      {
        time: "09:00",
        merchant: "MarketingHaus GmbH",
        detail: "Monthly salary · payroll",
        amount: "+€2,140.00",
        type: "in",
        icon: Wallet,
        category: "income",
        aiInsight: "Salary landed the same way it always does — quick and in full.",
      },
    ],
  },
  {
    day: "This week",
    items: [
      {
        time: "Sun · 16:22",
        merchant: "Walter & Söhne Boutique",
        detail: "Merino wool scarf · winter capsule",
        amount: "-€34.00",
        type: "out",
        icon: ShoppingBag,
        category: "local-sme",
        aiInsight: "Warmer layer for the 11°C walk — a nice Old Town find.",
      },
      {
        time: "Sat · 21:14",
        merchant: "Eiscafé Marktplatz",
        detail: "Stracciatella · evening walk",
        amount: "-€3.80",
        type: "out",
        icon: IceCream,
        category: "local-sme",
        aiInsight: "A soft stop after your evening walk — they know you by now.",
      },
      {
        time: "Mon · 06:00",
        merchant: "Spotify Premium",
        detail: "Recurring subscription",
        amount: "-€9.99",
        type: "out",
        icon: Sparkles,
        category: "subscription",
        aiInsight: "On autopilot since January — no surprises, same as last month.",
      },
    ],
  },
];

interface MerchantInflow {
  time: string;
  merchant: string;
  detail: string;
  amount: string;
  icon: LucideIcon;
}

interface MerchantInflowGroup {
  day: string;
  hint?: string;
  items: MerchantInflow[];
}

const MERCHANT_INFLOW_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50/80 text-emerald-800";

const MERCHANT_TX: MerchantInflowGroup[] = [
  {
    day: "Today · in-store income",
    hint: "Payone Riel · settled",
    items: [
      {
        time: "11:42",
        merchant: "Walk-in · VibePay",
        detail: "Laugen assortment + filter coffee · QR checkout",
        amount: "+€18.60",
        icon: Croissant,
      },
      {
        time: "10:05",
        merchant: "Regular · saved card",
        detail: "Office order · 6x sandwich + pastries",
        amount: "+€47.20",
        icon: Utensils,
      },
      {
        time: "08:51",
        merchant: "Commuter tap",
        detail: "Quick croissant + espresso · contactless",
        amount: "+€6.80",
        icon: Coffee,
      },
      {
        time: "08:14",
        merchant: "VibePay redemption",
        detail: "Offer pulse · breakfast combo",
        amount: "+€4.20",
        icon: QrCode,
      },
    ],
  },
];

const CATEGORY_LABEL: Record<Category, string> = {
  "local-sme": "Local SME",
  transport: "Transport",
  income: "Income",
  subscription: "Subscription",
};

const CATEGORY_TINT: Record<Category, string> = {
  "local-sme": "border-primary/30 bg-primary/5 text-primary",
  transport: "border-border bg-muted text-muted-foreground",
  income: "border-emerald-200 bg-emerald-50 text-emerald-700",
  subscription: "border-border bg-muted text-muted-foreground",
};

function ledgerDetailLines(lineItems: WalletLedgerRow["line_items"]): string {
  return lineItems.map((l) => l.name).join(" · ");
}

function MerchantLiveInflow({ rows }: { rows: WalletLedgerRow[] }) {
  const todayRows = rows.filter((r) => isToday(new Date(r.created_at)));
  if (!todayRows.length) return null;
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Today · VibePay QR checkouts
        </h2>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-800">
          Settled
        </span>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {todayRows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
          >
            <div className={MERCHANT_INFLOW_ICON}>
              <QrCode className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">VibePay · in-store</p>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                  +{formatEuroFromCents(r.amount_cents)}
                </span>
              </div>
              <p className="truncate text-[12px] text-muted-foreground">{ledgerDetailLines(r.line_items)}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[10px] tabular-nums uppercase tracking-wide text-muted-foreground">
                  {format(new Date(r.created_at), "HH:mm")}
                </span>
                <PayoneSeal variant="rail" tone="live" trailing="settled" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiaLiveOutflows({ rows }: { rows: WalletLedgerRow[] }) {
  const todayRows = rows.filter((r) => isToday(new Date(r.created_at)));
  if (!todayRows.length) return null;
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Today · VibePay
        </h2>
        <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">
          Your spend
        </span>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {todayRows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-primary">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{r.merchant_name}</p>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  -{formatEuroFromCents(r.amount_cents)}
                </span>
              </div>
              <p className="truncate text-[12px] text-muted-foreground">{ledgerDetailLines(r.line_items)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {format(new Date(r.created_at), "HH:mm")}
                </span>
                <PayoneSeal variant="rail" tone="live" trailing="Payone Riel" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MerchantActivityPage() {
  const [liveLedger, setLiveLedger] = useState<WalletLedgerRow[]>([]);
  const refreshLedger = useCallback(() => {
    void fetchMerchantLedger(DEMO_MERCHANT_ID, 60).then(setLiveLedger);
  }, []);
  useEffect(() => {
    refreshLedger();
    window.addEventListener("vibepay-balance-changed", refreshLedger);
    return () => window.removeEventListener("vibepay-balance-changed", refreshLedger);
  }, [refreshLedger]);

  const allItems = MERCHANT_TX.flatMap((g) => g.items);
  const totalIn = allItems.reduce(
    (sum, t) => sum + Number.parseFloat(t.amount.replace(/[^\d.]/g, "")),
    0,
  );

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-12 md:px-8 md:pt-8 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {DEMO_STORE.name} — today&apos;s income at your counter.
        </p>
      </header>

      <main className="space-y-4 px-5 pb-8 md:space-y-5 md:px-8 lg:px-10">
        <MerchantLiveInflow rows={liveLedger} />

        {MERCHANT_TX.map((group) => (
          <section key={group.day}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.day}
              </h2>
              {group.hint ? (
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800">
                  {group.hint}
                </span>
              ) : null}
            </div>

            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {group.items.map((t, idx) => {
                const Icon = t.icon;
                return (
                  <li
                    key={`${group.day}-${idx}`}
                    className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                  >
                    <div className={MERCHANT_INFLOW_ICON}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{t.merchant}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                          {t.amount}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-muted-foreground">{t.detail}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] tabular-nums uppercase tracking-wide text-muted-foreground">
                          {t.time}
                        </span>
                        <PayoneSeal variant="rail" tone="live" trailing="settled" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 md:px-4 md:py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-900">
              Payone Riel · business rail
            </p>
            <PayoneSeal variant="rail" tone="live" trailing={`${allItems.length} credits`} />
          </div>
          <p className="mt-1 text-[12px] leading-snug text-emerald-950">
            Today&apos;s gross{" "}
            <span className="font-semibold tabular-nums">€{totalIn.toFixed(2)}</span> before fees.
          </p>
        </section>

        <div className="flex justify-end pb-2">
          <PayoneSeal variant="wordmark" />
        </div>
      </main>
    </MobileShell>
  );
}

function MiaActivityPage() {
  const [miaLiveLedger, setMiaLiveLedger] = useState<WalletLedgerRow[]>([]);
  const refreshMiaLedger = useCallback(() => {
    void fetchConsumerLedger(DEMO_CONSUMER_ID, 60).then(setMiaLiveLedger);
  }, []);
  useEffect(() => {
    refreshMiaLedger();
    window.addEventListener("vibepay-balance-changed", refreshMiaLedger);
    return () => window.removeEventListener("vibepay-balance-changed", refreshMiaLedger);
  }, [refreshMiaLedger]);

  const allItems = TX.flatMap((g) => g.items);
  const outflows = allItems.filter((t) => t.type === "out");
  const localSmeOut = outflows.filter((t) => t.category === "local-sme");
  const totalSpent = outflows.reduce(
    (sum, t) => sum + Number.parseFloat(t.amount.replace(/[^\d.]/g, "")),
    0,
  );

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-12">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">What went in and out of your wallet.</p>
      </header>

      <main className="space-y-5 px-5 pb-8">
        <MiaLiveOutflows rows={miaLiveLedger} />

        {TX.map((group) => (
          <section key={group.day}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.day}
              </h2>
              {group.hint ? (
                <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                  {group.hint}
                </span>
              ) : null}
            </div>

            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {group.items.map((t, idx) => {
                const Icon = t.icon;
                return (
                  <li
                    key={`${group.day}-${idx}`}
                    className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${CATEGORY_TINT[t.category]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {t.merchant}
                        </p>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            t.type === "in" ? "text-emerald-600" : "text-foreground"
                          }`}
                        >
                          {t.amount}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-muted-foreground">{t.detail}</p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t.time}
                        </span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${CATEGORY_TINT[t.category]}`}
                        >
                          {CATEGORY_LABEL[t.category]}
                        </span>
                        <PayoneSeal variant="rail" tone="default" />
                      </div>

                      <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2 py-1">
                        <Sparkles className="mt-px h-3 w-3 shrink-0 text-primary" />
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {t.aiInsight}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-900">
              Payone Riel
            </p>
            <PayoneSeal variant="rail" tone="live" trailing={`${outflows.length} payments`} />
          </div>
          <p className="mt-1 text-[12px] leading-snug text-emerald-950">
            All of the above clear on <span className="font-semibold">Payone Riel</span> (instant, same rail as in Home).
          </p>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Right now
          </p>
          <p className="mt-1 text-[13px] leading-snug text-foreground">
            Chilly walk in the Old Town — a warm stop nearby might fit the rest of your day.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-medium text-primary">
              Tue ~14:30
            </span>
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-medium text-primary">
              ~12 min free
            </span>
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-medium text-primary">
              11 °C · overcast
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-[12px] text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">This week</span> · outflows on this list
            <span className="font-semibold text-foreground"> €{totalSpent.toFixed(2)}</span> ·{" "}
            <span className="text-foreground">{localSmeOut.length}</span> to local independents
          </p>
          <div className="mt-2 flex justify-end">
            <PayoneSeal variant="wordmark" />
          </div>
        </section>
      </main>
    </MobileShell>
  );
}

function ActivityPage() {
  const { appPersona } = useAppContext();
  if (appPersona === "merchant") {
    return <MerchantActivityPage />;
  }
  return <MiaActivityPage />;
}
