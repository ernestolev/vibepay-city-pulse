import type { LocalMerchant, Occupancy } from "./merchantData";
import { getTimeBucket, type TimeBucket } from "./vibeEngine";

/**
 * The offer engine evaluates merchant-defined rules against the current
 * city context and returns the best-matching offer at runtime.
 *
 * NOTHING is retrieved from a static "offer table" — each merchant ships
 * a list of rules (presets) and the engine composes the offer dynamically
 * based on weather, time of day, weekday, and live shop occupancy.
 *
 * This is what makes VibePay a Generative City-Wallet rather than a
 * coupon catalogue.
 */

export type WeatherSignal = "sunny" | "rainy" | "cloudy" | "cold";
export type WeekdaySignal = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface OfferRuleWhen {
  weather?: WeatherSignal[];
  timeBucket?: TimeBucket[];
  occupancy?: Occupancy[];
  weekday?: WeekdaySignal[];
}

export interface OfferRuleThen {
  discountPct: number; // 0..100
  durationMin: number; // how long the offer holds
  headline: string; // short merchant-facing label, e.g. "Quiet hour boost"
  message: string; // human-tone copy aimed at Mia
}

export interface OfferRule {
  id: string;
  label: string; // human-readable name shown in the merchant view
  enabled: boolean;
  priority: number; // higher wins when several rules match
  when: OfferRuleWhen;
  then: OfferRuleThen;
}

export interface OfferContext {
  weather: WeatherSignal;
  timeBucket: TimeBucket;
  occupancy: Occupancy;
  weekday: WeekdaySignal;
}

/**
 * Dynamic Traffic Activation states. Computed live from Payone settlement
 * counts. The engine only surfaces aggressive offers when the merchant
 * actually needs more sales today — VibePay never spams when a shop is
 * already busy or done for the day.
 */
export type ActivationState = "low_traffic" | "normal" | "target_reached";

export interface EvaluatedOffer {
  fired: boolean; // true if a rule matched AND traffic gate allowed it
  rule: OfferRule | null;
  discount: string; // e.g. "20% off · 15 min" or "Open · no special offer"
  headline: string;
  message: string;
  signalsMatched: string[]; // contextual signals that produced this offer
  activationState: ActivationState;
  transactionSummary: string; // e.g. "4 / 12 sales today via Payone"
}

const WEEKDAY_ORDER: WeekdaySignal[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getCurrentWeekday(date = new Date()): WeekdaySignal {
  return WEEKDAY_ORDER[date.getDay()];
}

interface BuildContextArgs {
  weatherVibe?: "sunny" | "rainy" | "cloudy";
  isCold?: boolean;
  simulatedTime?: string | null;
  occupancy: Occupancy;
}

/** Compose an OfferContext from VibePay's loose context inputs. */
export function buildOfferContext({
  weatherVibe,
  isCold,
  simulatedTime,
  occupancy,
}: BuildContextArgs): OfferContext {
  const weather: WeatherSignal = isCold ? "cold" : (weatherVibe ?? "cloudy");
  const timeBucket = getTimeBucket(simulatedTime ?? null);

  return {
    weather,
    timeBucket,
    occupancy,
    weekday: getCurrentWeekday(),
  };
}

interface RuleMatch {
  matches: boolean;
  signals: string[];
}

function ruleMatchesContext(rule: OfferRule, ctx: OfferContext): RuleMatch {
  if (!rule.enabled) return { matches: false, signals: [] };

  const signals: string[] = [];

  if (rule.when.weather && rule.when.weather.length > 0) {
    if (!rule.when.weather.includes(ctx.weather)) return { matches: false, signals: [] };
    signals.push(ctx.weather);
  }
  if (rule.when.timeBucket && rule.when.timeBucket.length > 0) {
    if (!rule.when.timeBucket.includes(ctx.timeBucket)) return { matches: false, signals: [] };
    signals.push(ctx.timeBucket);
  }
  if (rule.when.occupancy && rule.when.occupancy.length > 0) {
    if (!rule.when.occupancy.includes(ctx.occupancy)) return { matches: false, signals: [] };
    signals.push(ctx.occupancy);
  }
  if (rule.when.weekday && rule.when.weekday.length > 0) {
    if (!rule.when.weekday.includes(ctx.weekday)) return { matches: false, signals: [] };
    signals.push(ctx.weekday);
  }

  return { matches: true, signals };
}

/** Compute the live activation state from Payone settlement counts. */
export function getActivationState(merchant: LocalMerchant): ActivationState {
  if (merchant.dailyTargetReached) return "target_reached";
  if (merchant.currentTransactionsToday < merchant.lowTrafficThreshold) {
    return "low_traffic";
  }
  return "normal";
}

function buildTransactionSummary(merchant: LocalMerchant): string {
  return `${merchant.currentTransactionsToday} / ${merchant.lowTrafficThreshold} sales today via Payone`;
}

/**
 * Pick the best-matching enabled rule for the current context, but ONLY
 * surface a discounted offer when the shop is in low_traffic mode. When
 * the daily target is reached or the shop is already at normal traffic,
 * VibePay shows a soft greeting instead of an aggressive promo —
 * Powered-by-Payone semantics: real settlements gate the AI.
 */
export function evaluateOffer(merchant: LocalMerchant, ctx: OfferContext): EvaluatedOffer {
  const activationState = getActivationState(merchant);
  const transactionSummary = buildTransactionSummary(merchant);

  if (activationState !== "low_traffic") {
    return {
      fired: false,
      rule: null,
      discount:
        activationState === "target_reached"
          ? "Daily goal reached · no promo today"
          : "Steady traffic · no boost needed",
      headline: merchant.name,
      message: merchant.softMessage,
      signalsMatched: [],
      activationState,
      transactionSummary,
    };
  }

  let best: { rule: OfferRule; signals: string[] } | null = null;
  for (const rule of merchant.rules) {
    const match = ruleMatchesContext(rule, ctx);
    if (!match.matches) continue;
    if (!best || rule.priority > best.rule.priority) {
      best = { rule, signals: match.signals };
    }
  }

  const trafficPrefix = `${merchant.name} está tranquilo ahora y tiene una atención especial para ti.`;

  if (!best) {
    return {
      fired: false,
      rule: null,
      discount: "Quiet hour · open and waiting",
      headline: merchant.name,
      message: `${trafficPrefix} ${merchant.fallbackMessage}`,
      signalsMatched: ["low_traffic"],
      activationState,
      transactionSummary,
    };
  }

  return {
    fired: true,
    rule: best.rule,
    discount: `${best.rule.then.discountPct}% off · ${best.rule.then.durationMin} min`,
    headline: best.rule.then.headline,
    message: `${trafficPrefix} ${best.rule.then.message}`,
    signalsMatched: ["low_traffic", ...best.signals],
    activationState,
    transactionSummary,
  };
}

/**
 * Evaluate offers for a list of merchants and return them sorted by relevance:
 * fired-rule offers first (ordered by priority), then fallbacks. Useful for
 * "AI as curator: 1 of 12 nearby" displays.
 */
const ACTIVATION_RANK: Record<ActivationState, number> = {
  low_traffic: 0,
  normal: 1,
  target_reached: 2,
};

export function rankMerchantsByOffer(
  merchants: LocalMerchant[],
  ctx: OfferContext,
): Array<{ merchant: LocalMerchant; offer: EvaluatedOffer }> {
  return merchants
    .map((merchant) => ({ merchant, offer: evaluateOffer(merchant, ctx) }))
    .sort((a, b) => {
      const aa = ACTIVATION_RANK[a.offer.activationState];
      const bb = ACTIVATION_RANK[b.offer.activationState];
      if (aa !== bb) return aa - bb;
      if (a.offer.fired !== b.offer.fired) return a.offer.fired ? -1 : 1;
      const ap = a.offer.rule?.priority ?? 0;
      const bp = b.offer.rule?.priority ?? 0;
      return bp - ap;
    });
}
