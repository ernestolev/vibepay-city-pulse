import type { LocalMerchant } from "./merchantData";
import type { VibeKey } from "./vibe";
import { getTimeBucket } from "./vibeEngine";

type WeatherVibe = "sunny" | "rainy" | "cloudy";
export type PulseContext =
  | WeatherVibe
  | "cold"
  | "morning"
  | "evening"
  | "night";

export interface CityVibe {
  weather: WeatherVibe;
  topEvent: string;
  recommendation: string;
  city: string;
  temperatureC: number;
  cafeName: string;
}

interface TavilySearchResult {
  title?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
}

const FALLBACK_VIBE: CityVibe = {
  weather: "cloudy",
  topEvent: "Quiet morning in Old Town · steady local foot traffic",
  city: "Stuttgart, Germany",
  temperatureC: 11,
  cafeName: "Kaffeehaus Altstadt",
  recommendation:
    "Cold vibe detected (11°C overcast): surface a quiet family-run café near Stuttgart Old Town to support local merchants.",
};

function inferWeather(text: string): WeatherVibe {
  const normalized = text.toLowerCase();

  if (/(rain|drizzle|storm|shower|wet)/.test(normalized)) {
    return "rainy";
  }

  if (/(sun|clear sky|bright|heatwave|sunny)/.test(normalized)) {
    return "sunny";
  }

  return "cloudy";
}

function pickTopEvent(results: TavilySearchResult[]): string {
  const hotspot = results.find((r) => {
    const combined = `${r.title ?? ""} ${r.content ?? ""}`.toLowerCase();
    return /(festival|market|markt|fair|christmas market|weihnachtsmarkt|food fest|street food|night market|expo|conference|gallery|opening)/.test(
      combined,
    );
  });

  if (!hotspot) {
    return FALLBACK_VIBE.topEvent;
  }

  return (hotspot.title || hotspot.content || FALLBACK_VIBE.topEvent).slice(0, 140);
}

function pickCafeName(results: TavilySearchResult[]): string {
  const cafeLike = results.find((r) => {
    const combined = `${r.title ?? ""} ${r.content ?? ""}`.toLowerCase();
    return /(cafe|coffee|caf[eé]|espresso|bakery)/.test(combined);
  });

  if (!cafeLike) return FALLBACK_VIBE.cafeName;

  const source = (cafeLike.title || cafeLike.content || FALLBACK_VIBE.cafeName).trim();
  const cleaned = source
    .replace(/\s*[-|–].*$/, "")
    .replace(/\s+(open now|closed|hours|menu).*$/i, "")
    .trim();
  return cleaned.slice(0, 60);
}

export async function getCityVibe(city: string, pulseContext?: PulseContext): Promise<CityVibe> {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;

  if (!apiKey) {
    return {
      ...FALLBACK_VIBE,
      recommendation:
        "Fallback vibe active: Tavily API key is missing, so VibePay keeps a safe default merchant offer.",
    };
  }

  const isColdOrOvercastContext = pulseContext === "cold" || pulseContext === "cloudy";
  const query =
    pulseContext === "morning"
      ? `Top rated independent bakeries and family cafés open right now in ${city} Old Town`
      : pulseContext === "evening"
        ? `Cosy local cafés and family bistros open this evening in ${city} Old Town`
        : pulseContext === "night"
          ? `Family-run Weinstube and small local restaurants open late in ${city} Old Town`
          : isColdOrOvercastContext
            ? `Best independent coffee shops and family-run cafés in ${city} Old Town right now`
            : `Independent restaurants, family bistros and local merchants currently busy in ${city} Old Town`;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with status ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;
    const results = data.results ?? [];
    const allText = results.map((r) => `${r.title ?? ""} ${r.content ?? ""}`).join(" ");
    const weather = isColdOrOvercastContext ? "cloudy" : inferWeather(allText);
    const topEvent = pickTopEvent(results);

    const recommendation =
      weather === "rainy"
        ? "Rain detected in Old Town: route Mia to a warm family-run café or bakery, settled instantly via Payone Riel."
        : weather === "sunny"
          ? "Sunny pulse in Old Town: surface independent terraces, gelaterias and local market stalls within walking distance."
          : "Cloudy Old Town pulse: prioritise quiet family-run cafés and independent restaurants — keep traffic flowing to local Mittelstand.";

    return {
      weather,
      topEvent,
      recommendation,
      city,
      temperatureC: weather === "cloudy" ? 11 : weather === "rainy" ? 10 : 18,
      cafeName: pickCafeName(results),
    };
  } catch {
    return FALLBACK_VIBE;
  }
}

export interface CityPulseResult {
  pulse: CityVibe;
  /** False when API key is missing or the request failed — owner UI should not hard-block offers. */
  usedTavilyApi: boolean;
}

/**
 * Tavily search shaped by the **simulator** (vibe + time + Mia origin), so changing
 * "Simulate City Pulse" refetches and can gate owner flash suggestions.
 */
export async function getCityPulseForSimulator(params: {
  city?: string;
  lat?: number;
  lng?: number;
  vibe: VibeKey;
  simulatedTime: string | null;
}): Promise<CityPulseResult> {
  const city = params.city ?? "Stuttgart, Germany";
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;

  if (!apiKey) {
    return {
      pulse: {
        ...FALLBACK_VIBE,
        recommendation:
          "Sin VITE_TAVILY_API_KEY no hay pulso web: la sugerencia solo usa Payone + inventario.",
      },
      usedTavilyApi: false,
    };
  }

  const bucket = getTimeBucket(params.simulatedTime);
  const loc =
    params.lat != null && params.lng != null
      ? ` near ${params.lat.toFixed(4)}, ${params.lng.toFixed(4)}`
      : "";

  /** `event` = modo “tiempo real”: no forzar clima en la query; dejar que el texto refleje Tavily. */
  const isLiveWeatherMode = params.vibe === "event";

  const weatherPhrase = isLiveWeatherMode
    ? "Current real-time weather forecast and conditions"
    : params.vibe === "rainy"
      ? "Rainy wet weather"
      : params.vibe === "sunny"
        ? "Bright sunny clear weather"
        : params.vibe === "nighttime"
          ? "Late evening night"
          : "Current weather";

  const timePhrase =
    bucket === "morning"
      ? "in the morning"
      : bucket === "afternoon"
        ? "afternoon"
        : bucket === "evening"
          ? "early evening"
          : bucket === "night"
            ? "at night"
            : "right now";

  const query = isLiveWeatherMode
    ? `${weatherPhrase} ${timePhrase} in ${city} Old Town${loc} what is open for visitors cafés bakeries`
    : `${weatherPhrase} ${timePhrase} ${city} Old Town${loc} independent cafés bakeries local shops foot traffic`;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with status ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;
    const results = data.results ?? [];
    const allText = results.map((r) => `${r.title ?? ""} ${r.content ?? ""}`).join(" ");
    const weather = inferWeather(allText);
    const topEvent = pickTopEvent(results);
    const recommendation = isLiveWeatherMode
      ? `Pulso tiempo real (${timePhrase}): clima inferido ${weather} — basado en búsqueda Tavily + tu hora simulada.`
      : weather === "rainy"
        ? "Tavily pulse: rain — warm indoor venues and hot drinks fit the moment."
        : weather === "sunny"
          ? "Tavily pulse: sun — terraces, gelato, outdoor foot traffic likely."
          : "Tavily pulse: mixed / cloudy — steady local cafés and retail.";

    return {
      pulse: {
        weather,
        topEvent,
        recommendation,
        city,
        temperatureC: weather === "cloudy" ? 11 : weather === "rainy" ? 10 : 18,
        cafeName: pickCafeName(results),
      },
      usedTavilyApi: true,
    };
  } catch {
    return {
      pulse: {
        ...FALLBACK_VIBE,
        recommendation: "Tavily no respondió; comprueba red o API key.",
      },
      usedTavilyApi: false,
    };
  }
}

/**
 * When Tavily is active, block owner flash promos if the **real search pulse**
 * contradicts the simulated vibe (or time for “late hours”).
 */
export function simulatorAlignedWithTavily(
  vibe: VibeKey,
  pulse: CityVibe,
  usedTavilyApi: boolean,
  simulatedTime: string | null,
): { ok: boolean; messageKey?: string } {
  if (!usedTavilyApi) {
    return { ok: true };
  }

  /** Modo tiempo real: Tavily manda; no comparar con un clima “forzado”. */
  if (vibe === "event") {
    return { ok: true };
  }

  const bucket = getTimeBucket(simulatedTime);

  if (vibe === "nighttime") {
    if (bucket !== "evening" && bucket !== "night") {
      return {
        ok: false,
        messageKey: "pulse.late_hours_time",
      };
    }
  }

  if (vibe === "rainy" && pulse.weather === "sunny") {
    return {
      ok: false,
      messageKey: "pulse.rain_vs_sunny_tavily",
    };
  }

  if (vibe === "sunny" && pulse.weather === "rainy") {
    return {
      ok: false,
      messageKey: "pulse.sunny_vs_rain_tavily",
    };
  }

  return { ok: true };
}

/** Para inventario / copy: en modo `event` usar el clima que Tavily infirió, no el botón “festival”. */
export function resolveInventoryVibe(
  simulatorVibe: VibeKey,
  livePulse: CityVibe | null | undefined,
): VibeKey {
  if (simulatorVibe !== "event") return simulatorVibe;
  if (!livePulse) return "sunny";
  if (livePulse.weather === "sunny") return "sunny";
  if (livePulse.weather === "rainy") return "rainy";
  return "nighttime";
}

export interface MerchantContextSnippet {
  merchantId: string;
  liveSnippet: string;
  source: "tavily" | "fallback";
}

const MAX_MERCHANT_SNIPPET_LEN = 140;

export async function searchMerchantContext(
  merchant: LocalMerchant,
  city = "Stuttgart",
): Promise<MerchantContextSnippet> {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
  const fallback: MerchantContextSnippet = {
    merchantId: merchant.id,
    liveSnippet: merchant.fallbackMessage,
    source: "fallback",
  };

  if (!apiKey) return fallback;

  const query = `${merchant.name} ${city} Old Town current status hours offers ${merchant.category}`;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with status ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;
    const first = data.results?.[0];
    const snippet =
      (first?.content || first?.title || merchant.fallbackMessage).trim();

    return {
      merchantId: merchant.id,
      liveSnippet: snippet.slice(0, MAX_MERCHANT_SNIPPET_LEN),
      source: "tavily",
    };
  } catch {
    return fallback;
  }
}
