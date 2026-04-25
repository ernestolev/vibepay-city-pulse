import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { VIBES, VIBE_ORDER } from "@/lib/vibe";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "VibePay — Offers" },
      { name: "description", content: "Browse all live offers tailored to your context." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12">
        <h1 className="text-2xl font-bold tracking-tight">Live offers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated by VibePay based on weather, time and location.
        </p>
      </header>

      <main className="px-5 pb-6">
        <ul className="space-y-3">
          {VIBE_ORDER.map((key) => {
            const o = VIBES[key];
            const Icon = o.icon;
            return (
              <li key={o.id}>
                <Link
                  to="/offer/$offerId"
                  params={{ offerId: o.id }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
                >
                  <div
                    data-vibe={key}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--vibe-bg-from), var(--vibe-bg-to))",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{o.title}</p>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                        {o.discount}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.merchant} · {o.distance}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{o.expires}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </MobileShell>
  );
}
