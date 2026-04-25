import { Link, useLocation } from "@tanstack/react-router";
import { Home, Tag, Activity, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/offers", label: "Offers", icon: Tag },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-card/95 px-2 pb-3 pt-2 backdrop-blur">
      <ul className="flex items-stretch justify-between">
        {items.map(({ to, label, icon: Icon }) => {
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
                <span className={active ? "text-primary" : "text-muted-foreground"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
