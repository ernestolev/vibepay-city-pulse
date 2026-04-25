import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ContextSimulator } from "./context-simulator";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="relative mx-auto min-h-screen max-w-md bg-background pb-28">
        {children}
        <ContextSimulator />
        <BottomNav />
      </div>
    </div>
  );
}
