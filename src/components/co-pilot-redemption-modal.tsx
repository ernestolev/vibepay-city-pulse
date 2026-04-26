import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { PayoneSeal } from "@/components/payone-seal";
import { useI18n } from "@/lib/i18n/context";
import { buildFlashOfferRedeemUrl, type FlashOfferQrFields } from "@/lib/offerRedemptionQr";

interface CoPilotRedemptionModalProps {
  open: boolean;
  onClose: () => void;
  offer: FlashOfferQrFields | null;
  /** After successful Payone checkout this offer is marked redeemed — hide QR. */
  redeemed?: boolean;
}

export function CoPilotRedemptionModal({ open, onClose, offer, redeemed = false }: CoPilotRedemptionModalProps) {
  const { t } = useI18n();
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    if (!open || !offer || redeemed || typeof window === "undefined") {
      setQrValue("");
      return;
    }
    setQrValue(buildFlashOfferRedeemUrl(offer, window.location.origin));
  }, [open, offer, redeemed]);

  const merchantName = offer?.merchantName ?? "";
  const discountPct = offer?.discountPct ?? 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 lg:items-center"
          onClick={onClose}
        >
          <motion.section
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {redeemed ? t("copilot.modal.alreadyUsedTitle") : t("copilot.modal.title")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:text-foreground"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {redeemed ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-amber-950">{t("copilot.alreadyUsed")}</p>
                <p className="mt-2 text-xs leading-relaxed text-amber-900/90">{t("copilot.modal.alreadyUsedBody")}</p>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-4 flex justify-center rounded-2xl bg-white p-3 ring-1 ring-border">
                  {qrValue ? (
                    <QRCodeSVG
                      value={qrValue}
                      size={192}
                      bgColor="#ffffff"
                      fgColor="#111111"
                      level="M"
                      marginSize={0}
                      aria-label={t("copilot.openQr")}
                    />
                  ) : (
                    <div className="h-48 w-48 animate-pulse rounded-lg bg-muted" aria-hidden />
                  )}
                </div>

                {offer ? (
                  <p className="mb-2 break-all text-center font-mono text-[10px] leading-snug text-muted-foreground">
                    {offer.id}
                  </p>
                ) : null}

                <p className="text-center text-sm font-medium text-foreground">
                  {t("copilot.modal.payAt", { name: merchantName, pct: discountPct })}
                </p>
                <p className="mt-2 text-center text-xs font-semibold text-emerald-800">
                  {t("copilot.modal.settled")}
                </p>

                <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                    <span>{t("copilot.modal.confirm")}</span>
                    <span aria-hidden>→</span>
                    <PayoneSeal variant="rail" tone="live" trailing={t("copilot.modal.instant")} />
                  </div>
                  <p className="text-center text-[10px] leading-snug text-emerald-900/85">
                    {t("copilot.modal.cleared")}
                  </p>
                </div>
              </>
            )}

            <div className="mt-3 flex flex-col items-center gap-1.5">
              <PayoneSeal variant="wordmark" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("copilot.powered")}
              </p>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
