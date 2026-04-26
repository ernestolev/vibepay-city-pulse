export type Vibe = 'sunny' | 'rainy' | 'event' | 'night';
export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night' | 'unspecified';

export interface ContextualOffer {
  title: string;
  description: string;
  discount: string;
  merchantName: string;
  themeColor: string;
  iconName: string;
}

const contextualOffers: Record<Vibe, ContextualOffer> = {
  sunny: {
    title: 'Open terrace at Eiscafé Marktplatz',
    description:
      'Sunny day in Stuttgart Old Town: VibePay surfaces a family-run gelateria with an open terrace, settled instantly via Payone Riel.',
    discount: '20% off artisan gelato',
    merchantName: 'Eiscafé Marktplatz · independent SME',
    themeColor: '#E59A4D',
    iconName: 'IceCream',
  },
  rainy: {
    title: 'Stay cosy at Café Weinhalle',
    description:
      'Rain just started in Old Town: VibePay routes you to a quiet neighbourhood café with hot drinks, paid in one tap via Payone Riel.',
    discount: 'Buy a hot drink, second one on us',
    merchantName: 'Café Weinhalle · local Mittelstand',
    themeColor: '#2D6BFF',
    iconName: 'CloudRain',
  },
  event: {
    title: 'Marktplatz crowd, local bistros benefiting',
    description:
      'A festival nearby is bringing foot traffic to Old Town. VibePay highlights an independent bistro that prepared a special menu — settled via Payone Riel.',
    discount: '15% off Schwäbisch dinner menu',
    merchantName: 'Trattoria Marktplatz · family-run since 1994',
    themeColor: '#C84F2E',
    iconName: 'Utensils',
  },
  night: {
    title: 'Late dinner at Weinstube Lehmann',
    description:
      'After hours in Stuttgart: VibePay surfaces a small, family-owned Weinstube serving regional plates — instant settlement with Payone Riel.',
    discount: '10% off & a complimentary Trollinger glass',
    merchantName: 'Weinstube Lehmann · local Mittelstand',
    themeColor: '#4A35CC',
    iconName: 'Wine',
  },
};

export function getTimeBucket(time?: string | null): TimeBucket {
  if (!time) return 'unspecified';

  const [hourStr] = time.split(':');
  const hour = Number.parseInt(hourStr, 10);

  if (Number.isNaN(hour)) return 'unspecified';

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

const timeAwareOffers: Record<Exclude<TimeBucket, 'unspecified' | 'afternoon'>, ContextualOffer> = {
  morning: {
    title: 'Morning bake at Bäckerei Treiber',
    description:
      'Stuttgart Old Town is just waking up: VibePay pairs an espresso with a fresh Brezel at a family bakery, settled instantly with Payone Riel.',
    discount: 'Coffee + Brezel for €3.50',
    merchantName: 'Bäckerei Treiber · independent bakery',
    themeColor: '#E59A4D',
    iconName: 'Coffee',
  },
  evening: {
    title: 'End of workday · warm up locally',
    description:
      "It's getting dark and 11°C in Stuttgart. VibePay surfaces a quiet local café for a warm drink, or a discounted ride home — paid via Payone Riel.",
    discount: '20% off warm drinks · ride home discounted',
    merchantName: 'Old Town local café partners',
    themeColor: '#7C5CFF',
    iconName: 'Coffee',
  },
  night: {
    title: 'Late dinner at Weinstube Lehmann',
    description:
      'After hours in Stuttgart: a small family-owned Weinstube is serving regional plates — VibePay locks in a perk, settled via Payone Riel.',
    discount: '10% off & a complimentary Trollinger glass',
    merchantName: 'Weinstube Lehmann · local Mittelstand',
    themeColor: '#4A35CC',
    iconName: 'Wine',
  },
};

export function getContextualOffer(vibe: string, time?: string | null): ContextualOffer {
  const normalizedVibe = vibe.toLowerCase() as Vibe;
  const baseOffer = contextualOffers[normalizedVibe] ?? contextualOffers.sunny;

  const bucket = getTimeBucket(time);
  if (bucket === 'morning' || bucket === 'evening' || bucket === 'night') {
    return timeAwareOffers[bucket];
  }

  return baseOffer;
}
