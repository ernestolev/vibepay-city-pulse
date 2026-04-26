import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { VibeKey } from "./vibe";
import {
  DEFAULT_BUSINESS_OFFERS,
  type BusinessOffer,
  type NewBusinessOfferInput,
  toBusinessOffer,
} from "./business-data";

type Ctx = {
  vibe: VibeKey;
  setVibe: (v: VibeKey) => void;
  accountMode: "personal" | "business";
  setAccountMode: (mode: "personal" | "business") => void;
  businessOffers: BusinessOffer[];
  createBusinessOffer: (input: NewBusinessOfferInput) => BusinessOffer;
};

const VibeContext = createContext<Ctx | null>(null);

export function VibeProvider({ children }: { children: ReactNode }) {
  const [vibe, setVibe] = useState<VibeKey>("sunny");
  const [accountMode, setAccountMode] = useState<"personal" | "business">(() => {
    if (typeof window === "undefined") return "personal";
    const savedMode = window.localStorage.getItem("vibepay.accountMode");
    return savedMode === "business" ? "business" : "personal";
  });
  const [businessOffers, setBusinessOffers] = useState<BusinessOffer[]>(() => {
    if (typeof window === "undefined") return DEFAULT_BUSINESS_OFFERS;
    const rawOffers = window.localStorage.getItem("vibepay.businessOffers");
    if (!rawOffers) return DEFAULT_BUSINESS_OFFERS;
    try {
      const parsed = JSON.parse(rawOffers) as BusinessOffer[];
      return parsed.length ? parsed : DEFAULT_BUSINESS_OFFERS;
    } catch {
      return DEFAULT_BUSINESS_OFFERS;
    }
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-vibe", vibe);
    }
  }, [vibe]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("vibepay.accountMode", accountMode);
  }, [accountMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("vibepay.businessOffers", JSON.stringify(businessOffers));
  }, [businessOffers]);

  const createBusinessOffer = (input: NewBusinessOfferInput) => {
    const newOffer = toBusinessOffer(input);
    setBusinessOffers((prev) => [newOffer, ...prev]);
    return newOffer;
  };

  return (
    <VibeContext.Provider
      value={{
        vibe,
        setVibe,
        accountMode,
        setAccountMode,
        businessOffers,
        createBusinessOffer,
      }}
    >
      {children}
    </VibeContext.Provider>
  );
}

export function useVibe() {
  const ctx = useContext(VibeContext);
  if (!ctx) throw new Error("useVibe must be used within VibeProvider");
  return ctx;
}
