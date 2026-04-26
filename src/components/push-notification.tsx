import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Waves } from "lucide-react";
import { useAppContext } from "@/lib/app-context";
import { PayoneSeal } from "@/components/payone-seal";

export function PushNotification() {
  const { pushNotification, dismissPushNotification } = useAppContext();

  useEffect(() => {
    if (!pushNotification) return;
    const t = window.setTimeout(() => dismissPushNotification(), 6000);
    return () => window.clearTimeout(t);
  }, [pushNotification, dismissPushNotification]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-3">
      <AnimatePresence>
        {pushNotification ? (
          <motion.button
            key={pushNotification.id}
            type="button"
            initial={{ y: -80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            drag="y"
            dragConstraints={{ top: -120, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30) dismissPushNotification();
            }}
            onClick={() => dismissPushNotification()}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/40 bg-white/85 p-3 text-left text-foreground shadow-[0_18px_45px_-15px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            aria-live="polite"
            aria-label={`${pushNotification.title}. ${pushNotification.subtitle}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#16181d] to-[#3a3f4a] text-white">
                <Waves className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      VibePay
                    </span>
                    <PayoneSeal
                      variant="chip"
                      tone="default"
                      label="via Payone"
                      showDsv={false}
                      className="!px-1.5 !py-[1px] !text-[8px]"
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {pushNotification.timestamp}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold leading-tight">
                  {pushNotification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {pushNotification.subtitle}
                </p>
              </div>
            </div>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
