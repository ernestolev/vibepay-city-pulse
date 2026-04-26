import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";
import { useAppContext } from "@/lib/app-context";
import { StatusBar } from "./status-bar";

/**
 * iOS-style layer: you start "outside" the app — lock screen, then a single
 * VibePay icon on a springboard, then the real wallet. Skipped in the same
 * browser session after the first open (see sessionStorage in AppProvider)
 * or with ?nodevice=1 in the URL.
 */
export function DeviceBootLayer() {
  const {
    deviceBootStage,
    setDeviceBootStage,
    enterAppFromBoot,
    simulatedTime,
    isPresentationMode,
  } = useAppContext();

  const { clock, dateLine } = useMemo(() => {
    const t = (() => {
      if (simulatedTime) {
        const [h, m] = simulatedTime.split(":").map((x) => parseInt(x, 10));
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
      }
      return new Date();
    })();
    return {
      clock: t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
      dateLine: t.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  }, [simulatedTime]);

  if (deviceBootStage === "inApp") return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-center overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
    >
      {isPresentationMode ? (
        <div className="absolute left-0 right-0 top-0 z-10">
          <StatusBar simulatedTime={simulatedTime} />
        </div>
      ) : null}

      <div className="absolute inset-0 overflow-hidden max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {deviceBootStage === "lock" ? (
            <motion.button
              key="lock"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDeviceBootStage("springboard")}
              className="relative flex h-full w-full flex-col items-center border-0 bg-[#0a0a12] p-0 text-left outline-none"
              aria-label="Tap to go to home screen"
            >
              <div
                className="absolute inset-0 bg-gradient-to-b from-violet-900/30 via-rose-900/20 to-amber-900/20"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDcpIiBzdHJva2Utd2lkdGg9IjEiPjxwYXRoIGQ9Ik0wIDBoMzB2MzBINDB2MzBoMzB2MzAiLz48L2c+PC9zdmc+')]"
                aria-hidden
              />
              {isPresentationMode ? <div className="h-10 shrink-0" /> : <div className="h-14 shrink-0" />}

              <div className="relative mt-2 flex w-full flex-1 flex-col items-center">
                <p className="text-[3.1rem] font-extralight leading-none tabular-nums tracking-tight text-white">
                  {clock}
                </p>
                <p className="mt-1.5 text-[15px] font-medium text-white/85">{dateLine}</p>
              </div>

              <div className="relative w-full flex-1" />

              <div className="relative mb-8 flex w-full max-w-xs flex-col items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                  Tap to unlock
                </p>
                <div
                  className="flex w-full flex-col items-center gap-0.5 text-white/90"
                  aria-hidden
                >
                  <div className="h-0.5 w-9 rounded-full bg-white/30" />
                  <div className="h-0.5 w-7 rounded-full bg-white/20" />
                </div>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="spring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex h-full w-full flex-col overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-gradient-to-b from-sky-200/30 via-rose-200/20 to-amber-100/40"
                aria-hidden
              />
              {isPresentationMode ? <div className="h-10 shrink-0" /> : <div className="h-12 shrink-0" />}

              <div className="relative flex flex-1 flex-col items-center px-4 pt-6">
                <p className="text-center text-xs font-medium text-foreground/60">Mia’s iPhone</p>
                <div className="mt-20 flex w-full max-w-sm flex-1 items-start justify-center">
                  <button
                    type="button"
                    onClick={enterAppFromBoot}
                    className="group flex flex-col items-center gap-1.5 focus:outline-none"
                    aria-label="Open VibePay"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-primary to-rose-700 shadow-lg shadow-rose-900/30 ring-2 ring-white/20 transition group-active:scale-95 group-active:ring-white/30">
                      <Wallet className="h-8 w-8 text-white" strokeWidth={2.2} />
                    </div>
                    <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight text-foreground/90">
                      VibePay
                    </span>
                  </button>
                </div>
              </div>

              <div className="relative mb-2 mt-auto flex h-20 items-end justify-center rounded-t-[1.4rem] bg-white/20 px-2 pb-2 pt-1 backdrop-blur-md">
                <div className="grid grid-cols-2 gap-2 opacity-0">
                  <span className="h-1 w-1" />
                </div>
                <p className="absolute bottom-2 text-[9px] text-foreground/40">VibePay City Wallet</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
