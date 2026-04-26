import type { Locale } from "./types";
import { dictionaries } from "./dictionary";

/**
 * Pure string lookup for use outside React (e.g. coPilotOffer + listMiaFlashOffers).
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const table = dictionaries[locale] ?? dictionaries.en;
  let s = table[key] ?? dictionaries.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return s;
}
