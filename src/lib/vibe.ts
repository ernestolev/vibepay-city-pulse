import { CloudRain, Sun, Moon, Sparkles, Coffee, IceCream, Pizza, Music } from "lucide-react";
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
    id: "sunny-iced-coffee",
    vibe: "sunny",
    title: "Iced Coffee on us",
    merchant: "Shop Y Coffee Co.",
    description: "Beat the heat. Enjoy a free upgrade to any iced specialty drink, today only.",
    discount: "100% OFF",
    cashback: "+ £1.20 cashback",
    pattern: "dots",
    icon: IceCream,
    weatherIcon: Sun,
    weatherLabel: "28° · Sunny",
    tagline: "It's hot out there ☀️",
    distance: "120m away",
    expires: "Expires in 2h 14m",
  },
  rainy: {
    id: "rainy-hot-chocolate",
    vibe: "rainy",
    title: "Hot Chocolate, half price",
    merchant: "Cafe X",
    description: "A rainy afternoon calls for something warm. 50% off any hot drink at Cafe X.",
    discount: "50% OFF",
    cashback: "+ £0.80 cashback",
    pattern: "rain",
    icon: Coffee,
    weatherIcon: CloudRain,
    weatherLabel: "12° · Rainy",
    tagline: "Stay cosy, it's pouring 🌧️",
    distance: "80m away",
    expires: "Expires in 3h 02m",
  },
  nighttime: {
    id: "night-late-bites",
    vibe: "nighttime",
    title: "Late-night slice",
    merchant: "Luna Pizzeria",
    description: "After 9pm? Grab any slice for £2 and a free soft drink. Open till late.",
    discount: "£2 SLICE",
    cashback: "+ £0.50 cashback",
    pattern: "stars",
    icon: Pizza,
    weatherIcon: Moon,
    weatherLabel: "11° · Clear night",
    tagline: "The city's quiet — your turn 🌙",
    distance: "350m away",
    expires: "Expires at 02:00",
  },
  event: {
    id: "event-music-pass",
    vibe: "event",
    title: "Festival fast-pass",
    merchant: "Riverside Live",
    description: "Skip the queue at Riverside Live tonight + get a free welcome drink.",
    discount: "FAST PASS",
    cashback: "+ £3.00 cashback",
    pattern: "confetti",
    icon: Music,
    weatherIcon: Sparkles,
    weatherLabel: "Event nearby",
    tagline: "Something's happening tonight ✨",
    distance: "Riverside · 600m",
    expires: "Doors close 23:00",
  },
};

export const VIBE_ORDER: VibeKey[] = ["sunny", "rainy", "nighttime", "event"];
