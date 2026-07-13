export type TileType = 'empty' | 'floor' | 'wall' | 'door' | 'window' | 'bed' | 'reception' | 'plant' | 'table' | 'elevator' | 'bathroom' | 'staff' | 'stairs' | 'buffet' | 'restaurant' | 'pool' | 'arcade' | 'spa_tile' | 'power_plant' | 'pipe';

export interface Label {
  id: string;
  x: number;
  y: number;
  text: string;
  meta?: Record<string, any>;
}

export interface Floor {
  level: number;
  name?: string;
  grid: TileType[][];
  labels?: Label[];
  /** Per-cell furniture rotation in degrees (0/90/180/270). Only used for tiles like bed/table/reception etc. */
  rotations?: Record<string, number>; // key = `${x}:${y}`
}

export interface FloorTemplate {
  id: string;
  name: string;
  description?: string;
  grid: TileType[][];
  labels?: Label[];
  isBuiltIn?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetType: 'floors' | 'guests' | 'money' | 'staff';
  targetValue: number;
  unlocked: boolean;
  unlockedAt?: string;
  rarity?: 'bronze' | 'silver' | 'gold';
}

export type ViewMode = '2D' | '3D' | 'Walk';
export type AppMode = 'Design' | 'Management' | 'Analytics' | 'Chain';

export type StaffShift = 'morning' | 'evening' | 'night';

export type StaffTask = 'Idle' | 'Clean Room' | 'Maintain Elevator' | 'Check-in Guests' | 'Patrol' | 'Service VIP';

export interface StaffNPC {
  id: string;
  name: string;
  role: 'receptionist' | 'cleaner' | 'manager';
  salary: number;
  currentTask?: StaffTask;
  shift?: StaffShift;
  shiftSchedule?: StaffShift[];
}

export type GuestSpendingPattern = 'budget' | 'standard' | 'luxury';

export type GuestState = 'wandering' | 'checking-in' | 'going-to-elevator' | 'going-to-room' | 'in-room' | 'checking-out' | 'going-to-elevator-checkout' | 'leaving';

export interface GuestNPC {
  id: string;
  name: string;
  nationality?: string;
  roomAssigned?: string;
  stayDuration: number;
  stayLimitDays?: number;
  spent: number;
  state: GuestState;
  need?: 'hungry' | 'tired' | 'none';
  spendingPattern?: GuestSpendingPattern;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  finalTargetX?: number;
  finalTargetY?: number;
  finalFloorIndex?: number;
  floorIndex: number;
  isVip?: boolean;
  vipNeed?: 'champagne' | 'valet' | 'suite' | 'spa' | 'late checkout' | 'none';
  vipSatisfaction?: number; // 0 to 100
  vipAssignedStaff?: string; // Staff ID currently servicing them
  satisfaction?: number; // For standard guests (0-100)
  feedback?: {
    text: string;
    emoji: string;
    type: 'happy' | 'neutral' | 'angry';
    visibleUntil: number; // Timestamp or game-ticks
  };
  roomCategoryId?: string;
  enrolledInBonusProgram?: boolean;
  checkedOutAt?: string;
  revenueGenerated?: number;
}

export interface RoomRates {
  standard: number;
  suite: number;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  vipMultiplier: number; // multiplier for VIP satisfaction gains and tips (e.g. 1.5)
  bedMultiplier: number; // cost/revenue multiplier for placing standard/suite rooms (e.g. 1.2)
  styleColor: string; // CSS color classes for theme accents
  vipSpawnRate: number; // frequency modifier of VIP guests spawning (e.g. 0.4 for premium brands)
  isCustom?: boolean; // whether it was created by the user
  icon: string;
  color: string;
}

export interface RoomCategory {
  id: string;
  name: string;
  price: number;
  icon: string;
  requiredTiles: TileType[];
  description: string;
  presetTemplateId?: string; // linked layout template id for easy preset applying

  /** Optional structured requirements for residential-style rooms (e.g., 4BR apartments). */
  requiredBedroomUnits?: number; // exact bedroom units (legacy)
  minBedroomUnits?: number; // at least this many bedroom units
  minBathrooms?: number;
  requiresDoorToBedrooms?: boolean;

  /** Heuristic flags for how beds are interpreted for bedroom counting/matching. */
  bedClusterWallSeparation?: boolean;
}


export interface BonusProgram {
  id: string;
  name: string;
  description: string;
  costToActivate: number;
  privileges: string[]; // e.g. ['lateCheckout', 'organicVibe']
  isActive: boolean;
  enrollmentFee: number;
}

export interface OperationsExpenses {
  staffPayroll: number;
  utilities: number;
  electricity: number;
  water: number;
  housekeeping: number;
  maintenance: number;
  marketing: number;
  propertyTax: number;
  incomeTax: number;
  roomTax: number;
  wasteManagement: number;
  security: number;
  staffTraining: number;
  insurance: number;
  total: number;
}

export interface OperationsReport {
  gameDay: number;
  gameHour: number;
  phase: string;
  season: string;
  marketName: string;
  demandScore: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  roomsAvailable: number;
  roomsSold: number;
  guestCapacity: number;
  guestsInHouse: number;
  arrivalsInProgress: number;
  departuresInProgress: number;
  revenue: number;
  roomRevenue: number;
  fbRevenue: number;
  ancillaryRevenue: number;
  expenses: OperationsExpenses;
  gop: number;
  operatingMargin: number;
  avgSatisfaction: number;
  starRating: number;
  compSetAdr: number;
  arrivalsToday: number;
  departuresToday: number;
  inflationRate?: number;
}

export interface HotelData {
  id: string;
  name: string;
  brandId: string;
  floors: Floor[];
  money: number;
  staff: StaffNPC[];
  guests: GuestNPC[];
  roomRates: RoomRates;
  roomCategories?: RoomCategory[];
  bonusPrograms?: BonusProgram[];
  activeBonusProgramId?: string | null;
  totalGuestsServed: number;
  milestones: Milestone[];
  marketId?: string;
  marketingBudget?: number;
  operationsReport?: OperationsReport | null;
  propertyAppreciationRate?: number;
  buildingType?: 'hotel' | 'residences';
  tenants?: TenantNPC[];
  leases?: Lease[];
  apartmentUnits?: ApartmentUnit[];
  maintenanceRequests?: MaintenanceRequest[];
  residenceOperationsReport?: ResidenceOperationsReport | null;
  residenceHistory?: ResidenceOperationsReport[];
  totalResidentsServed?: number;
  rentPrices?: Record<string, number>;
  utilityRates?: Record<string, number>;
  petDepositRate?: number;
  securityDepositMonths?: number;
  lateFeeGraceDays?: number;
  lateFeeRate?: number;
  applicationFee?: number;
}

export interface GuestLedgerEntry {
  id: string;
  guestId: string;
  guestName: string;
  nationality: string;
  isVip: boolean;
  roomCategoryId: string;
  floorIndex: number;
  checkInDay: number;
  checkInHour: number;
  checkOutDay: number;
  checkOutHour: number;
  revenueGenerated: number;
  satisfaction: number;
  finalSatisfaction: number;
}

export interface HotelChain {
  name: string;
  hotels: HotelData[];
  activeHotelId: string;
  customBrands?: Brand[];
  roomCategories?: RoomCategory[];
  bonusPrograms?: BonusProgram[];
}

export interface HotelLocation {
  lat: number;
  lng: number;
  address?: string;
}

export type SceneryItemType =
  | 'park'
  | 'landmark'
  | 'restaurant'
  | 'natural'
  | 'water'
  | 'road'
  | 'poi'
  | 'generic';

export interface SceneryItem {
  id: string;
  type: SceneryItemType;
  lat: number;
  lng: number;
  name?: string;
  placeId?: string;
  score?: number;
}

export interface ScenerySpec {
  center: HotelLocation;
  radiusMeters: number;
  items: SceneryItem[];
  generatedAt: string;
  source: 'google-places' | 'fallback';
}

export interface ViewportSync {
  panOffset: { x: number; y: number };
  zoom: number;
  cameraTarget: { x: number; y: number; z?: number } | null;
  activeFloorIndex: number;
}

export interface SupplyChain {
  inventory: Record<string, number>;
  procurementCosts: Record<string, number>;
}

export interface EmergencyState {
  pipeLeak: boolean;
  powerOutage: boolean;
  activeEmergencyFloor: number | null;
}

export type TenantStatus = 'applied' | 'screening' | 'approved' | 'rejected' | 'active' | 'notice-given' | 'moved-out';

export interface Lease {
  id: string;
  tenantId: string;
  apartmentId: string;
  floorIndex: number;
  startDay: number;
  startHour: number;
  termDays: number;
  monthlyRent: number;
  securityDeposit: number;
  petDeposit: number;
  isPetFriendly: boolean;
  isFurnished: boolean;
  includesUtilities: boolean;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  lateFeeRate: number;
  lateFeeGraceDays: number;
  nextPaymentDay: number;
  lastPaymentDay: number;
  paymentsMissed: number;
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  apartmentId: string;
  floorIndex: number;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'other';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  status: 'open' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  submittedDay: number;
  submittedHour: number;
  assignedStaffId?: string;
  completedDay?: number;
  cost?: number;
  tenantSatisfactionImpact: number;
}

export interface ApartmentUnit {
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
  tenantId?: string;
  leaseId?: string;
}

export interface TenantNPC {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  income: number;
  creditScore: number;
  hasPets: boolean;
  petType?: string;
  moveInDay: number;
  leaseEndDay: number;
  apartmentId: string;
  floorIndex: number;
  status: TenantStatus;
  satisfaction: number;
  maintenanceRequestsCount: number;
  paymentsOnTime: number;
  paymentsLate: number;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  color: string;
}

export interface ResidenceOperationsReport {
  gameDay: number;
  gameHour: number;
  occupancyRate: number;
  vacancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  monthlyRentCollected: number;
  lateFeesCollected: number;
  securityDepositsHeld: number;
  maintenanceCosts: number;
  utilityBillsPaid: number;
  netOperatingIncome: number;
  averageRent: number;
  tenantSatisfaction: number;
  activeTenants: number;
  applicantsThisMonth: number;
  maintenanceRequestsOpen: number;
  maintenanceRequestsCompleted: number;
  evictionsThisMonth: number;
}

