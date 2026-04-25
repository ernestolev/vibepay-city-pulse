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
      'A refined summer reward from Santander: enjoy a handcrafted ice cream with seamless Payone checkout and elevated everyday value.',
    discount: '30% off premium ice cream',
    merchantName: 'Helado Atelier by Payone',
    themeColor: '#FF5A36',
    iconName: 'Sun',
  },
  rainy: {
    title: 'Rainy Day Reserve',
    description:
      'When the weather turns, Santander keeps your day moving with a warm, barista-made coffee benefit powered by Payone.',
    discount: 'Buy one hot coffee, get one complimentary',
    merchantName: 'Cafe Reserve by Payone',
    themeColor: '#2F6FDB',
    iconName: 'CloudRain',
  },
  event: {
    title: 'Matchday Priority Access',
    description:
      'A signature Santander event perk: secure premium stadium snacks faster with Payone and enjoy exclusive in-venue savings.',
    discount: '25% off stadium snacks',
    merchantName: 'Estadio Select Kiosks via Payone',
    themeColor: '#EC0000',
    iconName: 'Trophy',
  },
  night: {
    title: 'After Hours Jazz Benefit',
    description:
      'Close the evening with Santander Private-style rewards, including curated cashback at select jazz venues through Payone.',
    discount: '15% cashback on qualifying lounge spend',
    merchantName: 'Midnight Blue Jazz Club on Payone',
    themeColor: '#0D1B3D',
    iconName: 'Moon',
  },
};

export function getContextualOffer(vibe: string): ContextualOffer {
  const normalizedVibe = vibe.toLowerCase() as Vibe;
  return contextualOffers[normalizedVibe] ?? contextualOffers.sunny;
}