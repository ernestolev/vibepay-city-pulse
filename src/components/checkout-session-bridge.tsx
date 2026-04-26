import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAppContext } from "@/lib/app-context";
import { DEMO_CONSUMER_ID } from "@/lib/consumerProfileSupabase";
import { subscribeCheckoutSessionsForConsumer, type CheckoutSession } from "@/lib/walletSupabase";

/**
 * When the merchant creates a checkout_session for Mia, push her into the Pay flow (Realtime or local event).
 */
export function CheckoutSessionBridge() {
  const { appPersona, deviceBootStage } = useAppContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (appPersona !== "mia" || deviceBootStage !== "inApp") return;

    const onInsert = (session: CheckoutSession) => {
      const p = pathRef.current;
      if (p.startsWith("/pay/") && p.includes(session.id)) return;
      void navigate({ to: "/pay/$sessionId", params: { sessionId: session.id } });
    };

    return subscribeCheckoutSessionsForConsumer(DEMO_CONSUMER_ID, onInsert);
  }, [appPersona, deviceBootStage, navigate]);

  return null;
}
