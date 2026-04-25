import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { VibeKey } from "./vibe";

type Ctx = {
  vibe: VibeKey;
  setVibe: (v: VibeKey) => void;
};

const VibeContext = createContext<Ctx | null>(null);

export function VibeProvider({ children }: { children: ReactNode }) {
  const [vibe, setVibe] = useState<VibeKey>("sunny");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-vibe", vibe);
    }
  }, [vibe]);

  return <VibeContext.Provider value={{ vibe, setVibe }}>{children}</VibeContext.Provider>;
}

export function useVibe() {
  const ctx = useContext(VibeContext);
  if (!ctx) throw new Error("useVibe must be used within VibeProvider");
  return ctx;
}
