import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Eye,
  EyeOff,
  Navigation,
  Plus,
  Send,
  ArrowDownLeft,
  QrCode,
  Sparkles,
  Waves,
  MapPin,
  Footprints,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoPilotMiaOfferCard } from "@/components/co-pilot-mia-offer-card";
import { CoPilotRedemptionModal } from "@/components/co-pilot-redemption-modal";
import { MerchantHome } from "@/components/merchant-home";
import { MobileShell } from "@/components/mobile-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useNowTick } from "@/hooks/use-now-tick";
import { useRedeemedOfferIds } from "@/hooks/use-redeemed-offer-ids";
import { getTimeBucket } from "@/lib/vibeEngine";
import { getCityVibe, type CityVibe, type PulseContext } from "@/lib/tavilyService";
import { listMiaFlashOffers } from "@/lib/coPilotOffer";
import { MIA_VIBEPAY_PREFERENCE_TAGS } from "@/lib/miaConsumerProfile";
import { useAppContext } from "@/lib/app-context";
import { useVibe } from "@/lib/vibe-context";
import { describeMiaLocation, distanceMeters } from "@/lib/merchantData";
import { useMerchants, useMerchantsRemoteHydrated } from "@/lib/merchant-rules-context";
import { useI18n } from "@/lib/i18n/context";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { fetchConsumerBalanceCents, formatEuroFromCents } from "@/lib/walletSupabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibePay — Home" },
      { name: "description", content: "Your VibePay dashboard with live, context-aware offers." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { appPersona } = useAppContext();
  if (appPersona === "merchant") {
    return <MerchantHome />;
  }
  return <MiaHomePage />;
}

function MiaHomePage() {
  const { t, locale } = useI18n();
  const DEFAULT_PDF_PULSE: CityVibe = {
    city: "Stuttgart, Germany",
    weather: "cloudy",
    temperatureC: 11,
    topEvent: "No major nearby event detected",
    cafeName: "Kaffeehaus Altstadt",
    recommendation:
      "Cold vibe detected (11°C overcast): prioritize a warm and cozy coffee journey near Stuttgart Old Town.",
  };

  const { simulatedTime, simulatedMerchant, isWalking, miaPosition, destination } = useAppContext();
  const { vibe: simulatorVibe } = useVibe();
  const allMerchants = useMerchants();
  const merchantsRemoteHydrated = useMerchantsRemoteHydrated();
  const nowTick = useNowTick();
  const { redeemedSet, redeemedHydrated } = useRedeemedOfferIds();
  const showOfferSkeleton = isSupabaseConfigured() && !merchantsRemoteHydrated;

  const [currentVibe, setCurrentVibe] = useState("clear");
  const [hasManualVibe, setHasManualVibe] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isScanningPulse, setIsScanningPulse] = useState(true);
  const [cityPulse, setCityPulse] = useState<CityVibe>(DEFAULT_PDF_PULSE);
  const [miaBalanceCents, setMiaBalanceCents] = useState<number | null>(null);

  const refreshMiaBalance = useCallback(() => {
    void fetchConsumerBalanceCents().then(setMiaBalanceCents);
  }, []);

  useEffect(() => {
    refreshMiaBalance();
    window.addEventListener("vibepay-balance-changed", refreshMiaBalance);
    return () => window.removeEventListener("vibepay-balance-changed", refreshMiaBalance);
  }, [refreshMiaBalance]);

  const pulseForMiaRanking =
    cityPulse.weather === "rainy"
      ? ("rainy" as const)
      : cityPulse.weather === "sunny"
        ? ("sunny" as const)
        : ("cloudy" as const);

  const flashOffers = useMemo(
    () =>
      listMiaFlashOffers(allMerchants, {
        miaPreferenceTags: MIA_VIBEPAY_PREFERENCE_TAGS,
        pulseWeather: pulseForMiaRanking,
        timeBucket: getTimeBucket(simulatedTime),
        locale,
      }),
    [allMerchants, nowTick, pulseForMiaRanking, simulatedTime, locale],
  );

  const QUICK = useMemo(
    () =>
      [
        { label: t("home.quick.send"), icon: Send },
        { label: t("home.quick.request"), icon: ArrowDownLeft },
        { label: t("home.quick.topUp"), icon: Plus },
        { label: t("home.quick.payQr"), icon: QrCode },
      ] as const,
    [t],
  );
  const coPilotOffer = useMemo(() => {
    if (flashOffers.length === 0) return null;
    const fresh = redeemedHydrated
      ? flashOffers.filter((o) => !redeemedSet.has(o.id))
      : flashOffers;
    const pool = fresh.length ? fresh : flashOffers;
    const matchSim = simulatedMerchant
      ? pool.find((o) => o.merchantId === simulatedMerchant.id)
      : null;
    return matchSim ?? pool[0];
  }, [flashOffers, simulatedMerchant, redeemedHydrated, redeemedSet]);
  const coPilotRedeemed = !!(redeemedHydrated && coPilotOffer && redeemedSet.has(coPilotOffer.id));
  const coPilotLive = !showOfferSkeleton && coPilotOffer != null;
  const vibeVisual = useMemo(
    () =>
      ({
        clear: {
          borderColor: "#8FA8C7",
          accentText: t("vibe.accent.clear"),
        },
        rainy: {
          borderColor: "#1EA7FF",
          accentText: t("vibe.accent.rainy"),
        },
        sunny: {
          borderColor: "#FFD84D",
          accentText: t("vibe.accent.sunny"),
        },
        event: {
          borderColor: "#EC0000",
          accentText: t("vibe.accent.event"),
        },
        night: {
          borderColor: "#7C5CFF",
          accentText: t("vibe.accent.night"),
        },
      }) as const,
    [t],
  );
  const activeVibe = (currentVibe in vibeVisual ? currentVibe : "clear") as keyof typeof vibeVisual;

  useEffect(() => {
    if (!coPilotLive) setIsQrOpen(false);
  }, [coPilotLive]);

  useEffect(() => {
    if (redeemedHydrated && coPilotOffer && redeemedSet.has(coPilotOffer.id)) setIsQrOpen(false);
  }, [coPilotOffer?.id, redeemedHydrated, redeemedSet]);

  const isFirstSimulatorVibeSync = useRef(true);
  useEffect(() => {
    if (isFirstSimulatorVibeSync.current) {
      isFirstSimulatorVibeSync.current = false;
      return;
    }
    const mapped = simulatorVibe === "nighttime" ? "night" : simulatorVibe;
    setCurrentVibe(mapped);
    setHasManualVibe(true);
  }, [simulatorVibe]);

  useEffect(() => {
    let isMounted = true;

    const syncCityPulse = async () => {
      setIsScanningPulse(true);

      const bucket = getTimeBucket(simulatedTime);
      const pulseCtx: PulseContext =
        bucket === "morning"
          ? "morning"
          : bucket === "evening"
            ? "evening"
            : bucket === "night"
              ? "night"
              : "cold";

      const cityPulse = await getCityVibe("Stuttgart, Germany", pulseCtx);
      if (!isMounted) return;

      const hasEvent =
        cityPulse.topEvent &&
        cityPulse.topEvent.toLowerCase() !== "no major nearby event detected";

      if (!hasManualVibe) {
        if (hasEvent) {
          setCurrentVibe("event");
        } else if (cityPulse.weather === "rainy") {
          setCurrentVibe("rainy");
        } else if (cityPulse.weather === "sunny") {
          setCurrentVibe("sunny");
        } else {
          setCurrentVibe("clear");
        }
      }

      setCityPulse(cityPulse);
      setIsScanningPulse(false);
    };

    void syncCityPulse();

    return () => {
      isMounted = false;
    };
  }, [simulatedTime, hasManualVibe]);

  return (
    <MobileShell>
      <div className="min-h-screen bg-background font-sans text-foreground">
        <header className="mx-4 mt-4 rounded-3xl border border-border bg-surface px-5 pb-8 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
                <Waves className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t("home.mia.wallet")}
                </p>
                <p className="text-sm font-semibold text-foreground">{t("home.mia.subtitle")}</p>
              </div>
            </div>
            <button className="relative rounded-full border border-border bg-surface p-2.5">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
          </div>

          <div className="mt-7">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("home.balance")}</span>
              <button
                onClick={() => setShowBalance((v) => !v)}
                className="rounded-full p-1 hover:bg-muted"
                aria-label={t("home.balance")}
              >
                {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {showBalance ? (
                  miaBalanceCents != null ? (
                    formatEuroFromCents(miaBalanceCents)
                  ) : (
                    <Skeleton className="inline-block h-10 w-[9.5rem] rounded-lg align-middle" />
                  )
                ) : (
                  "€ ••••••"
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">•••• 4421 · VibePay</p>
          </div>

          <div className="mt-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isWalking
                  ? "border-primary/45 bg-primary/10 text-primary shadow-[0_0_12px_rgba(34,197,94,0.12)]"
                  : destination
                    ? "border-sky-400/50 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100"
                    : "border-border bg-muted/35 text-muted-foreground"
              }`}
              aria-live="polite"
            >
              {isWalking ? (
                <Footprints className="h-3 w-3 shrink-0" aria-hidden />
              ) : destination ? (
                <Navigation className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <MapPin className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              )}
              {isWalking
                ? t("home.movement.walking")
                : destination
                  ? t("home.movement.routeReady")
                  : t("home.movement.still")}
            </span>
          </div>

          <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/90">{t("home.cityPulse")}</span> · {cityPulse.city}{" "}
            · {cityPulse.temperatureC}°C · {vibeVisual[activeVibe].accentText}
          </p>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {QUICK.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-[11px] font-medium transition hover:bg-muted active:scale-95"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-5 pb-28 pt-6">
          {isWalking ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs text-primary shadow-[0_0_12px_rgba(34,197,94,0.18)]">
              <Footprints className="h-3.5 w-3.5" /> {t("home.walkingBanner")}
            </div>
          ) : isScanningPulse ? (
            <div className="mb-4 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs text-primary shadow-[0_0_12px_rgba(34,197,94,0.18)]">
              {t("home.scanningPulse")}
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-base font-bold">{t("home.forYou")}</h2>
              <p className="text-xs text-muted-foreground">
                {showOfferSkeleton ? (
                  <Skeleton className="mt-0.5 h-3 w-[min(18rem,100%)] rounded" />
                ) : coPilotLive ? (
                  t("home.forYouLive")
                ) : (
                  t("home.forYouEmpty")
                )}
              </p>
              {(() => {
                const pos = miaPosition;
                const loc = describeMiaLocation(pos, isWalking);
                const coordsLine =
                  loc.coordsOnly + (loc.isWalking ? t("map.walkingSuffix") : "");
                let hint: string | null = null;
                if (loc.nearestPresetId && loc.hintKind && loc.nearestDistanceM != null) {
                  const place = t(`map.preset.${loc.nearestPresetId}.label`);
                  const hintText = t(`map.preset.${loc.nearestPresetId}.hint`);
                  hint =
                    loc.hintKind === "near"
                      ? t("map.near", { place, m: loc.nearestDistanceM })
                      : t("map.toward", { hint: hintText, m: loc.nearestDistanceM });
                }
                return (
                  <div className="mt-2 space-y-0.5 text-[10px] leading-snug text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground/85">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">{coordsLine}</span>
                    </p>
                    {hint ? <p className="pl-5 text-muted-foreground">{hint}</p> : null}
                    {!showOfferSkeleton && !coPilotLive && simulatedMerchant ? (
                      <p className="pl-5 text-[10px] text-muted-foreground/90">
                        {isWalking
                          ? t("home.focusWalking", {
                              m: Math.round(distanceMeters(miaPosition, simulatedMerchant.position)),
                              name: simulatedMerchant.name,
                            })
                          : t("home.focusPin", { name: simulatedMerchant.name })}
                      </p>
                    ) : null}
                  </div>
                );
              })()}
            </div>
            {showOfferSkeleton ? (
              <Skeleton className="h-7 w-[4.5rem] shrink-0 rounded-full" />
            ) : coPilotLive ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <Sparkles className="h-3 w-3" /> {t("common.live")}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3 opacity-70" /> {t("common.empty")}
              </span>
            )}
          </div>

          {showOfferSkeleton ? (
            <div
              className="relative overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              aria-busy="true"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-6 w-[min(100%,14rem)] rounded-md" />
              <Skeleton className="mt-2 h-4 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-[80%] rounded" />
              <div className="mt-5 flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              </div>
            </div>
          ) : coPilotLive && coPilotOffer ? (
            <CoPilotMiaOfferCard
              offer={coPilotOffer}
              redeemed={coPilotRedeemed}
              onRedeem={() => setIsQrOpen(true)}
            />
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-border/90 bg-gradient-to-b from-muted/25 via-surface/90 to-surface px-6 py-12 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-3xl"
              />
              <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-surface shadow-sm">
                <Sparkles className="h-7 w-7 text-primary/55" strokeWidth={1.75} />
              </div>
              <p className="relative text-base font-semibold tracking-tight text-foreground">
                {t("home.noOffersTitle")}
              </p>
              <p className="relative mx-auto mt-2 max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
                {t("home.noOffersBodyBefore")}
                <Link
                  to="/offers"
                  className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary"
                >
                  {t("home.offersLink")}
                </Link>
                {t("home.noOffersBodyAfter")}
              </p>
              <p className="relative mt-5 text-[11px] leading-snug text-muted-foreground/90">
                {t("home.noOffersFoot")}
              </p>
            </div>
          )}
        </main>

        <CoPilotRedemptionModal
          open={isQrOpen && coPilotLive && !!coPilotOffer}
          onClose={() => setIsQrOpen(false)}
          offer={coPilotOffer}
          redeemed={coPilotRedeemed}
        />
      </div>
    </MobileShell>
  );
}
