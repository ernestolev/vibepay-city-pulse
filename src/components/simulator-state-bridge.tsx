import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/lib/app-context";
import {
  fetchSimulatorState,
  loadSimulatorFromLocalStorage,
  rowToPayload,
  saveSimulatorToLocalStorage,
  SIMULATOR_ROW_ID,
  upsertSimulatorState,
  type SimulatorStatePayload,
  type SimulatorStateRow,
} from "@/lib/simulatorStateSync";
import { upsertConsumerLocation } from "@/lib/consumerProfileSupabase";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useVibe } from "@/lib/vibe-context";

const DEBOUNCE_MS = 450;
/** After applying remote/initial hydrate, ignore persist briefly to avoid echo writes. */
const SUPPRESS_MS = 800;

/**
 * Persists simulator + path state: vibe, time, presentation, `mia_origin`, `is_walking`, `mia_destination`.
 * Realtime + Supabase keep Mia in sync with the Path Simulator (walking / route ready / still).
 */
export function SimulatorStateBridge() {
  const { vibe, setVibe } = useVibe();
  const {
    simulatedTime,
    setSimulatedTime,
    isPresentationMode,
    setIsPresentationMode,
    miaOrigin,
    isWalking,
    destination,
    applySimulatorPersistenceSnapshot,
  } = useAppContext();

  const [hydrated, setHydrated] = useState(false);
  const suppressUntilRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<SimulatorStatePayload | null>(null);

  // Initial hydrate: Supabase first, else localStorage
  useEffect(() => {
    let cancelled = false;
    suppressUntilRef.current = Date.now() + SUPPRESS_MS;
    (async () => {
      if (isSupabaseConfigured()) {
        const fromDb = await fetchSimulatorState();
        if (cancelled) return;
        if (fromDb) {
          setVibe(fromDb.vibe);
          setSimulatedTime(fromDb.simulatedTime);
          setIsPresentationMode(fromDb.isPresentationMode);
          applySimulatorPersistenceSnapshot({
            miaOrigin: fromDb.miaOrigin,
            miaDestination: fromDb.miaDestination,
            isWalking: fromDb.isWalking,
          });
        } else {
          const ls = loadSimulatorFromLocalStorage();
          if (ls) {
            setVibe(ls.vibe);
            setSimulatedTime(ls.simulatedTime);
            setIsPresentationMode(ls.isPresentationMode);
            applySimulatorPersistenceSnapshot({
              miaOrigin: ls.miaOrigin,
              miaDestination: ls.miaDestination ?? null,
              isWalking: ls.isWalking ?? false,
            });
          }
        }
      } else {
        const ls = loadSimulatorFromLocalStorage();
        if (ls && !cancelled) {
          setVibe(ls.vibe);
          setSimulatedTime(ls.simulatedTime);
          setIsPresentationMode(ls.isPresentationMode);
          applySimulatorPersistenceSnapshot({
            miaOrigin: ls.miaOrigin,
            miaDestination: ls.miaDestination ?? null,
            isWalking: ls.isWalking ?? false,
          });
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySimulatorPersistenceSnapshot, setSimulatedTime, setIsPresentationMode, setVibe]);

  // Realtime: other device changed simulator
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const ch = supabase
      .channel("vibepay-simulator")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "simulator_state" },
        (payload) => {
          const row = payload.new as SimulatorStateRow;
          if (row.id !== SIMULATOR_ROW_ID) return;
          const p = rowToPayload(row);
          suppressUntilRef.current = Date.now() + SUPPRESS_MS;
          setVibe(p.vibe);
          setSimulatedTime(p.simulatedTime);
          setIsPresentationMode(p.isPresentationMode);
          applySimulatorPersistenceSnapshot({
            miaOrigin: p.miaOrigin,
            miaDestination: p.miaDestination,
            isWalking: p.isWalking,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [applySimulatorPersistenceSnapshot, setIsPresentationMode, setSimulatedTime, setVibe]);

  // Debounced persist on user changes
  useEffect(() => {
    if (!hydrated) return;
    if (Date.now() < suppressUntilRef.current) return;

    const p: SimulatorStatePayload = {
      vibe,
      simulatedTime,
      isPresentationMode,
      miaOrigin,
      isWalking,
      miaDestination: destination,
    };
    latestRef.current = p;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const payload = latestRef.current;
      if (!payload) return;
      saveSimulatorToLocalStorage(payload);
      void upsertSimulatorState(payload);
      void upsertConsumerLocation(payload.miaOrigin);
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [hydrated, vibe, simulatedTime, isPresentationMode, miaOrigin, isWalking, destination]);

  return null;
}
