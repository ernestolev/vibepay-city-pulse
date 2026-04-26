import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { INITIAL_MERCHANTS, type LocalMerchant, type Occupancy } from "./merchantData";
import type { OfferRule } from "./offerEngine";

/**
 * Merchant rules live in React state so that the owner UI (/merchant) and
 * Mia's UI (/) read from the SAME source. When an owner flips a rule or
 * drags a discount slider, Mia's Vibe Card recomputes immediately via
 * `evaluateOffer()`. This is what makes the "generative" loop visible in
 * the demo.
 */

type Updater<T> = (prev: T) => T;

interface MerchantRulesState {
  merchants: LocalMerchant[];
  updateMerchant: (merchantId: string, updater: Updater<LocalMerchant>) => void;
  updateRule: (merchantId: string, ruleId: string, updater: Updater<OfferRule>) => void;
  toggleRule: (merchantId: string, ruleId: string) => void;
  setOccupancy: (merchantId: string, occupancy: Occupancy) => void;
  setTransactionsToday: (merchantId: string, count: number) => void;
  setLowTrafficThreshold: (merchantId: string, threshold: number) => void;
  setDailyTargetReached: (merchantId: string, reached: boolean) => void;
  incrementTransaction: (merchantId: string) => void;
  resetMerchant: (merchantId: string) => void;
  resetAll: () => void;
}

const MerchantRulesContext = createContext<MerchantRulesState | null>(null);

function cloneMerchants(): LocalMerchant[] {
  return INITIAL_MERCHANTS.map((m) => ({
    ...m,
    rules: m.rules.map((r) => ({ ...r, when: { ...r.when }, then: { ...r.then } })),
  }));
}

export function MerchantRulesProvider({ children }: { children: ReactNode }) {
  const [merchants, setMerchants] = useState<LocalMerchant[]>(() => cloneMerchants());

  const updateMerchant = useCallback(
    (merchantId: string, updater: Updater<LocalMerchant>) => {
      setMerchants((prev) => prev.map((m) => (m.id === merchantId ? updater(m) : m)));
    },
    [],
  );

  const updateRule = useCallback(
    (merchantId: string, ruleId: string, updater: Updater<OfferRule>) => {
      setMerchants((prev) =>
        prev.map((m) => {
          if (m.id !== merchantId) return m;
          return {
            ...m,
            rules: m.rules.map((r) => (r.id === ruleId ? updater(r) : r)),
          };
        }),
      );
    },
    [],
  );

  const toggleRule = useCallback((merchantId: string, ruleId: string) => {
    setMerchants((prev) =>
      prev.map((m) => {
        if (m.id !== merchantId) return m;
        return {
          ...m,
          rules: m.rules.map((r) =>
            r.id === ruleId ? { ...r, enabled: !r.enabled } : r,
          ),
        };
      }),
    );
  }, []);

  const setOccupancy = useCallback((merchantId: string, occupancy: Occupancy) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === merchantId ? { ...m, occupancy } : m)),
    );
  }, []);

  const setTransactionsToday = useCallback((merchantId: string, count: number) => {
    const safe = Math.max(0, Math.round(count));
    setMerchants((prev) =>
      prev.map((m) => (m.id === merchantId ? { ...m, currentTransactionsToday: safe } : m)),
    );
  }, []);

  const setLowTrafficThreshold = useCallback((merchantId: string, threshold: number) => {
    const safe = Math.max(1, Math.round(threshold));
    setMerchants((prev) =>
      prev.map((m) => (m.id === merchantId ? { ...m, lowTrafficThreshold: safe } : m)),
    );
  }, []);

  const setDailyTargetReached = useCallback((merchantId: string, reached: boolean) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === merchantId ? { ...m, dailyTargetReached: reached } : m)),
    );
  }, []);

  const incrementTransaction = useCallback((merchantId: string) => {
    setMerchants((prev) =>
      prev.map((m) =>
        m.id === merchantId
          ? { ...m, currentTransactionsToday: m.currentTransactionsToday + 1 }
          : m,
      ),
    );
  }, []);

  const resetMerchant = useCallback((merchantId: string) => {
    setMerchants((prev) => {
      const fresh = cloneMerchants().find((m) => m.id === merchantId);
      if (!fresh) return prev;
      return prev.map((m) => (m.id === merchantId ? fresh : m));
    });
  }, []);

  const resetAll = useCallback(() => {
    setMerchants(cloneMerchants());
  }, []);

  const value = useMemo<MerchantRulesState>(
    () => ({
      merchants,
      updateMerchant,
      updateRule,
      toggleRule,
      setOccupancy,
      setTransactionsToday,
      setLowTrafficThreshold,
      setDailyTargetReached,
      incrementTransaction,
      resetMerchant,
      resetAll,
    }),
    [
      merchants,
      updateMerchant,
      updateRule,
      toggleRule,
      setOccupancy,
      setTransactionsToday,
      setLowTrafficThreshold,
      setDailyTargetReached,
      incrementTransaction,
      resetMerchant,
      resetAll,
    ],
  );

  return (
    <MerchantRulesContext.Provider value={value}>{children}</MerchantRulesContext.Provider>
  );
}

export function useMerchantRules(): MerchantRulesState {
  const ctx = useContext(MerchantRulesContext);
  if (!ctx) throw new Error("useMerchantRules must be used within MerchantRulesProvider");
  return ctx;
}

export function useMerchants(): LocalMerchant[] {
  return useMerchantRules().merchants;
}

export function useMerchantById(id: string | null | undefined): LocalMerchant | undefined {
  const merchants = useMerchants();
  if (!id) return undefined;
  return merchants.find((m) => m.id === id);
}
