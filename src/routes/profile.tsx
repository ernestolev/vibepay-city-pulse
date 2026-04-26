import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { PayoneSeal } from "@/components/payone-seal";
import { useAppContext } from "@/lib/app-context";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/types";
import { DEMO_STORE, DEMO_STORE_OWNER } from "@/lib/merchant-demo-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "VibePay — Profile" },
      { name: "description", content: "Mia’s VibePay profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { appPersona, setAppPersona } = useAppContext();
  const { t, locale, setLocale } = useI18n();
  const isMerchant = appPersona === "merchant";

  const rows: { icon: LucideIcon; labelKey: string; subKey?: string }[] = [
    { icon: Sparkles, labelKey: "profile.vibeRow", subKey: "profile.vibeSub" },
    { icon: CreditCard, labelKey: "profile.cardsRow", subKey: "profile.cardsSub" },
    { icon: Bell, labelKey: "profile.notifications" },
    { icon: Shield, labelKey: "profile.security", subKey: "profile.securitySub" },
    { icon: HelpCircle, labelKey: "profile.help" },
  ];

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-12 md:px-8 md:pt-8 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
      </header>

      <main className="space-y-5 px-5 pb-8 md:px-8 lg:px-10">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("profile.language")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("profile.languageHint")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {LOCALES.map((code: Locale) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition",
                  locale === code
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border text-base font-bold ${
                isMerchant ? "bg-emerald-50 text-emerald-800" : "bg-primary/10 text-primary"
              }`}
            >
              {isMerchant ? DEMO_STORE_OWNER.initials : "M"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground">
                {isMerchant ? DEMO_STORE_OWNER.name : "Mia Berg"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isMerchant ? DEMO_STORE_OWNER.email : "mia.berg@email.com"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {isMerchant ? (
                  <Store className="h-3 w-3 shrink-0" />
                ) : (
                  <MapPin className="h-3 w-3 shrink-0" />
                )}
                {isMerchant
                  ? t("profile.merchantLocation", { store: DEMO_STORE.name })
                  : t("profile.miaLocation")}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setAppPersona(isMerchant ? "mia" : "merchant")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          <Store className="h-4 w-4" />
          {isMerchant ? t("profile.switchToMia") : t("profile.switchToMerchant")}
        </button>

        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map(({ icon: Icon, labelKey, subKey }) => (
            <li key={labelKey}>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-b border-border p-4 text-left transition hover:bg-muted/50 last:border-b-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t(labelKey)}</p>
                  {subKey ? (
                    <p className="text-xs text-muted-foreground">{t(subKey)}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-semibold text-primary transition hover:bg-muted/50"
        >
          <LogOut className="h-4 w-4" />
          {t("profile.signOut")}
        </button>

        <div className="flex justify-end pb-2">
          <PayoneSeal variant="wordmark" />
        </div>
      </main>
    </MobileShell>
  );
}
