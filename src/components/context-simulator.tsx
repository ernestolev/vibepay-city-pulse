import { motion } from "framer-motion";
import { Sun, CloudRain, Trophy, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useVibe } from "@/lib/vibe-context";
import type { VibeKey } from "@/lib/vibe";

type Pulse = { key: VibeKey; label: string; icon: LucideIcon };

const PULSES: Pulse[] = [
  { key: "sunny", label: "Sunny", icon: Sun },
  { key: "rainy", label: "Rainy", icon: CloudRain },
  { key: "event", label: "Event", icon: Trophy },
];

/**
 * Floating "City Pulse" demo bar — lets judges flip between the three
 * contexts that drive the Vibe Engine in real time.
 */
export function ContextSimulator() {
  const { vibe, setVibe } = useVibe();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 mx-auto flex max-w-md justify-center px-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="pointer-events-auto w-full"
      >
        <div className="rounded-3xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/25 backdrop-blur-xl ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
                City Pulse
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Radio className="h-2.5 w-2.5" />
              Demo
            </span>
          </div>

          <div className="relative grid grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1">
            {PULSES.map(({ key, label, icon: Icon }) => {
              const active = vibe === key;
              return (
                <button
                  key={key}
                  onClick={() => setVibe(key)}
                  aria-pressed={active}
                  aria-label={`Switch to ${label} vibe`}
                  className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition"
                >
                  {active && (
                    <motion.span
                      layoutId="city-pulse-active"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/30"
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 ${
                      active ? "text-primary-foreground" : "text-foreground"
                    }`}
                  />
                  <span
                    className={`relative z-10 ${
                      active ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
