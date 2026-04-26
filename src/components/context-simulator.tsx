import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudRain,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Store,
  Sun,
  Trophy,
  User,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useVibe } from "@/lib/vibe-context";
import { VIBE_ORDER, type VibeKey } from "@/lib/vibe";
import { useAppContext } from "@/lib/app-context";
import { useMerchants, useMerchantRules } from "@/lib/merchant-rules-context";
import { getActivationState, type ActivationState } from "@/lib/offerEngine";
import { PayoneSeal } from "./payone-seal";
import { PathSimulator } from "./path-simulator";

const META: Record<VibeKey, { label: string; icon: typeof Sun; hint: string }> = {
  sunny: { label: "Sunny", icon: Sun, hint: "Open terraces, gelaterias, family bakeries" },
  rainy: { label: "Rainy", icon: CloudRain, hint: "Cosy local cafés, soup, hot chocolate" },
  nighttime: { label: "Late hours", icon: Moon, hint: "Family bistros, Weinstuben, late bakeries" },
  event: { label: "Local hotspot", icon: Utensils, hint: "Festival nearby drives traffic to local restaurants" },
};

const TIME_PRESETS: { label: string; value: string | null }[] = [
  { label: "Morning 08:30", value: "08:30" },
  { label: "Evening 17:45", value: "17:45" },
  { label: "Night 22:15", value: "22:15" },
  { label: "Reset", value: null },
];

const ACTIVATION_TONE: Record<ActivationState, string> = {
  low_traffic: "border-emerald-300 bg-emerald-50 text-emerald-800",
  normal: "border-sky-300 bg-sky-50 text-sky-800",
  target_reached: "border-amber-300 bg-amber-50 text-amber-800",
};

const ACTIVATION_LABEL: Record<ActivationState, string> = {
  low_traffic: "Low traffic · live",
  normal: "Steady",
  target_reached: "Day done",
};

export function ContextSimulator() {
  const [open, setOpen] = useState(false);
  const { vibe, setVibe } = useVibe();
  const {
    isPresentationMode,
    setIsPresentationMode,
    simulatedTime,
    setSimulatedTime,
    simulatedMerchant,
  } = useAppContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOwnerView = pathname.startsWith("/merchant");

  const merchants = useMerchants();
  const {
    setTransactionsToday,
    setDailyTargetReached,
    incrementTransaction,
  } = useMerchantRules();

  const [trafficMerchantId, setTrafficMerchantId] = useState<string | null>(null);
  const activeTrafficId =
    trafficMerchantId ?? simulatedMerchant?.id ?? merchants[0]?.id ?? null;
  const trafficMerchant = useMemo(
    () => merchants.find((m) => m.id === activeTrafficId) ?? null,
    [merchants, activeTrafficId],
  );
  const trafficState: ActivationState | null = trafficMerchant
    ? getActivationState(trafficMerchant)
    : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-xs font-semibold text-background shadow-2xl shadow-black/30 transition active:scale-95"
        aria-label="Simulate City Pulse"
      >
        <Sparkles className="h-4 w-4" />
        Simulate City Pulse
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88vh] max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl"
            >
              <div className="px-5 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Simulate City Pulse</h2>
                    <p className="text-xs text-muted-foreground">
                      Toggle context, time, walk Mia through Old Town and watch VibePay adapt.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-muted p-2 text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="mb-4 rounded-2xl border border-border bg-surface p-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Audience
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      !isOwnerView
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" /> Mia view
                  </Link>
                  <Link
                    to="/merchant"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      isOwnerView
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" /> Owner view
                  </Link>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Same context, two perspectives. Owners tweak presets in real time and Mia sees the change instantly.
                </p>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">Presentation Mode</p>
                  <p className="text-[11px] text-muted-foreground">
                    Shows iPhone status bar and hides simulator labels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresentationMode(!isPresentationMode)}
                  className={`relative h-6 w-11 rounded-full border border-border transition ${
                    isPresentationMode ? "bg-primary" : "bg-muted"
                  }`}
                  aria-label="Toggle presentation mode"
                  aria-pressed={isPresentationMode}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-all ${
                      isPresentationMode ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Vibe
              </p>
              <div className="grid grid-cols-2 gap-3">
                {VIBE_ORDER.map((key) => {
                  const m = META[key];
                  const Icon = m.icon;
                  const active = vibe === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setVibe(key)}
                      className={`relative rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-primary bg-accent"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                          active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {m.hint}
                      </div>
                      {active && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                          Live
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Time Travel
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_PRESETS.map((preset) => {
                  const active = simulatedTime === preset.value;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setSimulatedTime(preset.value)}
                      className={`rounded-xl border px-2 py-2 text-[10px] font-semibold leading-tight transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-foreground hover:border-primary/40"
                      }`}
                      aria-pressed={active}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Live traffic via Payone
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                      Bump transactions to flip the live offer on/off in real time.
                    </p>
                  </div>
                  {trafficState ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ACTIVATION_TONE[trafficState]}`}
                    >
                      {trafficState === "low_traffic" ? (
                        <Zap className="h-2.5 w-2.5" />
                      ) : trafficState === "target_reached" ? (
                        <Trophy className="h-2.5 w-2.5" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      {ACTIVATION_LABEL[trafficState]}
                    </span>
                  ) : null}
                </div>

                <select
                  value={activeTrafficId ?? ""}
                  onChange={(e) => setTrafficMerchantId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground"
                  aria-label="Pick merchant for traffic test"
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {trafficMerchant ? (
                  <>
                    <div className="mt-2 flex items-baseline justify-between text-[10px] text-muted-foreground">
                      <span className="font-bold uppercase tracking-wide">
                        Transactions today
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {trafficMerchant.currentTransactionsToday}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                          / {trafficMerchant.lowTrafficThreshold} target
                        </span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(40, trafficMerchant.lowTrafficThreshold * 2)}
                      step={1}
                      value={trafficMerchant.currentTransactionsToday}
                      onChange={(e) =>
                        setTransactionsToday(trafficMerchant.id, Number(e.target.value))
                      }
                      className="mt-1 w-full accent-primary"
                      aria-label="Transactions today"
                    />

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => incrementTransaction(trafficMerchant.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-primary bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> +1 sale
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionsToday(trafficMerchant.id, 0)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDailyTargetReached(
                            trafficMerchant.id,
                            !trafficMerchant.dailyTargetReached,
                          )
                        }
                        className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                          trafficMerchant.dailyTargetReached
                            ? "border-amber-400 bg-amber-50 text-amber-800"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Trophy className="h-3 w-3" />{" "}
                        {trafficMerchant.dailyTargetReached ? "Goal ON" : "Goal OFF"}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <PathSimulator />
              </div>

              <div className="mt-4 flex flex-col items-center gap-1.5">
                <p className="text-center text-[11px] text-muted-foreground">
                  Demo mode · Tavily senses real merchants, Payone Riel settles every transaction.
                </p>
                <PayoneSeal variant="wordmark" />
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
