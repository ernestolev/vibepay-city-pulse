import type { LocalMerchant, MerchantProduct } from "./merchantData";
import type { VibeKey } from "./vibe";

export interface InventoryOfferProposal {
  product: MerchantProduct;
  discountPct: number;
  durationMinutes: number;
  title: string;
  /** Copy shown in the consumer app (no internal metrics). */
  publicOfferDescription: string;
  ownerBenefits: string[];
  agentRationaleEs: string;
  inventorySummaryEs: string;
}

function vibeContextTags(vibe: VibeKey): string[] {
  switch (vibe) {
    case "rainy":
      return ["rainy-day", "warm", "comfort", "coffee", "latte", "drink"];
    case "sunny":
      return ["sunny-day", "afternoon", "gelato", "cold-drink"];
    case "nighttime":
      return ["evening", "wine", "food", "sharing"];
    case "event":
      return ["local-specialty", "sharing", "sweet", "afternoon"];
    default:
      return ["coffee", "local-specialty", "morning"];
  }
}

function scoreProductWithVibe(
  p: MerchantProduct,
  vibe: VibeKey,
  vibeTags: string[],
  consumerPreferenceTags: string[] | undefined,
  salt: number,
): number {
  let s = 0;
  for (const t of p.tags) {
    if (vibeTags.includes(t)) s += 5;
    if (consumerPreferenceTags?.includes(t)) s += 3;
  }
  if (vibe === "sunny" && (p.tags.includes("gelato") || p.tags.includes("sunny-day"))) s += 18;
  if (vibe === "rainy" && (p.tags.includes("warm") || p.tags.includes("rainy-day"))) s += 18;
  if (vibe === "nighttime" && p.tags.some((t) => t === "evening" || t === "sharing")) s += 14;
  if (vibe === "event" && (p.tags.includes("sharing") || p.tags.includes("local-specialty"))) s += 10;
  s += (salt + p.id.length) % 3;
  return s;
}

const DEFAULT_OWNER_BENEFITS = [
  "Promocionas un artículo que ya tienes en inventario — sin crear cupones nuevos a mano.",
  "El mensaje nombra el producto concreto: menos fricción en caja o barra.",
  "VibePay puede mostrar la oferta sobre todo a clientes cuyo perfil encaja con las etiquetas del SKU.",
  "Liquidación instantánea vía Payone Riel al redimir — mismo riel que la wallet.",
];

export function buildProposalForProduct(
  merchant: LocalMerchant,
  product: MerchantProduct,
  vibe: VibeKey,
  discountPct: number,
  durationMinutes: number,
  options?: { rationaleSuffix?: string },
): InventoryOfferProposal {
  const title = `${discountPct}% OFF · ${product.name}`;
  const weatherLine =
    vibe === "rainy"
      ? "con este clima"
      : vibe === "sunny"
        ? "con el día que hace"
        : vibe === "nighttime"
          ? "para esta franja"
          : vibe === "event"
            ? "con el ambiente de hoy"
            : "ahora mismo";
  const publicOfferDescription = `¡Hola! ${merchant.name} te ofrece ${product.name} con ${discountPct}% de descuento ${weatherLine}, solo por los próximos ${durationMinutes} min. ¿Pasamos?`;

  const vibeWord =
    vibe === "rainy"
      ? "lluvia"
      : vibe === "sunny"
        ? "sol"
        : vibe === "nighttime"
          ? "tarde/noche"
          : vibe === "event"
            ? "evento / más movimiento"
            : "el contexto actual";

  const baseRationale = `Contexto simulado: ${vibeWord} + tráfico bajo (Payone). SKU «${product.name}» elegido por etiquetas del JSON.`;
  const agentRationaleEs = options?.rationaleSuffix
    ? `${options.rationaleSuffix} · ${baseRationale}`
    : baseRationale;

  const inventorySummaryEs = options?.rationaleSuffix
    ? `${options.rationaleSuffix} · «${product.name}» · simulación: ${vibeWord}.`
    : `Analizados ${merchant.productInventory.length} artículos de tu inventario JSON · destacado: «${product.name}».`;

  return {
    product,
    discountPct,
    durationMinutes,
    title,
    publicOfferDescription,
    ownerBenefits: DEFAULT_OWNER_BENEFITS,
    agentRationaleEs,
    inventorySummaryEs,
  };
}

/** Variantes para la demo del dueño: otros SKUs fuertes según clima / hora simulados. */
export function listWeatherDemoQuickPicks(
  merchant: LocalMerchant,
  vibe: VibeKey,
  opts: {
    discountPct: number;
    durationMinutes: number;
    consumerPreferenceTags?: string[];
    excludeProductId?: string | null;
    excludeProductIds?: string[];
    maxPicks?: number;
  },
): InventoryOfferProposal[] {
  const inv = merchant.productInventory;
  if (!inv.length) return [];

  const excluded = new Set<string>();
  if (opts.excludeProductId) excluded.add(opts.excludeProductId);
  for (const id of opts.excludeProductIds ?? []) excluded.add(id);

  const vibeTags = vibeContextTags(vibe);
  const scored = inv.map((p, i) => ({
    p,
    score: scoreProductWithVibe(
      p,
      vibe,
      vibeTags,
      opts.consumerPreferenceTags,
      i * 7,
    ),
  }));
  scored.sort((a, b) => b.score - a.score);

  const out: InventoryOfferProposal[] = [];
  const seen = new Set<string>();
  for (const { p } of scored) {
    if (excluded.has(p.id)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(
      buildProposalForProduct(merchant, p, vibe, opts.discountPct, opts.durationMinutes, {
        rationaleSuffix: "Demo rápida",
      }),
    );
    if (out.length >= (opts.maxPicks ?? 3)) break;
  }
  return out;
}

export function proposeFlashOfferFromInventory(params: {
  merchant: LocalMerchant;
  vibe: VibeKey;
  consumerPreferenceTags?: string[];
  discountPct: number;
  durationMinutes: number;
  proposalSalt?: number;
  excludeProductIds?: string[];
}): InventoryOfferProposal | null {
  const {
    merchant,
    vibe,
    consumerPreferenceTags,
    discountPct,
    durationMinutes,
    proposalSalt = 0,
    excludeProductIds = [],
  } = params;
  const inv = merchant.productInventory;
  if (!inv?.length) return null;

  const excluded = new Set(excludeProductIds);
  const vibeTags = vibeContextTags(vibe);
  const scored = inv
    .filter((p) => !excluded.has(p.id))
    .map((p, i) => ({
      p,
      score: scoreProductWithVibe(
        p,
        vibe,
        vibeTags,
        consumerPreferenceTags,
        proposalSalt + i * 7,
      ),
    }));
  scored.sort((a, b) => b.score - a.score);
  const product = scored[0]?.p;
  if (!product) return null;

  return buildProposalForProduct(merchant, product, vibe, discountPct, durationMinutes);
}
