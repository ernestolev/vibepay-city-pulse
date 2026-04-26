import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Store } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { VIBES, VIBE_ORDER } from "@/lib/vibe";
import { useVibe } from "@/lib/vibe-context";
import { type NewBusinessOfferInput } from "@/lib/business-data";

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
  const { accountMode, businessOffers, createBusinessOffer } = useVibe();
  const isBusinessMode = accountMode === "business";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NewBusinessOfferInput>({
    title: "",
    description: "",
    discount: "",
    durationHours: 2,
  });

  const handleCreateOffer = () => {
    if (!form.title.trim() || !form.description.trim() || !form.discount.trim()) return;
    createBusinessOffer({
      title: form.title.trim(),
      description: form.description.trim(),
      discount: form.discount.trim(),
      durationHours: form.durationHours,
    });
    setForm({ title: "", description: "", discount: "", durationHours: 2 });
    setIsCreateOpen(false);
  };

  if (isBusinessMode) {
    return (
      <MobileShell>
        <header className="px-5 pb-4 pt-12">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">My business offers</h1>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              LIVE
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage today&apos;s campaigns, duration and performance from one place.
          </p>
        </header>

        <main className="px-5 pb-6">
          <button
            onClick={() => setIsCreateOpen((prev) => !prev)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold"
          >
            <Plus className="h-4 w-4 text-primary" />
            {isCreateOpen ? "Close form" : "Create new offer"}
          </button>

          {isCreateOpen ? (
            <section className="mb-4 space-y-2 rounded-2xl border border-border bg-card p-4">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Offer title"
              />
              <input
                value={form.discount}
                onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Discount (e.g. 20% OFF)"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Offer details for your customers"
              />
              <label className="flex items-center justify-between text-xs text-muted-foreground">
                Duration (hours)
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={form.durationHours}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      durationHours: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm text-foreground"
                />
              </label>
              <button
                onClick={handleCreateOffer}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Publish offer
              </button>
            </section>
          ) : null}

          <ul className="space-y-3">
            {businessOffers.map((offer) => (
              <li key={offer.id}>
                <Link
                  to="/offer/$offerId"
                  params={{ offerId: offer.id }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Store className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{offer.title}</p>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                        {offer.discount}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {offer.status} · {offer.startsAt}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Duration: {offer.durationHours}h · {offer.expires}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </MobileShell>
    );
  }

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
