import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, CloudRain, Sun, Moon } from "lucide-react";
import { useVibe } from "@/lib/vibe-context";
import { VIBE_ORDER, type VibeKey } from "@/lib/vibe";

const META: Record<VibeKey, { label: string; icon: typeof Sun; hint: string }> = {
  sunny: { label: "Sunny / Hot", icon: Sun, hint: "Iced drinks, parks, light bites" },
  rainy: { label: "Rainy", icon: CloudRain, hint: "Hot drinks, indoor cafes" },
  nighttime: { label: "Nighttime", icon: Moon, hint: "Late bites, taxis, bars" },
  event: { label: "Event Nearby", icon: Sparkles, hint: "Festival, gig, fast-passes" },
};

export function ContextSimulator() {
  const [open, setOpen] = useState(false);
  const { vibe, setVibe } = useVibe();

  return (
    <>
      {/* Floating trigger — visible to judges */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-xs font-semibold text-background shadow-2xl shadow-black/30 transition active:scale-95"
        aria-label="Simulate City Pulse"
      >
        <Sparkles className="h-4 w-4" />
        Simulate City Pulse
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">Simulate City Pulse</h2>
                  <p className="text-xs text-muted-foreground">
                    Toggle a context to see VibePay adapt instantly.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-muted p-2 text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {VIBE_ORDER.map((key) => {
                  const m = META[key];
                  const Icon = m.icon;
                  const active = vibe === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setVibe(key)}
                      className={`relative rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-primary bg-accent"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                          active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {m.hint}
                      </div>
                      {active && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                          Live
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Demo mode · Context normally derived from weather, time & location.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
