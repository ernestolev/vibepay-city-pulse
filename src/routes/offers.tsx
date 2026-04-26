import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CoPilotMiaOfferCard } from "@/components/co-pilot-mia-offer-card";
import { CoPilotRedemptionModal } from "@/components/co-pilot-redemption-modal";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { Skeleton } from "@/components/ui/skeleton";
import { useNowTick } from "@/hooks/use-now-tick";
import { useRedeemedOfferIds } from "@/hooks/use-redeemed-offer-ids";
import { useOfferCountdown } from "@/hooks/use-offer-countdown";
import {
  buildMiaFlashDescriptionI18n,
  buildOwnerCoPilotInsightI18n,
  CATEGORY_RETAIL_LABEL,
  formatCountdown,
  listMiaFlashOffers,
} from "@/lib/coPilotOffer";
import { listWeatherDemoQuickPicks, proposeFlashOfferFromInventory } from "@/lib/inventoryOfferAgent";
import { MIA_VIBEPAY_PREFERENCE_TAGS } from "@/lib/miaConsumerProfile";
import { useAppContext } from "@/lib/app-context";
import { getTimeBucket } from "@/lib/vibeEngine";
import { useI18n } from "@/lib/i18n/context";
import { DEMO_MERCHANT_ID, DEMO_STORE } from "@/lib/merchant-demo-profile";
import { useMerchantRules, useMerchants, useMerchantsRemoteHydrated } from "@/lib/merchant-rules-context";
import {
  buildOfferContext,
  evaluateOffer,
  type ActivationState,
  type EvaluatedOffer,
} from "@/lib/offerEngine";
import {
  activeFlashProductIds,
  activeFlashSlots,
  type LocalMerchant,
  merchantHasAnyActiveFlash,
  merchantHasStaleFlashOnly,
  syncLegacyFieldsFromFlashOffers,
} from "@/lib/merchantData";
import type { VibeKey } from "@/lib/vibe";
import {
  getCityPulseForSimulator,
  resolveInventoryVibe,
  simulatorAlignedWithTavily,
  type CityPulseResult,
} from "@/lib/tavilyService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useVibe } from "@/lib/vibe-context";

const FLASH_DISCOUNT_PCT = 30;
const FLASH_DURATION_MIN = 20;
const MAX_CONCURRENT_FLASH = 12;

function miaPulseFromSimulatorVibe(vibe: VibeKey): "sunny" | "rainy" | "cloudy" | "nighttime" {
  if (vibe === "rainy") return "rainy";
  if (vibe === "sunny") return "sunny";
  if (vibe === "nighttime") return "nighttime";
  return "cloudy";
}

function OwnerFlashSlotRow({
  title,
  discountPct,
  endsAt,
  productId,
  onRemove,
}: {
  title: string;
  discountPct: number;
  endsAt: number;
  productId: string | null;
  onRemove: () => void;
}) {
  const secLeft = useOfferCountdown(endsAt);
  return (
    <div className="mt-3 rounded-xl border border-emerald-200/80 bg-surface/90 px-3 py-3 dark:border-emerald-800/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">{title}</p>
          <p className="mt-0.5 text-[11px] text-emerald-900/85 dark:text-emerald-200/85">
            {discountPct}% ·{" "}
            <span className="font-mono font-bold tabular-nums">{formatCountdown(secLeft)}</span>
            {productId ? (
              <span className="mt-0.5 block font-normal opacity-90">SKU: {productId}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-emerald-300 px-2 py-1 text-[10px] font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "VibePay — Offers" },
      {
        name: "description",
        content:
          "Live merchant offers gated by Payone settlement traffic — only surfaces when shops actually need a boost.",
      },
    ],
  }),
  component: OffersPage,
});

interface MerchantOfferRow {
  merchant: LocalMerchant;
  offer: EvaluatedOffer;
}

function OffersPage() {
  const merchants = useMerchants();
  const { simulatedTime, appPersona } = useAppContext();
  const { vibe } = useVibe();

  const rows = useMemo<MerchantOfferRow[]>(() => {
    return merchants.map((m) => {
      const ctx = buildOfferContext({
        weatherVibe: vibe === "rainy" ? "rainy" : vibe === "sunny" ? "sunny" : "cloudy",
        isCold: vibe === "rainy" || vibe === "nighttime",
        simulatedTime,
        occupancy: m.occupancy,
      });
      return { merchant: m, offer: evaluateOffer(m, ctx) };
    });
  }, [merchants, simulatedTime, vibe]);

  const myStoreRows = useMemo(
    () => rows.filter((r) => r.merchant.id === DEMO_MERCHANT_ID),
    [rows],
  );

  if (appPersona === "merchant") {
    return <MerchantOffersView rows={myStoreRows} />;
  }

  return <MiaConsumerOffersView />;
}

function MiaConsumerOffersView() {
  const { t, locale } = useI18n();
  const merchants = useMerchants();
  const merchantsRemoteHydrated = useMerchantsRemoteHydrated();
  const { vibe } = useVibe();
  const { simulatedTime } = useAppContext();
  const nowTick = useNowTick();
  const { isOfferRedeemed, redeemedHydrated } = useRedeemedOfferIds();
  const merchantsLoadingRemote = isSupabaseConfigured() && !merchantsRemoteHydrated;
  const flashOffers = useMemo(
    () =>
      listMiaFlashOffers(merchants, {
        miaPreferenceTags: MIA_VIBEPAY_PREFERENCE_TAGS,
        pulseWeather: miaPulseFromSimulatorVibe(vibe),
        timeBucket: getTimeBucket(simulatedTime),
        locale,
      }),
    [merchants, nowTick, vibe, simulatedTime, locale],
  );
  const [qrOpen, setQrOpen] = useState(false);
  const [qrFocusId, setQrFocusId] = useState<string | null>(null);

  const qrOffer = useMemo(
    () => (qrFocusId ? flashOffers.find((o) => o.id === qrFocusId) ?? null : null),
    [flashOffers, qrFocusId],
  );

  useEffect(() => {
    if (qrFocusId && !flashOffers.some((o) => o.id === qrFocusId)) {
      setQrFocusId(null);
      setQrOpen(false);
    }
  }, [flashOffers, qrFocusId]);

  useEffect(() => {
    if (qrOffer && redeemedHydrated && isOfferRedeemed(qrOffer.id)) {
      setQrOpen(false);
      setQrFocusId(null);
    }
  }, [qrOffer, redeemedHydrated, isOfferRedeemed]);

  const live = flashOffers.length > 0;

  const offerRedeemed = (offerId: string) => redeemedHydrated && isOfferRedeemed(offerId);

  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12 md:px-8 md:pt-8 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("offers.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("offers.subtitle")}</p>
      </header>

      <main className="space-y-6 px-5 pb-8 md:px-8 lg:px-10">
        {merchantsLoadingRemote ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-5"
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
            ))}
          </div>
        ) : !live ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">{t("offers.emptyTitle")}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("offers.emptyBody")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flashOffers.map((offer) => (
              <CoPilotMiaOfferCard
                key={offer.id}
                offer={offer}
                redeemed={offerRedeemed(offer.id)}
                onRedeem={() => {
                  setQrFocusId(offer.id);
                  setQrOpen(true);
                }}
              />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border/80 bg-surface/80 px-4 py-3 text-center text-[11px] text-muted-foreground">
          {t("offers.footer", { payone: "Payone Riel" })}
        </div>
        <div className="flex justify-end">
          <PayoneSeal variant="wordmark" />
        </div>
      </main>

      <CoPilotRedemptionModal
        open={qrOpen && !!qrOffer}
        onClose={() => {
          setQrOpen(false);
          setQrFocusId(null);
        }}
        offer={qrOffer}
        redeemed={qrOffer ? offerRedeemed(qrOffer.id) : false}
      />
    </MobileShell>
  );
}

function MerchantOffersView({ rows }: { rows: MerchantOfferRow[] }) {
  const { t, locale } = useI18n();
  const stateLabel = useMemo(
    () =>
      ({
        low_traffic: t("simulator.activation.low"),
        normal: t("simulator.activation.normal"),
        target_reached: t("simulator.activation.done"),
      }) as Record<ActivationState, string>,
    [t],
  );
  const [demoBoostPct, setDemoBoostPct] = useState(2);
  const [proposalNonce, setProposalNonce] = useState(0);
  const [pulseResult, setPulseResult] = useState<CityPulseResult | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const { updateMerchant } = useMerchantRules();
  const { vibe } = useVibe();
  const { simulatedTime, miaOrigin } = useAppContext();

  const merchant = rows[0]?.merchant;
  const payoneSalesToday = merchant?.currentTransactionsToday ?? 0;
  const targetThreshold = merchant?.lowTrafficThreshold ?? 12;
  const trafficSuggested =
    !!merchant &&
    payoneSalesToday < targetThreshold &&
    !merchant.dailyTargetReached;

  useEffect(() => {
    let cancelled = false;
    setPulseLoading(true);
    const timer = window.setTimeout(() => {
      void getCityPulseForSimulator({
        vibe,
        simulatedTime,
        lat: miaOrigin.lat,
        lng: miaOrigin.lng,
      }).then((r) => {
        if (!cancelled) {
          setPulseResult(r);
          setPulseLoading(false);
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [vibe, simulatedTime, miaOrigin.lat, miaOrigin.lng]);

  const pulseAlignment = useMemo(() => {
    if (!pulseResult) return { ok: false as boolean, messageKey: undefined as string | undefined };
    return simulatorAlignedWithTavily(
      vibe,
      pulseResult.pulse,
      pulseResult.usedTavilyApi,
      simulatedTime,
    );
  }, [pulseResult, vibe, simulatedTime]);

  /** Con clima “tiempo real” (`event`), el scoring del inventario sigue el pulso Tavily; con sunny/rainy/night sigue el simulador. */
  const inventoryVibe = useMemo(() => {
    if (!pulseResult) return vibe === "event" ? "sunny" : vibe;
    return resolveInventoryVibe(vibe, pulseResult.pulse);
  }, [vibe, pulseResult]);

  const pulseGateOk = !pulseLoading && pulseResult != null && pulseAlignment.ok;

  const offerLiveForOwner = !!merchant && merchantHasAnyActiveFlash(merchant);
  const offerStaleForOwner = !!merchant && merchantHasStaleFlashOnly(merchant);
  const ownerActiveSlots = merchant ? activeFlashSlots(merchant) : [];
  const atFlashCapacity = ownerActiveSlots.length >= MAX_CONCURRENT_FLASH;

  const busyProductIds = merchant ? activeFlashProductIds(merchant) : [];

  const inventoryProposal = useMemo(() => {
    if (!merchant || !trafficSuggested || !pulseGateOk || offerStaleForOwner || atFlashCapacity)
      return null;
    return proposeFlashOfferFromInventory({
      merchant,
      vibe: inventoryVibe,
      consumerPreferenceTags: MIA_VIBEPAY_PREFERENCE_TAGS,
      discountPct: FLASH_DISCOUNT_PCT,
      durationMinutes: FLASH_DURATION_MIN,
      proposalSalt: proposalNonce,
      excludeProductIds: busyProductIds,
    });
  }, [
    merchant,
    trafficSuggested,
    pulseGateOk,
    offerStaleForOwner,
    atFlashCapacity,
    inventoryVibe,
    proposalNonce,
    busyProductIds,
  ]);

  const weatherQuickPicks = useMemo(() => {
    if (!merchant || !trafficSuggested || !pulseGateOk || offerStaleForOwner || atFlashCapacity)
      return [];
    const exclude = new Set(busyProductIds);
    if (inventoryProposal?.product.id) exclude.add(inventoryProposal.product.id);
    return listWeatherDemoQuickPicks(merchant, inventoryVibe, {
      discountPct: FLASH_DISCOUNT_PCT,
      durationMinutes: FLASH_DURATION_MIN,
      consumerPreferenceTags: MIA_VIBEPAY_PREFERENCE_TAGS,
      excludeProductIds: [...exclude],
      maxPicks: 3,
    });
  }, [
    merchant,
    trafficSuggested,
    pulseGateOk,
    offerStaleForOwner,
    atFlashCapacity,
    inventoryVibe,
    inventoryProposal?.product.id,
    busyProductIds,
  ]);

  const coPilotInsight = merchant
    ? buildOwnerCoPilotInsightI18n(locale, {
        sales: payoneSalesToday,
        threshold: targetThreshold,
        discountPct: FLASH_DISCOUNT_PCT,
        durationMinutes: FLASH_DURATION_MIN,
      })
    : "";

  const clearActiveOfferFields = () => {
    if (!merchant) return;
    updateMerchant(merchant.id, (m) => syncLegacyFieldsFromFlashOffers({ ...m, flashOffers: [] }));
  };

  const removeOwnerFlashSlot = (slotId: string) => {
    if (!merchant) return;
    updateMerchant(merchant.id, (m) => {
      const next = (m.flashOffers ?? []).filter((s) => s.id !== slotId);
      return syncLegacyFieldsFromFlashOffers({ ...m, flashOffers: next });
    });
  };

  const cloudPersistenceOk = isSupabaseConfigured();

  const launchConfirmedOffer = (proposal: ReturnType<typeof proposeFlashOfferFromInventory> | null) => {
    if (!merchant) return;
    if (!cloudPersistenceOk) return;
    if (activeFlashSlots(merchant).length >= MAX_CONCURRENT_FLASH) return;
    const endsAt = Date.now() + FLASH_DURATION_MIN * 60_000;
    const pct = proposal?.discountPct ?? FLASH_DISCOUNT_PCT;
    const title =
      proposal?.title ?? `${pct}% OFF · ${CATEGORY_RETAIL_LABEL[merchant.category]}`;
    const description =
      proposal?.publicOfferDescription ??
      buildMiaFlashDescriptionI18n(locale, {
        merchantName: merchant.name,
        vibe: inventoryVibe,
        discountPct: pct,
        durationMinutes: FLASH_DURATION_MIN,
      });
    const newSlot = {
      id: crypto.randomUUID(),
      title,
      description,
      discountPct: pct,
      endsAt,
      productId: proposal?.product.id ?? null,
      productTags: proposal ? [...proposal.product.tags] : null,
    };
    updateMerchant(merchant.id, (m) => {
      const now = Date.now();
      const pruned = (m.flashOffers ?? []).filter((s) => s.endsAt > now);
      return syncLegacyFieldsFromFlashOffers({ ...m, flashOffers: [...pruned, newSlot] });
    });
  };

  return (
    <MobileShell>
      <header className="px-5 pb-4 pt-12 md:px-8 md:pt-8 lg:px-10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("owner.offers.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("owner.offers.subtitle", { store: DEMO_STORE.name })}
            </p>
          </div>
          <PayoneSeal variant="chip" tone="live" label={t("owner.offers.payoneChip")} />
        </div>
        <Link
          to="/merchant"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-foreground transition hover:bg-muted/50"
        >
          <Settings2 className="h-4 w-4" />
          {t("owner.offers.rulesLink")}
        </Link>
      </header>

      <main className="space-y-5 px-5 pb-6 md:px-8 lg:px-10">
        {!cloudPersistenceOk ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] leading-snug text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <p className="font-semibold">{t("owner.offers.dbTitle")}</p>
            <p className="mt-1 text-[12px] opacity-95">{t("owner.offers.dbBody")}</p>
          </div>
        ) : null}

        {merchant ? (
          <section className="rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-surface p-4 dark:from-violet-950/30 dark:to-surface">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-800 dark:text-violet-200">
                  {t("owner.offers.suggestionTitle")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("owner.offers.suggestionSub")}</p>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-violet-600" aria-hidden />
            </div>

            {offerStaleForOwner ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  {t("owner.offers.staleTitle")}
                </p>
                <p className="mt-1 text-[12px] text-amber-900/90 dark:text-amber-200/90">
                  {t("owner.offers.staleSub")}
                </p>
                <button
                  type="button"
                  onClick={() => clearActiveOfferFields()}
                  className="mt-3 w-full rounded-xl border border-amber-300 bg-surface py-2 text-[12px] font-semibold text-amber-950 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/50"
                >
                  {t("owner.offers.staleBtn")}
                </button>
              </div>
            ) : null}

            {offerLiveForOwner ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {cloudPersistenceOk
                    ? t("owner.offers.liveSupabase", { count: ownerActiveSlots.length })
                    : t("owner.offers.liveLocal", { count: ownerActiveSlots.length })}
                </p>
                <p className="mt-1 text-[11px] text-emerald-800/90 dark:text-emerald-200/90">
                  {t("owner.offers.liveCardSub")}
                </p>
                {!cloudPersistenceOk ? (
                  <p className="mt-2 text-[11px] font-medium text-amber-900 dark:text-amber-200">
                    {t("owner.offers.liveLocalOnly")}
                  </p>
                ) : null}
                <div className="mt-2 space-y-0">
                  {ownerActiveSlots.map((slot) => (
                    <OwnerFlashSlotRow
                      key={slot.id}
                      title={slot.title}
                      discountPct={slot.discountPct}
                      endsAt={slot.endsAt}
                      productId={slot.productId}
                      onRemove={() => removeOwnerFlashSlot(slot.id)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => clearActiveOfferFields()}
                  className="mt-4 w-full rounded-xl border border-emerald-300 bg-surface py-2 text-[12px] font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
                >
                  {t("owner.offers.endAll")}
                </button>
              </div>
            ) : null}

            {!offerStaleForOwner && trafficSuggested ? (
              <>
                {atFlashCapacity ? (
                  <p className="mt-4 text-[12px] font-medium text-amber-800 dark:text-amber-200">
                    {t("owner.offers.flashLimit", { n: MAX_CONCURRENT_FLASH })}
                  </p>
                ) : null}
                {pulseLoading ? (
                  <p className="mt-4 text-[12px] text-muted-foreground">{t("owner.offers.tavilyLoading")}</p>
                ) : pulseResult ? (
                  <div className="mt-4 rounded-2xl border border-border bg-surface/80 p-3 text-[11px] leading-snug text-muted-foreground">
                    <p className="font-semibold text-foreground">{t("owner.offers.pulseTitle")}</p>
                    <p className="mt-1">
                      {t("owner.offers.pulseWeather")}{" "}
                      <span className="text-foreground">{pulseResult.pulse.weather}</span> ·{" "}
                      {pulseResult.pulse.recommendation}
                    </p>
                    {!pulseResult.usedTavilyApi ? (
                      <p className="mt-2 text-[10px] text-amber-800/90 dark:text-amber-200/80">
                        {t("owner.offers.noTavilyKey")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!pulseLoading && pulseResult && !pulseAlignment.ok ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                      {t("owner.offers.tavilyMismatchTitle")}
                    </p>
                    <p className="mt-1 text-[12px] text-amber-900/90 dark:text-amber-200/90">
                      {pulseAlignment.messageKey ? t(pulseAlignment.messageKey) : ""}
                    </p>
                  </div>
                ) : null}

                {!pulseLoading && pulseGateOk && !atFlashCapacity ? (
                  <>
                    <p className="mt-4 text-[13px] leading-relaxed text-foreground">{coPilotInsight}</p>
                    {inventoryProposal ? (
                      <div className="mt-4 rounded-2xl border border-violet-200/80 bg-surface p-4 dark:border-violet-800/60">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          {t("owner.offers.catalogBlurb")}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {inventoryProposal.product.name}
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {inventoryProposal.inventorySummaryEs}
                        </p>
                        <p className="mt-2 text-[12px] leading-relaxed text-foreground/90">
                          {inventoryProposal.agentRationaleEs}
                        </p>
                        <p className="mt-3 text-[11px] font-semibold text-foreground">
                          {t("owner.offers.ifYouActivate")}
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-snug text-muted-foreground">
                          {inventoryProposal.ownerBenefits.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[10px] text-muted-foreground">{t("owner.offers.visibility")}</p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => setProposalNonce((n) => n + 1)}
                            className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                          >
                            {t("owner.offers.anotherSuggestion")}
                          </button>
                          <button
                            type="button"
                            disabled={!cloudPersistenceOk}
                            onClick={() => launchConfirmedOffer(inventoryProposal)}
                            title={
                              !cloudPersistenceOk ? t("owner.offers.needSupabaseTitle") : undefined
                            }
                            className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                          >
                            {t("owner.offers.addThisOffer")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 text-[12px] text-amber-800/90 dark:text-amber-200/80">
                          {t("owner.offers.addInventory")}
                        </p>
                        <button
                          type="button"
                          disabled={!cloudPersistenceOk}
                          onClick={() => launchConfirmedOffer(null)}
                          title={
                            !cloudPersistenceOk ? t("owner.offers.needSupabaseTitle") : undefined
                          }
                          className="mt-4 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                        >
                          {t("owner.offers.publishGeneric")}
                        </button>
                      </>
                    )}

                    {weatherQuickPicks.length > 0 ? (
                      <div className="mt-5 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:text-sky-200">
                          {t("owner.offers.quickDemo")}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{t("owner.offers.quickDemoSub")}</p>
                        <div className="mt-3 flex flex-col gap-2">
                          {weatherQuickPicks.map((pick) => (
                            <button
                              key={pick.product.id}
                              type="button"
                              disabled={!cloudPersistenceOk}
                              onClick={() => launchConfirmedOffer(pick)}
                              title={
                                !cloudPersistenceOk ? t("owner.offers.needSupabaseTitle") : undefined
                              }
                              className="w-full rounded-xl border border-sky-300/80 bg-surface px-3 py-2.5 text-left text-[12px] font-semibold text-foreground transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-sky-700 dark:hover:bg-sky-950/40"
                            >
                              <span className="text-foreground">{pick.product.name}</span>
                              <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                                {FLASH_DISCOUNT_PCT}% · {FLASH_DURATION_MIN} min · Payone / Supabase
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : !offerStaleForOwner ? (
              <p className="mt-4 text-[12px] text-muted-foreground">{t("owner.offers.trafficOk")}</p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {t("owner.offers.customizeTitle")}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">{t("owner.offers.customizeSub")}</p>
          <label className="mt-3 block text-[11px] font-semibold text-foreground">
            {t("owner.offers.boost", { n: demoBoostPct })}
            <input
              type="range"
              min={0}
              max={8}
              value={demoBoostPct}
              onChange={(e) => setDemoBoostPct(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>
        </section>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
            {t("owner.offers.noEvaluated")}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ merchant, offer }) => (
              <li key={merchant.id}>
                <div className="rounded-2xl border border-emerald-200 bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("owner.offers.preview")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{offer.headline}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {merchant.name} · {merchant.signature}
                  </p>
                  <p className="mt-2 text-[11px] leading-snug text-foreground/85">{offer.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {offer.transactionSummary}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      {offer.discount}
                      {demoBoostPct > 0 ? ` +${demoBoostPct}% (demo)` : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        offer.activationState === "low_traffic"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : offer.activationState === "target_reached"
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-sky-300 bg-sky-50 text-sky-800"
                      }`}
                    >
                      {stateLabel[offer.activationState]}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3 text-[11px] leading-snug text-muted-foreground">
          <p>{t("owner.offers.footerHint")}</p>
          <div className="mt-2 flex justify-end">
            <PayoneSeal variant="wordmark" />
          </div>
        </div>
      </main>
    </MobileShell>
  );
}
