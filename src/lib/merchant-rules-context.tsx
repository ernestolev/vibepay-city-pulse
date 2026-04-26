import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import {
  type MerchantRow,
  MERCHANTS_CROSS_TAB_SYNC_KEY,
  fetchMerchantsFromSupabase,
  merchantToRow,
  orderMerchants,
  rowToMerchant,
  ensureMerchantsSeeded,
  upsertMerchant,
  upsertMerchants,
} from "./merchantSupabase";
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
  /** False until the first Supabase merchants fetch finishes (avoids flashing seed data). True immediately if Supabase is off. */
  merchantsRemoteHydrated: boolean;
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
    productInventory: m.productInventory.map((p) => ({ ...p, tags: [...p.tags] })),
    flashOffers: (m.flashOffers ?? []).map((s) => ({
      ...s,
      productTags: s.productTags ? [...s.productTags] : null,
    })),
    rules: m.rules.map((r) => ({ ...r, when: { ...r.when }, then: { ...r.then } })),
  }));
}

export function MerchantRulesProvider({ children }: { children: ReactNode }) {
  const [merchants, setMerchants] = useState<LocalMerchant[]>(() => cloneMerchants());
  const [merchantsRemoteHydrated, setMerchantsRemoteHydrated] = useState(() => !isSupabaseConfigured());

  useEffect(() => {
    if (import.meta.env.DEV && !isSupabaseConfigured()) {
      console.warn(
        "[VibePay] Supabase no está conectado en el front: los cambios (ofertas, reglas…) solo viven en esta pestaña.\n" +
          "→ Crea .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (Project Settings → API en Supabase).\n" +
          "→ Copia la plantilla desde .env.example, guarda y reinicia `npm run dev`.",
      );
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    let pullDebounce: number | null = null;

    const applyRemoteList = (list: LocalMerchant[] | null) => {
      if (cancelled || !list || list.length === 0) return;
      setMerchants(orderMerchants(list));
    };

    /** Full pull from DB — used when another tab wrote (storage) or tab regains focus. */
    const resyncFromSupabase = async () => {
      const list = await fetchMerchantsFromSupabase();
      if (cancelled) return;
      applyRemoteList(list);
    };

    const scheduleResync = () => {
      if (pullDebounce != null) window.clearTimeout(pullDebounce);
      pullDebounce = window.setTimeout(() => {
        pullDebounce = null;
        void resyncFromSupabase();
      }, 320);
    };

    (async () => {
      try {
        let list = await fetchMerchantsFromSupabase();
        if (cancelled) return;
        // Empty table or first fetch hiccup: fill from INITIAL_MERCHANTS
        if (!list || list.length === 0) {
          await ensureMerchantsSeeded();
          if (cancelled) return;
          list = await fetchMerchantsFromSupabase();
        }
        if (cancelled) return;
        applyRemoteList(list);
      } finally {
        if (!cancelled) setMerchantsRemoteHydrated(true);
      }
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === MERCHANTS_CROSS_TAB_SYNC_KEY && e.newValue) scheduleResync();
    };
    window.addEventListener("storage", onStorage);

    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleResync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const channel = supabase
      .channel("vibepay-merchants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchants" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old) {
            const id = (payload.old as { id: string }).id;
            setMerchants((prev) => prev.filter((m) => m.id !== id));
            return;
          }
          if (payload.new) {
            const m = rowToMerchant(payload.new as MerchantRow);
            setMerchants((prev) => {
              const i = prev.findIndex((x) => x.id === m.id);
              if (i === -1) return orderMerchants([...prev, m]);
              const next = [...prev];
              next[i] = m;
              return next;
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") scheduleResync();
      });

    return () => {
      cancelled = true;
      if (pullDebounce != null) window.clearTimeout(pullDebounce);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, []);

  const updateMerchant = useCallback(
    (merchantId: string, updater: Updater<LocalMerchant>) => {
      setMerchants((prev) => {
        const next = prev.map((m) => (m.id === merchantId ? updater(m) : m));
        const row = next.find((m) => m.id === merchantId);
        if (row) void upsertMerchant(row);
        return next;
      });
    },
    [],
  );

  const updateRule = useCallback(
    (merchantId: string, ruleId: string, updater: Updater<OfferRule>) => {
      setMerchants((prev) => {
        const next = prev.map((m) => {
          if (m.id !== merchantId) return m;
          return {
            ...m,
            rules: m.rules.map((r) => (r.id === ruleId ? updater(r) : r)),
          };
        });
        const row = next.find((m) => m.id === merchantId);
        if (row) void upsertMerchant(row);
        return next;
      });
    },
    [],
  );

  const toggleRule = useCallback((merchantId: string, ruleId: string) => {
    setMerchants((prev) => {
      const next = prev.map((m) => {
        if (m.id !== merchantId) return m;
        return {
          ...m,
          rules: m.rules.map((r) =>
            r.id === ruleId ? { ...r, enabled: !r.enabled } : r,
          ),
        };
      });
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const setOccupancy = useCallback((merchantId: string, occupancy: Occupancy) => {
    setMerchants((prev) => {
      const next = prev.map((m) => (m.id === merchantId ? { ...m, occupancy } : m));
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const setTransactionsToday = useCallback((merchantId: string, count: number) => {
    const safe = Math.max(0, Math.round(count));
    setMerchants((prev) => {
      const next = prev.map((m) =>
        m.id === merchantId ? { ...m, currentTransactionsToday: safe } : m,
      );
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const setLowTrafficThreshold = useCallback((merchantId: string, threshold: number) => {
    const safe = Math.max(1, Math.round(threshold));
    setMerchants((prev) => {
      const next = prev.map((m) =>
        m.id === merchantId ? { ...m, lowTrafficThreshold: safe } : m,
      );
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const setDailyTargetReached = useCallback((merchantId: string, reached: boolean) => {
    setMerchants((prev) => {
      const next = prev.map((m) =>
        m.id === merchantId ? { ...m, dailyTargetReached: reached } : m,
      );
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const incrementTransaction = useCallback((merchantId: string) => {
    setMerchants((prev) => {
      const next = prev.map((m) =>
        m.id === merchantId
          ? { ...m, currentTransactionsToday: m.currentTransactionsToday + 1 }
          : m,
      );
      const row = next.find((m) => m.id === merchantId);
      if (row) void upsertMerchant(row);
      return next;
    });
  }, []);

  const resetMerchant = useCallback((merchantId: string) => {
    setMerchants((prev) => {
      const fresh = cloneMerchants().find((m) => m.id === merchantId);
      if (!fresh) return prev;
      const next = prev.map((m) => (m.id === merchantId ? fresh : m));
      void upsertMerchant(fresh);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const fresh = cloneMerchants();
    setMerchants(fresh);
    void upsertMerchants(fresh);
  }, []);

  const value = useMemo<MerchantRulesState>(
    () => ({
      merchants,
      merchantsRemoteHydrated,
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
      merchantsRemoteHydrated,
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

export function useMerchantsRemoteHydrated(): boolean {
  return useMerchantRules().merchantsRemoteHydrated;
}

export function useMerchantById(id: string | null | undefined): LocalMerchant | undefined {
  const merchants = useMerchants();
  if (!id) return undefined;
  return merchants.find((m) => m.id === id);
}
