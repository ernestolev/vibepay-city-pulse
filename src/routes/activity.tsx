import { createFileRoute } from "@tanstack/react-router";
import {
  Coffee,
  Croissant,
  IceCream,
  type LucideIcon,
  ShoppingBag,
  Sparkles,
  Train,
  Utensils,
  Wallet,
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";

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
        aiInsight:
          "You're a 4-mornings-a-week regular here — about €18/mo cheaper than the chain across the street.",
      },
      {
        time: "07:48",
        merchant: "VVS Stuttgart",
        detail: "4-Fahrten-Ticket · Zone 1",
        amount: "-€10.40",
        type: "out",
        icon: Train,
        category: "transport",
        aiInsight:
          "Same 7:45 line every Tue/Thu. A monthly pass would unlock ≈€4.10 in Vibe rewards.",
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
        aiInsight:
          "Fourth Monday-night Italian this winter. Family-run since 1987 — your spend keeps them open.",
      },
      {
        time: "12:48",
        merchant: "Café Weinhalle",
        detail: "Espresso + Quiche · Mittagspause",
        amount: "-€7.20",
        type: "out",
        icon: Coffee,
        category: "local-sme",
        aiInsight:
          "You repeat this Mittagspause when you skip a real lunch — the pattern matches today's hunger signal.",
      },
      {
        time: "09:00",
        merchant: "MarketingHaus GmbH",
        detail: "Monthly salary · payroll",
        amount: "+€2,140.00",
        type: "in",
        icon: Wallet,
        category: "income",
        aiInsight:
          "Salary cleared in 0.4 s via Payone Riel — same morning window, six months running.",
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
        aiInsight:
          "First wool purchase of the season — and it's why today's 11°C feels manageable. Old Town SME score: +1.",
      },
      {
        time: "Sat · 21:14",
        merchant: "Eiscafé Marktplatz",
        detail: "Stracciatella · evening walk",
        amount: "-€3.80",
        type: "out",
        icon: IceCream,
        category: "local-sme",
        aiInsight:
          "22% of your weekend evenings end here — the owner already knows your usual.",
      },
      {
        time: "Mon · 06:00",
        merchant: "Spotify Premium",
        detail: "Recurring subscription",
        amount: "-€9.99",
        type: "out",
        icon: Sparkles,
        category: "subscription",
        aiInsight:
          "Auto-renewed at €9.99 — €0 surprises since January. Want VibePay to test a family-plan switch?",
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

function ActivityPage() {
  const allItems = TX.flatMap((g) => g.items);
  const outflows = allItems.filter((t) => t.type === "out");
  const localSmeOut = outflows.filter((t) => t.category === "local-sme");
  const totalSpent = outflows.reduce(
    (sum, t) => sum + Number.parseFloat(t.amount.replace(/[^\d.]/g, "")),
    0,
  );

  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Mia · 28 · Marketing · Stuttgart Old Town
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{localSmeOut.length}</span> of{" "}
          <span className="font-semibold text-foreground">{outflows.length}</span> settlements went
          to local SMEs this week — all routed through{" "}
          <span className="font-semibold text-primary">Payone Riel</span>.
        </p>
      </header>

      <main className="space-y-5 px-5 pb-8">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-900">
              Wallet rail
            </p>
            <PayoneSeal variant="rail" tone="live" trailing={`${outflows.length} txns today`} />
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-emerald-950">
            Every settlement on this screen — incoming or outgoing — clears in under a second through{" "}
            <span className="font-semibold">Payone Riel</span>, DSV Gruppe's instant-settlement rail.
            The same rail that gates Mia's live offers when shops actually need traffic.
          </p>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Wallet insight · live context
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-foreground">
            Last meal: <span className="font-semibold">breakfast at 08:14</span>. It's now mid-afternoon
            and Mia is walking through Old Town at 11&nbsp;°C — VibePay flagged hunger plus the cold
            front and is surfacing nearby family-run cafés in the Vibe Card.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Tuesday · 14:30
            </span>
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              12 min free window
            </span>
            <span className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              11 °C · overcast
            </span>
          </div>
        </section>

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

                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1.5">
                        <Sparkles className="mt-[1px] h-3 w-3 shrink-0 text-primary" />
                        <p className="text-[11px] italic leading-snug text-muted-foreground">
                          <span className="font-semibold not-italic text-primary">Vibe insight · </span>
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

        <section className="rounded-2xl border border-border bg-surface px-4 py-3 text-[12px] leading-snug text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">System</span> · This week VibePay routed
            <span className="font-semibold text-primary"> €{totalSpent.toFixed(2)}</span> across{" "}
            {outflows.length} settlements. {localSmeOut.length} of them stayed inside the Old Town
            economy with independent merchants — the difference DSV Gruppe is built for.
          </p>
          <div className="mt-2 flex justify-end">
            <PayoneSeal variant="wordmark" />
          </div>
        </section>
      </main>
    </MobileShell>
  );
}
