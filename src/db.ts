export const DEFAULT_BRANDS = [
  {
    id: 'b-budget',
    name: 'Apex Budget',
    description: 'Affordable, clean, dense layouts with classic service, but low overhead costs.',
    vipMultiplier: 0.8,
    bedMultiplier: 0.8,
    styleColor: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    vipSpawnRate: 0.08,
    icon: '💰',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'b-eco',
    name: 'EcoZen Retreat',
    description: 'Eco-friendly and natural design focus. Plants and tables gain double satisfaction, fast-tracking guest happiness!',
    vipMultiplier: 1.2,
    bedMultiplier: 1.1,
    styleColor: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    vipSpawnRate: 0.18,
    icon: '🍃',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'b-luxury',
    name: 'Grand Luxe Signature',
    description: 'Extravagant suite experiences, ultra-fast check-ins, and triple the rate of VIP arrivals!',
    vipMultiplier: 1.8,
    bedMultiplier: 1.6,
    styleColor: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    vipSpawnRate: 0.35,
    icon: '👑',
    color: 'from-amber-500 to-orange-500'
  }
  ,
  {
    id: 'b-radisson',
    name: 'Radisson',
    description: 'Contemporary full-service hotels with warm service and modern design.',
    vipMultiplier: 1.15,
    bedMultiplier: 1.1,
    styleColor: 'from-sky-600/20 to-sky-900/10 border-sky-500/30 text-sky-400',
    vipSpawnRate: 0.12,
    icon: '🏨',
    color: 'from-sky-500 to-indigo-500'
  },
  {
    id: 'b-radisson-blu',
    name: 'Radisson Blu',
    description: 'Upscale full-service hotels focused on design and business travelers.',
    vipMultiplier: 1.2,
    bedMultiplier: 1.15,
    styleColor: 'from-blue-600/20 to-indigo-900/10 border-blue-500/30 text-blue-400',
    vipSpawnRate: 0.16,
    icon: '💠',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'b-radisson-red',
    name: 'Radisson RED',
    description: 'Lifestyle brand with bold design and social spaces.',
    vipMultiplier: 1.05,
    bedMultiplier: 1.0,
    styleColor: 'from-pink-600/20 to-rose-900/10 border-pink-500/30 text-pink-400',
    vipSpawnRate: 0.09,
    icon: '🔴',
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'b-marriott',
    name: 'Marriott',
    description: 'Global upscale hospitality brand focusing on consistent quality and service.',
    vipMultiplier: 1.25,
    bedMultiplier: 1.2,
    styleColor: 'from-red-600/20 to-red-900/10 border-red-500/30 text-red-400',
    vipSpawnRate: 0.18,
    icon: '🏩',
    color: 'from-red-500 to-rose-500'
  },
  {
    id: 'b-jw-marriott',
    name: 'JW Marriott',
    description: 'Luxury lifestyle brand emphasizing refined design and exceptional service.',
    vipMultiplier: 1.6,
    bedMultiplier: 1.4,
    styleColor: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    vipSpawnRate: 0.32,
    icon: '✨',
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'b-staybridge',
    name: 'Staybridge Suites',
    description: 'Extended-stay brand with apartment-style rooms and kitchens.',
    vipMultiplier: 1.02,
    bedMultiplier: 1.05,
    styleColor: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    vipSpawnRate: 0.07,
    icon: '🏘️',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'b-ihg',
    name: 'IHG',
    description: 'International Hotels Group — broad portfolio from midscale to luxury.',
    vipMultiplier: 1.14,
    bedMultiplier: 1.08,
    styleColor: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    vipSpawnRate: 0.11,
    icon: '🛎️',
    color: 'from-emerald-500 to-green-500'
  }
  ,
  {
    id: 'b-crowneplaza',
    name: 'Crowne Plaza',
    description: 'Upscale business-focused hotels with meeting facilities.',
    vipMultiplier: 1.18,
    bedMultiplier: 1.12,
    styleColor: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
    vipSpawnRate: 0.14,
    icon: '🏢',
    color: 'from-indigo-500 to-blue-600'
  },
  {
    id: 'b-holidayinn',
    name: 'Holiday Inn',
    description: 'Friendly full-service brand focused on families and business travelers.',
    vipMultiplier: 1.04,
    bedMultiplier: 1.03,
    styleColor: 'from-green-600/20 to-green-900/10 border-green-500/30 text-green-400',
    vipSpawnRate: 0.1,
    icon: '🏷️',
    color: 'from-green-500 to-emerald-500'
  }
];

export const DEFAULT_ROOM_CATEGORIES = [
  {
    id: 'rc-standard',
    name: 'Standard Room',
    price: 50,
    icon: '🛏️',
    requiredTiles: ['bed'] as any,
    description: 'A cozy minimalist bedroom for budget-minded travelers. Requires a bed.'
  },
  {
    id: 'rc-executive',
    name: 'Executive Suite',
    price: 120,
    icon: '👑',
    requiredTiles: ['bed', 'plant', 'bathroom'],
    description: 'An expansive modern suite complete with organic flora and high-end bathing layout. Requires bed, plant, and bathroom.'
  },
  {
    id: 'rc-penthouse',
    name: 'Royal Penthouse',
    price: 240,
    icon: '🏰',
    requiredTiles: ['bed', 'plant', 'bathroom', 'table', 'window'],
    description: 'The pinnacle of luxury! Magnificent views, dining furniture, and botanics. Requires bed, plant, bathroom, table, and window.'
  }
];

export const HOTEL_CHAINS = [
  {
    id: 'hc-default',
    name: 'Marriott & Radisson Hospitality Group',
    brandIds: DEFAULT_BRANDS.map(b => b.id)
  }
  ,
  {
    id: 'hc-radisson-group',
    name: 'Radisson Group',
    brandIds: ['b-radisson','b-radisson-blu','b-radisson-red']
  },
  {
    id: 'hc-marriott-group',
    name: 'Marriott International',
    brandIds: ['b-marriott','b-jw-marriott','b-staybridge']
  },
  {
    id: 'hc-ihg-group',
    name: 'IHG Hotels & Resorts',
    brandIds: ['b-ihg','b-crowneplaza','b-holidayinn']
  }
];

export default {
  DEFAULT_BRANDS,
  DEFAULT_ROOM_CATEGORIES,
  HOTEL_CHAINS,
};
