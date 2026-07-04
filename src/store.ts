import { create } from 'zustand';
import { Floor, TileType, ViewMode, Label, AppMode, StaffNPC, GuestNPC, HotelData, StaffTask, RoomRates, GuestState, FloorTemplate, Milestone, Brand, HotelChain, RoomCategory, BonusProgram, OperationsReport } from './types';
import { PRESETS } from './presets';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './firebase';
import confetti from 'canvas-confetti';
import { buildOperationsReport, getDayPhase, getGuestSpawnChance, calculateDemandScore, calculateStarRating, countRoomInventory } from './operations';

const GRID_SIZE = 20;
const LOCAL_SAVE_KEY = 'archhotel_windows_save';

const createEmptyGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty'));

export const DEFAULT_BRANDS: Brand[] = [
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
];

const getInitialMilestones = (): Milestone[] => [
  { id: 'm-floors-2', title: 'Growing Upward', description: 'Reach 2 hotel floors.', targetType: 'floors', targetValue: 2, unlocked: false, rarity: 'bronze' },
  { id: 'm-floors-5', title: 'High Rise', description: 'Reach 5 hotel floors.', targetType: 'floors', targetValue: 5, unlocked: false, rarity: 'silver' },
  { id: 'm-floors-10', title: 'Deca-Structure', description: 'Reach 10 hotel floors.', targetType: 'floors', targetValue: 10, unlocked: false, rarity: 'gold' },
  { id: 'm-guests-10', title: 'First Guests', description: 'Serve 10 total guests.', targetType: 'guests', targetValue: 10, unlocked: false, rarity: 'bronze' },
  { id: 'm-guests-50', title: 'Popular Spot', description: 'Serve 50 total guests.', targetType: 'guests', targetValue: 50, unlocked: false, rarity: 'silver' },
  { id: 'm-guests-100', title: 'Five-Star Legend', description: 'Serve 100 total guests.', targetType: 'guests', targetValue: 100, unlocked: false, rarity: 'gold' },
  { id: 'm-money-50k', title: 'Golden Vault', description: 'Amass $50,000 in your bank.', targetType: 'money', targetValue: 50000, unlocked: false, rarity: 'gold' },
  { id: 'm-staff-5', title: 'Team Player', description: 'Hire 5 or more staff members.', targetType: 'staff', targetValue: 5, unlocked: false, rarity: 'bronze' },
];

const syncActiveHotelHelper = (state: any) => {
  return state.hotels.map((h: HotelData) => {
    if (h.id === state.activeHotelId) {
      return {
        ...h,
        floors: state.floors,
        money: state.money,
        staff: state.staff,
        guests: state.guests,
        roomRates: state.roomRates,
        roomCategories: state.roomCategories,
        bonusPrograms: state.bonusPrograms,
        activeBonusProgramId: state.activeBonusProgramId,
        totalGuestsServed: state.totalGuestsServed,
        milestones: state.milestones,
        marketId: state.marketId,
        marketingBudget: state.marketingBudget,
        operationsReport: state.operationsReport,
      };
    }
    return h;
  });
};

function checkMilestones(state: any, set: any) {
  let changed = false;
  let newlyUnlocked: Milestone | null = null;
  
  const currentFloorsCount = state.floors.length;
  const currentGuestsCount = state.totalGuestsServed || 0;
  const currentMoney = state.money;
  const currentStaffCount = state.staff.length;

  const updatedMilestones = state.milestones.map((m: Milestone) => {
    if (m.unlocked) return m;

    let conditionMet = false;
    if (m.targetType === 'floors' && currentFloorsCount >= m.targetValue) conditionMet = true;
    if (m.targetType === 'guests' && currentGuestsCount >= m.targetValue) conditionMet = true;
    if (m.targetType === 'money' && currentMoney >= m.targetValue) conditionMet = true;
    if (m.targetType === 'staff' && currentStaffCount >= m.targetValue) conditionMet = true;

    if (conditionMet) {
      changed = true;
      newlyUnlocked = {
        ...m,
        unlocked: true,
        unlockedAt: new Date().toLocaleTimeString()
      };
      return newlyUnlocked;
    }
    return m;
  });

  if (changed && newlyUnlocked) {
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error('Confetti failed to trigger', e);
    }
    
    set({
      milestones: updatedMilestones,
      activeMilestoneNotification: newlyUnlocked
    });
  }
}

export const DEFAULT_ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: 'rc-standard',
    name: 'Standard Room',
    price: 50,
    icon: '🛏️',
    requiredTiles: ['bed'],
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

export const DEFAULT_BONUS_PROGRAMS: BonusProgram[] = [
  {
    id: 'bp-silver',
    name: 'Silver Elite Club',
    description: 'Enhance standard traveler satisfaction and increase nightly earnings through early-bird signup fees.',
    costToActivate: 2500,
    privileges: ['hygieneElite'],
    isActive: false,
    enrollmentFee: 20
  },
  {
    id: 'bp-gold',
    name: 'Gold Horizon Club',
    description: 'Enables late checkouts for extended nightly rates, doubles natural decor appreciation, and boosts VIP checkouts.',
    costToActivate: 5000,
    privileges: ['lateCheckout', 'organicVibe', 'vipWelcomeGift'],
    isActive: false,
    enrollmentFee: 50
  }
];

export const evaluateFloorRoomCategory = (floor: Floor, categories: RoomCategory[]): RoomCategory => {
  if (!floor) return categories[0];
  const tileCounts: Record<string, number> = {};
  floor.grid.forEach(row => row.forEach(tile => {
    if (tile !== 'empty') {
      tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    }
  }));

  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_ROOM_CATEGORIES;
  let bestCategory = availableCategories.find(c => c.id === 'rc-standard') || availableCategories[0];
  let maxPrice = bestCategory ? bestCategory.price : 0;

  availableCategories.forEach(cat => {
    const met = (cat.requiredTiles || []).every(reqTile => (tileCounts[reqTile] || 0) > 0);
    if (met && cat.price > maxPrice) {
      bestCategory = cat;
      maxPrice = cat.price;
    }
  });

  return bestCategory;
};

const getInitialTemplates = (): FloorTemplate[] => {
  const builtIn: FloorTemplate[] = [
    {
      id: 'template-lobby',
      name: 'Ground Lobby Layout',
      description: 'Lobby layout featuring a reception counter, cafe tables, and plants.',
      grid: PRESETS['small-hotel'][0].grid,
      labels: PRESETS['small-hotel'][0].labels || [],
      isBuiltIn: true
    },
    {
      id: 'template-standard',
      name: 'Standard Room Layout',
      description: 'Double rooms with en-suite spaces and central elevator corridor.',
      grid: PRESETS['small-hotel'][1].grid,
      labels: PRESETS['small-hotel'][1].labels || [],
      isBuiltIn: true
    },
    {
      id: 'template-luxury',
      name: 'Luxury Penthouse Layout',
      description: 'Large suite layout with private dining room, bedroom, and lobby area.',
      grid: PRESETS['luxury-suite'][0].grid,
      labels: PRESETS['luxury-suite'][0].labels || [],
      isBuiltIn: true
    },
    {
      id: 'template-empty',
      name: 'Clean Empty Layout',
      description: 'A blank canvas with standard flooring ready for fully custom construction.',
      grid: createEmptyGrid(),
      labels: [],
      isBuiltIn: true
    }
  ];

  try {
    const custom = localStorage.getItem('archhotel_custom_templates');
    if (custom) {
      const parsed = JSON.parse(custom);
      return [...builtIn, ...parsed];
    }
  } catch (e) {
    console.error('Failed to parse custom floor templates', e);
  }
  return builtIn;
};

function applyLoadedHotelData(data: Record<string, unknown>, set: (partial: Record<string, unknown>) => void): boolean {
  if (data.hotels && Array.isArray(data.hotels) && data.hotels.length > 0) {
    const activeId = (data.activeHotelId as string) || (data.hotels[0] as HotelData).id;
    const activeHotel = (data.hotels as HotelData[]).find((h) => h.id === activeId) || (data.hotels[0] as HotelData);
    set({
      chainName: (data.chainName as string) || 'Grand Horizon Hotels',
      hotels: data.hotels as HotelData[],
      activeHotelId: activeId,
      customBrands: (data.customBrands as Brand[]) || [],
      activeHotelBrandId: activeHotel.brandId || 'b-budget',
      floors: activeHotel.floors,
      money: activeHotel.money ?? 15000,
      staff: activeHotel.staff || [],
      guests: activeHotel.guests || [],
      roomRates: activeHotel.roomRates || { standard: 50, suite: 120 },
      roomCategories: activeHotel.roomCategories || DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: activeHotel.bonusPrograms || DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: activeHotel.activeBonusProgramId || null,
      totalGuestsServed: activeHotel.totalGuestsServed || 0,
      milestones: activeHotel.milestones || getInitialMilestones(),
      marketId: activeHotel.marketId || 'urban-business',
      marketingBudget: activeHotel.marketingBudget ?? 75,
      operationsReport: activeHotel.operationsReport || null,
      gameDay: (data.gameDay as number) || 1,
      gameHour: (data.gameHour as number) || 8,
      operationsHistory: (data.operationsHistory as OperationsReport[]) || [],
      activeFloorIndex: 0,
    });
    return true;
  }

  if (data.floors) {
    const legacyHotel: HotelData = {
      id: 'h-legacy',
      name: (data.name as string) || 'Grand Plaza Resort',
      brandId: 'b-budget',
      floors: data.floors as Floor[],
      money: (data.money as number) || 10000,
      staff: (data.staff as StaffNPC[]) || [],
      guests: (data.guests as GuestNPC[]) || [],
      roomRates: (data.roomRates as RoomRates) || { standard: 50, suite: 120 },
      totalGuestsServed: (data.totalGuestsServed as number) || 0,
      milestones: (data.milestones as Milestone[]) || getInitialMilestones(),
    };
    set({
      chainName: 'Legacy Hospitality Chain',
      hotels: [legacyHotel],
      activeHotelId: 'h-legacy',
      activeHotelBrandId: 'b-budget',
      customBrands: [],
      floors: legacyHotel.floors,
      money: legacyHotel.money,
      staff: legacyHotel.staff,
      guests: legacyHotel.guests,
      roomRates: legacyHotel.roomRates,
      totalGuestsServed: legacyHotel.totalGuestsServed,
      milestones: legacyHotel.milestones,
      activeFloorIndex: 0,
    });
    return true;
  }

  return false;
}

interface HotelStore {
  user: User | null;
  floors: Floor[];
  money: number;
  staff: StaffNPC[];
  guests: GuestNPC[];
  activeFloorIndex: number;
  viewMode: ViewMode;
  appMode: AppMode;
  selectedTool: TileType | 'eraser' | 'text';
  roomRates: RoomRates;
  floorTemplates: FloorTemplate[];
  totalGuestsServed: number;
  milestones: Milestone[];
  activeMilestoneNotification: Milestone | null;
  dismissMilestoneNotification: () => void;
  
  // Chain-level state
  chainName: string;
  hotels: HotelData[];
  activeHotelId: string;
  customBrands: Brand[];
  activeHotelBrandId: string;

  gameDay: number;
  gameHour: number;
  marketId: string;
  marketingBudget: number;
  operationsReport: OperationsReport | null;
  operationsHistory: OperationsReport[];

  // Chain-level actions
  setChainName: (name: string) => void;
  setActiveHotel: (hotelId: string) => void;
  createHotel: (name: string, brandId: string) => void;
  addHotel: (name: string, brandId: string) => void;
  createCustomBrand: (brand: Brand) => void;
  deleteHotel: (hotelId: string) => void;
  updateActiveHotelName: (newName: string) => void;
  updateHotelName: (hotelId: string, newName: string) => void;
  updateHotelBrand: (hotelId: string, brandId: string) => void;
  setMarket: (marketId: string) => void;
  setMarketingBudget: (amount: number) => void;
  
  setUser: (user: User | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  saveToCloud: () => Promise<void>;
  loadFromCloud: (uid: string) => Promise<void>;
  saveToLocal: () => boolean;
  loadFromLocal: () => boolean;

  hireStaff: (role: StaffNPC['role']) => void;
  assignTask: (staffId: string, task: StaffTask) => void;
  setRoomRate: (type: 'standard' | 'suite', rate: number) => void;
  addMoney: (amount: number) => void;
  tickNPCs: () => void;
  processGuests: () => void;
  serviceVipGuest: (guestId: string, staffId: string) => void;

  setTile: (x: number, y: number, type: TileType | 'eraser') => void;
  addLabel: (floorIndex: number, label: Label) => void;
  removeLabel: (floorIndex: number, id: string) => void;
  addFloor: () => void;
  setActiveFloor: (index: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setAppMode: (mode: AppMode) => void;
  setSelectedTool: (tool: TileType | 'eraser' | 'text') => void;
  loadPreset: (presetId: string) => void;
  resetAll: () => void;

  saveFloorTemplate: (name: string, description?: string) => void;
  loadFloorTemplate: (templateId: string) => void;
  deleteFloorTemplate: (templateId: string) => void;

  roomCategories: RoomCategory[];
  bonusPrograms: BonusProgram[];
  activeBonusProgramId: string | null;
  createRoomCategory: (cat: RoomCategory) => void;
  updateRoomCategoryPrice: (id: string, price: number) => void;
  deleteRoomCategory: (id: string) => void;
  createBonusProgram: (program: BonusProgram) => void;
  activateBonusProgram: (id: string | null) => void;
  deleteBonusProgram: (id: string) => void;
}

export const useHotelStore = create<HotelStore>((set, get) => ({
  user: null,
  floors: JSON.parse(JSON.stringify(PRESETS['small-hotel'])),
  money: 15000,
  staff: [
    { id: 's-receptionist-1', name: 'Alice (Receptionist)', role: 'receptionist', salary: 100, currentTask: 'Check-in Guests' },
    { id: 's-cleaner-1', name: 'Bob (Cleaner)', role: 'cleaner', salary: 50, currentTask: 'Clean Room' }
  ],
  guests: [],
  activeFloorIndex: 0,
  viewMode: '2D',
  appMode: 'Design',
  selectedTool: 'floor',
  roomRates: { standard: 50, suite: 120 },
  roomCategories: DEFAULT_ROOM_CATEGORIES,
  bonusPrograms: DEFAULT_BONUS_PROGRAMS,
  activeBonusProgramId: null,
  floorTemplates: getInitialTemplates(),
  totalGuestsServed: 0,
  milestones: getInitialMilestones(),
  activeMilestoneNotification: null,
  dismissMilestoneNotification: () => set({ activeMilestoneNotification: null }),

  chainName: 'Grand Horizon Hotels',
  hotels: [
    {
      id: 'h-1',
      name: 'Grand Plaza Resort',
      brandId: 'b-budget',
      floors: JSON.parse(JSON.stringify(PRESETS['small-hotel'])),
      money: 15000,
      staff: [
        { id: 's-receptionist-1', name: 'Alice (Receptionist)', role: 'receptionist', salary: 100, currentTask: 'Check-in Guests' },
        { id: 's-cleaner-1', name: 'Bob (Cleaner)', role: 'cleaner', salary: 50, currentTask: 'Clean Room' }
      ],
      guests: [],
      roomRates: { standard: 50, suite: 120 },
      roomCategories: DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: null,
      totalGuestsServed: 0,
      milestones: getInitialMilestones(),
      marketId: 'urban-business',
      marketingBudget: 75,
    }
  ],
  activeHotelId: 'h-1',
  customBrands: [],
  activeHotelBrandId: 'b-budget',
  gameDay: 1,
  gameHour: 8,
  marketId: 'urban-business',
  marketingBudget: 75,
  operationsReport: null,
  operationsHistory: [],

  setChainName: (name) => set({ chainName: name }),

  setActiveHotel: (hotelId) => set((state) => {
    const syncedHotels = syncActiveHotelHelper(state);
    const target = syncedHotels.find(h => h.id === hotelId);
    if (!target) return state;

    return {
      hotels: syncedHotels,
      activeHotelId: hotelId,
      activeHotelBrandId: target.brandId,
      floors: target.floors,
      money: target.money,
      staff: target.staff,
      guests: target.guests,
      roomRates: target.roomRates,
      roomCategories: target.roomCategories || DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: target.bonusPrograms || DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: target.activeBonusProgramId || null,
      totalGuestsServed: target.totalGuestsServed,
      milestones: target.milestones,
      marketId: target.marketId || 'urban-business',
      marketingBudget: target.marketingBudget ?? 75,
      operationsReport: target.operationsReport || null,
      activeFloorIndex: 0
    };
  }),

  createHotel: (name, brandId) => set((state) => {
    const syncedHotels = syncActiveHotelHelper(state);
    const newHotelId = `h-${Date.now()}`;
    const startingFloors = JSON.parse(JSON.stringify(PRESETS['small-hotel']));
    const startingStaff = [
      { id: 's-receptionist-1', name: 'Alice (Receptionist)', role: 'receptionist' as const, salary: 100, currentTask: 'Check-in Guests' as const },
      { id: 's-cleaner-1', name: 'Bob (Cleaner)', role: 'cleaner' as const, salary: 50, currentTask: 'Clean Room' as const }
    ];
    const brandKey = brandId || 'b-budget';
    
    const newHotel: HotelData = {
      id: newHotelId,
      name: name || `Horizon Oasis ${state.hotels.length + 1}`,
      brandId: brandKey,
      floors: startingFloors,
      money: 15000,
      staff: startingStaff,
      guests: [],
      roomRates: { standard: 50, suite: 120 },
      roomCategories: DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: null,
      totalGuestsServed: 0,
      milestones: getInitialMilestones(),
      marketId: state.marketId || 'urban-business',
      marketingBudget: 75,
    };

    return {
      hotels: [...syncedHotels, newHotel],
      activeHotelId: newHotelId,
      activeHotelBrandId: brandKey,
      floors: startingFloors,
      money: 15000,
      staff: startingStaff,
      guests: [],
      roomRates: { standard: 50, suite: 120 },
      roomCategories: DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: null,
      totalGuestsServed: 0,
      milestones: getInitialMilestones(),
      activeFloorIndex: 0
    };
  }),

  createCustomBrand: (brand) => set((state) => {
    const newBrand: Brand = {
      ...brand,
      id: `brand-${Date.now()}`,
      isCustom: true
    };
    return {
      customBrands: [...(state.customBrands || []), newBrand]
    };
  }),

  deleteHotel: (hotelId) => set((state) => {
    if (state.hotels.length <= 1) {
      alert("You must keep at least one hotel in your chain!");
      return state;
    }

    const filteredHotels = state.hotels.filter(h => h.id !== hotelId);
    if (state.activeHotelId === hotelId) {
      const fallback = filteredHotels[0];
      return {
        hotels: filteredHotels,
        activeHotelId: fallback.id,
        activeHotelBrandId: fallback.brandId,
        floors: fallback.floors,
        money: fallback.money,
        staff: fallback.staff,
        guests: fallback.guests,
        roomRates: fallback.roomRates,
        totalGuestsServed: fallback.totalGuestsServed,
        milestones: fallback.milestones,
        activeFloorIndex: 0
      };
    }
    return { hotels: filteredHotels };
  }),

  updateActiveHotelName: (newName) => set((state) => {
    const updatedHotels = state.hotels.map(h => 
      h.id === state.activeHotelId ? { ...h, name: newName } : h
    );
    const synced = syncActiveHotelHelper({ ...state, hotels: updatedHotels });
    return { hotels: synced };
  }),

  updateHotelBrand: (hotelId, brandId) => set((state) => {
    const updatedHotels = state.hotels.map(h => 
      h.id === hotelId ? { ...h, brandId } : h
    );
    const synced = syncActiveHotelHelper({ ...state, hotels: updatedHotels });
    const activeHotelBrandId = hotelId === state.activeHotelId ? brandId : state.activeHotelBrandId;
    return { hotels: synced, activeHotelBrandId };
  }),

  setMarket: (marketId) => set((state) => {
    const synced = syncActiveHotelHelper({ ...state, marketId });
    return { marketId, hotels: synced };
  }),

  setMarketingBudget: (amount) => set((state) => {
    const marketingBudget = Math.max(0, Math.min(500, Math.round(amount)));
    const synced = syncActiveHotelHelper({ ...state, marketingBudget });
    return { marketingBudget, hotels: synced };
  }),

  addHotel: (name, brandId) => {
    get().createHotel(name, brandId);
  },

  updateHotelName: (hotelId, newName) => set((state) => {
    const updatedHotels = state.hotels.map(h => 
      h.id === hotelId ? { ...h, name: newName } : h
    );
    const synced = syncActiveHotelHelper({ ...state, hotels: updatedHotels });
    return { hotels: synced };
  }),

  setUser: (user) => set({ user }),
  
  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      set({ user: result.user });
      await get().loadFromCloud(result.user.uid);
    } catch (error) {
      console.error("Login failed", error);
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null });
    get().loadPreset('auto-preset');
  },

  saveToCloud: async () => {
    const { user, chainName, customBrands, activeHotelId } = get();
    if (!user) return;
    try {
      const currentActiveHotels = syncActiveHotelHelper(get());
      const payload = {
        chainName: chainName || 'My Hotel Chain',
        activeHotelId: activeHotelId || 'h-1',
        customBrands: customBrands || [],
        hotels: currentActiveHotels
      };
      await setDoc(doc(db, 'hotels', user.uid), payload);
      alert('Chain saved to cloud successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save chain to cloud');
    }
  },

  loadFromCloud: async (uid) => {
    try {
      const docSnap = await getDoc(doc(db, 'hotels', uid));
      if (docSnap.exists()) {
        applyLoadedHotelData(docSnap.data() as Record<string, unknown>, set);
      } else {
        get().loadPreset('auto-preset');
        get().saveToCloud();
      }
    } catch (e) {
      console.error(e);
    }
  },

  saveToLocal: () => {
    try {
      const state = get();
      const currentActiveHotels = syncActiveHotelHelper(state);
      const payload = {
        chainName: state.chainName || 'My Hotel Chain',
        activeHotelId: state.activeHotelId || 'h-1',
        customBrands: state.customBrands || [],
        hotels: currentActiveHotels,
        gameDay: state.gameDay,
        gameHour: state.gameHour,
        marketId: state.marketId,
        marketingBudget: state.marketingBudget,
        operationsHistory: state.operationsHistory,
        activeFloorIndex: state.activeFloorIndex,
        viewMode: state.viewMode,
        appMode: state.appMode,
        selectedTool: state.selectedTool,
        saveVersion: 1,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('Failed to save locally', e);
      return false;
    }
  },

  loadFromLocal: () => {
    try {
      const raw = localStorage.getItem(LOCAL_SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as Record<string, unknown>;
      const loaded = applyLoadedHotelData(data, set);
      if (loaded) {
        set({
          gameDay: (data.gameDay as number) || 1,
          gameHour: (data.gameHour as number) || 8,
          marketId: (data.marketId as string) || 'urban-business',
          marketingBudget: (data.marketingBudget as number) ?? 75,
          operationsHistory: (data.operationsHistory as OperationsReport[]) || [],
          activeFloorIndex: (data.activeFloorIndex as number) ?? 0,
          viewMode: (data.viewMode as ViewMode) || '2D',
          appMode: (data.appMode as AppMode) || 'Design',
          selectedTool: (data.selectedTool as TileType | 'eraser' | 'text') || 'floor'
        });
      }
      return loaded;
    } catch (e) {
      console.error('Failed to load local save', e);
      return false;
    }
  },

  setRoomRate: (type, rate) => set((state) => {
    const updatedRates = { ...state.roomRates, [type]: rate };
    const synced = syncActiveHotelHelper({ ...state, roomRates: updatedRates });
    return { roomRates: updatedRates, hotels: synced };
  }),

  serviceVipGuest: (guestId, staffId) => set((state) => {
    const updatedGuests = state.guests.map(g => {
      if (g.id === guestId) {
        return { 
          ...g, 
          vipAssignedStaff: staffId,
          vipSatisfaction: Math.min(100, (g.vipSatisfaction || 50) + 25) 
        };
      }
      return g;
    });
    const updatedStaff = state.staff.map(s => {
      if (s.id === staffId) {
        return { ...s, currentTask: 'Service VIP' as StaffTask };
      }
      return s;
    });
    const synced = syncActiveHotelHelper({ ...state, guests: updatedGuests, staff: updatedStaff });
    return { guests: updatedGuests, staff: updatedStaff, hotels: synced };
  }),

  hireStaff: (role) => set((state) => {
    const costs = { receptionist: 1000, cleaner: 500, manager: 2000 };
    const cost = costs[role];
    if (state.money >= cost) {
      const newStaff: StaffNPC = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Staff ${state.staff.length + 1}`,
        role,
        salary: cost / 10
      };
      const updatedStaff = [...state.staff, newStaff];
      const updatedMoney = state.money - cost;
      setTimeout(() => checkMilestones(useHotelStore.getState(), set), 0);
      const synced = syncActiveHotelHelper({ ...state, money: updatedMoney, staff: updatedStaff });
      return { money: updatedMoney, staff: updatedStaff, hotels: synced };
    }
    return state;
  }),

  assignTask: (staffId, task) => set((state) => {
    const updatedStaff = state.staff.map(s => s.id === staffId ? { ...s, currentTask: task } : s);
    const synced = syncActiveHotelHelper({ ...state, staff: updatedStaff });
    return { staff: updatedStaff, hotels: synced };
  }),

  addMoney: (amount) => set((state) => {
    const updatedMoney = state.money + amount;
    setTimeout(() => checkMilestones(useHotelStore.getState(), set), 0);
    const synced = syncActiveHotelHelper({ ...state, money: updatedMoney });
    return { money: updatedMoney, hotels: synced };
  }),

  processGuests: () => set((state) => {
    const activeBrand = [...DEFAULT_BRANDS, ...(state.customBrands || [])].find(b => b.id === state.activeHotelBrandId) || DEFAULT_BRANDS[0];
    const activeProgram = state.activeBonusProgramId
      ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId)
      : null;

    let gameHour = state.gameHour + 1;
    let gameDay = state.gameDay;
    if (gameHour >= 24) {
      gameHour = 0;
      gameDay += 1;
    }

    const report = buildOperationsReport({
      floors: state.floors,
      guests: state.guests,
      staff: state.staff,
      marketId: state.marketId,
      gameDay,
      gameHour,
      marketingBudget: state.marketingBudget,
      roomCategories: state.roomCategories || DEFAULT_ROOM_CATEGORIES,
      brand: activeBrand,
      activeBonusProgramId: state.activeBonusProgramId,
      bonusPrivileges: activeProgram?.privileges || [],
      totalGuestsServed: state.totalGuestsServed,
      previousReport: state.operationsReport,
    });

    let expenses = report.expenses.total;
    if (activeProgram?.privileges.includes('staffLoungePlus')) {
      expenses = Math.round(expenses - report.expenses.staffPayroll * 0.15);
    }

    const netIncome = report.revenue - expenses;
    const newMoney = state.money + netIncome;
    const operationsHistory = [...state.operationsHistory, report].slice(-24);

    setTimeout(() => checkMilestones(useHotelStore.getState(), set), 0);
    const synced = syncActiveHotelHelper({
      ...state,
      money: newMoney,
      gameDay,
      gameHour,
      operationsReport: report,
      operationsHistory,
    });

    return {
      money: newMoney,
      gameDay,
      gameHour,
      operationsReport: report,
      operationsHistory,
      hotels: synced,
    };
  }),

  tickNPCs: () => set((state) => {
    let newGuests = [...state.guests];
    let extraMoney = 0;

    const activeBrand = [...DEFAULT_BRANDS, ...(state.customBrands || [])].find(b => b.id === state.activeHotelBrandId) || DEFAULT_BRANDS[0];
    const inventory = countRoomInventory(state.floors);
    const capacity = inventory.guestCapacity;
    const inRoomCount = newGuests.filter(g => g.state === 'in-room').length;
    const occupancyRate = capacity > 0 ? (inRoomCount / capacity) * 100 : 0;
    const starRating = calculateStarRating(state.floors, state.totalGuestsServed, newGuests);
    const demandScore = calculateDemandScore({
      marketId: state.marketId,
      gameDay: state.gameDay,
      starRating,
      brand: activeBrand,
      marketingBudget: state.marketingBudget,
      satisfaction: state.operationsReport?.avgSatisfaction || 75,
      occupancyRate,
    });
    const phase = getDayPhase(state.gameHour);
    const spawnChance = getGuestSpawnChance({
      demandScore,
      phase,
      currentGuests: newGuests.length,
      capacity,
    });

    if (newGuests.length < capacity && Math.random() < spawnChance) {
      // Find reception
      let receptionX = 10, receptionY = 10, receptionFloor = 0;
      let foundReception = false;
      for (let f = 0; f < state.floors.length; f++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (state.floors[f].grid[y][x] === 'reception') {
              receptionX = x; receptionY = y; receptionFloor = f;
              foundReception = true; break;
            }
          }
          if (foundReception) break;
        }
        if (foundReception) break;
      }
      
      const isVip = Math.random() < activeBrand.vipSpawnRate;
      let name = `Guest ${Math.floor(Math.random() * 1000)}`;
      let vipNeed: GuestNPC['vipNeed'] = undefined;
      let vipSatisfaction = undefined;
      
      if (isVip) {
        const vipNames = [
          'Sir Archibald Sterling', 'Lady Vivienne Rothschild', 'Duke Charles Wellington',
          'Baroness Beatrice Vance', 'Director Julian Finch', 'Ambassador Evelyn Thorne',
          'Princess Sophia of Bavaria', 'Lord Harrison Blackwood', 'CEO Jacqueline Thorne',
          'Count Maximillian Vance'
        ];
        name = vipNames[Math.floor(Math.random() * vipNames.length)] + ' 👑';
        const vipNeedsList: GuestNPC['vipNeed'][] = ['champagne', 'valet', 'suite', 'spa'];
        vipNeed = vipNeedsList[Math.floor(Math.random() * vipNeedsList.length)];
        vipSatisfaction = 50; // starts at 50%
      }
      
      newGuests.push({
        id: Math.random().toString(36).substr(2, 9),
        name,
        stayDuration: 0,
        spent: 0,
        state: 'checking-in',
        x: 10, y: 19, // Spawn at bottom center
        floorIndex: 0,
        targetX: receptionX,
        targetY: receptionY,
        isVip,
        vipNeed,
        vipSatisfaction,
        satisfaction: 75 // Starts at 75% for standard guests
      });
    }

    newGuests = newGuests.map(guest => {
      const g = { ...guest };
      g.stayDuration++;

      // Handle VIP satisfaction updates
      if (g.isVip) {
        // 1. Check general VIP Service staff task
        const generalService = state.staff.some(s => s.currentTask === 'Service VIP');
        if (generalService) {
          g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + 1.5);
        }
        
        // 2. Check assigned specific staff service
        if (g.vipAssignedStaff) {
          g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + 3);
        }

        // 3. Check floor tiles / amenities
        const floorGrid = state.floors[g.floorIndex]?.grid;
        if (floorGrid) {
          let hasBathroom = false;
          let hasPlant = false;
          let hasTable = false;
          let hasReception = false;
          floorGrid.forEach(row => row.forEach(tile => {
            if (tile === 'bathroom') hasBathroom = true;
            if (tile === 'plant') hasPlant = true;
            if (tile === 'table') hasTable = true;
            if (tile === 'reception') hasReception = true;
          }));

          if (g.vipNeed === 'spa' && hasBathroom) {
            let boost = 2;
            const activeProgram = state.activeBonusProgramId 
              ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId)
              : null;
            if (activeProgram?.privileges.includes('hygieneElite') && g.enrolledInBonusProgram) boost *= 2;
            g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + boost);
          } else if (g.vipNeed === 'suite' && hasPlant) {
            let boost = 2;
            const activeProgram = state.activeBonusProgramId 
              ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId)
              : null;
            if (activeProgram?.privileges.includes('organicVibe') && g.enrolledInBonusProgram) boost *= 2;
            g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + boost);
          } else if (g.vipNeed === 'champagne' && hasTable) {
            g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + 2);
          } else if (g.vipNeed === 'valet' && hasReception) {
            g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + 2);
          }
        }
        
        // Slight decay to keep it dynamic if no service is matched
        if (!generalService && !g.vipAssignedStaff) {
          g.vipSatisfaction = Math.max(10, (g.vipSatisfaction || 50) - 0.2);
        }
      } else {
        // Standard Guest Satisfaction Calculations
        let currentSat = g.satisfaction !== undefined ? g.satisfaction : 75;
        
        // 1. Price comfort based on assigned category price compared to baseline
        const cats = state.roomCategories || DEFAULT_ROOM_CATEGORIES;
        const categoryId = g.roomCategoryId || 'rc-standard';
        const category = cats.find(c => c.id === categoryId) || cats[0];
        
        const extraTilesCount = Math.max(0, (category.requiredTiles || []).length - 1);
        const baselinePrice = 50 + extraTilesCount * 30;
        
        const rateRatio = (category.price || 50) / baselinePrice;
        if (rateRatio < 0.9) {
          currentSat = Math.min(100, currentSat + 1.2);
        } else if (rateRatio > 1.6) {
          currentSat = Math.max(10, currentSat - 1.8);
        } else if (rateRatio > 1.2) {
          currentSat = Math.max(10, currentSat - 0.6);
        }

        // 2. Floor quality & amenities
        const floorGrid = state.floors[g.floorIndex]?.grid;
        const activeProgram = state.activeBonusProgramId 
          ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId)
          : null;

        if (floorGrid) {
          let hasBathroom = false;
          let hasPlant = false;
          let hasTable = false;
          floorGrid.forEach(row => row.forEach(tile => {
            if (tile === 'bathroom') hasBathroom = true;
            if (tile === 'plant') hasPlant = true;
            if (tile === 'table') hasTable = true;
          }));

          if (hasBathroom) {
            let bathBoost = 0.6;
            if (activeProgram?.privileges.includes('hygieneElite') && g.enrolledInBonusProgram) {
              bathBoost *= 2.0;
            }
            currentSat = Math.min(100, currentSat + bathBoost);
          } else {
            currentSat = Math.max(10, currentSat - 1.0);
          }

          if (hasPlant) {
            let plantBoost = (activeBrand.id === 'b-eco' ? 0.8 : 0.4);
            if (activeProgram?.privileges.includes('organicVibe') && g.enrolledInBonusProgram) {
              plantBoost *= 2.0;
            }
            currentSat = Math.min(100, currentSat + plantBoost);
          }
          if (hasTable) {
            currentSat = Math.min(100, currentSat + (activeBrand.id === 'b-eco' ? 0.8 : 0.4));
          }
        }

        // 3. Cleaners/Managers help
        const hasCleaner = state.staff.some(s => s.role === 'cleaner' && s.currentTask === 'Clean Room');
        const hasManager = state.staff.some(s => s.role === 'manager');
        if (hasCleaner) {
          currentSat = Math.min(100, currentSat + 0.5);
        } else {
          currentSat = Math.max(10, currentSat - 0.4);
        }
        if (hasManager) {
          currentSat = Math.min(100, currentSat + 0.3);
        }

        g.satisfaction = Math.round(currentSat * 10) / 10;
      }

      // Guest Feedback (Thought Bubble) Spawning Logic
      if (!g.feedback || Date.now() > g.feedback.visibleUntil) {
        if (Math.random() < 0.08) {
          const sat = g.isVip ? (g.vipSatisfaction || 50) : (g.satisfaction || 75);
          let type: 'happy' | 'neutral' | 'angry' = 'neutral';
          let emoji = '😐';
          let text = 'Enjoying my stay.';

          // Happy feedback
          const happyComments = [
            { text: 'This place looks amazing! ✨', emoji: '😊' },
            { text: 'I love the room decor and indoor plants! 🌿', emoji: '😍' },
            { text: 'Extremely cozy and clean beds! 🛏️', emoji: '🥰' },
            { text: 'Exceptional customer service here. 🛎️', emoji: '💯' },
            { text: 'Room prices are a great deal! 💵', emoji: '🤑' },
            { text: 'Fabulous five-star atmosphere! ⭐', emoji: '🤩' },
          ];

          // Neutral feedback
          const neutralComments = [
            { text: 'Just relaxing in the lobby area. 🚶', emoji: '🚶' },
            { text: 'Checking out the floor layouts. 🚪', emoji: '🤔' },
            { text: 'This hotel seems pretty solid. 👍', emoji: '🙂' },
            { text: 'Cozy enough to pass the night. 🛋️', emoji: '☕' },
          ];

          // Angry feedback
          const angryComments = [
            { text: 'Where is the bathroom on this floor?! 🚽', emoji: '😠' },
            { text: 'The hotel is quite dusty and messy! 🧹', emoji: '😤' },
            { text: 'These room rates are a total rip-off! 💸', emoji: '😡' },
            { text: 'I would like to complain to a manager! 🤬', emoji: '🗣️' },
            { text: 'My floor is lacking basic amenities. 📦', emoji: '👿' },
            { text: 'No elevators? Going up is exhausting! 🛗', emoji: '😫' },
          ];

          if (sat >= 80) {
            const pick = happyComments[Math.floor(Math.random() * happyComments.length)];
            text = pick.text;
            emoji = pick.emoji;
            type = 'happy';
          } else if (sat < 45) {
            // Context-based selection
            const standardRate = state.roomRates?.standard || 50;
            const floorGrid = state.floors[g.floorIndex]?.grid;
            let hasBathroom = false;
            if (floorGrid) {
              floorGrid.forEach(row => row.forEach(tile => { if (tile === 'bathroom') hasBathroom = true; }));
            }

            let candidates = [...angryComments];
            if (!hasBathroom) {
              candidates.push({ text: 'Where is the bathroom?! This floor is incomplete! 🚽', emoji: '😭' });
            }
            if (standardRate > 80) {
              candidates.push({ text: 'Standard room rates are way too expensive! 💸', emoji: '😡' });
            }

            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            text = pick.text;
            emoji = pick.emoji;
            type = 'angry';
          } else {
            const pick = neutralComments[Math.floor(Math.random() * neutralComments.length)];
            text = pick.text;
            emoji = pick.emoji;
            type = 'neutral';
          }

          // VIP customization
          if (g.isVip) {
            const vipHappy = [
              { text: 'Exquisite attention to detail! 👑', emoji: '🥂' },
              { text: 'My personal butler service is phenomenal! 🤵', emoji: '💖' },
              { text: 'This suite is perfect for royalty. 🏛️', emoji: '💅' }
            ];
            const vipAngry = [
              { text: 'This service is unacceptable for a VIP! 🚨', emoji: '💢' },
              { text: 'Where is my requested champagne service?! 🍾', emoji: '🙄' },
              { text: 'Exorbitant wait times! Horrible staff! ⏳', emoji: '👎' }
            ];

            if (sat >= 80 && Math.random() < 0.6) {
              const pick = vipHappy[Math.floor(Math.random() * vipHappy.length)];
              text = pick.text;
              emoji = pick.emoji;
              type = 'happy';
            } else if (sat < 45 && Math.random() < 0.6) {
              const pick = vipAngry[Math.floor(Math.random() * vipAngry.length)];
              text = pick.text;
              emoji = pick.emoji;
              type = 'angry';
            }
          }

          g.feedback = {
            text,
            emoji,
            type,
            visibleUntil: Date.now() + 6000 // Visible for 6 seconds
          };
        }
      }

      // Randomly get a need if they don't have one and are in a valid state
      if (!g.need || g.need === 'none') {
        if (Math.random() < 0.05 && (g.state === 'in-room' || g.state === 'wandering')) {
          g.need = Math.random() > 0.5 ? 'hungry' : 'tired';
        }
      } else {
        // Resolve need after some time
        if (Math.random() < 0.1) {
           g.need = 'none';
        }
      }
      
      // Move towards target
      if (g.targetX !== undefined && g.targetY !== undefined) {
        const dx = g.targetX - g.x;
        const dy = g.targetY - g.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0.5) {
          g.x += (dx / dist) * 0.5;
          g.y += (dy / dist) * 0.5;
        } else {
          // Reached target
          if (g.state === 'checking-in') {
            // Find a bed
            let foundBed = false;
            for (let f = 0; f < state.floors.length; f++) {
              for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                  const isBedTaken = newGuests.some(og => og.id !== g.id && (og.targetX === x && og.targetY === y || og.finalTargetX === x && og.finalTargetY === y));
                  if (state.floors[f].grid[y][x] === 'bed' && !isBedTaken) {
                    const bedX = x;
                    const bedY = y;
                    const bedFloor = f;

                    // Evaluate dynamic room category for this floor
                    const cats = state.roomCategories || DEFAULT_ROOM_CATEGORIES;
                    const matchedCat = evaluateFloorRoomCategory(state.floors[f], cats);
                    g.roomCategoryId = matchedCat.id;

                    // Loyalty program enrollment
                    if (state.activeBonusProgramId) {
                      const activeProgram = (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId);
                      if (activeProgram) {
                        const joinChance = g.isVip ? 0.9 : 0.4;
                        if (Math.random() < joinChance) {
                          g.enrolledInBonusProgram = true;
                          extraMoney += activeProgram.enrollmentFee || 0;
                          g.spent += activeProgram.enrollmentFee || 0;
                          if (!g.isVip) {
                            g.satisfaction = Math.min(100, (g.satisfaction || 75) + 15);
                          } else {
                            g.vipSatisfaction = Math.min(100, (g.vipSatisfaction || 50) + 15);
                          }
                        }
                      }
                    }

                    // Floor transition routing!
                    if (bedFloor === g.floorIndex) {
                      // Same floor, walk directly to bed
                      g.state = 'going-to-room';
                      g.targetX = bedX;
                      g.targetY = bedY;
                    } else {
                      // Different floor, look for elevator/stairs on current floor
                      let transitX = -1, transitY = -1;
                      for (let ty = 0; ty < GRID_SIZE; ty++) {
                        for (let tx = 0; tx < GRID_SIZE; tx++) {
                          const tile = state.floors[g.floorIndex].grid[ty][tx];
                          if (tile === 'elevator' || tile === 'stairs') {
                            transitX = tx; transitY = ty; break;
                          }
                        }
                        if (transitX !== -1) break;
                      }

                      if (transitX !== -1) {
                        // Elevator found! Walk to elevator first
                        g.state = 'going-to-elevator';
                        g.targetX = transitX;
                        g.targetY = transitY;
                        g.finalTargetX = bedX;
                        g.finalTargetY = bedY;
                        g.finalFloorIndex = bedFloor;
                      } else {
                        // Fallback: teleport if no elevator/stairs built yet
                        g.state = 'going-to-room';
                        g.targetX = bedX;
                        g.targetY = bedY;
                        g.floorIndex = bedFloor;
                      }
                    }

                    foundBed = true; break;
                  }
                }
                if (foundBed) break;
              }
              if (foundBed) break;
            }
            if (!foundBed) {
              g.state = 'leaving';
              g.targetX = 10; g.targetY = 19; g.floorIndex = 0;
            }
          } else if (g.state === 'going-to-elevator') {
            // Reached elevator on check-in! Move to target floor at the same elevator position
            g.floorIndex = g.finalFloorIndex !== undefined ? g.finalFloorIndex : 0;
            g.x = g.targetX !== undefined ? g.targetX : g.x;
            g.y = g.targetY !== undefined ? g.targetY : g.y;
            // Set final room bed as the next target
            g.state = 'going-to-room';
            g.targetX = g.finalTargetX;
            g.targetY = g.finalTargetY;
            g.finalTargetX = undefined;
            g.finalTargetY = undefined;
            g.finalFloorIndex = undefined;
          } else if (g.state === 'going-to-room') {
            g.state = 'in-room';
            g.targetX = undefined; g.targetY = undefined;
          } else if (g.state === 'going-to-elevator-checkout') {
            // Reached elevator on checkout! Move to lobby floor (usually level 0) at the elevator position
            g.floorIndex = g.finalFloorIndex !== undefined ? g.finalFloorIndex : 0;
            g.x = g.targetX !== undefined ? g.targetX : g.x;
            g.y = g.targetY !== undefined ? g.targetY : g.y;
            // Set reception desk as next target
            g.state = 'checking-out';
            g.targetX = g.finalTargetX;
            g.targetY = g.finalTargetY;
            g.finalTargetX = undefined;
            g.finalTargetY = undefined;
            g.finalFloorIndex = undefined;
          } else if (g.state === 'checking-out') {
            g.state = 'leaving';
            g.targetX = 10; g.targetY = 19; g.floorIndex = 0;
          } else if (g.state === 'leaving') {
            return { ...g, state: 'done' as GuestState }; // mark for removal
          }
        }
      } else if (g.state === 'in-room') {
        const activeProgram = state.activeBonusProgramId 
          ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === state.activeBonusProgramId)
          : null;
        const hasLateCheckout = activeProgram?.privileges.includes('lateCheckout') && g.enrolledInBonusProgram;
        const stayLimit = hasLateCheckout ? 45 : 30;

        if (g.stayDuration > stayLimit) {
          // Find reception
          let receptionX = 10, receptionY = 10, receptionFloor = 0;
          for (let f = 0; f < state.floors.length; f++) {
            for (let y = 0; y < GRID_SIZE; y++) {
              for (let x = 0; x < GRID_SIZE; x++) {
                if (state.floors[f].grid[y][x] === 'reception') {
                  receptionX = x; receptionY = y; receptionFloor = f; break;
                }
              }
            }
          }

          // Floor transition routing on checkout!
          if (g.floorIndex === receptionFloor) {
            // Same floor, walk directly to reception
            g.state = 'checking-out';
            g.targetX = receptionX;
            g.targetY = receptionY;
          } else {
            // Different floor, look for elevator/stairs on current floor
            let transitX = -1, transitY = -1;
            for (let ty = 0; ty < GRID_SIZE; ty++) {
              for (let tx = 0; tx < GRID_SIZE; tx++) {
                const tile = state.floors[g.floorIndex].grid[ty][tx];
                if (tile === 'elevator' || tile === 'stairs') {
                  transitX = tx; transitY = ty; break;
                }
              }
              if (transitX !== -1) break;
            }

            if (transitX !== -1) {
              // Transit tile found! Walk to elevator first
              g.state = 'going-to-elevator-checkout';
              g.targetX = transitX;
              g.targetY = transitY;
              g.finalTargetX = receptionX;
              g.finalTargetY = receptionY;
              g.finalFloorIndex = receptionFloor;
            } else {
              // Fallback: teleport to reception floor if no elevator/stairs built
              g.state = 'checking-out';
              g.targetX = receptionX;
              g.targetY = receptionY;
              g.floorIndex = receptionFloor;
            }
          }
          
          // VIP Guest checkout reward!
          if (g.isVip) {
            let payout = 1200 + (g.vipSatisfaction || 50) * 18;
            if (activeProgram?.privileges.includes('vipWelcomeGift') && g.enrolledInBonusProgram) {
              payout = Math.round(payout * 1.35);
            }
            extraMoney += Math.floor(payout * activeBrand.vipMultiplier);
          }
          
          // Release assigned staff from VIP task once VIP checked out
          if (g.vipAssignedStaff) {
            state.staff = state.staff.map(s => s.id === g.vipAssignedStaff ? { ...s, currentTask: 'Idle' as StaffTask } : s);
          }
        }
      } else if (g.state === 'wandering') {
        // Not really using wandering, but maybe later
      }
      
      return g;
    });

    // Count completed guests
    const doneGuestsCount = newGuests.filter(g => (g.state as any) === 'done').length;
    const nextGuestsServed = (state.totalGuestsServed || 0) + doneGuestsCount;

    // Remove guests that are done
    newGuests = newGuests.filter(g => (g.state as any) !== 'done');

    setTimeout(() => checkMilestones(useHotelStore.getState(), set), 0);
    const updatedStateFields = { 
      guests: newGuests, 
      money: state.money + extraMoney, 
      staff: state.staff,
      totalGuestsServed: nextGuestsServed
    };
    const synced = syncActiveHotelHelper({ ...state, ...updatedStateFields });
    return { ...updatedStateFields, hotels: synced };
  }),

  setTile: (x, y, tool) => set((state) => {
    if ((tool as any) === 'text') return state;
    
    let newFloors;
    if (tool === 'elevator') {
       newFloors = state.floors.map(floor => {
          const newGrid = [...floor.grid];
          newGrid[y] = [...newGrid[y]];
          newGrid[y][x] = 'elevator';
          return { ...floor, grid: newGrid };
       });
    } else {
       newFloors = [...state.floors];
       const newGrid = [...newFloors[state.activeFloorIndex].grid];
       newGrid[y] = [...newGrid[y]];
       newGrid[y][x] = tool === 'eraser' ? 'empty' : tool;
       newFloors[state.activeFloorIndex] = { ...newFloors[state.activeFloorIndex], grid: newGrid };
    }
    const synced = syncActiveHotelHelper({ ...state, floors: newFloors });
    return { floors: newFloors, hotels: synced };
  }),

  addLabel: (floorIndex, label) => set((state) => {
    const newFloors = [...state.floors];
    const floor = newFloors[floorIndex];
    const newLabels = [...(floor.labels || []), label];
    newFloors[floorIndex] = { ...floor, labels: newLabels };
    const synced = syncActiveHotelHelper({ ...state, floors: newFloors });
    return { floors: newFloors, hotels: synced };
  }),

  removeLabel: (floorIndex, id) => set((state) => {
    const newFloors = [...state.floors];
    const floor = newFloors[floorIndex];
    if (!floor.labels) return state;
    newFloors[floorIndex] = { ...floor, labels: floor.labels.filter(l => l.id !== id) };
    const synced = syncActiveHotelHelper({ ...state, floors: newFloors });
    return { floors: newFloors, hotels: synced };
  }),

  addFloor: () => set((state) => {
    const prevGrid = state.floors[state.floors.length - 1]?.grid;
    const newGrid = createEmptyGrid();
    
    if (prevGrid) {
      for (let y = 0; y < prevGrid.length; y++) {
        for (let x = 0; x < prevGrid[y].length; x++) {
          if (prevGrid[y][x] === 'elevator') {
            newGrid[y][x] = 'elevator';
          }
        }
      }
    }

    const nextFloors = [...state.floors, { level: state.floors.length, name: `Level ${state.floors.length}`, grid: newGrid, labels: [] }];
    setTimeout(() => checkMilestones(useHotelStore.getState(), set), 0);
    const synced = syncActiveHotelHelper({ ...state, floors: nextFloors });
    return {
      floors: nextFloors,
      activeFloorIndex: nextFloors.length - 1,
      hotels: synced
    };
  }),

  setActiveFloor: (index) => set({ activeFloorIndex: index }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setAppMode: (mode) => set({ appMode: mode }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),

  loadPreset: (presetId) => set((state) => {
    if (PRESETS[presetId]) {
      const floors = JSON.parse(JSON.stringify(PRESETS[presetId]));
      const synced = syncActiveHotelHelper({ ...state, floors, activeFloorIndex: 0 });
      return { floors, activeFloorIndex: 0, appMode: 'Design', viewMode: '2D', hotels: synced };
    }
    return state;
  }),

  resetAll: () => set((state) => {
    const startingFloors = JSON.parse(JSON.stringify(PRESETS['small-hotel']));
    const startingStaff = [
      { id: 's-receptionist-1', name: 'Alice (Receptionist)', role: 'receptionist' as const, salary: 100, currentTask: 'Check-in Guests' as const },
      { id: 's-cleaner-1', name: 'Bob (Cleaner)', role: 'cleaner' as const, salary: 50, currentTask: 'Clean Room' as const }
    ];
    const defaultHotel: HotelData = {
      id: 'h-1',
      name: 'Grand Plaza Resort',
      brandId: 'b-budget',
      floors: startingFloors,
      money: 15000,
      staff: startingStaff,
      guests: [],
      roomRates: { standard: 50, suite: 120 },
      roomCategories: DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: null,
      totalGuestsServed: 0,
      milestones: getInitialMilestones()
    };
    return { 
      chainName: 'Grand Horizon Hotels',
      hotels: [defaultHotel],
      activeHotelId: 'h-1',
      activeHotelBrandId: 'b-budget',
      customBrands: [],
      floors: defaultHotel.floors,
      activeFloorIndex: 0, 
      money: 15000, 
      staff: startingStaff, 
      guests: [],
      roomRates: { standard: 50, suite: 120 },
      roomCategories: DEFAULT_ROOM_CATEGORIES,
      bonusPrograms: DEFAULT_BONUS_PROGRAMS,
      activeBonusProgramId: null,
      totalGuestsServed: 0,
      milestones: getInitialMilestones(),
      activeMilestoneNotification: null
    };
  }),

  saveFloorTemplate: (name, description) => {
    const { floors, activeFloorIndex, floorTemplates } = get();
    const activeFloor = floors[activeFloorIndex];
    if (!activeFloor) return;

    const newTemplate: FloorTemplate = {
      id: `custom-template-${Date.now()}`,
      name: name || `Saved Layout ${floorTemplates.filter(t => !t.isBuiltIn).length + 1}`,
      description: description || 'User-saved custom floor layout.',
      grid: JSON.parse(JSON.stringify(activeFloor.grid)),
      labels: JSON.parse(JSON.stringify(activeFloor.labels || [])),
      isBuiltIn: false
    };

    const updatedTemplates = [...floorTemplates, newTemplate];
    set({ floorTemplates: updatedTemplates });

    try {
      const customOnly = updatedTemplates.filter(t => !t.isBuiltIn);
      localStorage.setItem('archhotel_custom_templates', JSON.stringify(customOnly));
    } catch (e) {
      console.error('Failed to save custom templates to localStorage', e);
    }
  },

  loadFloorTemplate: (templateId) => {
    const { floorTemplates, floors, activeFloorIndex } = get();
    const template = floorTemplates.find(t => t.id === templateId);
    if (!template) return;

    set((state) => {
      const newFloors = [...state.floors];
      // Retain the floor's original level and level-name, but overwrite the grid & labels
      newFloors[activeFloorIndex] = {
        ...newFloors[activeFloorIndex],
        grid: JSON.parse(JSON.stringify(template.grid)),
        labels: JSON.parse(JSON.stringify(template.labels || []))
      };
      const synced = syncActiveHotelHelper({ ...state, floors: newFloors });
      return { floors: newFloors, hotels: synced };
    });
  },

  deleteFloorTemplate: (templateId) => {
    set((state) => {
      const updatedTemplates = state.floorTemplates.filter(t => t.id !== templateId);

      try {
        const customOnly = updatedTemplates.filter(t => !t.isBuiltIn);
        localStorage.setItem('archhotel_custom_templates', JSON.stringify(customOnly));
      } catch (e) {
        console.error('Failed to save custom templates to localStorage', e);
      }

      return { floorTemplates: updatedTemplates };
    });
  },

  createRoomCategory: (cat) => set((state) => {
    const cats = [...(state.roomCategories || DEFAULT_ROOM_CATEGORIES), cat];
    const synced = syncActiveHotelHelper({ ...state, roomCategories: cats });
    return { roomCategories: cats, hotels: synced };
  }),

  updateRoomCategoryPrice: (id, price) => set((state) => {
    const cats = (state.roomCategories || DEFAULT_ROOM_CATEGORIES).map(c => 
      c.id === id ? { ...c, price } : c
    );
    const synced = syncActiveHotelHelper({ ...state, roomCategories: cats });
    return { roomCategories: cats, hotels: synced };
  }),

  deleteRoomCategory: (id) => set((state) => {
    const cats = (state.roomCategories || DEFAULT_ROOM_CATEGORIES).filter(c => c.id !== id);
    const synced = syncActiveHotelHelper({ ...state, roomCategories: cats });
    return { roomCategories: cats, hotels: synced };
  }),

  createBonusProgram: (program) => set((state) => {
    const programs = [...(state.bonusPrograms || DEFAULT_BONUS_PROGRAMS), program];
    const synced = syncActiveHotelHelper({ ...state, bonusPrograms: programs });
    return { bonusPrograms: programs, hotels: synced };
  }),

  activateBonusProgram: (id) => set((state) => {
    const targetProgram = id 
      ? (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).find(p => p.id === id)
      : null;

    if (targetProgram && state.money < targetProgram.costToActivate) {
      alert(`Insufficient funds! Need $${targetProgram.costToActivate.toLocaleString()} to activate this loyalty program.`);
      return state;
    }

    const updatedPrograms = (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).map(p => ({
      ...p,
      isActive: p.id === id
    }));

    const nextMoney = targetProgram ? state.money - targetProgram.costToActivate : state.money;
    const synced = syncActiveHotelHelper({ 
      ...state, 
      bonusPrograms: updatedPrograms, 
      activeBonusProgramId: id,
      money: nextMoney
    });

    return { 
      bonusPrograms: updatedPrograms, 
      activeBonusProgramId: id, 
      money: nextMoney,
      hotels: synced 
    };
  }),

  deleteBonusProgram: (id) => set((state) => {
    const programs = (state.bonusPrograms || DEFAULT_BONUS_PROGRAMS).filter(p => p.id !== id);
    const nextActiveId = state.activeBonusProgramId === id ? null : state.activeBonusProgramId;
    const synced = syncActiveHotelHelper({ ...state, bonusPrograms: programs, activeBonusProgramId: nextActiveId });
    return { bonusPrograms: programs, activeBonusProgramId: nextActiveId, hotels: synced };
  })
}));
