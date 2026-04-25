import type { ReactNode } from "react";
import { ContextSimulator } from "./context-simulator";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="relative mx-auto min-h-screen max-w-md bg-background pb-36">
        {children}
        <ContextSimulator />
      </div>
    </div>
  );
}
