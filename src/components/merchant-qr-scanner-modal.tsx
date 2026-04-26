import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import jsQR from "jsqr";
import { buildCheckoutDraftFromScan } from "@/lib/checkoutFromOffer";
import { DEMO_MERCHANT_ID } from "@/lib/merchant-demo-profile";
import type { LocalMerchant } from "@/lib/merchantData";
import { parseRedeemQrString } from "@/lib/offerRedemptionQr";
import { useI18n } from "@/lib/i18n/context";
import { fetchRedeemedOfferIdsForConsumer, insertCheckoutSession } from "@/lib/walletSupabase";

/** Decode QR from a live camera using canvas + jsQR (works on PC/Mac in Chrome, Edge, Firefox, Safari — no BarcodeDetector required). */
function decodeQrFromVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const maxDim = 960;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.max(1, Math.floor(vw * scale));
  const h = Math.max(1, Math.floor(vh * scale));

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

export function MerchantQrScannerModal({
  open,
  onClose,
  merchants,
}: {
  open: boolean;
  onClose: () => void;
  merchants: LocalMerchant[];
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);

  const finalizeScan = useCallback(
    async (raw: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const parsed = parseRedeemQrString(raw);
      if (!parsed) {
        setError("Not a VibePay offer QR.");
        scannedRef.current = false;
        return;
      }
      const draft = buildCheckoutDraftFromScan(parsed, merchants);
      if (!draft) {
        setError("Offer expired or not active in this demo.");
        scannedRef.current = false;
        return;
      }
      if (draft.merchantId !== DEMO_MERCHANT_ID) {
        setError("This QR is for another store. Demo checkout is Bäckerei Treiber only.");
        scannedRef.current = false;
        return;
      }
      const session = await insertCheckoutSession(draft);
      if (!session) {
        const r = await fetchRedeemedOfferIdsForConsumer(draft.consumerId);
        setError(
          r.has(draft.offerId)
            ? t("merchant.scan.promoAlreadyUsed")
            : t("merchant.scan.checkoutFailed"),
        );
        scannedRef.current = false;
        return;
      }
      setError(null);
      setHint("Checkout sent to Mia’s phone. She can pay now.");
      setTimeout(() => {
        onClose();
        scannedRef.current = false;
        setHint(null);
      }, 900);
    },
    [merchants, onClose, t],
  );

  useEffect(() => {
    if (!open) {
      scannedRef.current = false;
      setError(null);
      setHint(null);
      setPaste("");
      setCameraStarting(false);
      return;
    }

    scannedRef.current = false;
    setError(null);
    setHint(null);
    setCameraStarting(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setCameraStarting(false);
      setError("Camera preview not ready — try again or paste the URL below.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStarting(false);
      setError("This browser does not support camera access — paste the QR URL below.");
      return;
    }

    let cancelled = false;
    let raf = 0;
    let frameSkip = 0;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        setCameraStarting(false);

        const tick = () => {
          if (cancelled || scannedRef.current) return;
          frameSkip += 1;
          // jsQR is CPU-heavy; scan every 2nd frame to keep preview smooth on laptops
          if (frameSkip % 2 === 0) {
            const raw = decodeQrFromVideoFrame(video, canvas);
            if (raw) {
              void finalizeScan(raw);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setCameraStarting(false);
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Camera permission denied — allow access for this site or paste the URL below.");
        } else {
          setError("Could not open the camera — paste the QR URL below.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopStream();
    };
  }, [open, finalizeScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 lg:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-4 text-foreground shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Scan Mia’s offer QR</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-muted p-2 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
          {cameraStarting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs font-medium text-white">
              Starting camera…
            </div>
          ) : null}
        </div>
        <canvas ref={canvasRef} className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" aria-hidden />

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Point your PC webcam at Mia’s QR. Allow the browser to use the camera when prompted.
        </p>

        {hint ? <p className="mt-2 text-center text-xs font-medium text-emerald-700">{hint}</p> : null}
        {error ? <p className="mt-2 text-center text-xs text-destructive">{error}</p> : null}

        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Or paste URL</p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="https://…/redeem?offerId=…"
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
          />
          <button
            type="button"
            disabled={!paste.trim()}
            onClick={() => void finalizeScan(paste.trim())}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Use pasted link
          </button>
        </div>
      </div>
    </div>
  );
}
