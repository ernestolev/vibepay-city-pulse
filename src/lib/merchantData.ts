import type { OfferRule } from "./offerEngine";

export type MerchantCategory =
  | "cafe"
  | "bakery"
  | "bistro"
  | "weinstube"
  | "gelateria"
  | "boutique";

export type Occupancy = "quiet" | "normal" | "busy";

export type VibeMatch =
  | "sunny"
  | "rainy"
  | "cold"
  | "morning"
  | "evening"
  | "night"
  | "event";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** POS / ERP style line items — the Co-Pilot agent reads this JSON to propose concrete promos. */
export interface MerchantProduct {
  id: string;
  name: string;
  /** e.g. coffee, latte, pastry — matched against Mia's VibePay preference tags when targeting. */
  tags: string[];
}

/** One concurrent flash campaign; several can be live per merchant. */
export interface MerchantFlashOfferSlot {
  id: string;
  title: string;
  description: string;
  discountPct: number;
  endsAt: number;
  productId: string | null;
  productTags: string[] | null;
}

export interface LocalMerchant {
  id: string;
  name: string;
  category: MerchantCategory;
  position: GeoPoint;
  hours: { open: string; close: string };
  occupancy: Occupancy;
  /**
   * Rule presets configured by the merchant owner.
   * The runtime offer is composed by `evaluateOffer(merchant, context)`.
   * NEVER read from a hardcoded "offer" object — always go through the engine.
   */
  rules: OfferRule[];
  /** Shown when no rule fires for the current context. */
  fallbackMessage: string;
  /** Shown when the shop is *not* in low-traffic mode (target reached or busy day). */
  softMessage: string;
  /**
   * Live traffic signals coming from Payone settlements. They drive the
   * "Dynamic Traffic Activation" gate: an offer is only surfaced to the
   * customer when the shop genuinely needs more sales today.
   */
  currentTransactionsToday: number;
  lowTrafficThreshold: number;
  dailyTargetReached: boolean;
  vibesMatch: VibeMatch[];
  signature: string;
  /** Owner-launched flash offer persisted to Supabase — visible to Mia when active and not expired. */
  isOfferActive: boolean;
  activeOfferTitle: string | null;
  activeOfferDescription: string | null;
  activeOfferDiscountPct: number | null;
  /** Unix ms; null when no timed offer. */
  activeOfferEndsAt: number | null;
  /** Article catalogue (persisted as JSON in Supabase). */
  productInventory: MerchantProduct[];
  /** Set when the owner launches an offer — used to decide if Mia (profile tags) should see it. */
  activeOfferProductTags: string[] | null;
  activeOfferProductId: string | null;
  /** Multiple live flash offers (persisted as JSON); legacy `activeOffer*` mirror the primary active slot. */
  flashOffers: MerchantFlashOfferSlot[];
}

function isFlashSlotRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x != null;
}

function parseFlashOfferSlot(x: unknown): MerchantFlashOfferSlot | null {
  if (!isFlashSlotRecord(x)) return null;
  const id = x.id;
  const title = x.title;
  const description = x.description;
  const discountPct = x.discountPct;
  const endsAt = x.endsAt;
  if (typeof id !== "string" || typeof title !== "string" || typeof description !== "string")
    return null;
  if (typeof discountPct !== "number" || typeof endsAt !== "number") return null;
  const productId = x.productId;
  const productTags = x.productTags;
  return {
    id,
    title,
    description,
    discountPct,
    endsAt,
    productId: typeof productId === "string" ? productId : null,
    productTags: Array.isArray(productTags) ? productTags.filter((t): t is string => typeof t === "string") : null,
  };
}

export function parseFlashOffersFromJson(raw: unknown): MerchantFlashOfferSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseFlashOfferSlot).filter((s): s is MerchantFlashOfferSlot => s != null);
}

/** Non-expired slots, soonest expiry first. Falls back to legacy single-offer columns if JSON empty. */
export function activeFlashSlots(m: LocalMerchant): MerchantFlashOfferSlot[] {
  const now = Date.now();
  const fromArr = (m.flashOffers ?? []).filter((s) => s.endsAt > now);
  if (fromArr.length > 0) return [...fromArr].sort((a, b) => a.endsAt - b.endsAt);
  if (
    m.isOfferActive &&
    m.activeOfferEndsAt != null &&
    m.activeOfferEndsAt > now &&
    (m.activeOfferDescription?.length ?? 0) > 0
  ) {
    return [
      {
        id: "legacy-single",
        title: m.activeOfferTitle ?? "",
        description: m.activeOfferDescription!,
        discountPct: m.activeOfferDiscountPct ?? 30,
        endsAt: m.activeOfferEndsAt,
        productId: m.activeOfferProductId,
        productTags: m.activeOfferProductTags ? [...m.activeOfferProductTags] : null,
      },
    ];
  }
  return [];
}

export function merchantHasAnyActiveFlash(m: LocalMerchant): boolean {
  return activeFlashSlots(m).length > 0;
}

/** All slots expired (or legacy flag stale) but owner should dismiss UI. */
export function merchantHasStaleFlashOnly(m: LocalMerchant): boolean {
  if (merchantHasAnyActiveFlash(m)) return false;
  if ((m.flashOffers ?? []).some((s) => s.endsAt <= Date.now())) return true;
  if (m.isOfferActive) return true;
  return false;
}

/** Align legacy scalar columns with the earliest-expiring active slot (Supabase / old readers). */
export function syncLegacyFieldsFromFlashOffers(m: LocalMerchant): LocalMerchant {
  const active = activeFlashSlots(m);
  const primary = active[0];
  return {
    ...m,
    isOfferActive: active.length > 0,
    activeOfferTitle: primary?.title ?? null,
    activeOfferDescription: primary?.description ?? null,
    activeOfferDiscountPct: primary?.discountPct ?? null,
    activeOfferEndsAt: primary?.endsAt ?? null,
    activeOfferProductId: primary?.productId ?? null,
    activeOfferProductTags: primary?.productTags ? [...primary.productTags] : null,
  };
}

export function activeFlashProductIds(m: LocalMerchant): string[] {
  return activeFlashSlots(m)
    .map((s) => s.productId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export const MIA_HOME: GeoPoint = { lat: 48.7758, lng: 9.1829 };

/**
 * Quick-pick locations around Stuttgart Old Town. Used by the Path Simulator
 * to drop Mia somewhere new in one click for the demo.
 */
export interface MiaLocationPreset {
  id: string;
  label: string;
  hint: string;
  position: GeoPoint;
}

export const MIA_LOCATION_PRESETS: MiaLocationPreset[] = [
  {
    id: "home",
    label: "Home",
    hint: "Default · near Schillerplatz",
    position: MIA_HOME,
  },
  {
    id: "marktplatz",
    label: "Marktplatz",
    hint: "Heart of Old Town · markets & cafés",
    position: { lat: 48.7765, lng: 9.1782 },
  },
  {
    id: "schlossplatz",
    label: "Schlossplatz",
    hint: "Royal square · luxury & hotspots",
    position: { lat: 48.7784, lng: 9.1791 },
  },
  {
    id: "konigstrasse",
    label: "Königstraße",
    hint: "Shopping mile · north end",
    position: { lat: 48.7776, lng: 9.1755 },
  },
  {
    id: "leonhardskirche",
    label: "Leonhardskirche",
    hint: "South Old Town · weinstuben & bistros",
    position: { lat: 48.7740, lng: 9.1818 },
  },
];

export const STUTTGART_BBOX = {
  latMin: 48.774,
  latMax: 48.7785,
  lngMin: 9.1795,
  lngMax: 9.1865,
};

/**
 * Initial rule presets per merchant. The owner can tweak these in /merchant.
 * They live as static initial state but become editable via MerchantRulesContext.
 */
export const INITIAL_MERCHANTS: LocalMerchant[] = [
  {
    id: "kaffeehaus-altstadt",
    name: "Kaffeehaus Altstadt",
    category: "cafe",
    position: { lat: 48.777, lng: 9.182 },
    hours: { open: "07:00", close: "19:00" },
    occupancy: "quiet",
    fallbackMessage: "Open and cosy — pour-over filter coffee just landed.",
    softMessage:
      "Kaffeehaus Altstadt cerró el día con buena venta. Pasa a saludar cuando puedas.",
    currentTransactionsToday: 4,
    lowTrafficThreshold: 12,
    dailyTargetReached: false,
    vibesMatch: ["cold", "rainy", "morning"],
    signature: "Family-run · since 1968",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "latte-classic",
        name: "Latte grande",
        tags: ["coffee", "latte", "warm", "rainy-day", "local-specialty"],
      },
      {
        id: "filter-hause",
        name: "Café filtro de la casa",
        tags: ["coffee", "filter", "morning", "quiet-cup"],
      },
      {
        id: "croissant-butter",
        name: "Croissant de mantequilla",
        tags: ["pastry", "bakery-crossover", "morning"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "kaffee-quiet-cold",
        label: "Quiet hour + cold weather",
        enabled: true,
        priority: 12,
        when: { weather: ["cold", "rainy"], occupancy: ["quiet"] },
        then: {
          discountPct: 20,
          durationMin: 15,
          headline: "Quiet brew window",
          message:
            "Hey Mia — fresh pot just landed and the place is empty. Perfect 15 min to warm up.",
        },
      },
      {
        id: "kaffee-morning",
        label: "Morning rush",
        enabled: true,
        priority: 8,
        when: { timeBucket: ["morning"] },
        then: {
          discountPct: 10,
          durationMin: 30,
          headline: "Morning espresso ready",
          message: "Morning, Mia — espresso ready when you walk in.",
        },
      },
      {
        id: "kaffee-default",
        label: "Cloudy day default",
        enabled: true,
        priority: 4,
        when: { weather: ["cloudy"] },
        then: {
          discountPct: 5,
          durationMin: 60,
          headline: "Cloudy comfort",
          message: "Cloudy outside, cosy inside — house filter on tap.",
        },
      },
    ],
  },
  {
    id: "baeckerei-treiber",
    name: "Bäckerei Treiber",
    category: "bakery",
    position: { lat: 48.7762, lng: 9.1815 },
    hours: { open: "06:30", close: "18:00" },
    occupancy: "normal",
    fallbackMessage: "Independent bakery — fresh batch every two hours.",
    softMessage:
      "Bäckerei Treiber ya cumplió su meta del día gracias a sus clientes regulares. ¡Gran día!",
    currentTransactionsToday: 4,
    lowTrafficThreshold: 10,
    dailyTargetReached: false,
    /** Broad tags so path-simulator proximity pings work under common vibe + time combos (not only morning/cold). */
    vibesMatch: ["morning", "cold", "evening", "night", "sunny", "rainy", "event"],
    signature: "Independent bakery · Mittelstand",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "brezel-laugen",
        name: "Brezel de manteca",
        tags: ["pastry", "savory", "morning", "local-specialty"],
      },
      {
        id: "bienenstich-slice",
        name: "Porción Bienenstich",
        tags: ["pastry", "sweet", "afternoon"],
      },
      {
        id: "filterklein",
        name: "Kleiner Filterkaffee",
        tags: ["coffee", "filter", "quick"],
      },
      {
        id: "softeis-becher",
        name: "Softeis im Becher (mostrador helado)",
        tags: ["gelato", "sweet", "sunny-day", "afternoon", "cold-drink"],
      },
      {
        id: "heisse-schokolade",
        name: "Heiße Schokolade grande",
        tags: ["warm", "rainy-day", "drink", "comfort"],
      },
      {
        id: "abend-brotzeit",
        name: "Brotzeit-Platte (tarde/noche)",
        tags: ["evening", "food", "savory", "sharing", "local-specialty"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "baeckerei-morning-combo",
        label: "Morning combo",
        enabled: true,
        priority: 10,
        when: { timeBucket: ["morning"] },
        then: {
          discountPct: 15,
          durationMin: 30,
          headline: "Brezel + Filterkaffee",
          message:
            "Brezel hot from the oven — pair it with a Filterkaffee for the next 30 min, on the house lighter.",
        },
      },
      {
        id: "baeckerei-cold-snack",
        label: "Cold-day Schwarzbrot",
        enabled: true,
        priority: 7,
        when: { weather: ["cold"] },
        then: {
          discountPct: 10,
          durationMin: 45,
          headline: "Wholegrain on the house",
          message: "It's chilly — Schwarzbrot just baked, perfect for the walk.",
        },
      },
      {
        id: "baeckerei-default",
        label: "Daily default",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 5,
          durationMin: 60,
          headline: "Today's bake",
          message: "Today's bake is on — drop by, the smell is already outside.",
        },
      },
    ],
  },
  {
    id: "cafe-weinhalle",
    name: "Café Weinhalle",
    category: "cafe",
    position: { lat: 48.7754, lng: 9.184 },
    hours: { open: "08:00", close: "22:00" },
    occupancy: "quiet",
    fallbackMessage: "Family-owned, neighbourhood feel, 80 m from you.",
    softMessage:
      "Café Weinhalle ya tiene un día redondo, pasa a saludar a la familia.",
    currentTransactionsToday: 3,
    lowTrafficThreshold: 10,
    dailyTargetReached: false,
    vibesMatch: ["rainy", "cold", "evening"],
    signature: "Family-owned · 80 m from you",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "wein-schwaebisch",
        name: "Copa Schwäbisch (Trollinger)",
        tags: ["wine", "evening", "local-specialty"],
      },
      {
        id: "flammbrot",
        name: "Flammkuchen clásico",
        tags: ["food", "sharing", "evening"],
      },
      {
        id: "espresso-bar",
        name: "Espresso doble",
        tags: ["coffee", "quick", "warm"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "weinhalle-quiet-warmup",
        label: "Quiet hour rescue",
        enabled: true,
        priority: 14,
        when: { occupancy: ["quiet"], weather: ["rainy", "cold"] },
        then: {
          discountPct: 25,
          durationMin: 20,
          headline: "Empty + kettle on",
          message:
            "It's empty right now and the kettle just whistled — your kind of place. Stay 20 min, second cup is on us.",
        },
      },
      {
        id: "weinhalle-evening",
        label: "Evening hot drink hour",
        enabled: true,
        priority: 8,
        when: { timeBucket: ["evening"] },
        then: {
          discountPct: 15,
          durationMin: 30,
          headline: "Evening hot drink",
          message: "Evening hot drink hour — hot chocolate or pour-over, second cup on us.",
        },
      },
      {
        id: "weinhalle-default",
        label: "Neighbourhood default",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 5,
          durationMin: 45,
          headline: "Neighbourhood drop-in",
          message: "Drop in — neighbourhood feel, never a queue.",
        },
      },
    ],
  },
  {
    id: "eiscafe-marktplatz",
    name: "Eiscafé Marktplatz",
    category: "gelateria",
    position: { lat: 48.776, lng: 9.1828 },
    hours: { open: "11:00", close: "20:00" },
    occupancy: "normal",
    fallbackMessage: "Italian family terrace, handcrafted gelato.",
    softMessage:
      "Eiscafé Marktplatz va con buen ritmo hoy — pasa cuando quieras, sin prisa.",
    currentTransactionsToday: 24,
    lowTrafficThreshold: 22,
    dailyTargetReached: false,
    vibesMatch: ["sunny", "event"],
    signature: "Family terrace · Marktplatz",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "gelato-pistacchio",
        name: "Gelato pistacho (doble)",
        tags: ["gelato", "sweet", "sunny-day"],
      },
      {
        id: "affogato",
        name: "Affogato",
        tags: ["coffee", "gelato", "afternoon"],
      },
      {
        id: "waffel-mini",
        name: "Mini gofre con chocolate",
        tags: ["sweet", "kids", "quick"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "eiscafe-sunny",
        label: "Sunny terrace boost",
        enabled: true,
        priority: 10,
        when: { weather: ["sunny"] },
        then: {
          discountPct: 25,
          durationMin: 30,
          headline: "Open terrace + sun",
          message: "Sun's out, terrace open — gelato made fresh this morning.",
        },
      },
      {
        id: "eiscafe-weekend",
        label: "Weekend afternoon walk",
        enabled: true,
        priority: 7,
        when: { weekday: ["sat", "sun"], timeBucket: ["afternoon"] },
        then: {
          discountPct: 15,
          durationMin: 60,
          headline: "Weekend stroll",
          message: "Weekend stroll energy — try the stracciatella, it's the staff pick today.",
        },
      },
      {
        id: "eiscafe-default",
        label: "Steady terrace",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 5,
          durationMin: 60,
          headline: "Open terrace",
          message: "Terrace is open — handcrafted gelato by the same family for 22 years.",
        },
      },
    ],
  },
  {
    id: "trattoria-marktplatz",
    name: "Trattoria Marktplatz",
    category: "bistro",
    position: { lat: 48.7748, lng: 9.183 },
    hours: { open: "12:00", close: "23:00" },
    occupancy: "busy",
    fallbackMessage: "Family-run since 1994, daily Schwäbisch specials.",
    softMessage:
      "Trattoria Marktplatz ya está en plena hora pico — mejor pásate más tarde.",
    currentTransactionsToday: 31,
    lowTrafficThreshold: 18,
    dailyTargetReached: true,
    vibesMatch: ["event", "evening", "night"],
    signature: "Family since 1994 · special menu",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "maultaschen-portion",
        name: "Maultaschen en caldo",
        tags: ["food", "warm", "local-specialty", "rainy-day"],
      },
      {
        id: "spätzle-kaese",
        name: "Käsespätzle",
        tags: ["food", "comfort", "evening"],
      },
      {
        id: "tiramisu",
        name: "Tiramisú de la casa",
        tags: ["sweet", "dessert", "sharing"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "trattoria-evening-busy",
        label: "Evening Wirtshaus night",
        enabled: true,
        priority: 10,
        when: { timeBucket: ["evening", "night"], occupancy: ["busy"] },
        then: {
          discountPct: 15,
          durationMin: 60,
          headline: "Wirtshaus night",
          message: "Schwäbisch Wirtshaus night — group menu live, the kitchen's hot.",
        },
      },
      {
        id: "trattoria-quiet-lunch",
        label: "Quiet hour rescue",
        enabled: true,
        priority: 8,
        when: { occupancy: ["quiet"] },
        then: {
          discountPct: 25,
          durationMin: 45,
          headline: "Slow afternoon, free chef",
          message: "Slow afternoon, the chef's experimenting — biggest discount of the week.",
        },
      },
      {
        id: "trattoria-default",
        label: "Daily Schwäbisch",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 10,
          durationMin: 60,
          headline: "Daily Schwäbisch",
          message: "Family-run since '94, daily Schwäbisch specials on the board.",
        },
      },
    ],
  },
  {
    id: "weinstube-lehmann",
    name: "Weinstube Lehmann",
    category: "weinstube",
    position: { lat: 48.7765, lng: 9.181 },
    hours: { open: "17:00", close: "00:00" },
    occupancy: "normal",
    fallbackMessage: "Independent Weinstube serving regional Schwäbisch plates.",
    softMessage:
      "Weinstube Lehmann va cubriendo el día — sin prisa, hay sitio.",
    currentTransactionsToday: 5,
    lowTrafficThreshold: 14,
    dailyTargetReached: false,
    vibesMatch: ["night", "evening"],
    signature: "Independent Weinstube · since 1972",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "trollinger-flight",
        name: "Vuelo Trollinger (3 copas)",
        tags: ["wine", "evening", "local-specialty"],
      },
      {
        id: "maultaschen-wein",
        name: "Maultaschen + copa",
        tags: ["food", "wine", "warm"],
      },
      {
        id: "obstkuchen",
        name: "Tarta de manzana casera",
        tags: ["sweet", "pastry", "afternoon"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "weinstube-night",
        label: "Last seating",
        enabled: true,
        priority: 10,
        when: { timeBucket: ["night"] },
        then: {
          discountPct: 20,
          durationMin: 60,
          headline: "Last seating · Trollinger flight",
          message:
            "Last seating tonight — Trollinger flight on us with any main. Quiet table by the window.",
        },
      },
      {
        id: "weinstube-cold-evening",
        label: "Cold evening warmth",
        enabled: true,
        priority: 7,
        when: { timeBucket: ["evening"], weather: ["cold", "rainy"] },
        then: {
          discountPct: 15,
          durationMin: 60,
          headline: "Maultaschen weather",
          message: "Cold evening, warm Weinstube — Maultaschen are in the pot.",
        },
      },
      {
        id: "weinstube-default",
        label: "Steady evening",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 5,
          durationMin: 90,
          headline: "Open and serving",
          message: "Open and serving regional plates — independent since '72.",
        },
      },
    ],
  },
  {
    id: "walter-soehne",
    name: "Walter & Söhne Boutique",
    category: "boutique",
    position: { lat: 48.7752, lng: 9.1842 },
    hours: { open: "10:00", close: "19:00" },
    occupancy: "quiet",
    fallbackMessage: "Independent Königstraße boutique, hand-finished pieces.",
    softMessage:
      "Walter & Söhne ya tuvo varias visitas hoy — mejor un sábado tranquilo.",
    currentTransactionsToday: 6,
    lowTrafficThreshold: 9,
    dailyTargetReached: false,
    vibesMatch: ["cold", "sunny"],
    signature: "Independent boutique · Königstraße",
    isOfferActive: false,
    activeOfferTitle: null,
    activeOfferDescription: null,
    activeOfferDiscountPct: null,
    activeOfferEndsAt: null,
    productInventory: [
      {
        id: "merino-scarf",
        name: "Bufanda Merino edición frío",
        tags: ["accessory", "warm", "gift"],
      },
      {
        id: "linen-shirt",
        name: "Camisa lino slim",
        tags: ["fashion", "sunny-day", "capsule", "local-specialty"],
      },
      {
        id: "leather-wallet",
        name: "Cartera piel hecha a mano",
        tags: ["accessory", "gift", "local-specialty"],
      },
    ],
    activeOfferProductTags: null,
    activeOfferProductId: null,
    flashOffers: [],
    rules: [
      {
        id: "walter-cold-quiet",
        label: "Cold + empty store",
        enabled: true,
        priority: 10,
        when: { occupancy: ["quiet"], weather: ["cold"] },
        then: {
          discountPct: 20,
          durationMin: 60,
          headline: "New Merino drop",
          message:
            "It's chilly out — new Merino scarves arrived this morning, and the shop's empty. 20% off your fitting.",
        },
      },
      {
        id: "walter-sunny-linen",
        label: "Sunny linen drop",
        enabled: true,
        priority: 7,
        when: { weather: ["sunny"] },
        then: {
          discountPct: 10,
          durationMin: 60,
          headline: "Linen capsule",
          message: "Sun's perfect for the linen drop — accessories at -10% the rest of the day.",
        },
      },
      {
        id: "walter-default",
        label: "Königstraße default",
        enabled: true,
        priority: 4,
        when: {},
        then: {
          discountPct: 5,
          durationMin: 120,
          headline: "Hand-finished pieces",
          message: "Hand-finished pieces, independent since '03 — drop in for the new collection.",
        },
      },
    ],
  },
];

/** @deprecated Prefer `useMerchants()` from merchant-rules-context. */
export const LOCAL_MERCHANTS = INITIAL_MERCHANTS;

export function getMerchantById(
  merchants: LocalMerchant[],
  id: string,
): LocalMerchant | undefined {
  return merchants.find((m) => m.id === id);
}

const EARTH_RADIUS_M = 6_371_000;

/** Mia location line + nearest preset (i18n labels via `map.preset.{id}` in the UI). */
export function describeMiaLocation(position: GeoPoint, isWalking: boolean): {
  coordsOnly: string;
  isWalking: boolean;
  nearestPresetId: string | null;
  nearestDistanceM: number | null;
  hintKind: "near" | "toward" | null;
} {
  let best: { preset: MiaLocationPreset; d: number } | null = null;
  for (const preset of MIA_LOCATION_PRESETS) {
    const d = distanceMeters(position, preset.position);
    if (!best || d < best.d) best = { preset, d };
  }
  const coordsOnly = `${position.lat.toFixed(4)}°, ${position.lng.toFixed(4)}°`;
  if (!best) {
    return {
      coordsOnly,
      isWalking,
      nearestPresetId: null,
      nearestDistanceM: null,
      hintKind: null,
    };
  }
  return {
    coordsOnly,
    isWalking,
    nearestPresetId: best.preset.id,
    nearestDistanceM: Math.round(best.d),
    hintKind: best.d < 85 ? "near" : "toward",
  };
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(aa)));
}

export function interpolate(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

export function findNearbyMatchingMerchants(
  merchants: LocalMerchant[],
  position: GeoPoint,
  radiusMeters: number,
  matchVibes: VibeMatch[],
  excludeIds: Set<string> = new Set(),
): LocalMerchant[] {
  return merchants.filter((m) => {
    if (excludeIds.has(m.id)) return false;
    if (distanceMeters(position, m.position) > radiusMeters) return false;
    return m.vibesMatch.some((v) => matchVibes.includes(v));
  });
}

export function projectToSvg(
  point: GeoPoint,
  width: number,
  height: number,
  bbox = STUTTGART_BBOX,
): { x: number; y: number } {
  const x = ((point.lng - bbox.lngMin) / (bbox.lngMax - bbox.lngMin)) * width;
  const y = ((bbox.latMax - point.lat) / (bbox.latMax - bbox.latMin)) * height;
  return { x, y };
}

export function unprojectFromSvg(
  point: { x: number; y: number },
  width: number,
  height: number,
  bbox = STUTTGART_BBOX,
): GeoPoint {
  const lng = bbox.lngMin + (point.x / width) * (bbox.lngMax - bbox.lngMin);
  const lat = bbox.latMax - (point.y / height) * (bbox.latMax - bbox.latMin);
  return { lat, lng };
}
