import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { useAppContext } from "@/lib/app-context";
import {
  dismissLockNotificationRow,
  fetchRecentPushNotifications,
  subscribePushNotifications,
  type ConsumerPushNotificationRow,
} from "@/lib/pushNotificationsSupabase";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { StatusBar } from "./status-bar";
import { PinLoginScreen } from "./pin-login-screen";
import {
  VibeSpringboardAppIcon,
  type SpringboardAppIconVariant,
} from "./vibe-springboard-app-icon";

/** “sparkasse” = rojo S; “dsv” = azul DSV Gruppe. Cambia en un solo sitio. */
const SPRINGBOARD_APP_ICON: SpringboardAppIconVariant = "sparkasse";

const LOCK_PUSH_LIMIT = 6;
const SWIPE_DISMISS_PX = 52;

function formatLockNotifTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function LockScreenNotificationCard({
  row,
  onRemoved,
}: {
  row: ConsumerPushNotificationRow;
  onRemoved: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      drag="x"
      dragConstraints={{ left: -220, right: 0 }}
      dragElastic={{ left: 0.1, right: 0 }}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 28 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDragEnd={(_, info) => {
        if (info.offset.x < -SWIPE_DISMISS_PX) {
          void dismissLockNotificationRow(row.id);
          onRemoved(row.id);
        }
      }}
      className="touch-pan-x"
    >
      <div className="flex gap-2.5 rounded-2xl border border-white/10 bg-white/[0.12] px-3 py-2.5 text-left shadow-lg backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/40 text-[11px] font-semibold text-white">
          {(row.merchant_name ?? "V").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{row.title}</p>
            <span className="shrink-0 text-[10px] tabular-nums text-white/45">
              {formatLockNotifTime(row.created_at)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/65">{row.subtitle}</p>
          {row.body ? (
            <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-white/55">{row.body}</p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * iOS-style layer: you start "outside" the app — lock screen, then a single
 * VibePay icon on a springboard, then the real wallet. Skipped in the same
 * browser session after the first open (see sessionStorage in AppProvider)
 * or with ?nodevice=1 in the URL.
 */
export function DeviceBootLayer() {
  const { deviceBootStage, setDeviceBootStage, simulatedTime, isPresentationMode } = useAppContext();

  const appIconRef = useRef<HTMLDivElement>(null);
  const launchDone = useRef(false);
  const [launchOrigin, setLaunchOrigin] = useState<{
    cx: number;
    cy: number;
    s: number;
  } | null>(null);
  const [lockNotifications, setLockNotifications] = useState<ConsumerPushNotificationRow[]>([]);
  const warnedNoSupabaseRef = useRef(false);

  const goToPinScreen = useCallback(() => {
    setDeviceBootStage("pin");
  }, [setDeviceBootStage]);

  const startOpenApp = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      goToPinScreen();
      return;
    }
    const r = appIconRef.current?.getBoundingClientRect();
    if (!r) {
      goToPinScreen();
      return;
    }
    launchDone.current = false;
    setLaunchOrigin({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: r.width });
  }, [goToPinScreen]);

  const onLaunchAnimComplete = useCallback(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    setLaunchOrigin(null);
    goToPinScreen();
  }, [goToPinScreen]);

  useEffect(() => {
    if (deviceBootStage === "springboard") {
      launchDone.current = false;
    }
  }, [deviceBootStage]);

  useEffect(() => {
    if (deviceBootStage !== "lock") return;
    if (import.meta.env.DEV && !isSupabaseConfigured() && !warnedNoSupabaseRef.current) {
      warnedNoSupabaseRef.current = true;
      console.warn(
        "[VibePay] Pantalla de bloqueo: sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no hay persistencia ni lista de pushes. Copia .env.example → .env.local y reinicia `npm run dev`.",
      );
    }
    let cancelled = false;
    void fetchRecentPushNotifications(LOCK_PUSH_LIMIT).then((rows) => {
      if (!cancelled) setLockNotifications(rows);
    });
    const unsub = subscribePushNotifications({
      onInsert: (row) => {
        if (row.dismissed_at) return;
        setLockNotifications((prev) => {
          const next = [row, ...prev.filter((r) => r.id !== row.id)];
          return next.slice(0, LOCK_PUSH_LIMIT);
        });
      },
      onUpdate: (row) => {
        if (row.dismissed_at) {
          setLockNotifications((prev) => prev.filter((r) => r.id !== row.id));
          return;
        }
        setLockNotifications((prev) => {
          const next = [row, ...prev.filter((r) => r.id !== row.id)];
          return next.slice(0, LOCK_PUSH_LIMIT);
        });
      },
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [deviceBootStage]);

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
      className="fixed inset-0 z-[200] flex justify-center overflow-hidden bg-zinc-950"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
    >
      {isPresentationMode ? (
        <div className="absolute left-0 right-0 top-0 z-10">
          <StatusBar simulatedTime={simulatedTime} />
        </div>
      ) : null}

      <div className="absolute inset-0 mx-auto w-full max-w-md overflow-hidden bg-zinc-950">
        <AnimatePresence mode="wait">
          {deviceBootStage === "lock" && (
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

              <div className="relative mt-2 flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto">
                <p className="text-[3.1rem] font-extralight leading-none tabular-nums tracking-tight text-white">
                  {clock}
                </p>
                <p className="mt-1.5 text-[15px] font-medium text-white/85">{dateLine}</p>
                {lockNotifications.length > 0 ? (
                  <div className="relative z-10 mt-5 w-full max-w-sm px-3 pb-2">
                    <div className="space-y-2">
                      {lockNotifications.map((row) => (
                        <LockScreenNotificationCard
                          key={row.id}
                          row={row}
                          onRemoved={(id) =>
                            setLockNotifications((prev) => prev.filter((r) => r.id !== id))
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-center text-[9px] text-white/35">Desliza a la izquierda para descartar</p>
                  </div>
                ) : null}
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
          )}

          {deviceBootStage === "springboard" && (
            <motion.div
              key="spring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative flex h-full w-full flex-col overflow-hidden bg-slate-200"
            >
              {/** Opaque “wallpaper” so the wallet UI is never visible underneath */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-sky-200 from-20% via-rose-100 to-amber-100"
                aria-hidden
              />
              {isPresentationMode ? <div className="h-10 shrink-0" /> : <div className="h-12 shrink-0" />}

              <div
                className={`relative flex flex-1 flex-col items-center px-4 pt-6 ${launchOrigin ? "pointer-events-none" : ""}`}
              >
                <p className="text-center text-xs font-medium text-foreground/60">Mia’s iPhone</p>
                <div className="mt-20 flex w-full max-w-sm flex-1 items-start justify-center gap-6 px-2">
                  <motion.button
                    type="button"
                    onClick={startOpenApp}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 border-0 bg-transparent p-0 focus:outline-none"
                    aria-label="Abrir VibePay"
                  >
                    <div
                      ref={appIconRef}
                      className="h-16 w-16 drop-shadow-lg ring-1 ring-white/20 transition group-hover:ring-white/30"
                    >
                      <VibeSpringboardAppIcon
                        className="block h-full w-full"
                        size={64}
                        variant={SPRINGBOARD_APP_ICON}
                      />
                    </div>
                    <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight text-foreground/90">
                      VibePay
                    </span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setDeviceBootStage("lock")}
                    className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 focus:outline-none"
                    aria-label="Bloquear y volver a la pantalla de bloqueo"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.1rem] bg-slate-800/20 shadow-inner ring-2 ring-foreground/15 backdrop-blur-sm transition group-active:scale-95 group-active:ring-foreground/25">
                      <Lock className="h-7 w-7 text-foreground/80" strokeWidth={2.2} />
                    </div>
                    <span className="max-w-full text-center text-[10px] font-medium leading-tight text-foreground/80">
                      Bloquear
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

          {deviceBootStage === "pin" && <PinLoginScreen key="pin-login" />}
        </AnimatePresence>
      </div>

      {launchOrigin ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-[201] h-16 w-16 -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl ring-2 ring-white/30"
          style={{ left: launchOrigin.cx, top: launchOrigin.cy, borderRadius: "1.1rem" }}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 48, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          onAnimationComplete={onLaunchAnimComplete}
        >
          <VibeSpringboardAppIcon
            className="h-full w-full"
            size={64}
            variant={SPRINGBOARD_APP_ICON}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
