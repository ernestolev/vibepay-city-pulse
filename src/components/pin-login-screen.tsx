import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Delete, ScanFace } from "lucide-react";
import { useAppContext } from "@/lib/app-context";
import { VIBEPAY_DEMO_WALLET_PIN, shuffledNumberKeys } from "@/lib/walletPin";
import { FaceIdAppleAnimation } from "./face-id-apple-animation";
import { cn } from "@/lib/utils";

/**
 * Teclado: 1–9 en posiciones 3×3 (orden barajado), fila 4: retroceso, 0, Face ID.
 */
export function PinLoginScreen() {
  const { enterAppFromBoot, isPresentationMode } = useAppContext();
  const [pin, setPin] = useState("");
  const [shaken, setShaken] = useState(0);
  const [faceIdActive, setFaceIdActive] = useState(false);
  const numberGrid = useMemo(() => shuffledNumberKeys(), []);

  const trySubmit = useCallback(
    (value: string) => {
      if (value.length !== 6) return;
      if (value === VIBEPAY_DEMO_WALLET_PIN) {
        enterAppFromBoot();
        return;
      }
      setPin("");
      setShaken((k) => k + 1);
    },
    [enterAppFromBoot],
  );

  const onDigit = useCallback(
    (d: string) => {
      if (pin.length >= 6) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 6) {
        trySubmit(next);
      }
    },
    [pin, trySubmit],
  );

  const onBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const onFaceId = useCallback(() => {
    if (faceIdActive) return;
    setFaceIdActive(true);
  }, [faceIdActive]);

  const r1 = numberGrid.slice(0, 3);
  const r2 = numberGrid.slice(3, 6);
  const r3 = numberGrid.slice(6, 9);

  return (
    <>
    <FaceIdAppleAnimation
      active={faceIdActive}
      onUnlocked={enterAppFromBoot}
      message="Autenticando con Face ID"
    />
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-card",
        isPresentationMode ? "pt-11" : "",
      )}
    >
      <div
        className="flex min-h-[30%] flex-[0.3] flex-col items-center justify-center bg-primary px-6 text-primary-foreground"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
      >
        <h1 className="text-3xl font-bold tracking-tight">VibePay</h1>
        <p className="mt-1 text-sm font-medium text-primary-foreground/85">City Wallet</p>
      </div>

      <div className="flex min-h-0 flex-[0.7] flex-col items-center overflow-y-auto bg-background px-4 pb-6 pt-5">
        <p className="text-base font-medium text-foreground">Ingresa PIN</p>

        <motion.div
          key={shaken}
          className="mt-4 flex h-4 justify-center gap-2.5"
          animate={shaken > 0 ? { x: [0, -6, 6, -6, 6, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={`dot-${i}`}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2",
                i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/50 bg-transparent",
              )}
            />
          ))}
        </motion.div>

        <div className="mt-auto flex w-full max-w-[17rem] flex-col gap-2.5 pt-4">
          {[r1, r2, r3].map((row, ri) => (
            <div key={`p-${ri}`} className="grid grid-cols-3 gap-2.5">
              {row.map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => onDigit(String(n))}
                  className="flex h-12 items-center justify-center rounded-full bg-zinc-200/95 text-xl font-light tabular-nums text-foreground transition active:scale-95 dark:bg-zinc-600/95"
                  aria-label={`Dígito ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={onBackspace}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-200/95 text-foreground/80 transition active:scale-95 dark:bg-zinc-600/95"
              aria-label="Borrar"
            >
              <Delete className="h-6 w-6" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onDigit("0")}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-200/95 text-xl font-light text-foreground transition active:scale-95 dark:bg-zinc-600/95"
              aria-label="Cero"
            >
              0
            </button>
            <button
              type="button"
              onClick={onFaceId}
              disabled={faceIdActive}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-200/95 text-foreground transition active:scale-95 enabled:cursor-pointer enabled:hover:bg-zinc-300/95 disabled:opacity-50 dark:bg-zinc-600/95 dark:enabled:hover:bg-zinc-500/95"
              aria-label="Face ID: autenticar"
            >
              <ScanFace className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
