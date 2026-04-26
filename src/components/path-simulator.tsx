import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Crosshair,
  Footprints,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAppContext } from "@/lib/app-context";
import { useVibe } from "@/lib/vibe-context";
import {
  MIA_LOCATION_PRESETS,
  distanceMeters,
  findNearbyMatchingMerchants,
  interpolate,
  projectToSvg,
  unprojectFromSvg,
  type GeoPoint,
  type LocalMerchant,
  type VibeMatch,
} from "@/lib/merchantData";
import { useMerchants } from "@/lib/merchant-rules-context";
import { getTimeBucket } from "@/lib/vibeEngine";
import { buildOfferContext, evaluateOffer } from "@/lib/offerEngine";
import { buildProximityPushCopy } from "@/lib/coPilotOffer";
import { MIA_VIBEPAY_PREFERENCE_TAGS } from "@/lib/miaConsumerProfile";
import type { MiaPulseWeather } from "@/lib/i18n/types";
import { getWalkingRoute, isGoogleMapsConfigured } from "@/lib/googleMapsService";
import { DEMO_MERCHANT_ID } from "@/lib/merchant-demo-profile";
import { useI18n } from "@/lib/i18n/context";
import { GoogleMapView } from "./google-map-view";

const MAP_WIDTH = 320;
const MAP_HEIGHT = 200;

const CATEGORY_COLOR: Record<LocalMerchant["category"], string> = {
  cafe: "#7A4E2A",
  bakery: "#C98A4B",
  bistro: "#C84F2E",
  weinstube: "#6B2D5C",
  gelateria: "#E59A4D",
  boutique: "#3E5D7E",
};

const STREETS: Array<{ d: string }> = [
  { d: "M 0 60 L 320 80" },
  { d: "M 0 120 L 320 100" },
  { d: "M 0 160 L 320 170" },
  { d: "M 60 0 L 80 200" },
  { d: "M 160 0 L 165 200" },
  { d: "M 240 0 L 230 200" },
];

const WALK_SPEED_MPS = 2;
const WALK_SPEED_KMH = +(WALK_SPEED_MPS * 3.6).toFixed(1);
const WALK_TICK_MS = 60;
/** Default radius when Mia’s path passes near a merchant pin (Google walking routes often arc around blocks). */
const PROXIMITY_RADIUS_M = 130;
/** Wider catchment for the DSV / demo affiliate pin so jury walks reliably trigger a push. */
const AFFILIATE_PROXIMITY_RADIUS_M = 220;

type RouteSource = "google" | "fallback" | null;

function bucketToVibe(bucket: ReturnType<typeof getTimeBucket>): VibeMatch | null {
  if (bucket === "morning" || bucket === "evening" || bucket === "night") return bucket;
  /** Lunch window: seed merchants like the demo bakery tag `cold` / afternoon treats. */
  if (bucket === "afternoon") return "cold";
  /** No simulated clock: still allow `cold`-tagged merchants (e.g. Bäckerei Treiber) to match. */
  if (bucket === "unspecified") return "cold";
  return null;
}

function vibeKeyToMatches(vibeKey: string): VibeMatch[] {
  if (vibeKey === "rainy") return ["rainy", "cold"];
  if (vibeKey === "sunny") return ["sunny"];
  if (vibeKey === "nighttime") return ["night", "evening"];
  if (vibeKey === "event") return ["event"];
  if (vibeKey === "clear") return ["cold"];
  return ["cold"];
}

function formatPushTime(simulatedTime: string | null): string {
  if (simulatedTime) return simulatedTime;
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function vibeKeyToPulse(v: string): MiaPulseWeather | undefined {
  if (v === "sunny") return "sunny";
  if (v === "rainy") return "rainy";
  if (v === "nighttime") return "nighttime";
  return undefined;
}

function buildPolylineD(points: GeoPoint[]): string {
  return points
    .map((p, i) => {
      const xy = projectToSvg(p, MAP_WIDTH, MAP_HEIGHT);
      return `${i === 0 ? "M" : "L"} ${xy.x.toFixed(1)} ${xy.y.toFixed(1)}`;
    })
    .join(" ");
}

function totalRouteDistance(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceMeters(points[i - 1], points[i]);
  }
  return total;
}

type MapClickMode = "destination" | "origin";

export function PathSimulator() {
  const {
    miaPosition,
    setMiaPosition,
    miaOrigin,
    setMiaOrigin,
    destination,
    setDestination,
    isWalking,
    setIsWalking,
    showPushNotification,
    setSimulatedMerchant,
    notifiedMerchantIds,
    markMerchantNotified,
    clearNotifiedMerchants,
    resetWalkSession,
    commitStandingLocation,
    simulatedTime,
  } = useAppContext();
  const { vibe } = useVibe();
  const { t, locale } = useI18n();
  const merchants = useMerchants();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [pathPoints, setPathPoints] = useState<GeoPoint[]>([]);
  const [routeSource, setRouteSource] = useState<RouteSource>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [useGoogleMap, setUseGoogleMap] = useState<boolean>(() => isGoogleMapsConfigured());
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  /** Whether the next map click sets a destination or moves Mia's origin. */
  const [mapClickMode, setMapClickMode] = useState<MapClickMode>("destination");

  const matchingVibes = useMemo<VibeMatch[]>(() => {
    const fromVibe = vibeKeyToMatches(vibe);
    const bucket = bucketToVibe(getTimeBucket(simulatedTime));
    return bucket ? Array.from(new Set([...fromVibe, bucket])) : fromVibe;
  }, [vibe, simulatedTime]);

  const distanceToDestM = useMemo(() => {
    if (!destination) return 0;
    return Math.round(distanceMeters(miaPosition, destination));
  }, [miaPosition, destination]);

  const totalRouteDistM = useMemo(
    () => Math.round(totalRouteDistance(pathPoints)),
    [pathPoints],
  );

  const totalRouteDurationS = useMemo(() => {
    if (totalRouteDistM <= 0) return 0;
    return Math.max(1, Math.round((totalRouteDistM / WALK_SPEED_MPS) * 10) / 10);
  }, [totalRouteDistM]);

  useEffect(() => {
    if (!destination) {
      setPathPoints([]);
      setRouteSource(null);
      setRouteError(null);
      setIsLoadingRoute(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRoute(true);
    setRouteError(null);

    const fallback = () => {
      setPathPoints([miaOrigin, destination]);
      setRouteSource("fallback");
    };

    if (!isGoogleMapsConfigured()) {
      fallback();
      setRouteError("Add VITE_GOOGLE_MAPS_API_KEY for real walking paths. Using straight line.");
      setIsLoadingRoute(false);
      return;
    }

    getWalkingRoute(miaOrigin, destination)
      .then((points) => {
        if (cancelled) return;
        if (points.length < 2) {
          fallback();
          setRouteError("Google Maps returned an empty route — using straight line.");
        } else {
          setPathPoints(points);
          setRouteSource("google");
        }
        setIsLoadingRoute(false);
      })
      .catch((err: Error & { code?: string }) => {
        if (cancelled) return;
        fallback();
        if (err.code === "DIRECTIONS_API_DISABLED") {
          setRouteError("DIRECTIONS_API_DISABLED");
        } else {
          setRouteError(err.message);
        }
        setIsLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destination, miaOrigin]);

  const setFreshDestination = (point: GeoPoint) => {
    setIsWalking(false);
    setMiaPosition(miaOrigin);
    setDestination(point);
    clearNotifiedMerchants();
  };

  const handleMapPick = (point: GeoPoint) => {
    if (mapClickMode === "origin") {
      setMiaOrigin(point);
      setMapClickMode("destination");
      return;
    }
    setFreshDestination(point);
  };

  const handleSvgClick: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const point = unprojectFromSvg({ x, y }, MAP_WIDTH, MAP_HEIGHT);
    handleMapPick(point);
  };

  const pickMerchantAsDestination = (merchant: LocalMerchant) => {
    if (mapClickMode === "origin") {
      // While in origin mode, tapping a merchant snaps Mia to that pin so
      // you can rapidly demo "what offers light up if Mia were standing here?"
      setMiaOrigin(merchant.position);
      setMapClickMode("destination");
      return;
    }
    setFreshDestination(merchant.position);
  };

  const activePresetId = MIA_LOCATION_PRESETS.find(
    (p) => Math.abs(p.position.lat - miaOrigin.lat) < 1e-5 && Math.abs(p.position.lng - miaOrigin.lng) < 1e-5,
  )?.id ?? null;

  const elapsedRef = useRef(0);
  const miaPositionRef = useRef(miaPosition);
  miaPositionRef.current = miaPosition;
  /** DEV: one warning per walk if Treiber is in range but Payone traffic gate blocks the push. */
  const affiliateLowTrafficDevWarnedRef = useRef(false);

  const handleStart = () => {
    if (!destination || pathPoints.length < 2 || isLoadingRoute) return;
    const arrived =
      destination && distanceMeters(miaPosition, destination) < 1.5;
    if (arrived) {
      setMiaPosition(miaOrigin);
      elapsedRef.current = 0;
      clearNotifiedMerchants();
    }
    affiliateLowTrafficDevWarnedRef.current = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vibepay-simulated-walk", { detail: { phase: "start" } }));
    }
    setIsWalking(true);
  };

  const handlePause = () => {
    commitStandingLocation(miaPositionRef.current);
  };

  const handleReset = () => {
    elapsedRef.current = 0;
    resetWalkSession();
  };

  useEffect(() => {
    if (!destination) elapsedRef.current = 0;
  }, [destination]);

  useEffect(() => {
    if (!isWalking) return;
    if (pathPoints.length < 2) {
      if (destination) return;
      setIsWalking(false);
      return;
    }

    const cumulative: number[] = [0];
    for (let i = 1; i < pathPoints.length; i++) {
      cumulative.push(cumulative[i - 1] + distanceMeters(pathPoints[i - 1], pathPoints[i]));
    }
    const totalDist = cumulative[cumulative.length - 1];

    if (totalDist <= 0) {
      setIsWalking(false);
      return;
    }

    let lastTick = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;
      elapsedRef.current += dt;

      const targetDist = Math.min(totalDist, (elapsedRef.current / 1000) * WALK_SPEED_MPS);

      let segIdx = 0;
      while (segIdx < cumulative.length - 2 && cumulative[segIdx + 1] < targetDist) {
        segIdx += 1;
      }

      const segStart = pathPoints[segIdx];
      const segEnd = pathPoints[Math.min(segIdx + 1, pathPoints.length - 1)];
      const segLen = (cumulative[segIdx + 1] ?? cumulative[segIdx]) - cumulative[segIdx];
      const segT = segLen > 0 ? (targetDist - cumulative[segIdx]) / segLen : 1;

      const next = interpolate(segStart, segEnd, segT);
      miaPositionRef.current = next;
      setMiaPosition(next);

      let nearby = findNearbyMatchingMerchants(
        merchants,
        next,
        PROXIMITY_RADIUS_M,
        matchingVibes,
        notifiedMerchantIds,
      );

      const affiliate = merchants.find((m) => m.id === DEMO_MERCHANT_ID);
      if (
        affiliate &&
        !notifiedMerchantIds.has(DEMO_MERCHANT_ID) &&
        distanceMeters(next, affiliate.position) <= AFFILIATE_PROXIMITY_RADIUS_M
      ) {
        if (!nearby.some((m) => m.id === DEMO_MERCHANT_ID)) {
          nearby = [...nearby, affiliate];
        }
      }

      nearby.sort(
        (a, b) => distanceMeters(next, a.position) - distanceMeters(next, b.position),
      );

      if (nearby.length > 0) {
        // Pick the closest nearby merchant that is currently in low_traffic mode.
        // Merchants with target reached or steady traffic are silently skipped:
        // VibePay never disturbs Mia for shops that don't need a boost.
        const weatherVibe = vibe === "rainy" ? "rainy" : vibe === "sunny" ? "sunny" : "cloudy";
        const isCold = vibe === "rainy" || vibe === "nighttime";

        const evaluatedNearby = nearby.map((m) => ({
          merchant: m,
          evaluated: evaluateOffer(
            m,
            buildOfferContext({
              weatherVibe,
              isCold,
              simulatedTime,
              occupancy: m.occupancy,
            }),
          ),
        }));

        const activated = evaluatedNearby.find((x) => x.evaluated.activationState === "low_traffic");

        if (import.meta.env.DEV && !affiliateLowTrafficDevWarnedRef.current) {
          const affEv = evaluatedNearby.find((x) => x.merchant.id === DEMO_MERCHANT_ID);
          if (affEv && affEv.evaluated.activationState !== "low_traffic") {
            affiliateLowTrafficDevWarnedRef.current = true;
            console.warn(
              "[VibePay] Bäckerei Treiber está en rango pero no hay push:",
              affEv.evaluated.activationState,
              "—",
              affEv.evaluated.transactionSummary,
              "Baja «Transacciones hoy» en /merchant o en merchants en Supabase.",
            );
          }
        }

        if (activated) {
          const { merchant, evaluated } = activated;
          markMerchantNotified(merchant.id);
          setSimulatedMerchant(merchant);

          const copy = buildProximityPushCopy({
            merchant,
            evaluated,
            timeBucket: getTimeBucket(simulatedTime ?? null),
            pulseWeather: vibeKeyToPulse(vibe),
            locale,
            miaPreferenceTags: MIA_VIBEPAY_PREFERENCE_TAGS,
          });
          const stableClientId = `proximity-${merchant.id}`;

          showPushNotification({
            id: stableClientId,
            title: copy.title,
            subtitle: copy.subtitle,
            body: copy.body,
            merchant,
            timestamp: formatPushTime(simulatedTime),
          });
        }
        /** If no push (e.g. traffic still "normal"), do NOT mark merchants notified — otherwise
         *  lowering "Transactions today" in the simulator never retries. */
      }

      if (targetDist >= totalDist) {
        window.clearInterval(interval);
        commitStandingLocation(next);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vibepay-simulated-walk", { detail: { phase: "end" } }));
        }
      }
    }, WALK_TICK_MS);

    return () => window.clearInterval(interval);
  }, [
    isWalking,
    destination,
    pathPoints,
    matchingVibes,
    notifiedMerchantIds,
    markMerchantNotified,
    setMiaPosition,
    commitStandingLocation,
    setSimulatedMerchant,
    showPushNotification,
    simulatedTime,
    merchants,
    vibe,
    locale,
  ]);

  const miaXY = projectToSvg(miaPosition, MAP_WIDTH, MAP_HEIGHT);
  const destXY = destination ? projectToSvg(destination, MAP_WIDTH, MAP_HEIGHT) : null;
  const startXY = projectToSvg(miaOrigin, MAP_WIDTH, MAP_HEIGHT);
  const polylineD = pathPoints.length > 1 ? buildPolylineD(pathPoints) : "";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Path Simulator
          </p>
          <p className="text-[11px] text-muted-foreground">
            {mapClickMode === "origin"
              ? "Tap the map or a pin to drop Mia there"
              : "Tap a pin or the map to set destination"}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/90">
            {t("simulator.pathProximityHint")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapClickMode((m) => (m === "origin" ? "destination" : "origin"))}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
              mapClickMode === "origin"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={mapClickMode === "origin"}
            aria-label="Set Mia's location"
          >
            <Crosshair className="h-3 w-3" />
            {mapClickMode === "origin" ? "Picking location…" : "Set Mia's location"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted"
            aria-label="Reset walk"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Home className="h-3 w-3" /> Mia is at
        </span>
        {MIA_LOCATION_PRESETS.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setMiaOrigin(preset.position)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
              title={preset.hint}
              aria-pressed={active}
            >
              {preset.label}
            </button>
          );
        })}
        {!activePresetId ? (
          <span className="rounded-full border border-dashed border-border bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
            custom pin
          </span>
        ) : null}
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-[10px]">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
            isGoogleMapsConfigured()
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          {isGoogleMapsConfigured() ? "Google key · ok" : "Google key · missing"}
        </span>
        <span className="text-muted-foreground">
          {useGoogleMap && !mapLoadError
            ? "Live map embedded"
            : mapLoadError
              ? "Live map blocked → fallback"
              : "Using SVG fallback"}
        </span>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border bg-[#F4EEE2] transition ${
          mapClickMode === "origin"
            ? "border-primary ring-2 ring-primary/40"
            : "border-border"
        }`}
      >
        {useGoogleMap && !mapLoadError ? (
          <GoogleMapView
            miaPosition={miaPosition}
            origin={miaOrigin}
            destination={destination}
            pathPoints={pathPoints}
            matchingVibes={matchingVibes}
            isWalking={isWalking}
            routeSource={routeSource}
            affiliatedMerchantId={DEMO_MERCHANT_ID}
            affiliatedLabel={t("map.affiliatePin")}
            onMerchantClick={pickMerchantAsDestination}
            onMapClick={handleMapPick}
            onLoadError={(err) => {
              setMapLoadError(err.message);
              setUseGoogleMap(false);
            }}
          />
        ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          onClick={handleSvgClick}
          className="block h-auto w-full cursor-crosshair"
          role="img"
          aria-label="Stuttgart Old Town mini-map"
        >
          <defs>
            <pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#F4EEE2" />
              <circle cx="1" cy="1" r="0.4" fill="#E2D5BD" />
            </pattern>
            <radialGradient id="miaGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#3E89FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3E89FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#paper)" />

          {STREETS.map((s, i) => (
            <path
              key={i}
              d={s.d}
              stroke="#D4C5A8"
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {STREETS.map((s, i) => (
            <path
              key={`c-${i}`}
              d={s.d}
              stroke="#FBF6EC"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          <rect
            x={140}
            y={110}
            width={50}
            height={32}
            rx={3}
            fill="#E8DCC2"
            stroke="#C9B68C"
            strokeWidth={0.5}
          />
          <text
            x={165}
            y={130}
            textAnchor="middle"
            fontSize="7"
            fontWeight="600"
            fill="#7A6033"
            style={{ pointerEvents: "none" }}
          >
            Marktplatz
          </text>

          {polylineD ? (
            <path
              d={polylineD}
              fill="none"
              stroke="#3E89FF"
              strokeWidth={routeSource === "google" ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={routeSource === "google" ? undefined : "3 3"}
              opacity={routeSource === "google" ? 0.9 : 0.7}
            />
          ) : null}

          {merchants.map((m) => {
            const xy = projectToSvg(m.position, MAP_WIDTH, MAP_HEIGHT);
            const matches = m.vibesMatch.some((v) => matchingVibes.includes(v));
            const isHover = hoveredId === m.id;
            const isAffiliate = m.id === DEMO_MERCHANT_ID;
            const pinR = isAffiliate ? (isHover ? 6 : 5) : isHover ? 5 : 4;
            return (
              <g
                key={m.id}
                transform={`translate(${xy.x}, ${xy.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  pickMerchantAsDestination(m);
                }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
              >
                {isAffiliate ? (
                  <circle
                    r={14}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    opacity={0.95}
                  />
                ) : null}
                {matches ? (
                  <circle
                    r={isAffiliate ? 11 : 9}
                    fill={CATEGORY_COLOR[m.category]}
                    fillOpacity="0.18"
                  />
                ) : null}
                <circle
                  r={pinR}
                  fill={CATEGORY_COLOR[m.category]}
                  stroke={isAffiliate ? "#D97706" : "#FFFFFF"}
                  strokeWidth={isAffiliate ? 2.25 : 1.5}
                />
                {isAffiliate ? (
                  <text
                    y={-18}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="700"
                    fill="#B45309"
                    style={{ pointerEvents: "none" }}
                  >
                    {t("map.affiliatePin")}
                  </text>
                ) : null}
                {isHover ? (
                  <g pointerEvents="none">
                    <rect
                      x={-58}
                      y={-26}
                      width={116}
                      height={16}
                      rx={3}
                      fill="#16181D"
                      opacity="0.92"
                    />
                    <text x={0} y={-15} textAnchor="middle" fontSize="8" fill="#FFFFFF">
                      {m.name}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          <g transform={`translate(${startXY.x}, ${startXY.y})`} pointerEvents="none">
            <circle r={4} fill="#FFFFFF" stroke="#3E89FF" strokeWidth={1.5} />
          </g>

          {destXY ? (
            <g transform={`translate(${destXY.x}, ${destXY.y})`} pointerEvents="none">
              <circle r={10} fill="none" stroke="#EC0000" strokeWidth={1.5} strokeDasharray="2 2" />
              <circle r={3} fill="#EC0000" />
            </g>
          ) : null}

          <g transform={`translate(${miaXY.x}, ${miaXY.y})`} pointerEvents="none">
            <circle r={14} fill="url(#miaGlow)" />
            <circle r={5} fill="#3E89FF" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={0} y={-10} textAnchor="middle" fontSize="8" fontWeight="700" fill="#3E89FF">
              Mia
            </text>
          </g>
        </svg>
        )}

        <div className="pointer-events-none absolute left-2 top-2 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur ${
              useGoogleMap && !mapLoadError
                ? "bg-emerald-500/90 text-white"
                : "bg-white/85 text-muted-foreground"
            }`}
          >
            {useGoogleMap && !mapLoadError ? "Live · Google Maps" : "SVG fallback"}
          </span>
        </div>

        {mapClickMode === "origin" ? (
          <div className="pointer-events-none absolute inset-x-2 top-9 z-10 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-lg">
              <Crosshair className="h-3 w-3" />
              Click anywhere to drop Mia here
            </span>
          </div>
        ) : null}
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur ${
              routeSource === "google"
                ? "bg-emerald-500/90 text-white"
                : routeSource === "fallback"
                  ? "bg-amber-500/90 text-white"
                  : "bg-white/80 text-muted-foreground"
            }`}
          >
            {routeSource === "google"
              ? "Route · WALKING"
              : routeSource === "fallback"
                ? "Straight-line"
                : "Idle"}
          </span>
          {isLoadingRoute ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-sm backdrop-blur">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Routing…
            </span>
          ) : null}
        </div>
      </div>

      {mapLoadError ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-900">
          <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
          <span>
            Live map failed to load: {mapLoadError}. Showing SVG fallback. Check your API key
            restrictions in Google Cloud Console.
          </span>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["cafe", "bakery", "bistro", "gelateria", "weinstube", "boutique"] as const).map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: CATEGORY_COLOR[c] }}
            />
            {c}
          </span>
        ))}
      </div>

      {routeError === "DIRECTIONS_API_DISABLED" ? (
        <div className="mt-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Directions API not enabled</p>
              <p className="mt-0.5 text-amber-800">
                The map loaded, but Google rejected the route request. Mia is currently walking
                straight-line. To get street-following routes:
              </p>
              <ol className="mt-1 list-decimal pl-4 text-amber-800">
                <li>
                  Open{" "}
                  <a
                    href="https://console.cloud.google.com/apis/library/directions-backend.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline"
                  >
                    Directions API
                  </a>{" "}
                  in Google Cloud Console.
                </li>
                <li>Select your project and click <span className="font-semibold">Enable</span>.</li>
                <li>Pick the destination again — no reload needed.</li>
              </ol>
            </div>
          </div>
        </div>
      ) : routeError ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-900">
          <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
          <span>{routeError}</span>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Navigation className="h-3 w-3" />
            {destination ? (
              <span>
                Route:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {totalRouteDistM > 0 ? totalRouteDistM : distanceToDestM} m
                </span>
                {totalRouteDurationS > 0 ? (
                  <span className="ml-1 text-muted-foreground">
                    · ~{totalRouteDurationS}s @ walking pace ({WALK_SPEED_KMH} km/h)
                  </span>
                ) : null}
              </span>
            ) : (
              <span>Pick a pin or tap the map</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>
              Listening for: <span className="text-foreground">{matchingVibes.join(" · ")}</span>
            </span>
          </div>
        </div>
        {isWalking ? (
          <button
            type="button"
            onClick={handlePause}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!destination || pathPoints.length < 2 || isLoadingRoute}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoadingRoute ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {isLoadingRoute ? "Routing…" : "Start walk"}
          </button>
        )}
      </div>

      {isWalking ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <Footprints className="h-3 w-3 text-primary" />
          <motion.span
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <MapPin className="h-3 w-3" /> Mia walking · sensing local merchants
          </motion.span>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground">
        Modular: each pin is a `LocalMerchant` record. The live map and routes come from Google
        Maps (<code className="rounded bg-muted px-1">travelMode: WALKING</code>); the dot snaps
        to real sidewalks. SVG fallback kicks in automatically if the API key is missing or
        restricted.
      </p>
    </div>
  );
}
