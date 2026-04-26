import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Croissant, Eye, EyeOff, QrCode, ScanLine, Sparkles, Store } from "lucide-react";
import { startOfDay } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { MerchantQrScannerModal } from "@/components/merchant-qr-scanner-modal";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_MERCHANT_ID, DEMO_STORE, DEMO_STORE_OWNER } from "@/lib/merchant-demo-profile";
import { useMerchants } from "@/lib/merchant-rules-context";
import { useI18n } from "@/lib/i18n/context";
import { fetchMerchantBalanceCents, fetchMerchantLedger, formatEuroFromCents } from "@/lib/walletSupabase";

export function MerchantHome() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const merchants = useMerchants();
  const [showBalance, setShowBalance] = useState(true);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [todayInCents, setTodayInCents] = useState<number | null>(null);

  const refreshMoney = useCallback(async () => {
    const [bal, rows] = await Promise.all([
      fetchMerchantBalanceCents(DEMO_MERCHANT_ID),
      fetchMerchantLedger(DEMO_MERCHANT_ID, 80),
    ]);
    setBalanceCents(bal);
    const start = startOfDay(new Date());
    const sum = rows
      .filter((r) => new Date(r.created_at) >= start)
      .reduce((acc, r) => acc + r.amount_cents, 0);
    setTodayInCents(sum);
  }, []);

  useEffect(() => {
    void refreshMoney();
    window.addEventListener("vibepay-balance-changed", refreshMoney);
    return () => window.removeEventListener("vibepay-balance-changed", refreshMoney);
  }, [refreshMoney]);

  return (
    <MobileShell>
      <div className="min-h-screen bg-background font-sans text-foreground">
        <header className="mx-4 mt-4 rounded-3xl border border-border bg-surface px-5 pb-8 pt-12 md:mx-8 md:mt-6 md:px-8 lg:mx-10 lg:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {DEMO_STORE.name}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {DEMO_STORE_OWNER.name} · {t("merchant.home.business")}
                </p>
              </div>
            </div>
            <button type="button" className="relative rounded-full border border-border bg-surface p-2.5">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">{DEMO_STORE.tagline}</p>

          <div className="mt-7">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("merchant.home.balance")}</span>
              <button
                type="button"
                onClick={() => setShowBalance((v) => !v)}
                className="rounded-full p-1 hover:bg-muted"
                aria-label={t("merchant.home.balance")}
              >
                {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {showBalance ? (
                  balanceCents != null ? (
                    formatEuroFromCents(balanceCents)
                  ) : (
                    <Skeleton className="inline-block h-10 w-[9.5rem] rounded-lg align-middle" />
                  )
                ) : (
                  "€ ••••••"
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{DEMO_STORE.accountHint}</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-[11px] font-medium transition hover:bg-muted active:scale-95"
            >
              <ScanLine className="h-4 w-4 text-primary" />
              {t("merchant.home.scanQr")}
            </button>
            <button
              type="button"
              onClick={() => setDemoBanner(t("merchant.banner.checkout"))}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-[11px] font-medium transition hover:bg-muted active:scale-95"
            >
              <QrCode className="h-4 w-4 text-primary" />
              {t("merchant.home.generateQr")}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/offers" })}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-[11px] font-medium transition hover:bg-muted active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              {t("merchant.home.activateOffers")}
            </button>
          </div>
        </header>

        <MerchantQrScannerModal open={scanOpen} onClose={() => setScanOpen(false)} merchants={merchants} />

        <main className="px-5 pb-28 pt-6 md:px-8 lg:px-10">
          {demoBanner ? (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
              <p>{demoBanner}</p>
              <button
                type="button"
                onClick={() => setDemoBanner(null)}
                className="mt-1 text-[11px] font-semibold text-primary"
              >
                {t("common.dismiss")}
              </button>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">{t("merchant.home.counterTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("merchant.home.counterSub")}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">
              <Sparkles className="h-3 w-3" /> {t("common.live")}
            </span>
          </div>

          <section className="rounded-3xl border border-border bg-surface p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C98A4B]/40 bg-[#C98A4B]/10 text-[#C98A4B]">
                <Croissant className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("merchant.home.storePulse")}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{DEMO_STORE.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {t("merchant.home.pulseBody")}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center md:gap-3">
              <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("merchant.home.todaySoFar")}
                </p>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {todayInCents != null ? (
                    formatEuroFromCents(todayInCents)
                  ) : (
                    <Skeleton className="mx-auto mt-1 h-7 w-24 rounded-md" />
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("merchant.home.vibepayShare")}
                </p>
                <p className="text-lg font-bold tabular-nums text-emerald-700">
                  {todayInCents != null ? (
                    formatEuroFromCents(todayInCents)
                  ) : (
                    <Skeleton className="mx-auto mt-1 h-7 w-24 rounded-md" />
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                <span>{t("merchant.home.settlement")}</span>
                <span aria-hidden>→</span>
                <PayoneSeal variant="rail" tone="live" trailing="< 1 s" />
              </div>
              <p className="mt-1 text-[10px] leading-snug text-emerald-900/85">
                {t("merchant.home.settlementSub")}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link
                to="/activity"
                className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t("merchant.home.viewIncome")}
              </Link>
              <PayoneSeal variant="wordmark" />
            </div>
          </section>
        </main>
      </div>
    </MobileShell>
  );
}
