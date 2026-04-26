import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Coffee,
  Croissant,
  IceCream,
  Plus,
  RotateCcw,
  Sparkles,
  Store,
  Trophy,
  Utensils,
  Wine,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PayoneSeal } from "@/components/payone-seal";
import { MobileShell } from "@/components/mobile-shell";
import { useMerchantRules } from "@/lib/merchant-rules-context";
import { useAppContext } from "@/lib/app-context";
import { useVibe } from "@/lib/vibe-context";
import {
  buildOfferContext,
  evaluateOffer,
  type ActivationState,
  type WeatherSignal,
  type WeekdaySignal,
} from "@/lib/offerEngine";
import type { MerchantCategory, Occupancy } from "@/lib/merchantData";
import type { TimeBucket } from "@/lib/vibeEngine";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "VibePay — Owner view" },
      { name: "description", content: "Merchant rules console for VibePay City-Wallet." },
    ],
  }),
  component: MerchantPage,
});

const CATEGORY_ICON: Record<MerchantCategory, LucideIcon> = {
  cafe: Coffee,
  bakery: Croissant,
  bistro: Utensils,
  weinstube: Wine,
  gelateria: IceCream,
  boutique: Store,
};

const CATEGORY_COLOR: Record<MerchantCategory, string> = {
  cafe: "#7A4E2A",
  bakery: "#C98A4B",
  bistro: "#C84F2E",
  weinstube: "#6B2D5C",
  gelateria: "#E59A4D",
  boutique: "#3E5D7E",
};

const WEATHER_OPTIONS: WeatherSignal[] = ["sunny", "cloudy", "rainy", "cold"];
const TIME_OPTIONS: TimeBucket[] = ["morning", "afternoon", "evening", "night"];
const OCCUPANCY_OPTIONS: Occupancy[] = ["quiet", "normal", "busy"];
const WEEKDAY_OPTIONS: WeekdaySignal[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const ACTIVATION_META: Record<ActivationState, { label: string; tone: string; icon: LucideIcon }> = {
  low_traffic: {
    label: "Low traffic · offer LIVE",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
    icon: Zap,
  },
  normal: {
    label: "Steady traffic · soft mode",
    tone: "border-sky-300 bg-sky-50 text-sky-800",
    icon: Sparkles,
  },
  target_reached: {
    label: "Daily target reached · greet only",
    tone: "border-amber-300 bg-amber-50 text-amber-800",
    icon: Trophy,
  },
};

function MerchantPage() {
  const {
    merchants,
    updateMerchant,
    updateRule,
    toggleRule,
    setOccupancy,
    setTransactionsToday,
    setLowTrafficThreshold,
    setDailyTargetReached,
    incrementTransaction,
    resetMerchant,
    resetAll,
  } = useMerchantRules();
  const { simulatedTime } = useAppContext();
  const { vibe } = useVibe();

  const [selectedId, setSelectedId] = useState<string>(merchants[0]?.id ?? "");
  const merchant = useMemo(
    () => merchants.find((m) => m.id === selectedId) ?? merchants[0],
    [merchants, selectedId],
  );

  const previewContext = useMemo(
    () =>
      buildOfferContext({
        weatherVibe: vibe === "rainy" ? "rainy" : vibe === "sunny" ? "sunny" : "cloudy",
        isCold: vibe === "rainy" || vibe === "nighttime",
        simulatedTime,
        occupancy: merchant?.occupancy ?? "normal",
      }),
    [vibe, simulatedTime, merchant?.occupancy],
  );

  const evaluated = useMemo(() => {
    if (!merchant) return null;
    return evaluateOffer(merchant, previewContext);
  }, [merchant, previewContext]);

  if (!merchant) {
    return (
      <MobileShell>
        <div className="px-5 pt-16 text-center text-muted-foreground">No merchants loaded.</div>
      </MobileShell>
    );
  }

  const Icon = CATEGORY_ICON[merchant.category];
  const accentColor = CATEGORY_COLOR[merchant.category];

  return (
    <MobileShell>
      <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
        <header className="mx-4 mt-4 rounded-3xl border border-border bg-surface px-5 pb-5 pt-8">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Mia view
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              <Sparkles className="h-3 w-3" /> Owner view
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${accentColor}55`,
                background: `${accentColor}15`,
                color: accentColor,
              }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {merchant.category} · {merchant.signature}
              </p>
              <h1 className="text-lg font-bold leading-tight">{merchant.name}</h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Rule console — VibePay computes Mia's offer in real time from these presets.
              </p>
            </div>
          </div>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-4 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.category}
              </option>
            ))}
          </select>
        </header>

        <main className="px-5 pt-5">
          <section
            className="rounded-3xl border bg-surface p-4"
            style={{
              borderColor: evaluated?.fired ? `${accentColor}66` : "var(--border)",
              background: evaluated?.fired
                ? `linear-gradient(140deg, ${accentColor}14 0%, var(--surface) 70%)`
                : undefined,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Live preview · what Mia sees right now
              </p>
              <div className="flex items-center gap-1.5">
                {evaluated ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ACTIVATION_META[evaluated.activationState].tone}`}
                  >
                    {(() => {
                      const ActIcon = ACTIVATION_META[evaluated.activationState].icon;
                      return <ActIcon className="h-2.5 w-2.5" />;
                    })()}
                    {ACTIVATION_META[evaluated.activationState].label}
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    evaluated?.fired
                      ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {evaluated?.fired ? <CheckCircle2 className="h-2.5 w-2.5" /> : <CircleSlash className="h-2.5 w-2.5" />}
                  {evaluated?.fired ? "rule fired" : evaluated?.activationState === "target_reached" ? "no promo" : "fallback"}
                </span>
              </div>
            </div>
            {evaluated ? (
              <>
                <h2 className="mt-2 text-base font-bold leading-tight">{evaluated.headline}</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">{evaluated.message}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      borderColor: `${accentColor}66`,
                      background: `${accentColor}1A`,
                      color: accentColor,
                      border: "1px solid",
                    }}
                  >
                    {evaluated.discount}
                  </span>
                  {evaluated.signalsMatched.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Context · weather: {previewContext.weather} · time: {previewContext.timeBucket} · occupancy:{" "}
                  {previewContext.occupancy} · weekday: {previewContext.weekday}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Powered by Payone · {evaluated.transactionSummary}
                </p>
              </>
            ) : null}
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold text-foreground">Ofertas flash para clientes</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Si Payone marca poco tráfico, VibePay puede sugerirte un descuento a partir de tu inventario
              (JSON). Revísalo y actívalo en{" "}
              <Link to="/offers" className="font-semibold text-foreground underline-offset-2 hover:underline">
                Ofertas
              </Link>
              .
            </p>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Live traffic via Payone
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Real settlements gate the AI: the offer only lights up when you actually need more sales.
                </p>
              </div>
              <PayoneSeal variant="rail" tone="live" trailing="settlement source" />
            </div>

            <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Transactions today
                </span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {merchant.currentTransactionsToday}
                  <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                    / {merchant.lowTrafficThreshold} target
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(40, merchant.lowTrafficThreshold * 2)}
                step={1}
                value={merchant.currentTransactionsToday}
                onChange={(e) => setTransactionsToday(merchant.id, Number(e.target.value))}
                className="mt-2 w-full accent-primary"
                aria-label="Transactions today"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => incrementTransaction(merchant.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-primary bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition active:scale-95"
                >
                  <Plus className="h-3 w-3" /> Simulate Payone sale
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionsToday(merchant.id, 0)}
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Threshold
                  </span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {merchant.lowTrafficThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={40}
                  step={1}
                  value={merchant.lowTrafficThreshold}
                  onChange={(e) => setLowTrafficThreshold(merchant.id, Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                  aria-label="Low traffic threshold"
                />
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Daily target
                  </span>
                  <button
                    type="button"
                    onClick={() => setDailyTargetReached(merchant.id, !merchant.dailyTargetReached)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      merchant.dailyTargetReached ? "bg-amber-400" : "bg-muted-foreground/30"
                    }`}
                    aria-label={
                      merchant.dailyTargetReached ? "Reset daily target" : "Mark daily target reached"
                    }
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        merchant.dailyTargetReached ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  {merchant.dailyTargetReached
                    ? "Reached · VibePay won't push promos today."
                    : "Pending · VibePay can push offers if traffic stays low."}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Live shop occupancy
              </p>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                drives "quiet hour" rules
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {OCCUPANCY_OPTIONS.map((opt) => {
                const active = merchant.occupancy === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setOccupancy(merchant.id, opt)}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Offer rules · presets</h2>
              <button
                onClick={() => resetMerchant(merchant.id)}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
              >
                <RotateCcw className="h-3 w-3" /> Reset shop
              </button>
            </div>
            <div className="space-y-3">
              {merchant.rules.map((rule) => {
                const fired = evaluated?.rule?.id === rule.id;
                return (
                  <article
                    key={rule.id}
                    className={`rounded-2xl border bg-surface p-4 transition ${
                      fired
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : rule.enabled
                          ? "border-border"
                          : "border-border bg-muted/30 opacity-70"
                    }`}
                  >
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold leading-tight">{rule.label}</h3>
                          {fired ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">
                              <Sparkles className="h-2.5 w-2.5" /> firing now
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          priority {rule.priority} · id {rule.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRule(merchant.id, rule.id)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                          rule.enabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                        aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            rule.enabled ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </header>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                      <ConditionGroup
                        title="Weather"
                        options={WEATHER_OPTIONS}
                        selected={rule.when.weather ?? []}
                        onToggle={(v) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            when: { ...r.when, weather: toggleArr(r.when.weather, v) },
                          }))
                        }
                      />
                      <ConditionGroup
                        title="Time"
                        options={TIME_OPTIONS}
                        selected={rule.when.timeBucket ?? []}
                        onToggle={(v) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            when: { ...r.when, timeBucket: toggleArr(r.when.timeBucket, v) },
                          }))
                        }
                      />
                      <ConditionGroup
                        title="Occupancy"
                        options={OCCUPANCY_OPTIONS}
                        selected={rule.when.occupancy ?? []}
                        onToggle={(v) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            when: { ...r.when, occupancy: toggleArr(r.when.occupancy, v) },
                          }))
                        }
                      />
                      <ConditionGroup
                        title="Weekday"
                        options={WEEKDAY_OPTIONS}
                        selected={rule.when.weekday ?? []}
                        onToggle={(v) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            when: { ...r.when, weekday: toggleArr(r.when.weekday, v) },
                          }))
                        }
                      />
                    </div>

                    <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Discount
                        </label>
                        <span className="text-xs font-bold tabular-nums text-foreground">
                          {rule.then.discountPct}% · {rule.then.durationMin} min
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={rule.then.discountPct}
                        onChange={(e) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            then: { ...r.then, discountPct: Number(e.target.value) },
                          }))
                        }
                        className="mt-2 w-full accent-primary"
                      />
                      <input
                        type="range"
                        min={5}
                        max={120}
                        step={5}
                        value={rule.then.durationMin}
                        onChange={(e) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            then: { ...r.then, durationMin: Number(e.target.value) },
                          }))
                        }
                        className="mt-2 w-full accent-primary"
                      />
                      <input
                        type="text"
                        value={rule.then.headline}
                        onChange={(e) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            then: { ...r.then, headline: e.target.value },
                          }))
                        }
                        className="mt-3 w-full rounded-xl border border-border bg-surface px-2 py-1 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <textarea
                        value={rule.then.message}
                        onChange={(e) =>
                          updateRule(merchant.id, rule.id, (r) => ({
                            ...r,
                            then: { ...r.then, message: e.target.value },
                          }))
                        }
                        rows={2}
                        className="mt-2 w-full rounded-xl border border-border bg-surface px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">How it works.</span> When Mia walks past
              your shop, VibePay calls{" "}
              <code className="rounded bg-surface px-1 text-[10px]">evaluateOffer(merchant, ctx)</code>
              . The first enabled rule whose conditions match the live context wins (highest{" "}
              <em>priority</em> breaks ties). The composed offer is what appears on her Vibe Card,
              not a static record from a database.
            </p>
            <button
              onClick={resetAll}
              type="button"
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-3 w-3" /> Reset all shops
            </button>
          </section>
        </main>
      </div>
    </MobileShell>
  );
}

function ConditionGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toggleArr<T>(arr: T[] | undefined, v: T): T[] {
  const set = new Set(arr ?? []);
  if (set.has(v)) set.delete(v);
  else set.add(v);
  return Array.from(set);
}

