/**
 * Demo profile for Mia — mirrors what a real VibePay "taste graph" would expose
 * to ranking / eligibility without leaking owner metrics.
 */
export const MIA_VIBEPAY_PREFERENCE_TAGS: string[] = [
  "coffee",
  "latte",
  "warm",
  "pastry",
  "local-specialty",
  "filter",
  /** Also likes to dine / dessert out — keeps non-café demos eligible while still tag-gated. */
  "food",
  "wine",
  "sweet",
  "gelato",
  "accessory",
];
