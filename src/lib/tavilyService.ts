type WeatherVibe = "sunny" | "rainy" | "cloudy";
type PulseContext = WeatherVibe | "cold";

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
  topEvent: "No major nearby event detected",
  city: "Stuttgart, Germany",
  temperatureC: 11,
  cafeName: "Kaffeehaus Altstadt",
  recommendation:
    "Cold vibe detected (11°C overcast): prioritize a warm and cozy coffee journey near Stuttgart Old Town.",
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
  const eventLike = results.find((r) => {
    const combined = `${r.title ?? ""} ${r.content ?? ""}`.toLowerCase();
    return /(concert|festival|match|game|expo|conference|event|fair|show)/.test(combined);
  });

  if (!eventLike) {
    return FALLBACK_VIBE.topEvent;
  }

  return (eventLike.title || eventLike.content || FALLBACK_VIBE.topEvent).slice(0, 140);
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
  const query = isColdOrOvercastContext
    ? "Best rated local coffee shops in Stuttgart Old Town with current status"
    : `current weather and main events in ${city} right now for a banking app context`;

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
        ? "Rain detected: prioritize nearby warm indoor merchants (coffee, transit hubs) with instant Payone-settled rewards."
        : weather === "sunny"
          ? "Sunny conditions: promote outdoor spend categories and time-limited cashback around high footfall zones."
          : "Cloudy city pulse: surface versatile daily offers near commuting routes and current local events.";

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
