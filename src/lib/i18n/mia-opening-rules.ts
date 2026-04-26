import type { Locale, MiaPulseWeather } from "./types";
import { translate } from "./translate";
import type { TimeBucket } from "@/lib/vibeEngine";

type TasteKind =
  | "gelato"
  | "pastry"
  | "coffee"
  | "wine"
  | "food"
  | "sweet"
  | "warm"
  | "local"
  | "accessory";

interface MiaLineCtx {
  kind: TasteKind;
  night: boolean;
  evening: boolean;
  morning: boolean;
  afternoon: boolean;
  rainy: boolean;
  sunny: boolean;
}

export const MIA_OPENING_VARIANTS: Record<string, number> = {
  gelato_night_rain: 3,
  gelato_rain: 3,
  gelato_night: 2,
  gelato_sun: 2,
  gelato_default: 2,
  pastry_morning: 3,
  pastry_rain: 2,
  pastry_default: 2,
  coffee_morning: 2,
  coffee_rain: 2,
  coffee_default: 2,
  wine_evening: 2,
  wine_default: 2,
  food_evening: 2,
  food_default: 2,
  sweet_default: 2,
  warm_rain: 2,
  warm_default: 2,
  local_default: 2,
  accessory_default: 2,
};

function detectPrimaryTasteKind(overlap: string[]): TasteKind | null {
  const s = overlap.map((t) => t.toLowerCase());
  const has = (sub: string) => s.some((t) => t.includes(sub));
  if (has("gelato") || has("ice")) return "gelato";
  if (has("pastry")) return "pastry";
  if (has("coffee") || has("latte") || has("filter")) return "coffee";
  if (has("wine")) return "wine";
  if (has("food")) return "food";
  if (has("sweet")) return "sweet";
  if (has("warm")) return "warm";
  if (has("local-specialty")) return "local";
  if (has("accessory")) return "accessory";
  return null;
}

function buildCtx(
  overlap: string[],
  timeBucket: TimeBucket | undefined,
  pulseWeather: MiaPulseWeather,
): MiaLineCtx | null {
  const kind = detectPrimaryTasteKind(overlap);
  if (!kind) return null;
  const tb = timeBucket;
  return {
    kind,
    night: tb === "night",
    evening: tb === "evening",
    morning: tb === "morning",
    afternoon: tb === "afternoon",
    rainy: pulseWeather === "rainy",
    sunny: pulseWeather === "sunny",
  };
}

function resolveRuleId(ctx: MiaLineCtx): string | null {
  const { kind, night, evening, morning, afternoon, rainy, sunny } = ctx;
  if (kind === "gelato" && night && rainy) return "gelato_night_rain";
  if (kind === "gelato" && rainy) return "gelato_rain";
  if (kind === "gelato" && night) return "gelato_night";
  if (kind === "gelato" && sunny) return "gelato_sun";
  if (kind === "gelato") return "gelato_default";
  if (kind === "pastry" && morning) return "pastry_morning";
  if (kind === "pastry" && rainy) return "pastry_rain";
  if (kind === "pastry") return "pastry_default";
  if (kind === "coffee" && morning) return "coffee_morning";
  if (kind === "coffee" && rainy) return "coffee_rain";
  if (kind === "coffee") return "coffee_default";
  if (kind === "wine" && (evening || night)) return "wine_evening";
  if (kind === "wine") return "wine_default";
  if (kind === "food" && (evening || night)) return "food_evening";
  if (kind === "food") return "food_default";
  if (kind === "sweet") return "sweet_default";
  if (kind === "warm" && rainy) return "warm_rain";
  if (kind === "warm") return "warm_default";
  if (kind === "local") return "local_default";
  if (kind === "accessory") return "accessory_default";
  return null;
}

export function stablePickIndex(seed: string, modulo: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % modulo;
}

export function pickMiaOpeningLineI18n(
  overlappingTags: string[],
  timeBucket: TimeBucket | undefined,
  pulseWeather: MiaPulseWeather,
  seed: string,
  locale: Locale,
): string | null {
  const ctx = buildCtx(overlappingTags, timeBucket, pulseWeather);
  if (!ctx) return null;
  const ruleId = resolveRuleId(ctx);
  if (!ruleId) return null;
  const n = MIA_OPENING_VARIANTS[ruleId] ?? 1;
  const idx = stablePickIndex(seed, n);
  return translate(locale, `mia.opening.${ruleId}.${idx}`);
}
