import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SCAN_MS = 1500;
const SUCCESS_HOLD_MS = 500;
const BEFORE_UNLOCK_MS = 180;

type Phase = "scan" | "success";

/** Colores y tipografía alineados con UIKit (modo oscuro) — aprox. HIG. */
const IOS = {
  label: "rgba(255, 255, 255, 0.92)",
  secondary: "rgba(235, 235, 245, 0.6)",
  systemGreen: "#34C759",
  scrim: "rgba(0, 0, 0, 0.45)",
} as const;

const easeApple = [0.25, 0.1, 0.25, 1] as const;
const scanEase = [0.4, 0.0, 0.2, 1.0] as const;

interface FaceIdAppleAnimationProps {
  active: boolean;
  onUnlocked: () => void;
  message?: string;
}

/**
 * Presentación estilo iOS: material oscuro, SF stack, contorno de rostro + barrido
 * (no usa assets de Apple; aproximación al flujo y timing del sistema).
 */
export function FaceIdAppleAnimation({ active, onUnlocked, message = "Autenticando con Face ID" }: FaceIdAppleAnimationProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("scan");
  const unlockRef = useRef(onUnlocked);
  unlockRef.current = onUnlocked;

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setPhase("scan");
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      unlockRef.current();
      return;
    }

    setVisible(true);
    setPhase("scan");
    const t1 = window.setTimeout(() => setPhase("success"), SCAN_MS);
    const t2 = window.setTimeout(() => {
      unlockRef.current();
    }, SCAN_MS + SUCCESS_HOLD_MS + BEFORE_UNLOCK_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {visible && active ? (
        <motion.div
          key="faceid"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.22, ease: easeApple } }}
          transition={{ duration: 0.32, ease: easeApple }}
        >
          {/** Scrim + vibrancia tipo UIVisualEffect (aprox. con blur) */}
          <div
            className="absolute inset-0 backdrop-blur-2xl backdrop-saturate-150"
            style={{ backgroundColor: IOS.scrim }}
            aria-hidden
          />

          <div className="relative z-10 flex w-full max-w-sm flex-col items-center" role="status" aria-live="polite">
            <h2
              className="px-4 text-center"
              style={{
                color: IOS.label,
                fontSize: 17,
                lineHeight: "22px",
                fontWeight: 600,
                letterSpacing: -0.41,
              }}
            >
              {message}
            </h2>

            <div className="mt-6 flex w-full flex-col items-center">
              {/** Tamaño ~ como el glifo del sistema (≈90–100pt) */}
              <div className="relative h-28 w-28" aria-hidden>
                <FaceIdIosGlyph phase={phase} />
              </div>

              <p
                className="mt-5 text-center"
                style={{
                  color: phase === "success" ? IOS.systemGreen : IOS.secondary,
                  fontSize: 15,
                  lineHeight: "20px",
                  fontWeight: 400,
                  letterSpacing: -0.24,
                  minHeight: 20,
                }}
              >
                {phase === "success" ? "Rostro reconocido" : "Buscando rostro…"}
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Contorno de rostro en marco (squircle vertical) + ojos y boca — estilo al prompt de iOS, no un asset oficial.
 */
function FaceIdIosGlyph({ phase }: { phase: Phase }) {
  const success = phase === "success";
  const stroke = success ? IOS.systemGreen : "rgba(255, 255, 255, 0.95)";

  return (
    <svg viewBox="0 0 100 110" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <filter id="face-id-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="face-id-clip">
          <path
            d="M50 8 C 28 8 12 24 12 48 L 12 62 C 12 80 24 95 40 100 L 50 104 L 60 100 C 76 95 88 80 88 62 L 88 48 C 88 24 72 8 50 8 Z"
            fill="white"
          />
        </clipPath>
        <linearGradient id="face-scan-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="45%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.95" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/** Pulso barely perceptible (como el sistema) */}
      <motion.g
        filter="url(#face-id-soft)"
        initial={false}
        animate={success ? { scale: 1, opacity: 1 } : { scale: [1, 1.02, 1] }}
        transition={
          success
            ? { type: "spring", stiffness: 400, damping: 24 }
            : { duration: 1.45, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformOrigin: "50px 55px" }}
      >
        <motion.path
          d="M50 8 C 28 8 12 24 12 48 L 12 62 C 12 80 24 95 40 100 L 50 104 L 60 100 C 76 95 88 80 88 62 L 88 48 C 88 24 72 8 50 8 Z"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={false}
          animate={{ stroke }}
          transition={{ duration: 0.38, ease: easeApple }}
        />
        <motion.circle
          cx="36"
          cy="48"
          r="3.5"
          fill={stroke}
          initial={false}
          animate={{ fill: stroke }}
          transition={{ duration: 0.38, ease: easeApple }}
        />
        <motion.circle
          cx="64"
          cy="48"
          r="3.5"
          fill={stroke}
          initial={false}
          animate={{ fill: stroke }}
          transition={{ duration: 0.38, ease: easeApple }}
        />
        <motion.path
          d="M 34 64 Q 50 78 66 64"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={false}
          animate={{ stroke }}
          transition={{ duration: 0.38, ease: easeApple }}
        />
      </motion.g>

      {/** Barrido luminoso, solo en fase scan */}
      {!success && (
        <motion.g clipPath="url(#face-id-clip)">
          <motion.rect
            x="0"
            width="100"
            height="12"
            fill="url(#face-scan-grad)"
            style={{ filter: "blur(1.5px)" }}
            initial={{ y: 10, opacity: 0.4 }}
            animate={{
              y: [8, 88, 8, 88, 8],
              opacity: [0.35, 0.9, 0.4, 0.85, 0.4],
            }}
            transition={{
              y: { duration: SCAN_MS / 1000, times: [0, 0.25, 0.5, 0.75, 1], ease: scanEase },
              opacity: { duration: SCAN_MS / 1000, times: [0, 0.25, 0.5, 0.75, 1], ease: scanEase },
            }}
          />
        </motion.g>
      )}

      {/** Check de éxito, esquina como en diálogos de sistema */}
      {success && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.04 }}
        >
          <circle cx="90" cy="20" r="9" fill={IOS.systemGreen} />
          <path
            d="M85.5 20.5 L88.2 23.2 L94.5 16.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>
      )}
    </svg>
  );
}
