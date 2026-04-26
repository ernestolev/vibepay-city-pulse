import type { LocalMerchant } from "./merchantData";

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
