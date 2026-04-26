import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Home, Tag, User } from "lucide-react";
import { PayoneSeal } from "@/components/payone-seal";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ROUTES = ["/", "/offers", "/activity", "/profile"] as const;
const ICONS = [Home, Tag, Activity, User] as const;
const LABEL_KEYS = ["nav.home", "nav.offers", "nav.activity", "nav.profile"] as const;

export function DesktopNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-border bg-card/95 backdrop-blur-xl lg:flex">
      <div className="flex h-full min-h-0 flex-col px-3 py-6">
        <div className="mb-8 px-3">
          <p className="text-lg font-bold tracking-tight text-foreground">VibePay</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("desktop.tagline")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
          {ROUTES.map((to, i) => {
            const Icon = ICONS[i];
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                {t(LABEL_KEYS[i])}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border pt-4">
          <PayoneSeal variant="wordmark" className="px-1" />
        </div>
      </div>
    </aside>
  );
}
