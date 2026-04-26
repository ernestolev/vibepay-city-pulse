export type BusinessMovement = {
  id: string;
  concept: string;
  amount: number;
  channel: "Store" | "Online" | "Delivery";
  timeLabel: string;
};

export type BusinessOffer = {
  id: string;
  title: string;
  description: string;
  discount: string;
  merchant: string;
  distance: string;
  expires: string;
  durationHours: number;
  startsAt: string;
  status: "Scheduled" | "Live" | "Ending soon";
};

export type NewBusinessOfferInput = {
  title: string;
  description: string;
  discount: string;
  durationHours: number;
};

export const BUSINESS_MOVEMENTS: BusinessMovement[] = [
  { id: "m-1", concept: "Breakfast combo sales", amount: 138, channel: "Store", timeLabel: "08:45" },
  { id: "m-2", concept: "Coffee subscriptions", amount: 94, channel: "Online", timeLabel: "10:10" },
  { id: "m-3", concept: "Lunch promo redemptions", amount: 172, channel: "Store", timeLabel: "13:05" },
  { id: "m-4", concept: "Afternoon delivery batch", amount: 116, channel: "Delivery", timeLabel: "16:30" },
];

export const DAILY_INCOME_TARGET = 700;

export const DEFAULT_BUSINESS_OFFERS: BusinessOffer[] = [
  {
    id: "biz-breakfast-power-hour",
    title: "Breakfast Power Hour",
    description: "2x1 on selected coffee drinks before 11:00.",
    discount: "2x1",
    merchant: "Mia's Coffee Lab",
    distance: "Your business profile",
    expires: "Ends 11:00",
    durationHours: 3,
    startsAt: "08:00",
    status: "Ending soon",
  },
  {
    id: "biz-lunch-combo",
    title: "Lunch Combo Boost",
    description: "15% off for combo meals from 12:00 to 15:00.",
    discount: "15% OFF",
    merchant: "Mia's Coffee Lab",
    distance: "Your business profile",
    expires: "Ends 15:00",
    durationHours: 3,
    startsAt: "12:00",
    status: "Live",
  },
  {
    id: "biz-happy-latte",
    title: "Happy Latte Evening",
    description: "Free topping after 18:00 for all latte sizes.",
    discount: "FREE TOPPING",
    merchant: "Mia's Coffee Lab",
    distance: "Your business profile",
    expires: "Starts 18:00",
    durationHours: 4,
    startsAt: "18:00",
    status: "Scheduled",
  },
];

export type HourlyIncome = {
  hour: string;
  amount: number;
};

export const HOURLY_INCOME: HourlyIncome[] = [
  { hour: "08", amount: 80 },
  { hour: "10", amount: 138 },
  { hour: "12", amount: 94 },
  { hour: "14", amount: 172 },
  { hour: "16", amount: 60 },
  { hour: "18", amount: 116 },
];

export const YESTERDAY_INCOME = 612;

export const TOP_PRODUCT = {
  name: "Flat White Combo",
  units: 38,
  revenue: 247,
};

export const ACTIVE_CUSTOMERS_TODAY = 64;

export const OFFER_CONVERSION = {
  redeemed: 27,
  views: 184,
};

export function getBusinessDashboardMetrics() {
  const incomeToday = BUSINESS_MOVEMENTS.reduce((acc, movement) => acc + movement.amount, 0);
  const transactionsToday = BUSINESS_MOVEMENTS.length;
  const averageTicket = transactionsToday > 0 ? incomeToday / transactionsToday : 0;
  const coverageRate = incomeToday / DAILY_INCOME_TARGET;
  const dailyDelta = incomeToday - YESTERDAY_INCOME;
  const dailyDeltaPercent = YESTERDAY_INCOME > 0 ? (dailyDelta / YESTERDAY_INCOME) * 100 : 0;
  const peak = HOURLY_INCOME.reduce((best, current) => (current.amount > best.amount ? current : best), HOURLY_INCOME[0]);
  const conversionRate = OFFER_CONVERSION.views > 0 ? (OFFER_CONVERSION.redeemed / OFFER_CONVERSION.views) * 100 : 0;

  return {
    incomeToday,
    transactionsToday,
    averageTicket,
    coverageRate,
    incomeGap: Math.max(DAILY_INCOME_TARGET - incomeToday, 0),
    goalReached: incomeToday >= DAILY_INCOME_TARGET,
    dailyDelta,
    dailyDeltaPercent,
    peakHourLabel: `${peak.hour}:00`,
    peakHourAmount: peak.amount,
    conversionRate,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function toBusinessOffer(input: NewBusinessOfferInput): BusinessOffer {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + input.durationHours * 60 * 60 * 1000);
  const startsAt = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
  const endsAt = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

  return {
    id: `biz-${Date.now()}`,
    title: input.title,
    description: input.description,
    discount: input.discount,
    merchant: "Mia's Coffee Lab",
    distance: "Your business profile",
    expires: `Ends ${endsAt}`,
    durationHours: input.durationHours,
    startsAt,
    status: "Live",
  };
}
