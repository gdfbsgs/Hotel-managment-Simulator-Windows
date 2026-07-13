import { Floor, TileType, GuestNPC, StaffNPC, HotelData, RoomCategory, OperationsExpenses, OperationsReport, ResidenceOperationsReport } from './types';
import { countRoomInventory, calculateOperatingCosts, calculateStarRating, calculateDemandScore, getDayPhase, getSeasonMultiplier } from './operations';
import { DEFAULT_ROOM_CATEGORIES } from './db';
import { RESIDENTIAL_ROOM_CATEGORIES } from './residential';

const GRID_SIZE = 20;

export interface ScanApartmentResult {
  id: string;
  label: string;
  floorIndex: number;
  roomCategoryId: string;
  x: number;
  y: number;
  beds: number;
  bathrooms: number;
  hasKitchen: boolean;
  hasBalcony: boolean;
  hasParking: boolean;
  petFriendly: boolean;
  furnished: boolean;
  sqft: number;
  marketRent: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
}

export function scanApartmentsFromFloors(floors: Floor[], roomCategories: RoomCategory[]): ScanApartmentResult[] {
  const cats = roomCategories.length > 0 ? roomCategories : DEFAULT_ROOM_CATEGORIES;
  const apartments: ScanApartmentResult[] = [];
  let apartmentIdCounter = 1;

  floors.forEach((floor, floorIndex) => {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const grid = floor.grid;

    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
    const isWalkable = (x: number, y: number) => {
      if (!inBounds(x, y)) return false;
      const t = grid[y][x];
      return t !== 'empty' && t !== 'wall';
    };

    const floodFill = (startX: number, startY: number): { x: number; y: number }[] => {
      const component: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
      visited[startY][startX] = true;

      const dirs = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      ];

      while (queue.length > 0) {
        const cur = queue.shift()!;
        component.push(cur);
        for (const { dx, dy } of dirs) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (!inBounds(nx, ny)) continue;
          if (visited[ny][nx]) continue;
          if (!isWalkable(nx, ny)) continue;
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
      return component;
    };

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (visited[y][x]) continue;
        if (!isWalkable(x, y)) continue;

        const component = floodFill(x, y);
        const bedCount = component.filter(p => grid[p.y][p.x] === 'bed').length;
        const bathroomCount = component.filter(p => grid[p.y][p.x] === 'bathroom').length;
        const tableCount = component.filter(p => grid[p.y][p.x] === 'table').length;
        const plantCount = component.filter(p => grid[p.y][p.x] === 'plant').length;
        const windowCount = component.filter(p => grid[p.y][p.x] === 'window').length;

        if (bedCount === 0) continue;

        const hasKitchen = tableCount > 0;
        const hasBalcony = windowCount > 0;
        const petFriendly = plantCount > 0;
        const furnished = tableCount > 0 && plantCount > 0;
        const sqft = Math.round(component.length * 40);
        const label = `Apt ${apartmentIdCounter}`;
        apartmentIdCounter++;

        const category = evaluateApartmentCategory(bedCount, bathroomCount, hasKitchen, hasBalcony, cats);
        const marketRent = category ? category.price : 800;

        apartments.push({
          id: `apt-${floorIndex}-${x}-${y}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          label,
          floorIndex,
          roomCategoryId: category?.id || cats[0]?.id || 'rc-studio',
          x: component[0]?.x || x,
          y: component[0]?.y || y,
          beds: bedCount,
          bathrooms: Math.max(1, bathroomCount),
          hasKitchen,
          hasBalcony,
          hasParking: false,
          petFriendly,
          furnished,
          sqft,
          marketRent,
          status: 'vacant',
        });
      }
    }
  });

  return apartments;
}

function evaluateApartmentCategory(beds: number, bathrooms: number, hasKitchen: boolean, hasBalcony: boolean, categories: RoomCategory[]): RoomCategory | undefined {
  const residential = categories.length > 0 ? categories : RESIDENTIAL_ROOM_CATEGORIES;
  let best: RoomCategory | undefined;
  let bestScore = -1;

  for (const cat of residential) {
    const required = cat.requiredTiles || [];
    const hasBed = required.includes('bed');
    const hasBath = required.includes('bathroom');
    const hasTable = required.includes('table');
    const hasPlant = required.includes('plant');
    const minBaths = cat.minBathrooms;

    const meetsTiles = (!hasBed || beds > 0) && (!hasBath || bathrooms > 0) && (!hasTable || hasKitchen) && (!hasPlant || hasBalcony);
    const meetsBaths = !minBaths || bathrooms >= minBaths;

    if (meetsTiles && meetsBaths) {
      const score = (beds + bathrooms) + (hasKitchen ? 1 : 0) + (hasBalcony ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = cat;
      }
    }
  }

  return best;
}

export function generateTenantName(): string {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

export function generateTenantOccupation(): string {
  const occupations = ['Software Engineer', 'Teacher', 'Nurse', 'Accountant', 'Marketing Manager', 'Consultant', 'Designer', 'Analyst', 'Sales Rep', 'Developer', 'Doctor', 'Architect', 'Chef', 'Writer', 'Photographer'];
  return occupations[Math.floor(Math.random() * occupations.length)];
}

export function calculateTenantSatisfaction(tenant: any, apartment: any, buildingType: string): number {
  let sat = 70;

  if (apartment.furnished) sat += 5;
  if (apartment.hasBalcony) sat += 5;
  if (apartment.hasKitchen) sat += 3;
  if (apartment.petFriendly && tenant.hasPets) sat += 8;
  if (apartment.parking) sat += 5;

  const rentRatio = apartment.marketRent / (tenant.income * 0.3);
  if (rentRatio > 1.2) sat -= 15;
  else if (rentRatio > 1.0) sat -= 8;
  else if (rentRatio < 0.7) sat += 5;

  return Math.round(Math.min(100, Math.max(0, sat)));
}

export function calculateResidenceOperatingCosts(params: {
  apartments: any[];
  tenants: any[];
  maintenanceRequests: any[];
  staff: StaffNPC[];
  inventory: ReturnType<typeof countRoomInventory>;
  inflationRate?: number;
  revenue?: number;
}): OperationsExpenses {
  const inflationRate = params.inflationRate ?? 0;
  const inflationMultiplier = 1 + inflationRate;
  const occupiedCount = params.apartments.filter(a => a.status === 'occupied').length;
  const vacantCount = params.apartments.filter(a => a.status === 'vacant').length;

  const staffPayroll = Math.round(params.staff.reduce((acc, s) => acc + s.salary, 0) * inflationMultiplier);
  const maintenance = Math.round((params.maintenanceRequests.filter(m => m.status === 'open' || m.status === 'in-progress').length * 50 + params.apartments.length * 10) * inflationMultiplier);
  const utilities = Math.round((params.inventory.totalTiles * 0.2 + params.inventory.floors * 60) * inflationMultiplier);
  const propertyTax = Math.round((params.inventory.floors * 40 + params.apartments.length * 8) * inflationMultiplier);
  const incomeTax = Math.round((params.revenue || 0) * 0.12 * inflationMultiplier);
  const insurance = Math.round((params.apartments.length * 5 + 50) * inflationMultiplier);
  const marketing = Math.round(vacantCount * 25 * inflationMultiplier);
  const security = Math.round((params.inventory.floors * 25 + params.apartments.length * 3) * inflationMultiplier);
  const staffTraining = Math.round(params.staff.length * 15 * inflationMultiplier);
  const total = staffPayroll + maintenance + utilities + propertyTax + incomeTax + insurance + marketing + security + staffTraining;

  return {
    staffPayroll,
    utilities,
    electricity: 0,
    water: 0,
    housekeeping: 0,
    maintenance,
    marketing,
    propertyTax,
    incomeTax,
    roomTax: 0,
    wasteManagement: 0,
    security,
    staffTraining,
    insurance,
    total,
  };
}

export function buildResidenceOperationsReport(params: {
  floors: Floor[];
  tenants: any[];
  leases: any[];
  apartmentUnits: any[];
  maintenanceRequests: any[];
  staff: StaffNPC[];
  gameDay: number;
  gameHour: number;
  previousReport?: ResidenceOperationsReport | null;
  inflationRate?: number;
  buildingType?: string;
}): ResidenceOperationsReport {
  const totalUnits = params.apartmentUnits.length;
  const occupiedUnits = params.apartmentUnits.filter(a => a.status === 'occupied').length;
  const vacantUnits = params.apartmentUnits.filter(a => a.status === 'vacant').length;
  const maintenanceUnits = params.apartmentUnits.filter(a => a.status === 'maintenance').length;

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const vacancyRate = totalUnits > 0 ? Math.round((vacantUnits / totalUnits) * 100) : 0;

  const activeTenants = params.tenants.filter(t => t.status === 'active').length;
  const tenantSatisfaction = activeTenants > 0 ? Math.round(params.tenants.reduce((acc, t) => acc + (t.satisfaction || 75), 0) / activeTenants) : 75;

  let monthlyRentCollected = 0;
  params.leases.forEach(lease => {
    if (lease.status === 'active') {
      monthlyRentCollected += lease.monthlyRent;
    }
  });

  const lateFeesCollected = params.tenants.filter(t => t.paymentsLate > 0).length * 50;
  const securityDepositsHeld = params.leases.filter(l => l.status === 'active').reduce((acc, l) => acc + l.securityDeposit, 0);

  const openMaintenance = params.maintenanceRequests.filter(m => m.status === 'open' || m.status === 'in-progress').length;
  const completedMaintenance = params.maintenanceRequests.filter(m => m.status === 'completed').length;
  const maintenanceCosts = params.maintenanceRequests
    .filter(m => m.status === 'completed')
    .reduce((acc, m) => acc + (m.cost || 0), 0);

  const inventory = countRoomInventory(params.floors);
  const costs = calculateResidenceOperatingCosts({
    apartments: params.apartmentUnits,
    tenants: params.tenants,
    maintenanceRequests: params.maintenanceRequests,
    staff: params.staff,
    inventory,
    inflationRate: params.inflationRate ?? 0,
    revenue: monthlyRentCollected,
  });

  const netOperatingIncome = monthlyRentCollected + lateFeesCollected - costs.total;
  const averageRent = occupiedUnits > 0 ? Math.round(monthlyRentCollected / occupiedUnits) : 0;

  const evictionsThisMonth = params.tenants.filter(t => t.status === 'notice-given').length;

  return {
    gameDay: params.gameDay,
    gameHour: params.gameHour,
    occupancyRate,
    vacancyRate,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    monthlyRentCollected,
    lateFeesCollected,
    securityDepositsHeld,
    maintenanceCosts,
    utilityBillsPaid: costs.utilities,
    netOperatingIncome,
    averageRent,
    tenantSatisfaction,
    activeTenants,
    applicantsThisMonth: 0,
    maintenanceRequestsOpen: openMaintenance,
    maintenanceRequestsCompleted: completedMaintenance,
    evictionsThisMonth,
  };
}

export function processResidenceTick(params: {
  floors: Floor[];
  tenants: any[];
  leases: any[];
  apartmentUnits: any[];
  maintenanceRequests: any[];
  staff: StaffNPC[];
  gameDay: number;
  gameHour: number;
  money: number;
  buildingType?: string;
  previousReport?: ResidenceOperationsReport | null;
  inflationRate?: number;
  applicationFee?: number;
  petDepositRate?: number;
  securityDepositMonths?: number;
  lateFeeGraceDays?: number;
  lateFeeRate?: number;
  rentPrices?: Record<string, number>;
  utilityRates?: Record<string, number>;
}) {
  const {
    floors,
    tenants,
    leases,
    apartmentUnits,
    maintenanceRequests,
    staff,
    gameDay,
    gameHour,
    money,
    buildingType,
    previousReport,
    inflationRate,
    applicationFee,
    petDepositRate,
    securityDepositMonths,
    lateFeeGraceDays,
    lateFeeRate,
    rentPrices,
    utilityRates,
  } = params;

  const inflation = inflationRate ?? 0;
  const inflationMultiplier = 1 + inflation;

  let updatedTenants = [...tenants];
  let updatedLeases = [...leases];
  let updatedUnits = [...apartmentUnits];
  let updatedRequests = [...maintenanceRequests];
  let extraMoney = 0;
  let totalResidentsServed = 0;

  for (const tenant of updatedTenants) {
    if (tenant.status === 'active') {
      tenant.satisfaction = Math.max(0, Math.min(100, (tenant.satisfaction || 75) + (Math.random() - 0.5) * 2));

      const lease = updatedLeases.find(l => l.tenantId === tenant.id && l.status === 'active');
      if (lease) {
        const daysRemaining = lease.termDays - (gameDay - lease.startDay);
        if (daysRemaining <= 0) {
          tenant.status = 'notice-given';
        }
      }

      if (Math.random() < 0.01) {
        const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other'];
        const priorities: Array<'low' | 'medium' | 'high' | 'emergency'> = ['low', 'medium', 'high', 'emergency'];
        updatedRequests.push({
          id: `maint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          tenantId: tenant.id,
          apartmentId: tenant.apartmentId,
          floorIndex: tenant.floorIndex,
          category: categories[Math.floor(Math.random() * categories.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          description: 'Maintenance needed',
          status: 'open',
          submittedDay: gameDay,
          submittedHour: gameHour,
          tenantSatisfactionImpact: -5,
        });
      }
    }
  }

  const activeLeases = updatedLeases.filter(l => l.status === 'active');
  for (const lease of activeLeases) {
    const rent = lease.monthlyRent;
    const daysLate = gameDay - lease.lastPaymentDay;
    if (daysLate > (lateFeeGraceDays || 5)) {
      const lateFee = Math.round(rent * (lateFeeRate || 0.05));
      extraMoney += lateFee;
    } else {
      extraMoney += rent;
    }
    lease.lastPaymentDay = gameDay;
    lease.nextPaymentDay = gameDay + 30;
  }

  const report = buildResidenceOperationsReport({
    floors,
    tenants: updatedTenants,
    leases: updatedLeases,
    apartmentUnits: updatedUnits,
    maintenanceRequests: updatedRequests,
    staff,
    gameDay,
    gameHour,
    previousReport,
    inflationRate: inflation,
    buildingType,
  });

  return {
    tenants: updatedTenants,
    leases: updatedLeases,
    apartmentUnits: updatedUnits,
    maintenanceRequests: updatedRequests,
    residenceOperationsReport: report,
    money: money + extraMoney,
    totalResidentsServed: totalResidentsServed + activeLeases.length,
  };
}
