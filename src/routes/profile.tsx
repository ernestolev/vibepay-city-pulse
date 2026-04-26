import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Shield, CreditCard, Bell, HelpCircle, LogOut, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { Switch } from "@/components/ui/switch";
import { useVibe } from "@/lib/vibe-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "VibePay — Profile" },
      { name: "description", content: "Manage your VibePay account and preferences." },
    ],
  }),
  component: ProfilePage,
});

const ROWS = [
  { icon: Sparkles, label: "Vibe preferences", sub: "Pick what offers you like" },
  { icon: CreditCard, label: "Cards & accounts", sub: "Santander Edge · 4421" },
  { icon: Bell, label: "Notifications", sub: "Sound, badges, push" },
  { icon: Shield, label: "Security", sub: "Face ID, PIN, alerts" },
  { icon: HelpCircle, label: "Help & support", sub: "Chat with us" },
] as const;

function ProfilePage() {
  const { accountMode, setAccountMode } = useVibe();
  const isBusinessMode = accountMode === "business";

  return (
    <MobileShell>
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </header>

      <section className="mx-5 mt-3 rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
            AM
          </div>
          <div>
            <p className="text-base font-semibold">Alex Morgan</p>
            <p className="text-xs opacity-80">alex.morgan@email.com</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { v: "£9.20", l: "Saved" },
            { v: "12", l: "Vibes used" },
            { v: "Gold", l: "Tier" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/12 px-2 py-3">
              <div className="text-base font-bold">{s.v}</div>
              <div className="opacity-80">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="px-5 mt-6">
        <section className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Business mode</p>
              <p className="text-xs text-muted-foreground">
                {isBusinessMode
                  ? "Home and offers are now optimized for your business."
                  : "Switch to business dashboards, metrics and offer management."}
              </p>
            </div>
            <Switch
              checked={isBusinessMode}
              onCheckedChange={(checked) => setAccountMode(checked ? "business" : "personal")}
              aria-label="Toggle business mode"
            />
          </div>
        </section>

        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {ROWS.map(({ icon: Icon, label, sub }) => (
            <li key={label}>
              <button className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-primary">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </main>
    </MobileShell>
  );
}
