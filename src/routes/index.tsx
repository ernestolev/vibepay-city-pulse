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
  X,
  Waves,
  Coffee,
  Thermometer,
  MapPin,
  Clock,
  Footprints,
  ChevronRight,
  Utensils,
  Store,
  Wine,
  IceCream,
  Croissant,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { getContextualOffer, getTimeBucket } from "@/lib/vibeEngine";
import { getCityVibe, type CityVibe, type PulseContext } from "@/lib/tavilyService";
import { useAppContext } from "@/lib/app-context";
import { useVibe } from "@/lib/vibe-context";
import { distanceMeters } from "@/lib/merchantData";
import { useMerchantById } from "@/lib/merchant-rules-context";
import { buildOfferContext, evaluateOffer } from "@/lib/offerEngine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibePay — Home" },
      { name: "description", content: "Your VibePay dashboard with live, context-aware offers." },
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

function HomePage() {
  const DEFAULT_PDF_PULSE: CityVibe = {
    city: "Stuttgart, Germany",
    weather: "cloudy",
    temperatureC: 11,
    topEvent: "No major nearby event detected",
    cafeName: "Kaffeehaus Altstadt",
    recommendation:
      "Cold vibe detected (11°C overcast): prioritize a warm and cozy coffee journey near Stuttgart Old Town.",
  };

  const { simulatedTime, simulatedMerchant, isWalking, miaPosition } = useAppContext();
  const { vibe: simulatorVibe } = useVibe();
  const liveMerchantFromRules = useMerchantById(simulatedMerchant?.id);

  const [currentVibe, setCurrentVibe] = useState("clear");
  const [hasManualVibe, setHasManualVibe] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isScanningPulse, setIsScanningPulse] = useState(true);
  const [pulseEvent, setPulseEvent] = useState<string | null>(null);
  const [cityPulse, setCityPulse] = useState<CityVibe>(DEFAULT_PDF_PULSE);
  const offer = getContextualOffer(currentVibe, simulatedTime);
  const timeBucket = getTimeBucket(simulatedTime);
  const useTimeAwareCopy =
    timeBucket === "morning" || timeBucket === "evening" || timeBucket === "night";
  const vibeVisual = {
    clear: {
      borderColor: "#8FA8C7",
      accentText: "Warm & Cozy | Stuttgart Old Town",
    },
    rainy: {
      borderColor: "#1EA7FF",
      accentText: "Vibe: Lluvia | Café -15%",
    },
    sunny: {
      borderColor: "#FFD84D",
      accentText: "Vibe: Sol | Cashback Activo",
    },
    event: {
      borderColor: "#EC0000",
      accentText: "Vibe: Evento | Acceso VIP",
    },
  } as const;
  const activeVibe = (currentVibe in vibeVisual ? currentVibe : "clear") as keyof typeof vibeVisual;
  const qrCells = Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const finder =
      (row < 3 && col < 3) ||
      (row < 3 && col > 5) ||
      (row > 5 && col < 3);
    const pattern = (row * 3 + col * 5 + currentVibe.length) % 4 === 0;
    return finder || pattern;
  });
  const activeCardStyle = {
    borderColor: vibeVisual[activeVibe].borderColor,
    boxShadow:
      activeVibe === "clear"
        ? "0 10px 26px rgba(120, 146, 178, 0.24)"
        : isQrOpen
          ? `0 8px 24px color-mix(in srgb, ${vibeVisual[activeVibe].borderColor} 20%, transparent)`
          : "none",
  };

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
      setPulseEvent(cityPulse.topEvent);
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mia&apos;s Wallet</p>
              <p className="text-sm font-semibold text-foreground">Marketing Professional | Stuttgart</p>
            </div>
          </div>
          <button className="relative rounded-full border border-border bg-surface p-2.5">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Current balance</span>
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="Toggle balance"
            >
              {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
              {showBalance ? "€4,287.50" : "€ ••••••"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">•••• 4421 · VibePay</p>
        </div>

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
            <Footprints className="h-3.5 w-3.5" /> Mia walking · sensing local merchants via Tavily
          </div>
        ) : isScanningPulse ? (
          <div className="mb-4 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs text-primary shadow-[0_0_12px_rgba(34,197,94,0.18)]">
            Scanning City Pulse via Tavily AI...
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">For you, right now</h2>
            <p className="text-xs text-muted-foreground">
              {simulatedMerchant
                ? isWalking
                  ? `Mia walking · ${Math.round(distanceMeters(miaPosition, simulatedMerchant.position))} m to ${simulatedMerchant.name}`
                  : `Live match · ${simulatedMerchant.name}`
                : activeVibe === "clear"
                  ? `${cityPulse.city} · Cold vibe`
                  : `Context: ${currentVibe}`}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{ color: vibeVisual[activeVibe].borderColor }}
          >
            <Sparkles className="h-3 w-3" /> Vibe Engine
          </span>
        </div>

        {(() => {
          type Signal = { icon: LucideIcon; label: string };
          const liveMerchant = liveMerchantFromRules ?? simulatedMerchant;
          const distToMerchant = liveMerchant
            ? Math.max(0, Math.round(distanceMeters(miaPosition, liveMerchant.position)))
            : null;

          const evaluatedOffer = liveMerchant
            ? evaluateOffer(
                liveMerchant,
                buildOfferContext({
                  weatherVibe:
                    cityPulse.weather === "rainy"
                      ? "rainy"
                      : cityPulse.weather === "sunny"
                        ? "sunny"
                        : "cloudy",
                  isCold: (cityPulse.temperatureC ?? 20) <= 13,
                  simulatedTime,
                  occupancy: liveMerchant.occupancy,
                }),
              )
            : null;
          const offerActive = evaluatedOffer?.activationState === "low_traffic";
          const activationLabel =
            evaluatedOffer?.activationState === "low_traffic"
              ? "Payone · low traffic"
              : evaluatedOffer?.activationState === "target_reached"
                ? "Daily goal reached"
                : evaluatedOffer?.activationState === "normal"
                  ? "Steady traffic"
                  : null;

          const merchantIconMap: Record<string, LucideIcon> = {
            cafe: Coffee,
            bakery: Croissant,
            bistro: Utensils,
            weinstube: Wine,
            gelateria: IceCream,
            boutique: Store,
          };

          const merchantColorMap: Record<string, string> = {
            cafe: "#7A4E2A",
            bakery: "#C98A4B",
            bistro: "#C84F2E",
            weinstube: "#6B2D5C",
            gelateria: "#E59A4D",
            boutique: "#3E5D7E",
          };

          const signals: Signal[] = liveMerchant
            ? [
                { icon: Store, label: `${liveMerchant.category} · ${liveMerchant.signature}` },
                { icon: MapPin, label: `${distToMerchant} m from Mia` },
                { icon: Footprints, label: `Currently ${liveMerchant.occupancy}` },
                ...(evaluatedOffer?.fired && evaluatedOffer.signalsMatched.length
                  ? [
                      {
                        icon: Sparkles,
                        label: `Rule fired · ${evaluatedOffer.signalsMatched.join(" + ")}`,
                      } as Signal,
                    ]
                  : [
                      {
                        icon: Clock,
                        label: `Open ${liveMerchant.hours.open}–${liveMerchant.hours.close}`,
                      } as Signal,
                    ]),
              ]
            : activeVibe === "clear"
              ? [
                  { icon: Thermometer, label: `${cityPulse.temperatureC}°C overcast` },
                  { icon: MapPin, label: "80 m · Old Town" },
                  { icon: Clock, label: "Just brewed · 2 min" },
                  { icon: Footprints, label: "Slow pace · 2 stops" },
                ]
              : activeVibe === "rainy"
                ? [
                    { icon: Thermometer, label: `${cityPulse.temperatureC}°C rainy` },
                    { icon: Store, label: cityPulse.cafeName },
                    { icon: MapPin, label: "Family-run · 80 m" },
                    { icon: Clock, label: "Hot drink · indoor" },
                  ]
                : activeVibe === "sunny"
                  ? [
                      { icon: Thermometer, label: `${cityPulse.temperatureC}°C sunny` },
                      { icon: Store, label: cityPulse.cafeName },
                      { icon: MapPin, label: "Open terrace · 140 m" },
                      { icon: Clock, label: "Independent gelateria" },
                    ]
                  : [
                      { icon: Utensils, label: "Trattoria Marktplatz" },
                      { icon: MapPin, label: "Marktplatz · 320 m" },
                      { icon: Footprints, label: "Foot traffic +35%" },
                      { icon: Clock, label: "Special menu tonight" },
                    ];

          const isMia = activeVibe === "clear" && !liveMerchant;
          const merchantThemeColor = liveMerchant
            ? merchantColorMap[liveMerchant.category]
            : null;
          const MerchantHeroIcon = liveMerchant
            ? (merchantIconMap[liveMerchant.category] ?? Store)
            : null;

          const cardStyle = {
            ...activeCardStyle,
            ...(liveMerchant
              ? {
                  background: `linear-gradient(140deg, ${merchantThemeColor}14 0%, var(--surface) 70%)`,
                  borderColor: merchantThemeColor ?? "var(--border)",
                  boxShadow: `0 18px 40px -22px ${merchantThemeColor}55`,
                }
              : isMia
                ? {
                    background:
                      "linear-gradient(140deg, #FFF6E5 0%, #FFFBF3 45%, var(--surface) 100%)",
                    borderColor: "#E2C9A1",
                  }
                : {}),
          };

          const canRedeem = !liveMerchant || offerActive;

          return (
            <button
              onClick={() => {
                if (canRedeem) setIsQrOpen(true);
              }}
              disabled={!canRedeem}
              className={`group relative w-full overflow-hidden rounded-3xl border bg-surface p-5 text-left text-foreground transition-all duration-300 ${
                canRedeem ? "" : "cursor-default opacity-95"
              }`}
              style={cardStyle}
              aria-label={canRedeem ? "Open offer QR code" : "No promo available"}
            >
              {liveMerchant ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-70 blur-3xl"
                  style={{
                    background: `radial-gradient(circle, ${merchantThemeColor}66 0%, transparent 70%)`,
                  }}
                />
              ) : isMia ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full opacity-70 blur-3xl"
                  style={{ background: "radial-gradient(circle, #F4D5A8 0%, transparent 70%)" }}
                />
              ) : null}

              <div className="relative flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {liveMerchant
                    ? offerActive
                      ? "Live merchant ping · low traffic"
                      : evaluatedOffer?.activationState === "target_reached"
                        ? "Live merchant · day closed"
                        : "Live merchant · steady"
                    : "VibePay Pulse Offer"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    liveMerchant
                      ? offerActive
                        ? "border-emerald-300 text-emerald-800"
                        : evaluatedOffer?.activationState === "target_reached"
                          ? "border-amber-300 text-amber-800"
                          : "border-sky-300 text-sky-800"
                      : "border-border text-foreground"
                  }`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                        liveMerchant && !offerActive ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                        liveMerchant && !offerActive ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </span>
                  {liveMerchant
                    ? activationLabel
                    : isMia
                      ? "Café Pulse"
                      : "Live"}
                </span>
              </div>

              <div className="relative mt-4 flex items-start gap-4">
                {liveMerchant && MerchantHeroIcon ? (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: `${merchantThemeColor}55`,
                      background: `${merchantThemeColor}1A`,
                      color: merchantThemeColor ?? undefined,
                    }}
                  >
                    <MerchantHeroIcon className="h-6 w-6" />
                  </div>
                ) : isMia ? (
                  <div className="relative">
                    <div className="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-2 w-[2px] rounded-full bg-[#C9A06A]"
                          animate={{ y: [-1, -5, -1], opacity: [0.25, 0.75, 0.25] }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E2C9A1] bg-[#FAEFD9]">
                      <Coffee className="h-6 w-6 text-[#7A4E2A]" />
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted"
                    style={{ color: vibeVisual[activeVibe].borderColor }}
                  >
                    {activeVibe === "event" ? (
                      <Utensils className="h-6 w-6" />
                    ) : activeVibe === "rainy" ? (
                      <Coffee className="h-6 w-6" />
                    ) : (
                      <Store className="h-6 w-6" />
                    )}
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-lg font-bold leading-tight">
                    {liveMerchant && evaluatedOffer
                      ? isWalking
                        ? `Walk to ${liveMerchant.name}`
                        : evaluatedOffer.headline
                      : isMia
                        ? `Warm up at ${cityPulse.cafeName}`
                        : offer.title}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {liveMerchant
                      ? `${liveMerchant.name} · ${liveMerchant.signature} · ${distToMerchant} m`
                      : isMia
                        ? `${cityPulse.temperatureC}°C overcast · 80 m · just brewed`
                        : offer.merchantName}
                  </p>
                </div>
              </div>

              {liveMerchant && evaluatedOffer ? (
                <p
                  className="relative mt-4 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed text-foreground"
                  style={{
                    borderColor: `${merchantThemeColor}55`,
                    background: `${merchantThemeColor}10`,
                  }}
                >
                  {evaluatedOffer.message}
                </p>
              ) : isMia ? (
                <p className="relative mt-4 rounded-2xl border border-[#EDD8B4] bg-[#FFF8EC] px-4 py-3 text-[13px] leading-relaxed text-foreground">
                  Because it&apos;s {cityPulse.temperatureC}°C, you&apos;ve slowed down twice in 10 min, and a
                  quiet café 80&nbsp;m away just brewed fresh coffee — perfect to warm up.
                </p>
              ) : (
                <p className="relative mt-3 text-sm text-muted-foreground">{offer.description}</p>
              )}

              {signals.length ? (
                <div className="relative mt-4 flex flex-wrap gap-2">
                  {signals.map((s, i) => {
                    const Icon = s.icon;
                    const merchantChip = !!liveMerchant;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={
                          merchantChip
                            ? {
                                borderColor: `${merchantThemeColor}40`,
                                background: "var(--surface)",
                                color: merchantThemeColor ?? undefined,
                              }
                            : isMia
                              ? {
                                  borderColor: "#E5CFAA",
                                  background: "rgba(255,255,255,0.7)",
                                  color: "#5C3A14",
                                }
                              : undefined
                        }
                      >
                        <Icon className="h-3 w-3 opacity-80" />
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="relative mt-5 flex items-center justify-between gap-3">
                <div
                  className="inline-flex items-center rounded-2xl border px-3 py-2 text-xs font-semibold"
                  style={
                    liveMerchant
                      ? {
                          borderColor: `${merchantThemeColor}66`,
                          background: `${merchantThemeColor}1A`,
                          color: merchantThemeColor ?? undefined,
                        }
                      : isMia
                        ? {
                            borderColor: "#E2C9A1",
                            background: "#FFF1DB",
                            color: "#8C5A28",
                          }
                        : { color: vibeVisual[activeVibe].borderColor }
                  }
                >
                  {liveMerchant && evaluatedOffer
                    ? evaluatedOffer.discount
                    : isMia
                      ? "20% OFF · next 15 min"
                      : offer.discount}
                </div>
                {canRedeem ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Tap to redeem <ChevronRight className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    No promo · greeting
                  </span>
                )}
              </div>

              <div className="relative mt-4 flex flex-col gap-1 border-t border-border pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>
                    {evaluatedOffer?.fired
                      ? `Computed by Vibe Engine · ${evaluatedOffer.signalsMatched.length} signal${evaluatedOffer.signalsMatched.length === 1 ? "" : "s"} matched`
                      : evaluatedOffer
                        ? `Computed by Vibe Engine · ${evaluatedOffer.activationState.replace("_", " ")}`
                        : "Computed by Vibe Engine · context fallback"}
                  </span>
                  <span>Settled via Payone Riel</span>
                </div>
                {evaluatedOffer ? (
                  <span className="text-[9px] normal-case tracking-normal text-muted-foreground/80">
                    Powered by Payone · {evaluatedOffer.transactionSummary}
                  </span>
                ) : null}
                {evaluatedOffer?.rule ? (
                  <span className="text-[9px] normal-case tracking-normal text-muted-foreground/80">
                    Rule: <span className="font-semibold">{evaluatedOffer.rule.label}</span> · priority {evaluatedOffer.rule.priority} · merchant-defined
                  </span>
                ) : (
                  <span className="text-[9px] normal-case tracking-normal text-muted-foreground/80">
                    Verified via Tavily Search
                  </span>
                )}
              </div>
            </button>
          );
        })()}

      </main>

      <AnimatePresence>
        {isQrOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4"
            onClick={() => setIsQrOpen(false)}
          >
            <motion.section
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Scan to redeem</p>
                <button
                  onClick={() => setIsQrOpen(false)}
                  className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:text-foreground"
                  aria-label="Close QR modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mx-auto mb-4 grid w-48 grid-cols-9 gap-1 rounded-2xl bg-white p-3">
                {qrCells.map((filled, idx) => (
                  <div key={idx} className={`h-4 w-4 rounded-[2px] ${filled ? "bg-black" : "bg-white"}`} />
                ))}
              </div>

              <p className="text-center text-sm font-medium text-foreground">
                {liveMerchantFromRules
                  ? `Pay with VibePay at ${liveMerchantFromRules.name} to redeem your live offer.`
                  : `Pay with VibePay at ${offer.merchantName} to redeem your ${offer.discount}.`}
              </p>
              <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
                Computed by Vibe Engine
              </p>

              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                  <span>Pay</span>
                  <span aria-hidden>→</span>
                  <PayoneSeal variant="rail" tone="live" trailing="instant settlement" />
                </div>
                <p className="text-center text-[10px] leading-snug text-emerald-900/80">
                  Cleared in &lt; 1 s on the DSV Gruppe rail. Cashback lands in your wallet automatically.
                </p>
              </div>

              <div className="mt-3 flex justify-center">
                <PayoneSeal variant="wordmark" />
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </MobileShell>
  );
}
