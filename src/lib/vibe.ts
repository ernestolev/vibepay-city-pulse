import { CloudRain, Sun, Moon, Coffee, IceCream, Wine, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VibeKey = "sunny" | "rainy" | "nighttime" | "event";

export type VibeOffer = {
  id: string;
  vibe: VibeKey;
  title: string;
  merchant: string;
  description: string;
  discount: string;
  cashback: string;
  pattern: "dots" | "rain" | "stars" | "confetti";
  icon: LucideIcon;
  weatherIcon: LucideIcon;
  weatherLabel: string;
  tagline: string;
  distance: string;
  expires: string;
};

export const VIBES: Record<VibeKey, VibeOffer> = {
  sunny: {
    id: "sunny-local-gelato",
    vibe: "sunny",
    title: "Open terrace gelato",
    merchant: "Eiscafé Marktplatz · family-run",
    description:
      "Sun is out in Old Town: a family-run gelateria opened its terrace. Treat yourself to artisan gelato — settled instantly via Payone Riel.",
    discount: "20% OFF",
    cashback: "+ €0.80 cashback",
    pattern: "dots",
    icon: IceCream,
    weatherIcon: Sun,
    weatherLabel: "22° · Sunny",
    tagline: "Independent gelateria, sunny terrace",
    distance: "140 m away",
    expires: "Open until 19:30",
  },
  rainy: {
    id: "rainy-cosy-cafe",
    vibe: "rainy",
    title: "Cosy hot drink",
    merchant: "Café Weinhalle · local SME",
    description:
      "Rain just started in Old Town. Step into a quiet, family-owned café — buy one hot drink, the second is on VibePay, settled via Payone Riel.",
    discount: "2 FOR 1",
    cashback: "+ €0.60 cashback",
    pattern: "rain",
    icon: Coffee,
    weatherIcon: CloudRain,
    weatherLabel: "12° · Rainy",
    tagline: "Family-owned café, dry and warm",
    distance: "80 m away",
    expires: "Open for 3h",
  },
  nighttime: {
    id: "night-weinstube",
    vibe: "nighttime",
    title: "Late dinner at the Weinstube",
    merchant: "Weinstube Lehmann · since 1972",
    description:
      "Late hours in Stuttgart Old Town: a small, family-owned Weinstube serves regional plates. VibePay locks in a perk — settled via Payone Riel.",
    discount: "10% OFF",
    cashback: "+ Trollinger glass on us",
    pattern: "stars",
    icon: Wine,
    weatherIcon: Moon,
    weatherLabel: "11° · Clear night",
    tagline: "Independent Weinstube, quiet hour",
    distance: "210 m away",
    expires: "Kitchen closes 23:30",
  },
  event: {
    id: "event-local-bistro",
    vibe: "event",
    title: "Live weather pulse (Tavily)",
    merchant: "Trattoria Marktplatz · family since 1994",
    description:
      "Tavily reads real conditions for Old Town while your simulator clock sets the time slice. VibePay can align perks with that pulse — settled via Payone Riel.",
    discount: "15% OFF",
    cashback: "+ €1.50 cashback",
    pattern: "confetti",
    icon: Utensils,
    weatherIcon: Utensils,
    weatherLabel: "Tavily · clima en vivo",
    tagline: "Search pulse + your simulated hour",
    distance: "Marktplatz · 320 m",
    expires: "Tonight until 22:00",
  },
};

export const VIBE_ORDER: VibeKey[] = ["sunny", "rainy", "nighttime", "event"];
