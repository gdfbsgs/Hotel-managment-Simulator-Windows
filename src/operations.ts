import { Brand, Floor, GuestNPC, OperationsReport, StaffNPC, RoomCategory, TileType } from './types';

const GRID_SIZE = 20;
const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
const isBed = (grid: TileType[][], x: number, y: number) => inBounds(x, y) && grid[y][x] === 'bed';

const clusterToBedroomUnits = (clusterSize: number) => {
  if (clusterSize <= 0) return 0;
  if (clusterSize === 1) return 1;
  if (clusterSize === 2) return 1;
  return Math.ceil(clusterSize / 2);
};

export function countBedUnitsInGrid(grid: TileType[][]) {
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  let units = 0;
  const dirs = [
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!isBed(grid, x, y) || visited[y][x]) continue;
      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      visited[y][x] = true;
      let clusterSize = 0;
      while (queue.length) {
        const cur = queue.shift()!;
        clusterSize++;
        for (const { dx, dy } of dirs) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (!inBounds(nx, ny)) continue;
          if (visited[ny][nx]) continue;
          if (!isBed(grid, nx, ny)) continue;
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
      units += clusterToBedroomUnits(clusterSize);
    }
  }
  return units;
}

export const DEFAULT_ROOM_CATEGORIES_FALLBACK: RoomCategory[] = [
  { id: 'rc-standard', name: 'Standard Room', price: 50, icon: '🛏️', requiredTiles: ['bed'], description: 'Standard room' },
  { id: 'rc-executive', name: 'Executive Suite', price: 120, icon: '👑', requiredTiles: ['bed', 'plant', 'bathroom'], description: 'Executive suite' },
  { id: 'rc-penthouse', name: 'Royal Penthouse', price: 240, icon: '🏰', requiredTiles: ['bed', 'plant', 'bathroom', 'table', 'window'], description: 'Penthouse' },
];

function evaluateFloorRoomCategory(floor: Floor, categories: RoomCategory[]): RoomCategory {
  if (!floor) return categories[0];

  const GRID_H = floor.grid.length;
  const GRID_W = floor.grid[0]?.length || 0;

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
  const gridAt = (x: number, y: number) => floor.grid[y][x];

  const tileCounts: Record<string, number> = {};
  floor.grid.forEach((row) =>
    row.forEach((tile) => {
      if (tile !== 'empty') tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    })
  );

  const countBathrooms = () => tileCounts['bathroom'] || 0;

  const isBed = (x: number, y: number) => gridAt(x, y) === 'bed';
  const isWall = (x: number, y: number) => gridAt(x, y) === 'wall';
  const isDoor = (x: number, y: number) => gridAt(x, y) === 'door';
  const isHallway = (x: number, y: number) => gridAt(x, y) === 'floor';

  const floodFillBeds = () => {
    const visited = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(false));
    const comps: Array<Array<{ x: number; y: number }>> = [];

    const dirs = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!isBed(x, y) || visited[y][x]) continue;
        const comp: Array<{ x: number; y: number }> = [];
        const queue: Array<{ x: number; y: number }> = [{ x, y }];
        visited[y][x] = true;

        while (queue.length) {
          const cur = queue.shift()!;
          comp.push(cur);
          for (const { dx, dy } of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (!inBounds(nx, ny)) continue;
            if (visited[ny][nx]) continue;
            if (!isBed(nx, ny)) continue;
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
        comps.push(comp);
      }
    }

    return comps;
  };

  // bedroom unit rule:
  // - cluster size 1 => 1 bedroom
  // - cluster size 2 => 1 bedroom (2 adjacent bed tiles = 1 bedroom)
  // - cluster size > 2 => ceil(size/2)
  const clusterToBedroomUnits = (clusterSize: number) => {
    if (clusterSize <= 0) return 0;
    if (clusterSize === 1) return 1;
    if (clusterSize === 2) return 1;
    return Math.ceil(clusterSize / 2);
  };

  const computeBedInfo = () => {
    const comps = floodFillBeds();
    const bedroomUnits = comps.reduce((acc, c) => acc + clusterToBedroomUnits(c.length), 0);
    return { comps, bedroomUnits, bedClusterCount: comps.length };
  };

  const requiresDoorToBedroomsOk = () => {
    const bedInfo = computeBedInfo();
    if (bedInfo.bedClusterCount === 0) return false;

    let hasDoorAdjacentToBedroom = false;
    let hasDoorAdjacentToHallway = false;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!isDoor(x, y)) continue;

        const neighbors = [
          { nx: x - 1, ny: y },
          { nx: x + 1, ny: y },
          { nx: x, ny: y - 1 },
          { nx: x, ny: y + 1 },
        ];

        for (const { nx, ny } of neighbors) {
          if (!inBounds(nx, ny)) continue;
          if (isBed(nx, ny)) hasDoorAdjacentToBedroom = true;
          if (isHallway(nx, ny)) hasDoorAdjacentToHallway = true;
        }
      }
    }

    // If any door is adjacent to a hallway, do a simplified reachability check to any bed without crossing walls.
    const doorAdjacentHallwayTiles: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!isDoor(x, y)) continue;
        const neighbors = [
          { nx: x - 1, ny: y },
          { nx: x + 1, ny: y },
          { nx: x, ny: y - 1 },
          { nx: x, ny: y + 1 },
        ];
        for (const { nx, ny } of neighbors) {
          if (!inBounds(nx, ny)) continue;
          if (isHallway(nx, ny)) doorAdjacentHallwayTiles.push({ x: nx, y: ny });
        }
      }
    }

    const hasReachableBed = (() => {
      if (doorAdjacentHallwayTiles.length === 0) return false;
      const visited = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(false));
      const queue: Array<{ x: number; y: number }> = [];

      for (const t of doorAdjacentHallwayTiles) {
        if (!inBounds(t.x, t.y)) continue;
        visited[t.y][t.x] = true;
        queue.push({ x: t.x, y: t.y });
      }

      const dirs = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
      ];

      while (queue.length) {
        const cur = queue.shift()!;
        if (isBed(cur.x, cur.y)) return true;

        for (const { dx, dy } of dirs) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (!inBounds(nx, ny)) continue;
          if (visited[ny][nx]) continue;
          if (isWall(nx, ny)) continue;
          // traverse non-empty walkable areas: hallway tiles + doors + beds (endpoints)
          const tile = gridAt(nx, ny);
          if (tile === 'empty' || tile === 'wall') continue;
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }

      return false;
    })();

    return (hasDoorAdjacentToBedroom && hasDoorAdjacentToHallway) || hasReachableBed;
  };

  const requiresBedroomWallSeparationOk = () => {
    const bedInfo = computeBedInfo();
    if (bedInfo.bedClusterCount === 0) return false;
    // Heuristic: at least 2 bed clusters separated by walls.
    return bedInfo.bedClusterCount >= 2;
  };

  let best = categories.find((c) => c.id === 'rc-standard') || categories[0];
  let maxPrice = best?.price || 0;

  categories.forEach((cat) => {
    const metBasicTiles = (cat.requiredTiles || []).every((req) => (tileCounts[req as TileType] || 0) > 0);
    if (!metBasicTiles) return;

    if (typeof cat.requiredBedroomUnits === 'number') {
      const bedInfo = computeBedInfo();
      if (bedInfo.bedroomUnits !== cat.requiredBedroomUnits) return;
    }

    if (typeof cat.minBedroomUnits === 'number') {
      const bedInfo = computeBedInfo();
      if (bedInfo.bedroomUnits < cat.minBedroomUnits) return;
    }

    if (typeof cat.minBathrooms === 'number') {
      if (countBathrooms() < cat.minBathrooms) return;
    }

    if (cat.requiresDoorToBedrooms) {
      if (!requiresDoorToBedroomsOk()) return;
    }

    if (cat.bedClusterWallSeparation) {
      if (!requiresBedroomWallSeparationOk()) return;
    }

    if (cat.price > maxPrice) {
      best = cat;
      maxPrice = cat.price;
    }
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
  competitorAdr?: number;
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
    competitorAdr: 165,
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
    competitorAdr: 195,
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
    competitorAdr: 130,
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
    competitorAdr: 148,
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
    competitorAdr: 175,
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
  let bedUnits = 0;
  let bathrooms = 0;
  let elevators = 0;
  let reception = 0;
  let totalTiles = 0;

  floors.forEach((floor) => {
    floor.grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell !== 'empty') totalTiles++;
        if (cell === 'bathroom') bathrooms++;
        if (cell === 'elevator') elevators++;
        if (cell === 'reception') reception++;
      });
    });
    bedUnits += countBedUnitsInGrid(floor.grid);
  });

  const rooms = bedUnits;
  const guestCapacity = bedUnits * 2;

  return { beds: bedUnits, rooms, guestCapacity, bathrooms, elevators, reception, totalTiles, floors: floors.length };
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
  hotelAdr?: number;
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

  const competitorAdr = (market as any).competitorAdr ?? market.compSetAdr * 0.92;
  const hotelAdr = params.hotelAdr ?? 0;
  if (competitorAdr > 0 && hotelAdr > 0 && hotelAdr > competitorAdr * 1.15) {
    demand *= 0.8;
  } else if (competitorAdr > 0 && hotelAdr > 0 && hotelAdr < competitorAdr * 0.85) {
    demand *= 1.12;
  }

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
  // Increased overall spawn pressure; keeps cap-based balancing in getGuestSpawnChance usage.
  let phaseMultiplier = 0.06;

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
  inflationRate?: number;
  energyUsage?: number;
}) {
  const market = getMarket(params.marketId);
  const inflationRate = params.inflationRate ?? 0;
  const inflationMultiplier = 1 + inflationRate;
  const energyUsage = params.energyUsage ?? 0;
  const staffPayroll = Math.round(params.staff.reduce((acc, s) => acc + s.salary, 0) * inflationMultiplier);
  const utilities = Math.round(
    ((params.inventory.totalTiles * 0.2 + params.inventory.floors * 60) * market.utilityRate + energyUsage * 0.3) * inflationMultiplier
  );
  const housekeeping = Math.round((params.guestCount * 6 + params.inventory.rooms * 1) * inflationMultiplier);
  const maintenance = Math.round((params.inventory.elevators * 20 + params.inventory.floors * 15) * inflationMultiplier);
  const marketing = Math.round(params.marketingBudget * 0.6);
  const propertyTax = Math.round((params.inventory.floors * 40 + params.inventory.rooms * 6) * inflationMultiplier);
  const insurance = Math.round((params.inventory.rooms * 3 + 60) * inflationMultiplier);

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
  inflationRate?: number;
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
    hotelAdr: params.previousReport?.adr,
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
    inflationRate: params.inflationRate ?? 0,
    energyUsage: (params.previousReport?.expenses?.utilities ?? 0) * 0.1,
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
