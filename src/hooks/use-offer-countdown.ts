import { useEffect, useState } from "react";

/** Seconds remaining until `endsAt` (ms); updates every second. */
export function useOfferCountdown(endsAt: number | null): number {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setSec(0);
      return;
    }
    const tick = () => setSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return sec;
}
