import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ContextSimulator } from "./context-simulator";
import { StatusBar } from "./status-bar";
import { PushNotification } from "./push-notification";
import { useAppContext } from "@/lib/app-context";

export function MobileShell({ children }: { children: ReactNode }) {
  const { isPresentationMode, simulatedTime } = useAppContext();

  return (
    <div className="min-h-screen bg-surface">
      {isPresentationMode ? <StatusBar simulatedTime={simulatedTime} /> : null}
      <PushNotification />
      <div
        className={`relative mx-auto min-h-screen max-w-md bg-background pb-28 ${
          isPresentationMode ? "pt-11" : ""
        }`}
      >
        {children}
        <ContextSimulator />
        <BottomNav />
      </div>
    </div>
  );
}
