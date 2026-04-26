import { useEffect, useState } from "react";

/** Current time (ms), updates every `intervalMs` — for expiry checks without polling merchants. */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
