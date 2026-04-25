import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "VibePay — Activity" },
      { name: "description", content: "Your transactions and cashback history." },
    ],
  }),
  component: ActivityPage,
});

const TX = [
  { day: "Today", items: [
    { name: "Cafe X", sub: "Hot chocolate · Vibe redeem", amt: "-£1.70", inc: false, tag: "Saved £1.70" },
    { name: "TfL Travel", sub: "Bus journey", amt: "-£1.75", inc: false },
  ]},
  { day: "Yesterday", items: [
    { name: "Salary · Ada Ltd", sub: "Monthly payroll", amt: "+£2,140.00", inc: true },
    { name: "Shop Y Coffee", sub: "Iced latte · Vibe redeem", amt: "Free", inc: false, tag: "Saved £4.20" },
  ]},
  { day: "This week", items: [
    { name: "Riverside Live", sub: "Festival fast-pass", amt: "-£18.00", inc: false, tag: "Cashback +£3.00" },
    { name: "Luna Pizzeria", sub: "Late slice", amt: "-£2.00", inc: false },
  ]},
];

function ActivityPage() {
  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You've saved <span className="font-semibold text-primary">£9.20</span> this month with
          Vibe Card.
        </p>
      </header>

      <main className="px-5 space-y-6">
        {TX.map((group) => (
          <section key={group.day}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.day}
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {group.items.map((t) => (
                <li
                  key={t.name + t.sub}
                  className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        t.inc ? "bg-accent text-primary" : "bg-muted text-foreground"
                      }`}
                    >
                      {t.inc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                      {t.tag && (
                        <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                          {t.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      t.inc ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {t.amt}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </MobileShell>
  );
}
