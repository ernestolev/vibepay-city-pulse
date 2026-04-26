import { Link, useLocation } from "@tanstack/react-router";
import { Home, Tag, Activity, User } from "lucide-react";
import { SHELL_INNER_MAX } from "@/lib/shell-layout";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ROUTES = ["/", "/offers", "/activity", "/profile"] as const;
const ICONS = [Home, Tag, Activity, User] as const;
const LABEL_KEYS = ["nav.home", "nav.offers", "nav.activity", "nav.profile"] as const;

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-3 pt-2 backdrop-blur lg:hidden",
        SHELL_INNER_MAX,
        className,
      )}
    >
      <ul className="flex items-stretch justify-between">
        {ROUTES.map((to, i) => {
          const Icon = ICONS[i];
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition"
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={active ? "text-primary" : "text-muted-foreground"}>
                  {t(LABEL_KEYS[i])}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
