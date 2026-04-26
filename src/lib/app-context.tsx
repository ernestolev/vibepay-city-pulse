import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MIA_HOME, type GeoPoint, type LocalMerchant } from "./merchantData";
import { persistPushNotification } from "./pushNotificationsSupabase";

const WALLET_SESSION_KEY = "vibepay_wallet_unlocked";
const DEVICE_BOOT_KEY = "vibepay_device_boot";
const APP_PERSONA_KEY = "vibepay_app_persona";

export type AppPersona = "mia" | "merchant";

function getInitialAppPersona(): AppPersona {
  if (typeof window === "undefined") return "mia";
  try {
    const v = sessionStorage.getItem(APP_PERSONA_KEY);
    if (v === "merchant") return "merchant";
  } catch {
    /* ignore */
  }
  return "mia";
}

/** iOS-style boot: lock → home grid → PIN → in-app (wallet). */
export type DeviceBootStage = "lock" | "springboard" | "pin" | "inApp";

function getInitialDeviceBootStage(): DeviceBootStage {
  if (typeof window === "undefined") return "inApp";
  try {
    if (new URLSearchParams(window.location.search).get("nodevice") === "1") {
      return "inApp";
    }
    if (sessionStorage.getItem(WALLET_SESSION_KEY) === "1") {
      return "inApp";
    }
    if (sessionStorage.getItem(DEVICE_BOOT_KEY) === "1") {
      return "inApp";
    }
  } catch {
    return "inApp";
  }
  return "lock";
}

export interface PushNotification {
  id: string;
  title: string;
  subtitle: string;
  body?: string;
  merchant: LocalMerchant;
  timestamp: string;
}

/** Geo slice persisted in `simulator_state` (Supabase + localStorage). Does not clear push / notified. */
export interface SimulatorPersistenceGeoSnapshot {
  miaOrigin: GeoPoint;
  miaDestination: GeoPoint | null;
  isWalking: boolean;
}

export interface AppState {
  isPresentationMode: boolean;
  setIsPresentationMode: (value: boolean) => void;

  simulatedTime: string | null;
  setSimulatedTime: (value: string | null) => void;

  miaPosition: GeoPoint;
  setMiaPosition: (p: GeoPoint) => void;

  /**
   * Mia's *origin* — the point she's standing at when not walking. Distinct
   * from `miaPosition` (which interpolates while walking). Owners can move
   * this anywhere on the map to demo proximity offers from a different
   * neighbourhood without resetting state.
   */
  miaOrigin: GeoPoint;
  setMiaOrigin: (p: GeoPoint) => void;

  destination: GeoPoint | null;
  setDestination: (p: GeoPoint | null) => void;

  isWalking: boolean;
  setIsWalking: (v: boolean) => void;

  pushNotification: PushNotification | null;
  showPushNotification: (n: PushNotification) => void;
  dismissPushNotification: () => void;

  simulatedMerchant: LocalMerchant | null;
  setSimulatedMerchant: (m: LocalMerchant | null) => void;

  notifiedMerchantIds: Set<string>;
  markMerchantNotified: (id: string) => void;
  clearNotifiedMerchants: () => void;
  resetWalkSession: () => void;
  /**
   * After a simulated walk ends or pauses: set standing point here (updates `miaOrigin` + `miaPosition`,
   * clears route). Does not wipe push / Co-Pilot focus. Persisted by SimulatorStateBridge like `miaOrigin`.
   */
  commitStandingLocation: (p: GeoPoint) => void;
  /** DB / realtime / localStorage: apply origin, route destination, walking without wiping offers or push. */
  applySimulatorPersistenceSnapshot: (p: SimulatorPersistenceGeoSnapshot) => void;

  deviceBootStage: DeviceBootStage;
  setDeviceBootStage: (s: DeviceBootStage) => void;
  enterAppFromBoot: () => void;
  /** Bumps on each in-app open from the device flow so the shell can play an entrance. */
  appLaunchNonce: number;
  /** Clears wallet + device flags so the next abrir desde springboard pide PIN de nuevo. */
  clearWalletSession: () => void;
  /** Clears session flag and returns to the lock screen (jury / demo again). */
  replayDeviceBoot: () => void;

  /** Consumer (Mia) vs. demo local store owner (merchant) — same shell, different copy & flows. */
  appPersona: AppPersona;
  setAppPersona: (p: AppPersona) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [deviceBootStage, setDeviceBootStage] = useState<DeviceBootStage>(getInitialDeviceBootStage);
  const [appLaunchNonce, setAppLaunchNonce] = useState(0);
  const [appPersona, setAppPersonaState] = useState<AppPersona>(getInitialAppPersona);

  const setAppPersona = useCallback((p: AppPersona) => {
    setAppPersonaState(p);
    try {
      sessionStorage.setItem(APP_PERSONA_KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const [miaOrigin, setMiaOriginState] = useState<GeoPoint>(MIA_HOME);
  const [miaPosition, setMiaPosition] = useState<GeoPoint>(MIA_HOME);
  const [destination, setDestination] = useState<GeoPoint | null>(null);
  const [isWalking, setIsWalking] = useState(false);

  const setMiaOrigin = useCallback((p: GeoPoint) => {
    setMiaOriginState(p);
    setMiaPosition(p);
    setIsWalking(false);
    setDestination(null);
    setNotifiedMerchantIds(new Set());
    setSimulatedMerchant(null);
    setPushNotification(null);
  }, []);
  const [pushNotification, setPushNotification] = useState<PushNotification | null>(null);
  const [simulatedMerchant, setSimulatedMerchant] = useState<LocalMerchant | null>(null);
  const [notifiedMerchantIds, setNotifiedMerchantIds] = useState<Set<string>>(() => new Set());

  const showPushNotification = useCallback((n: PushNotification) => {
    setPushNotification(n);
    void persistPushNotification({
      id: n.id,
      title: n.title,
      subtitle: n.subtitle,
      body: n.body,
      merchantId: n.merchant.id,
      merchantName: n.merchant.name,
    });
  }, []);

  const dismissPushNotification = useCallback(() => {
    setPushNotification(null);
  }, []);

  const markMerchantNotified = useCallback((id: string) => {
    setNotifiedMerchantIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearNotifiedMerchants = useCallback(() => {
    setNotifiedMerchantIds(new Set());
    setSimulatedMerchant(null);
    setPushNotification(null);
  }, []);

  const resetWalkSession = useCallback(() => {
    setMiaPosition(miaOrigin);
    setDestination(null);
    setIsWalking(false);
    setPushNotification(null);
    setSimulatedMerchant(null);
    setNotifiedMerchantIds(new Set());
  }, [miaOrigin]);

  const commitStandingLocation = useCallback((p: GeoPoint) => {
    setMiaOriginState(p);
    setMiaPosition(p);
    setIsWalking(false);
    setDestination(null);
  }, []);

  const applySimulatorPersistenceSnapshot = useCallback((p: SimulatorPersistenceGeoSnapshot) => {
    setMiaOriginState(p.miaOrigin);
    setDestination(p.miaDestination);
    setIsWalking(p.isWalking);
    /**
     * While `isWalking`, `miaPosition` is advanced by PathSimulator — do not snap to origin here.
     * Realtime echoes of our own upsert were resetting Mia to the route start every ~450ms, so she
     * never stayed within proximity of merchant pins and push never fired.
     */
    if (!p.isWalking) {
      setMiaPosition(p.miaOrigin);
    }
  }, []);

  const clearWalletSession = useCallback(() => {
    try {
      sessionStorage.removeItem(WALLET_SESSION_KEY);
      sessionStorage.removeItem(DEVICE_BOOT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const enterAppFromBoot = useCallback(() => {
    try {
      sessionStorage.setItem(DEVICE_BOOT_KEY, "1");
      sessionStorage.setItem(WALLET_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setAppLaunchNonce((n) => n + 1);
    setDeviceBootStage("inApp");
  }, []);

  const replayDeviceBoot = useCallback(() => {
    try {
      sessionStorage.removeItem(DEVICE_BOOT_KEY);
      sessionStorage.removeItem(WALLET_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setDeviceBootStage("lock");
  }, []);

  const value = useMemo<AppState>(
    () => ({
      isPresentationMode,
      setIsPresentationMode,
      simulatedTime,
      setSimulatedTime,
      miaPosition,
      setMiaPosition,
      miaOrigin,
      setMiaOrigin,
      destination,
      setDestination,
      isWalking,
      setIsWalking,
      pushNotification,
      showPushNotification,
      dismissPushNotification,
      simulatedMerchant,
      setSimulatedMerchant,
      notifiedMerchantIds,
      markMerchantNotified,
      clearNotifiedMerchants,
      resetWalkSession,
      commitStandingLocation,
      applySimulatorPersistenceSnapshot,
      deviceBootStage,
      setDeviceBootStage,
      enterAppFromBoot,
      appLaunchNonce,
      clearWalletSession,
      replayDeviceBoot,
      appPersona,
      setAppPersona,
    }),
    [
      isPresentationMode,
      simulatedTime,
      miaPosition,
      miaOrigin,
      setMiaOrigin,
      destination,
      isWalking,
      pushNotification,
      simulatedMerchant,
      notifiedMerchantIds,
      showPushNotification,
      dismissPushNotification,
      markMerchantNotified,
      clearNotifiedMerchants,
      resetWalkSession,
      commitStandingLocation,
      applySimulatorPersistenceSnapshot,
      deviceBootStage,
      appLaunchNonce,
      enterAppFromBoot,
      clearWalletSession,
      replayDeviceBoot,
      appPersona,
      setAppPersona,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
