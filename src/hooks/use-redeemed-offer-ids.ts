import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_CONSUMER_ID } from "@/lib/consumerProfileSupabase";
import { fetchRedeemedOfferIdsForConsumer } from "@/lib/walletSupabase";

/** Tracks flash-offer IDs Mia has already paid for (completed checkout). */
export function useRedeemedOfferIds() {
  const [redeemedOfferIds, setRedeemedOfferIds] = useState<string[]>([]);
  const [redeemedHydrated, setRedeemedHydrated] = useState(false);

  const refresh = useCallback(() => {
    void fetchRedeemedOfferIdsForConsumer(DEMO_CONSUMER_ID)
      .then((s) => setRedeemedOfferIds([...s].sort()))
      .finally(() => setRedeemedHydrated(true));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("vibepay-balance-changed", refresh);
    return () => window.removeEventListener("vibepay-balance-changed", refresh);
  }, [refresh]);

  const redeemedSet = useMemo(() => new Set(redeemedOfferIds), [redeemedOfferIds]);

  const isOfferRedeemed = useCallback((offerId: string) => redeemedSet.has(offerId), [redeemedSet]);

  return { redeemedOfferIds, redeemedSet, redeemedHydrated, isOfferRedeemed };
}
