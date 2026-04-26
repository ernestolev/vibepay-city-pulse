import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { VibeProvider } from "@/lib/vibe-context";
import { AppProvider } from "@/lib/app-context";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { MerchantRulesProvider } from "@/lib/merchant-rules-context";
import { SimulatorStateBridge } from "@/components/simulator-state-bridge";
import { DeviceBootLayer } from "@/components/device-boot-layer";
import { CheckoutSessionBridge } from "@/components/checkout-session-bridge";

function NotFoundComponent() {
  return (
    <I18nProvider>
      <NotFoundInner />
    </I18nProvider>
  );
}

function NotFoundInner() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notfound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notfound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notfound.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VibePay — Banking that gets you" },
      { name: "description", content: "VibePay by Santander — context-aware offers that adapt to your city, weather and time." },
      { name: "author", content: "Santander" },
      { name: "theme-color", content: "#EC0000" },
      { property: "og:title", content: "VibePay — Banking that gets you" },
      { property: "og:description", content: "Context-aware offers that adapt to your city, weather and time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <MerchantRulesProvider>
      <AppProvider>
        <I18nProvider>
          <VibeProvider>
            <SimulatorStateBridge />
            <CheckoutSessionBridge />
            <Outlet />
            <DeviceBootLayer />
          </VibeProvider>
        </I18nProvider>
      </AppProvider>
    </MerchantRulesProvider>
  );
}
