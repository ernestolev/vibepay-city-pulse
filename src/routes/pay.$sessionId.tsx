import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { PayoneSeal } from "@/components/payone-seal";
import {
  completeCheckoutRpc,
  fetchCheckoutSession,
  formatEuroFromCents,
  type CheckoutSession,
} from "@/lib/walletSupabase";

export const Route = createFileRoute("/pay/$sessionId")({
  head: () => ({
    meta: [{ title: "Pay — VibePay" }],
  }),
  component: PaySessionPage,
});

type Phase = "pay" | "otp" | "processing" | "success";

function PaySessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pay");
  const [otp, setOtp] = useState("");
  const [payErr, setPayErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const row = await fetchCheckoutSession(sessionId);
      if (!alive) return;
      if (!row) {
        setLoadErr("Checkout not found.");
        return;
      }
      if (row.status === "completed") {
        setSession(row);
        setPhase("success");
        return;
      }
      setSession(row);
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "otp") return;
    const t = window.setTimeout(() => setOtp("847291"), 1200);
    return () => window.clearTimeout(t);
  }, [phase]);

  async function onConfirmOtp() {
    if (otp.length < 6) return;
    setPayErr(null);
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 1400));
    const res = await completeCheckoutRpc(sessionId);
    if (!res.ok) {
      setPayErr(res.error ?? "Payment failed");
      setPhase("pay");
      return;
    }
    setPhase("success");
  }

  if (loadErr) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-sm text-destructive">{loadErr}</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => void navigate({ to: "/" })}
        >
          Home
        </button>
      </div>
    );
  }

  if (!session && phase !== "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "success" && session) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6 text-center text-white"
      >
        <div className="mb-6 rounded-full border border-emerald-400/40 bg-emerald-500/15 p-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/90">Payone Riel</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Payment complete</h1>
        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{formatEuroFromCents(session.amount_cents)}</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
          {session.merchant_name} · settled on the Payone rail. Your wallet and Activity are updated.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <PayoneSeal variant="wordmark" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Secured checkout</span>
        </div>
        <button
          type="button"
          className="mt-10 w-full max-w-xs rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-900/40"
          onClick={() => void navigate({ to: "/" })}
        >
          Back to wallet
        </button>
      </motion.div>
    );
  }

  const s = session!;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground"
            onClick={() => void navigate({ to: "/" })}
          >
            Cancel
          </button>
          <PayoneSeal variant="rail" tone="live" trailing="Checkout" />
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-4 pb-24 pt-8">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Pay at counter
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold leading-tight md:text-3xl">{s.merchant_name}</h1>

        <ul className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-4">
          {s.line_items.map((line, i) => (
            <li key={`${line.name}-${i}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{line.name}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatEuroFromCents(line.unit_cents)}</span>
            </li>
          ))}
          {s.discount_pct > 0 ? (
            <li className="flex items-center justify-between border-t border-border pt-3 text-sm text-emerald-700">
              <span>VibePay offer · −{s.discount_pct}%</span>
              <span className="font-semibold">−{formatEuroFromCents(s.subtotal_cents - s.amount_cents)}</span>
            </li>
          ) : null}
        </ul>

        <div className="mt-10 text-center">
          <p className="text-xs font-medium text-muted-foreground">Total due</p>
          <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight md:text-6xl">
            {formatEuroFromCents(s.amount_cents)}
          </p>
        </div>

        {payErr ? <p className="mt-4 text-center text-sm text-destructive">{payErr}</p> : null}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => {
              setPayErr(null);
              setOtp("");
              setPhase("otp");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Shield className="h-5 w-5" />
            Pay with Payone
          </button>
        </div>
      </main>

      <AnimatePresence>
        {phase === "otp" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
            onClick={() => setPhase("pay")}
          >
            <motion.section
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-sm font-semibold">Dynamic authentication</p>
              <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
                A one-time code is being sent to your device (simulated for this demo).
              </p>
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.35em] text-foreground">
                  {otp || "······"}
                </p>
              </div>
              <button
                type="button"
                disabled={otp.length < 6}
                onClick={() => void onConfirmOtp()}
                className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-45"
              >
                Confirm & pay
              </button>
              <button
                type="button"
                className="mt-2 w-full py-2 text-xs font-medium text-muted-foreground"
                onClick={() => setPhase("pay")}
              >
                Back
              </button>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {phase === "processing" ? (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/92 backdrop-blur-sm">
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Settling via Payone Riel…</p>
        </div>
      ) : null}
    </div>
  );
}
