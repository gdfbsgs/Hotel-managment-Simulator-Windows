import { Brand, Floor, GuestNPC, OperationsReport, StaffNPC, RoomCategory, TileType } from './types';

export const DEFAULT_ROOM_CATEGORIES_FALLBACK: RoomCategory[] = [
  { id: 'rc-standard', name: 'Standard Room', price: 50, icon: '🛏️', requiredTiles: ['bed'], description: 'Standard room' },
  { id: 'rc-executive', name: 'Executive Suite', price: 120, icon: '👑', requiredTiles: ['bed', 'plant', 'bathroom'], description: 'Executive suite' },
  { id: 'rc-penthouse', name: 'Royal Penthouse', price: 240, icon: '🏰', requiredTiles: ['bed', 'plant', 'bathroom', 'table', 'window'], description: 'Penthouse' },
];

function evaluateFloorRoomCategory(floor: Floor, categories: RoomCategory[]): RoomCategory {
  if (!floor) return categories[0];
  const tileCounts: Record<string, number> = {};
  floor.grid.forEach((row) => row.forEach((tile) => {
    if (tile !== 'empty') tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  }));
  let best = categories.find((c) => c.id === 'rc-standard') || categories[0];
  let maxPrice = best?.price || 0;
  categories.forEach((cat) => {
    const met = (cat.requiredTiles || []).every((req) => (tileCounts[req as TileType] || 0) > 0);
    if (met && cat.price > maxPrice) { best = cat; maxPrice = cat.price; }
  });
  return best;
}

export interface HotelMarket {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseDemand: number;
  businessShare: number;
  leisureShare: number;
  groupShare: number;
  compSetAdr: number;
  utilityRate: number;
  marketingEfficiency: number;
}

export const HOTEL_MARKETS: HotelMarket[] = [
  {
    id: 'urban-business',
    name: 'Downtown Business District',
    icon: '🏙️',
    description: 'Corporate travelers, weekday peaks, high ADR potential. Think Manhattan or Canary Wharf.',
    baseDemand: 72,
    businessShare: 0.62,
    leisureShare: 0.18,
    groupShare: 0.20,
    compSetAdr: 185,
    utilityRate: 1.15,
    marketingEfficiency: 0.9,
  },
  {
    id: 'beach-resort',
    name: 'Coastal Resort Strip',
    icon: '🏖️',
    description: 'Leisure demand surges in summer. Families and honeymooners dominate weekends.',
    baseDemand: 68,
    businessShare: 0.12,
    leisureShare: 0.72,
    groupShare: 0.16,
    compSetAdr: 210,
    utilityRate: 1.05,
    marketingEfficiency: 1.1,
  },
  {
    id: 'airport-transit',
    name: 'Airport Transit Hub',
    icon: '✈️',
    description: 'Steady fly-in demand year-round. Short stays, high turnover, consistent occupancy.',
    baseDemand: 78,
    businessShare: 0.45,
    leisureShare: 0.35,
    groupShare: 0.20,
    compSetAdr: 145,
    utilityRate: 1.0,
    marketingEfficiency: 0.85,
  },
  {
    id: 'convention-city',
    name: 'Convention & Events City',
    icon: '🎪',
    description: 'Group blocks and conference peaks. Demand spikes during event seasons.',
    baseDemand: 70,
    businessShare: 0.38,
    leisureShare: 0.22,
    groupShare: 0.40,
    compSetAdr: 165,
    utilityRate: 1.08,
    marketingEfficiency: 1.0,
  },
  {
    id: 'mountain-retreat',
    name: 'Mountain & Ski Retreat',
    icon: '⛷️',
    description: 'Strong winter leisure demand, quiet summers. Premium suite potential.',
    baseDemand: 58,
    businessShare: 0.15,
    leisureShare: 0.70,
    groupShare: 0.15,
    compSetAdr: 195,
    utilityRate: 1.2,
    marketingEfficiency: 1.05,
  },
];

export type DayPhase = 'pre-dawn' | 'checkout-rush' | 'daytime' | 'checkin-rush' | 'evening' | 'overnight';

export function getMarket(marketId: string): HotelMarket {
  return HOTEL_MARKETS.find((m) => m.id === marketId) || HOTEL_MARKETS[0];
}

export function getSeasonMultiplier(gameDay: number): { name: string; multiplier: number; icon: string } {
  const month = Math.floor((gameDay % 360) / 30);
  const seasons = [
    { name: 'Winter', multiplier: 0.88, icon: '❄️' },
    { name: 'Spring', multiplier: 1.0, icon: '🌸' },
    { name: 'Summer', multiplier: 1.18, icon: '☀️' },
    { name: 'Fall', multiplier: 0.95, icon: '🍂' },
  ];
  return seasons[month % 4];
}

export function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 9) return 'checkout-rush';
  if (hour >= 9 && hour < 14) return 'daytime';
  if (hour >= 14 && hour < 20) return 'checkin-rush';
  if (hour >= 20 && hour < 23) return 'evening';
  if (hour >= 23 || hour < 5) return 'overnight';
  return 'pre-dawn';
}

export function getPhaseLabel(phase: DayPhase): string {
  const labels: Record<DayPhase, string> = {
    'pre-dawn': 'Pre-Dawn (Low Activity)',
    'checkout-rush': 'Checkout Rush (06:00–09:00)',
    daytime: 'Daytime Operations',
    'checkin-rush': 'Check-In Rush (14:00–20:00)',
    evening: 'Evening Service',
    overnight: 'Overnight Stay',
  };
  return labels[phase];
}

export function countRoomInventory(floors: Floor[]) {
  let beds = 0;
  let bathrooms = 0;
  let elevators = 0;
  let reception = 0;
  let totalTiles = 0;

  floors.forEach((floor) => {
    floor.grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell !== 'empty') totalTiles++;
        if (cell === 'bed') beds++;
        if (cell === 'bathroom') bathrooms++;
        if (cell === 'elevator') elevators++;
        if (cell === 'reception') reception++;
      });
    });
  });

  const rooms = beds;
  const guestCapacity = beds * 2;

  return { beds, rooms, guestCapacity, bathrooms, elevators, reception, totalTiles, floors: floors.length };
}

export function calculateStarRating(
  floors: Floor[],
  totalGuestsServed: number,
  guests: GuestNPC[]
): number {
  const inRoom = guests.filter((g) => g.state === 'in-room');
  const avgSat =
    inRoom.length > 0
      ? inRoom.reduce((acc, g) => acc + (g.isVip ? g.vipSatisfaction || 50 : g.satisfaction || 75), 0) / inRoom.length
      : 75;

  const floorStars = Math.min(1.5, floors.length * 0.15);
  const guestStars = Math.min(1.5, (totalGuestsServed || 0) * 0.05);
  const satisfactionStars = (avgSat / 100) * 1.0;
  return Math.min(5.0, Math.max(1.0, Math.round((1.0 + floorStars + guestStars + satisfactionStars) * 10) / 10));
}

export function calculateDemandScore(params: {
  marketId: string;
  gameDay: number;
  starRating: number;
  brand: Brand;
  marketingBudget: number;
  satisfaction: number;
  occupancyRate: number;
}): number {
  const market = getMarket(params.marketId);
  const season = getSeasonMultiplier(params.gameDay);
  const weekendBoost = params.gameDay % 7 >= 5 ? 1.12 : 1.0;

  let demand =
    market.baseDemand *
    season.multiplier *
    weekendBoost *
    (0.7 + params.starRating * 0.06) *
    (0.85 + params.brand.vipSpawnRate * 0.5);

  demand += (params.marketingBudget / 100) * market.marketingEfficiency;
  demand += (params.satisfaction - 70) * 0.15;

  if (params.occupancyRate > 90) demand *= 0.82;
  else if (params.occupancyRate > 75) demand *= 0.92;

  return Math.min(100, Math.max(15, Math.round(demand)));
}

export function getGuestSpawnChance(params: {
  demandScore: number;
  phase: DayPhase;
  currentGuests: number;
  capacity: number;
}): number {
  if (params.capacity <= 0 || params.currentGuests >= params.capacity) return 0;

  const occupancyHeadroom = 1 - params.currentGuests / params.capacity;
  let phaseMultiplier = 0.04;

  switch (params.phase) {
    case 'checkin-rush':
      phaseMultiplier = 0.22;
      break;
    case 'checkout-rush':
      phaseMultiplier = 0.06;
      break;
    case 'evening':
      phaseMultiplier = 0.12;
      break;
    case 'daytime':
      phaseMultiplier = 0.08;
      break;
    case 'overnight':
      phaseMultiplier = 0.03;
      break;
    default:
      phaseMultiplier = 0.02;
  }

  return Math.min(0.35, (params.demandScore / 100) * phaseMultiplier * occupancyHeadroom);
}

export function calculateOperatingCosts(params: {
  floors: Floor[];
  staff: StaffNPC[];
  marketId: string;
  marketingBudget: number;
  guestCount: number;
  inventory: ReturnType<typeof countRoomInventory>;
}) {
  const market = getMarket(params.marketId);
  const staffPayroll = params.staff.reduce((acc, s) => acc + s.salary, 0);
  const utilities = Math.round(
    (params.inventory.totalTiles * 0.35 + params.inventory.floors * 120) * market.utilityRate
  );
  const housekeeping = Math.round(params.guestCount * 8 + params.inventory.rooms * 2);
  const maintenance = Math.round(params.inventory.elevators * 45 + params.inventory.floors * 35);
  const marketing = params.marketingBudget;
  const propertyTax = Math.round(params.inventory.floors * 85 + params.inventory.rooms * 12);
  const insurance = Math.round(params.inventory.rooms * 6 + 150);

  const total = staffPayroll + utilities + housekeeping + maintenance + marketing + propertyTax + insurance;

  return {
    staffPayroll,
    utilities,
    housekeeping,
    maintenance,
    marketing,
    propertyTax,
    insurance,
    total,
  };
}

export function calculateRoomRevenue(params: {
  guests: GuestNPC[];
  floors: Floor[];
  roomCategories: RoomCategory[];
  brand: Brand;
  activeBonusProgramId: string | null;
  bonusPrivileges: string[];
}) {
  const inRoom = params.guests.filter((g) => g.state === 'in-room');
  const normalGuests = inRoom.filter((g) => !g.isVip);
  const vipGuests = inRoom.filter((g) => g.isVip);
  const cats = params.roomCategories.length ? params.roomCategories : DEFAULT_ROOM_CATEGORIES_FALLBACK;

  let roomRevenue = 0;
  normalGuests.forEach((g) => {
    const floor = params.floors[g.floorIndex] || params.floors[0];
    const category = g.roomCategoryId
      ? cats.find((c) => c.id === g.roomCategoryId) || cats[0]
      : evaluateFloorRoomCategory(floor, cats);
    let price = category?.price || 50;
    const satMult = 0.5 + ((g.satisfaction || 75) / 100) * 0.8;
    if (params.bonusPrivileges.includes('lateCheckout') && g.enrolledInBonusProgram) {
      price = Math.round(price * 1.2);
    }
    roomRevenue += Math.round(price * satMult * params.brand.bedMultiplier);
  });

  vipGuests.forEach((g) => {
    const floor = params.floors[g.floorIndex] || params.floors[0];
    const category = evaluateFloorRoomCategory(floor, cats);
    let price = Math.max(category.price * 1.4, 120);
    const satMult = 1.2 + ((g.vipSatisfaction || 50) / 100);
    roomRevenue += Math.round(price * satMult * params.brand.vipMultiplier);
  });

  return roomRevenue;
}

export function buildOperationsReport(params: {
  floors: Floor[];
  guests: GuestNPC[];
  staff: StaffNPC[];
  marketId: string;
  gameDay: number;
  gameHour: number;
  marketingBudget: number;
  roomCategories: RoomCategory[];
  brand: Brand;
  activeBonusProgramId: string | null;
  bonusPrivileges: string[];
  totalGuestsServed: number;
  previousReport?: OperationsReport | null;
}): OperationsReport {
  const inventory = countRoomInventory(params.floors);
  const inRoom = params.guests.filter((g) => g.state === 'in-room');
  const checkingIn = params.guests.filter((g) => g.state === 'checking-in' || g.state === 'going-to-room');
  const checkingOut = params.guests.filter(
    (g) => g.state === 'checking-out' || g.state === 'going-to-elevator-checkout' || g.state === 'leaving'
  );

  const occupancyRate =
    inventory.guestCapacity > 0 ? Math.round((inRoom.length / inventory.guestCapacity) * 100) : 0;

  const avgSatisfaction =
    inRoom.length > 0
      ? Math.round(
          inRoom.reduce((acc, g) => acc + (g.isVip ? g.vipSatisfaction || 50 : g.satisfaction || 75), 0) /
            inRoom.length
        )
      : 75;

  const starRating = calculateStarRating(params.floors, params.totalGuestsServed, params.guests);
  const demandScore = calculateDemandScore({
    marketId: params.marketId,
    gameDay: params.gameDay,
    starRating,
    brand: params.brand,
    marketingBudget: params.marketingBudget,
    satisfaction: avgSatisfaction,
    occupancyRate,
  });

  const roomRevenue = calculateRoomRevenue({
    guests: params.guests,
    floors: params.floors,
    roomCategories: params.roomCategories,
    brand: params.brand,
    activeBonusProgramId: params.activeBonusProgramId,
    bonusPrivileges: params.bonusPrivileges,
  });

  const fbRevenue = Math.round(inRoom.length * (params.brand.id === 'b-luxury' ? 18 : 8));
  const ancillaryRevenue = Math.round(
    params.guests.filter((g) => g.isVip && g.state === 'in-room').length * 25
  );
  const revenue = roomRevenue + fbRevenue + ancillaryRevenue;

  const costs = calculateOperatingCosts({
    floors: params.floors,
    staff: params.staff,
    marketId: params.marketId,
    marketingBudget: params.marketingBudget,
    guestCount: inRoom.length,
    inventory,
  });

  const roomsSold = inRoom.length;
  const adr = roomsSold > 0 ? Math.round(roomRevenue / roomsSold) : 0;
  const revpar = inventory.rooms > 0 ? Math.round(roomRevenue / inventory.rooms) : 0;
  const gop = revenue - costs.total;
  const operatingMargin = revenue > 0 ? Math.round((gop / revenue) * 100) : 0;

  const market = getMarket(params.marketId);
  const season = getSeasonMultiplier(params.gameDay);
  const phase = getDayPhase(params.gameHour);

  return {
    gameDay: params.gameDay,
    gameHour: params.gameHour,
    phase,
    season: season.name,
    marketName: market.name,
    demandScore,
    occupancyRate,
    adr,
    revpar,
    roomsAvailable: inventory.rooms,
    roomsSold,
    guestCapacity: inventory.guestCapacity,
    guestsInHouse: inRoom.length,
    arrivalsInProgress: checkingIn.length,
    departuresInProgress: checkingOut.length,
    revenue,
    roomRevenue,
    fbRevenue,
    ancillaryRevenue,
    expenses: costs,
    gop,
    operatingMargin,
    avgSatisfaction,
    starRating,
    compSetAdr: market.compSetAdr,
    arrivalsToday: (params.previousReport?.arrivalsToday || 0),
    departuresToday: (params.previousReport?.departuresToday || 0),
  };
}
