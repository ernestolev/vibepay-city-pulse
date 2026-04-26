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
  Thermometer,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useVibe } from "@/lib/vibe-context";
import { VIBE_ORDER, type VibeKey } from "@/lib/vibe";
import { useAppContext } from "@/lib/app-context";
import { useMerchants, useMerchantRules } from "@/lib/merchant-rules-context";
import { getActivationState, type ActivationState } from "@/lib/offerEngine";
import { DESKTOP_MAIN_LEFT, SHELL_INNER_MAX } from "@/lib/shell-layout";
import { cn } from "@/lib/utils";
import { PayoneSeal } from "./payone-seal";
import { PathSimulator } from "./path-simulator";
import { useI18n } from "@/lib/i18n/context";

const ACTIVATION_TONE: Record<ActivationState, string> = {
  low_traffic: "border-emerald-300 bg-emerald-50 text-emerald-800",
  normal: "border-sky-300 bg-sky-50 text-sky-800",
  target_reached: "border-amber-300 bg-amber-50 text-amber-800",
};

export function ContextSimulator() {
  const { t } = useI18n();
  const meta = useMemo(
    (): Record<VibeKey, { label: string; icon: typeof Sun; hint: string }> => ({
      sunny: {
        label: t("vibe.meta.sunny.label"),
        icon: Sun,
        hint: t("vibe.meta.sunny.hint"),
      },
      rainy: {
        label: t("vibe.meta.rainy.label"),
        icon: CloudRain,
        hint: t("vibe.meta.rainy.hint"),
      },
      nighttime: {
        label: t("vibe.meta.nighttime.label"),
        icon: Moon,
        hint: t("vibe.meta.nighttime.hint"),
      },
      event: {
        label: t("vibe.meta.event.label"),
        icon: Thermometer,
        hint: t("vibe.meta.event.hint"),
      },
    }),
    [t],
  );

  const timePresets = useMemo(
    () =>
      [
        { label: t("simulator.time.morning"), value: "08:30" as const },
        { label: t("simulator.time.evening"), value: "17:45" as const },
        { label: t("simulator.time.night"), value: "22:15" as const },
        { label: t("simulator.time.reset"), value: null },
      ] as const,
    [t],
  );

  const activationLabel = useMemo(
    () =>
      ({
        low_traffic: t("simulator.activation.low"),
        normal: t("simulator.activation.normal"),
        target_reached: t("simulator.activation.done"),
      }) as Record<ActivationState, string>,
    [t],
  );

  const [open, setOpen] = useState(false);
  const { vibe, setVibe } = useVibe();
  const {
    isPresentationMode,
    setIsPresentationMode,
    simulatedTime,
    setSimulatedTime,
    simulatedMerchant,
    replayDeviceBoot,
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
        className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-xs font-semibold text-background shadow-2xl shadow-black/30 transition active:scale-95 lg:bottom-8 lg:right-8"
        aria-label={t("simulator.fab")}
      >
        <Sparkles className="h-4 w-4" />
        {t("simulator.fab")}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", DESKTOP_MAIN_LEFT)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl",
                SHELL_INNER_MAX,
                "lg:inset-x-auto lg:bottom-8 lg:right-8 lg:left-auto lg:max-h-[min(85vh,46rem)] lg:w-[min(28rem,calc(100vw-14rem-2.5rem))] lg:rounded-2xl lg:border lg:border-border lg:shadow-2xl",
              )}
            >
              <div className="px-5 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{t("simulator.title")}</h2>
                    <p className="text-xs text-muted-foreground">{t("simulator.subtitle")}</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-muted p-2 text-muted-foreground"
                    aria-label={t("common.close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="mb-4 rounded-2xl border border-border bg-surface p-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("simulator.audience")}
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
                    <User className="h-3.5 w-3.5" /> {t("simulator.miaView")}
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
                    <Store className="h-3.5 w-3.5" /> {t("simulator.ownerView")}
                  </Link>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  {t("simulator.audienceHint")}
                </p>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{t("simulator.presentation")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("simulator.presentationHint")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresentationMode(!isPresentationMode)}
                  className={`relative h-6 w-11 rounded-full border border-border transition ${
                    isPresentationMode ? "bg-primary" : "bg-muted"
                  }`}
                  aria-label={t("simulator.presentation")}
                  aria-pressed={isPresentationMode}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-all ${
                      isPresentationMode ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-border bg-surface p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("simulator.deviceFlow")}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t("simulator.deviceFlowHint")}</p>
                <button
                  type="button"
                  onClick={() => {
                    replayDeviceBoot();
                    setOpen(false);
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  {t("simulator.replayIntro")}
                </button>
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("simulator.vibeSection")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {VIBE_ORDER.map((key) => {
                  const m = meta[key];
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
                          {t("simulator.liveBadge")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("simulator.timeTravel")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {timePresets.map((preset) => {
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
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("simulator.traffic.title")}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                      {t("simulator.traffic.hint")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
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
                        {activationLabel[trafficState]}
                      </span>
                    ) : null}
                    <PayoneSeal
                      variant="rail"
                      tone="live"
                      trailing={t("simulator.traffic.payoneRail")}
                    />
                  </div>
                </div>

                <select
                  value={activeTrafficId ?? ""}
                  onChange={(e) => setTrafficMerchantId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground"
                  aria-label={t("simulator.traffic.pickMerchant")}
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
                        {t("simulator.traffic.txToday")}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {trafficMerchant.currentTransactionsToday}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                          {t("simulator.traffic.target", { n: trafficMerchant.lowTrafficThreshold })}
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
                      aria-label={t("simulator.traffic.txToday")}
                    />

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => incrementTransaction(trafficMerchant.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-primary bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> {t("simulator.traffic.plusOne")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionsToday(trafficMerchant.id, 0)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
                      >
                        <RotateCcw className="h-3 w-3" /> {t("simulator.traffic.reset")}
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
                        {trafficMerchant.dailyTargetReached
                          ? t("simulator.traffic.goalOn")
                          : t("simulator.traffic.goalOff")}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <PathSimulator />
              </div>

              <div className="mt-4 flex flex-col items-center gap-1.5">
                <p className="text-center text-[11px] text-muted-foreground">{t("simulator.footer")}</p>
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
