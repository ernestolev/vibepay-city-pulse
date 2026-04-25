export type Vibe = 'sunny' | 'rainy' | 'event' | 'night';

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
    title: 'Golden Hour Treat',
    description:
      'A premium VibePay summer privilege: enjoy handcrafted ice cream with seamless Payone checkout and elevated everyday value.',
    discount: '30% off premium ice cream',
    merchantName: 'Helado Atelier by Payone',
    themeColor: '#6F3CFF',
    iconName: 'Sun',
  },
  rainy: {
    title: 'Rainy Day Reserve',
    description:
      'When weather shifts, VibePay keeps your day moving with a warm, barista-made coffee benefit powered by Payone.',
    discount: 'Buy one hot coffee, get one complimentary',
    merchantName: 'Cafe Reserve by Payone',
    themeColor: '#2D6BFF',
    iconName: 'CloudRain',
  },
  event: {
    title: 'Matchday Priority Access',
    description:
      'A signature VibePay event perk: secure premium stadium snacks faster with Payone and enjoy priority in-venue value.',
    discount: '25% off stadium snacks',
    merchantName: 'Estadio Select Kiosks via Payone',
    themeColor: '#00C9B7',
    iconName: 'Trophy',
  },
  night: {
    title: 'After Hours Jazz Benefit',
    description:
      'Close the evening with VibePay Private-style rewards, including curated cashback at select jazz venues through Payone.',
    discount: '15% cashback on qualifying lounge spend',
    merchantName: 'Midnight Blue Jazz Club on Payone',
    themeColor: '#4A35CC',
    iconName: 'Moon',
  },
};

export function getContextualOffer(vibe: string): ContextualOffer {
  const normalizedVibe = vibe.toLowerCase() as Vibe;
  return contextualOffers[normalizedVibe] ?? contextualOffers.sunny;
}