import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MIA_HOME, type GeoPoint, type LocalMerchant } from "./merchantData";

export interface PushNotification {
  id: string;
  title: string;
  subtitle: string;
  body?: string;
  merchant: LocalMerchant;
  timestamp: string;
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
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);

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
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
