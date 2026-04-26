import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "./bottom-nav";
import { DesktopNav } from "./desktop-nav";
import { ContextSimulator } from "./context-simulator";
import { StatusBar } from "./status-bar";
import { PushNotification } from "./push-notification";
import { PhoneHomeBar } from "./phone-home-bar";
import { useAppContext } from "@/lib/app-context";
import { DESKTOP_CONTENT_MAX, SHELL_INNER_MAX } from "@/lib/shell-layout";
import { cn } from "@/lib/utils";

export function MobileShell({ children }: { children: ReactNode }) {
  const { isPresentationMode, simulatedTime, deviceBootStage, appLaunchNonce } = useAppContext();
  const showIphoneHomeStrip = isPresentationMode && deviceBootStage === "inApp";

  return (
    <div className="min-h-screen bg-surface">
      {isPresentationMode ? (
        <div className="md:hidden">
          <StatusBar simulatedTime={simulatedTime} />
        </div>
      ) : null}
      <PushNotification />
      <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
        <DesktopNav />
        <div
          className={cn(
            "relative flex min-h-screen min-w-0 flex-1 flex-col bg-background",
            SHELL_INNER_MAX,
            isPresentationMode ? "pt-11 md:pt-0 lg:pt-0" : "",
            "pb-28 lg:pb-6",
          )}
        >
          <motion.div
            key={appLaunchNonce}
            className={cn("block min-h-0 flex-1", DESKTOP_CONTENT_MAX)}
            initial={appLaunchNonce === 0 ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {children}
          </motion.div>
          <ContextSimulator />
          <BottomNav />
          {showIphoneHomeStrip ? (
            <div className="md:hidden">
              <PhoneHomeBar />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
