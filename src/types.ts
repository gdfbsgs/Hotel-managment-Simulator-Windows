export type TileType = 'empty' | 'floor' | 'wall' | 'door' | 'window' | 'bed' | 'reception' | 'plant' | 'table' | 'elevator' | 'bathroom' | 'staff' | 'stairs';

export interface Label {
  id: string;
  x: number;
  y: number;
  text: string;
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

export type StaffTask = 'Idle' | 'Clean Room' | 'Maintain Elevator' | 'Check-in Guests' | 'Patrol' | 'Service VIP';

export interface StaffNPC {
  id: string;
  name: string;
  role: 'receptionist' | 'cleaner' | 'manager';
  salary: number;
  currentTask?: StaffTask;
}

export type GuestState = 'wandering' | 'checking-in' | 'going-to-elevator' | 'going-to-room' | 'in-room' | 'checking-out' | 'going-to-elevator-checkout' | 'leaving';

export interface GuestNPC {
  id: string;
  name: string;
  roomAssigned?: string;
  stayDuration: number;
  spent: number;
  state: GuestState;
  need?: 'hungry' | 'tired' | 'none';
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
  housekeeping: number;
  maintenance: number;
  marketing: number;
  propertyTax: number;
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

