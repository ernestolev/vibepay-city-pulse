import { CloudRain, Sun, Coffee, Trophy, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VibeKey = "sunny" | "rainy" | "event";

export type VibeOffer = {
  id: string;
  vibe: VibeKey;
  brand: string;
  title: string;
  merchant: string;
  description: string;
  discount: string;
  cashback: string;
  pattern: "dots" | "rain" | "confetti";
  icon: LucideIcon;
  weatherIcon: LucideIcon;
  weatherLabel: string;
  tagline: string;
  distance: string;
  expires: string;
  /** Code embedded in the QR for redemption (mock). */
  redemptionCode: string;
};

export const VIBES: Record<VibeKey, VibeOffer> = {
  sunny: {
    id: "sunny-gelatto-2x1",
    vibe: "sunny",
    brand: "Santander Pulse",
    title: "2x1 Ice Cream",
    merchant: "Gelatto",
    description:
      "It's a hot one — bring a friend and grab two scoops for the price of one at any Gelatto in town.",
    discount: "2x1 OFFER",
    cashback: "+ £1.20 cashback",
    pattern: "dots",
    icon: Sun,
    weatherIcon: Sun,
    weatherLabel: "28° · Sunny",
    tagline: "Santander Pulse · It's hot out there",
    distance: "Gelatto · 120m away",
    expires: "Expires today, 22:00",
    redemptionCode: "VIBEPAY-SUN-2X1-GELATTO-4421",
  },
  rainy: {
    id: "rainy-lacentral-coffee",
    vibe: "rainy",
    brand: "Rainy Discount",
    title: "Free Coffee",
    merchant: "La Central",
    description:
      "Dry off with a complimentary house coffee at La Central. Settled instantly via Payone — no codes, no fuss.",
    discount: "FREE COFFEE",
    cashback: "via Payone",
    pattern: "rain",
    icon: Coffee,
    weatherIcon: CloudRain,
    weatherLabel: "12° · Rainy",
    tagline: "Rainy Discount · Stay cosy",
    distance: "La Central · 80m away",
    expires: "Valid while it rains",
    redemptionCode: "VIBEPAY-RAIN-FREECOFFEE-LACENTRAL-4421",
  },
  event: {
    id: "event-stadium-cashback",
    vibe: "event",
    brand: "Match Day",
    title: "20% Cashback",
    merchant: "The Stadium",
    description:
      "It's match day. Tap to pay anywhere inside The Stadium and get 20% back, settled via Payone.",
    discount: "20% CASHBACK",
    cashback: "Match Day boost",
    pattern: "confetti",
    icon: Trophy,
    weatherIcon: Sparkles,
    weatherLabel: "Live · Match Day",
    tagline: "Match Day · The city is buzzing",
    distance: "The Stadium · 600m",
    expires: "Until full-time, 22:30",
    redemptionCode: "VIBEPAY-EVENT-CASHBACK-STADIUM-4421",
  },
};

export const VIBE_ORDER: VibeKey[] = ["sunny", "rainy", "event"];
