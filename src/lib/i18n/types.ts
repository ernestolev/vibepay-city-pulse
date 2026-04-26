export type Locale = "en" | "de" | "es";

/** Aligns with Tavily / simulator for Mia offer ranking & copy. */
export type MiaPulseWeather = "sunny" | "rainy" | "cloudy" | "nighttime" | null | undefined;

export const LOCALES: Locale[] = ["en", "de", "es"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
};

export const VIBEPAY_LOCALE_STORAGE_KEY = "vibepay-locale";

export function isLocale(v: string): v is Locale {
  return v === "en" || v === "de" || v === "es";
}
