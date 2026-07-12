import React, { useState } from 'react';
import { useHotelStore } from '../store';
import { DEFAULT_BRANDS } from '../db';
import { normalizeAiFloors } from '../aiHotel';
import { OperationsDashboard } from './OperationsDashboard';
import { 
  Building2, 
  Users, 
  BedDouble, 
  CheckCircle, 
  ArrowDownToLine, 
  DollarSign, 
  Crown, 
  Sparkles, 
  Plus, 
  Palette, 
  Briefcase, 
  TrendingUp, 
  Trash2, 
  Edit3, 
  Layers, 
  HelpCircle,
  Check,
  Gift,
  Clock,
  Heart,
  Activity,
  Flame,
  Gauge,
  Copy,
  ShieldCheck,
  BookOpen,
  MapPin,
  Zap
} from 'lucide-react';
import { Tooltip } from './Tooltip';

export const Management: React.FC = () => {
  const { 
    floors, 
    loadPreset, 
    staff, 
    hireStaff, 
    assignTask, 
    money, 
    guests, 
    serviceVipGuest,
    chainName,
    setChainName,
    hotels,
    activeHotelId,
    setActiveHotel,
    addHotel,
    updateHotelName,
    updateHotelBrand,
    customBrands,
    createCustomBrand,
    activeHotelBrandId,
    roomCategories,
    bonusPrograms,
    activeBonusProgramId,
    createRoomCategory,
    updateRoomCategoryPrice,
    deleteRoomCategory,
    createBonusProgram,
    activateBonusProgram,
    deleteBonusProgram,
    floorTemplates,
    operationsReport,
    roomRates,
    setRoomRate,
    gameDay,
    gameHour,
    guestSpawnRatePerSecond,
    setGuestSpawnRatePerSecond,
    gameSpeed,
    setGameSpeed,
    renameFloor,
    duplicateFloor,
    getFireSafetyRating,
    guestLedger,
    totalGuestsServed,
    milestones,
  } = useHotelStore();

  const [activeTab, setActiveTab] = useState<'operations' | 'chain' | 'staff' | 'guests' | 'presets' | 'categories' | 'bonuses' | 'settings'>('operations');

  // New Hotel Form State
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelBrand, setNewHotelBrand] = useState('b-budget');

  // Custom Brand Creator State
  const [customBrandName, setCustomBrandName] = useState('');
  const [customBrandVipSpawn, setCustomBrandVipSpawn] = useState(0.2); // 20%
  const [customBrandVipMult, setCustomBrandVipMult] = useState(1.5);   // 1.5x
  const [customBrandIcon, setCustomBrandIcon] = useState('🌟');

  // Hotel Renaming State
  const [renamingHotelId, setRenamingHotelId] = useState<string | null>(null);
  const [renamingHotelName, setRenamingHotelName] = useState('');

  // Custom Room Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrice, setNewCatPrice] = useState(100);
  const [newCatIcon, setNewCatIcon] = useState('🛌');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatRequired, setNewCatRequired] = useState<string[]>(['bed']);
  const [newCatTemplateId, setNewCatTemplateId] = useState<string>('');
  
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatPrice, setEditingCatPrice] = useState(100);

  // Custom Loyalty/Bonus Program State
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [newProgramCost, setNewProgramCost] = useState(3000);
  const [newProgramFee, setNewProgramFee] = useState(30);
  const [newProgramPrivileges, setNewProgramPrivileges] = useState<string[]>([]);

  const allBrands = [...DEFAULT_BRANDS, ...(customBrands || [])];
  const activeBrand = allBrands.find(b => b.id === activeHotelBrandId) || DEFAULT_BRANDS[0];

  let totalBeds = 0;
  let totalArea = 0;
  let totalElevators = 0;
  let totalPlants = 0;

  floors.forEach(floor => {
    floor.grid.forEach(row => {
      row.forEach(cell => {
        if (cell === 'bed') totalBeds++;
        if (cell !== 'empty') totalArea += 4; // 2x2m
        if (cell === 'elevator') totalElevators++;
        if (cell === 'plant') totalPlants++;
      })
    })
  });

  const handleCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBrandName.trim()) return;

    const newBrandId = `b-custom-${Date.now()}`;
    createCustomBrand({
      id: newBrandId,
      name: customBrandName.trim(),
      description: 'A custom-designed elite brand tailored for supreme service and luxury.',
      vipSpawnRate: Number(customBrandVipSpawn),
      vipMultiplier: Number(customBrandVipMult),
      bedMultiplier: 1.2,
      styleColor: 'from-fuchsia-600/20 to-indigo-900/10 border-fuchsia-500/30 text-fuchsia-400',
      color: 'from-fuchsia-500 to-indigo-500',
      icon: customBrandIcon
    });

    setCustomBrandName('');
    alert(`Successfully registered custom brand: "${customBrandName}"!`);
  };

  const handleBuildHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim()) return;

    addHotel(newHotelName.trim(), newHotelBrand);
    setNewHotelName('');
    alert(`New hotel "${newHotelName}" built successfully and added to your portfolio!`);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    createRoomCategory({
      id: `rc-custom-${Date.now()}`,
      name: newCatName.trim(),
      price: Number(newCatPrice),
      icon: newCatIcon,
      requiredTiles: newCatRequired as any[],
      description: newCatDesc.trim() || 'Custom room configurations.',
      presetTemplateId: newCatTemplateId || undefined
    });

    setNewCatName('');
    setNewCatDesc('');
    setNewCatRequired(['bed']);
    setNewCatTemplateId('');
    alert(`Successfully registered category: "${newCatName}"!`);
  };

  const toggleRequiredTile = (tile: string) => {
    if (tile === 'bed') return; // Bed is always required for any room
    setNewCatRequired(prev => 
      prev.includes(tile) ? prev.filter(t => t !== tile) : [...prev, tile]
    );
  };

  const handleUpdateCategoryPrice = (id: string) => {
    updateRoomCategoryPrice(id, editingCatPrice);
    setEditingCatId(null);
    alert(`Room Category price updated!`);
  };

  const handleCreateBonusProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramName.trim()) return;

    createBonusProgram({
      id: `bp-custom-${Date.now()}`,
      name: newProgramName.trim(),
      description: newProgramDesc.trim() || 'Enrich traveler comfort levels.',
      costToActivate: Number(newProgramCost),
      privileges: newProgramPrivileges,
      isActive: false,
      enrollmentFee: Number(newProgramFee)
    });

    setNewProgramName('');
    setNewProgramDesc('');
    setNewProgramCost(3000);
    setNewProgramFee(30);
    setNewProgramPrivileges([]);
    alert(`Successfully launched loyalty program blueprint: "${newProgramName}"!`);
  };

  const togglePrivilege = (priv: string) => {
    setNewProgramPrivileges(prev => 
      prev.includes(priv) ? prev.filter(p => p !== priv) : [...prev, priv]
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 text-slate-100 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header with Chain Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500 font-black text-xs uppercase tracking-wider bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-500/20">
                Hotel Chain Headquarters
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Building2 className="text-amber-500 w-6 h-6" />
              <input
                type="text"
                value={chainName || 'My Hotel Chain'}
                onChange={(e) => setChainName(e.target.value)}
                className="bg-transparent text-2xl font-black text-white hover:bg-slate-900 focus:bg-slate-900 px-2 py-0.5 rounded border border-transparent focus:border-slate-800 focus:outline-none transition-colors w-full md:w-auto"
                title="Click to rename your hotel chain"
                placeholder="Enter Chain Name..."
              />
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Currently Managing: <strong className="text-white">{(hotels || []).length} Properties</strong> · Airline-simulator-style ops with real hotel KPIs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-900 border border-slate-800 p-2 rounded-xl">
            <span className="text-2xl">{activeBrand.icon}</span>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Hotel Brand</p>
              <p className="text-xs font-black text-white">{activeBrand.name}</p>
            </div>
          </div>
        </div>

        {/* Quick Statistics Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Treasury</p>
            <p className="text-lg sm:text-2xl font-black text-emerald-400 mt-0.5">${money.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy</p>
            <p className="text-lg sm:text-2xl font-black text-sky-400 mt-0.5">{operationsReport?.occupancyRate ?? 0}%</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RevPAR</p>
            <p className="text-lg sm:text-2xl font-black text-amber-400 mt-0.5">${operationsReport?.revpar ?? 0}</p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotel Time</p>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">D{gameDay} <span className="text-sm text-slate-400">{String(gameHour).padStart(2,'0')}:00</span></p>
          </div>
        </div>

        {/* Tab Navigation - Highly optimized for Mobile tap space */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-1 py-1 no-scrollbar scroll-smooth">
          <button 
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'operations' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Activity size={14} />
            Operations
          </button>
          <button 
            onClick={() => setActiveTab('chain')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'chain' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Building2 size={14} />
            Chain & Brands
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'staff' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Users size={14} />
            Staff ({staff.length})
          </button>
          <button 
            onClick={() => setActiveTab('guests')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'guests' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Crown size={14} />
            VIP & Guests
          </button>
          {/* Pricing tab removed per user request */}
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'categories' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <BedDouble size={14} />
            Room Categories
          </button>
          <button 
            onClick={() => setActiveTab('bonuses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'bonuses' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Gift size={14} />
            Loyalty Clubs
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'settings' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Gauge size={14} />
            Settings
          </button>
          <button 
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === 'presets' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Sparkles size={14} />
            AI Generator
          </button>
        </div>

        {/* Tab 0: Live Operations Center */}
        {activeTab === 'operations' && <OperationsDashboard />}

        {/* Tab 1: Chain HQ & Custom Brands */}
        {activeTab === 'chain' && (
          <div className="space-y-6">
            
            {/* Hotels List */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers size={18} className="text-amber-500" />
                  Your Hotel Portfolio
                </h3>
                <p className="text-slate-400 text-xs mt-1">Switch between hotels, change brands, and manage room setups.</p>
              </div>

              <div className="p-5 divide-y divide-slate-800/60 space-y-4">
                {(hotels || []).map((h) => {
                  const hotelBrand = allBrands.find(b => b.id === h.brandId) || DEFAULT_BRANDS[0];
                  const isActive = h.id === activeHotelId;

                  return (
                    <div key={h.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 first:pt-0 ${isActive ? 'bg-amber-500/5 -mx-5 px-5 py-4 rounded-xl border border-amber-500/10' : ''}`}>
                      <div className="space-y-1">
                        {renamingHotelId === h.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renamingHotelName}
                              onChange={(e) => setRenamingHotelName(e.target.value)}
                              className="px-2.5 py-1 text-sm bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-500"
                            />
                            <button
                              onClick={() => {
                                if (renamingHotelName.trim()) {
                                  updateHotelName(h.id, renamingHotelName.trim());
                                  setRenamingHotelId(null);
                                }
                              }}
                              className="px-2 py-1 bg-amber-500 text-slate-950 rounded text-xs font-black"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setRenamingHotelId(null)}
                              className="px-2 py-1 bg-slate-850 text-slate-400 rounded text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-white text-base">{h.name}</h4>
                            <button
                              onClick={() => {
                                setRenamingHotelId(h.id);
                                setRenamingHotelName(h.name);
                              }}
                              className="p-1 text-slate-500 hover:text-white transition-colors"
                              title="Rename Hotel"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{hotelBrand.icon}</span>
                          <span className="text-xs text-slate-400">Brand: <strong>{hotelBrand.name}</strong></span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                          Assets: {h.floors?.length || 1} Floors | Staff: {h.staff?.length || 0} | Balance: ${h.money?.toLocaleString() || 0}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Reposition Brand</span>
                          <select
                            value={h.brandId}
                            onChange={(e) => updateHotelBrand(h.id, e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 mt-1 focus:outline-none focus:border-amber-500"
                          >
                            {allBrands.map(b => (
                              <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                            ))}
                          </select>
                        </div>

                        {!isActive ? (
                          <button
                            onClick={() => setActiveHotel(h.id)}
                            className="px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-black transition-all"
                          >
                            Activate Hotel
                          </button>
                        ) : (
                          <span className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1">
                            <CheckCircle size={12} /> Currently Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Build New Hotel Panel */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus size={18} className="text-amber-500" />
                  Expand Portfolio: Build New Hotel
                </h3>
                <p className="text-slate-400 text-xs mt-1">Establish a new branch under your chain umbrella. New hotels start with a base $15,000 budget.</p>
              </div>
              <form onSubmit={handleBuildHotel} className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5 col-span-1 md:col-span-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Branch Location/Name</label>
                  <input
                    type="text"
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    placeholder="e.g. Royal Crest Inn"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-500 font-bold text-white text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-1 md:col-span-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Assign Brand Identity</label>
                  <select
                    value={newHotelBrand}
                    onChange={(e) => setNewHotelBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-500 text-slate-200 text-sm h-[38px]"
                  >
                    {allBrands.map(b => (
                      <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-sm transition-colors w-full h-[38px] flex items-center justify-center gap-2 col-span-1"
                >
                  <Building2 size={16} /> Construct Branch
                </button>
              </form>
            </div>

            {/* Brand Designer Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Existing Brand Showcase */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Palette size={16} className="text-amber-500" />
                    Available Brand Profiles
                  </h3>
                </div>
                <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto">
                  {allBrands.map((b) => (
                    <div key={b.id} className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{b.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{b.name}</h4>
                          <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-900 px-1.5 py-0.5 rounded">
                            {b.id.startsWith('b-custom') ? 'Custom Identity' : 'Standard Identity'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-amber-500 font-bold">VIP Spawn: {Math.round(b.vipSpawnRate * 100)}%</p>
                        <p className="text-slate-400">Spending Mult: {b.vipMultiplier}x</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Registration Form */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    Register Custom Brand
                  </h3>
                </div>
                <form onSubmit={handleCreateBrand} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Brand Name</label>
                      <input
                        type="text"
                        value={customBrandName}
                        onChange={(e) => setCustomBrandName(e.target.value)}
                        placeholder="e.g. NeoVibe Luxury"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Emblem/Emoji</label>
                      <select
                        value={customBrandIcon}
                        onChange={(e) => setCustomBrandIcon(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 h-[32px]"
                      >
                        <option value="🌟">🌟 Celestial</option>
                        <option value="💎">💎 Diamond</option>
                        <option value="🍃">🍃 Botanic</option>
                        <option value="🍷">🍷 Vintage</option>
                        <option value="🪐">🪐 Cosmic</option>
                        <option value="🏝️">🏝️ Oasis</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>VIP Spawning Rate</span>
                      <span className="text-amber-500">{Math.round(customBrandVipSpawn * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.50"
                      step="0.05"
                      value={customBrandVipSpawn}
                      onChange={(e) => setCustomBrandVipSpawn(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>VIP Checkout Spending Mult</span>
                      <span className="text-amber-500">{customBrandVipMult}x Payout</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.5"
                      step="0.1"
                      value={customBrandVipMult}
                      onChange={(e) => setCustomBrandVipMult(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Palette size={14} /> Register Custom Identity
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Staff Management */}
        {activeTab === 'staff' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-lg font-black text-white">Staff Management</h3>
              <p className="text-sm text-slate-400 mt-1">Recruit specialist staff to handle reception, cleaning, and administration.</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="border border-slate-800 rounded-lg p-4 text-center bg-slate-950/40 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white mb-1">Receptionist</h4>
                    <p className="text-xs text-slate-400 mb-3">Cost: $1,000 | Salary: $100/day</p>
                  </div>
                  <button 
                    onClick={() => hireStaff('receptionist')}
                    disabled={money < 1000}
                    className="w-full px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-black hover:bg-amber-600 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Hire Receptionist
                  </button>
                </div>
                <div className="border border-slate-800 rounded-lg p-4 text-center bg-slate-950/40 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white mb-1">Cleaner</h4>
                    <p className="text-xs text-slate-400 mb-3">Cost: $500 | Salary: $50/day</p>
                  </div>
                  <button 
                    onClick={() => hireStaff('cleaner')}
                    disabled={money < 500}
                    className="w-full px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-black hover:bg-amber-600 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Hire Cleaner
                  </button>
                </div>
                <div className="border border-slate-800 rounded-lg p-4 text-center bg-slate-950/40 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white mb-1">Manager</h4>
                    <p className="text-xs text-slate-400 mb-3">Cost: $2,000 | Salary: $200/day</p>
                  </div>
                  <button 
                    onClick={() => hireStaff('manager')}
                    disabled={money < 2000}
                    className="w-full px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-black hover:bg-amber-600 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Hire Manager
                  </button>
                </div>
              </div>

              {staff.length > 0 ? (
                <div>
                  <h4 className="font-bold text-slate-400 mb-3 uppercase text-[10px] tracking-wider">Current Branch Staff List</h4>
                  <div className="space-y-2">
                    {staff.map(s => (
                      <div key={s.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-slate-950/30 rounded-lg border border-slate-800 gap-3">
                        <div>
                          <p className="font-bold text-slate-200 text-sm">{s.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{s.role}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <select 
                            value={s.currentTask || 'Idle'} 
                            onChange={(e) => assignTask(s.id, e.target.value as any)}
                            className="px-2 py-1 text-xs border border-slate-800 rounded bg-slate-900 text-slate-100 focus:outline-none focus:border-amber-500"
                          >
                            <option value="Idle">Idle</option>
                            <option value="Clean Room">Clean Room</option>
                            <option value="Maintain Elevator">Maintain Elevator</option>
                            <option value="Check-in Guests">Check-in Guests</option>
                            <option value="Patrol">Patrol</option>
                          </select>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-300">Salary: ${s.salary}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center py-6 text-slate-500 text-sm italic">No employees currently active at this branch. Hire some above!</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: VIP Hub & Standard Guests */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            
            {/* VIP Guests Card */}
            <div className="bg-slate-900 rounded-xl border border-amber-500/20 overflow-hidden">
              <div className="p-5 border-b border-amber-500/10 bg-gradient-to-r from-amber-500/5 to-slate-900 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 rounded text-slate-950"><Crown size={18} /></div>
                  <div>
                    <h3 className="text-lg font-black text-white">VIP Guest Hub</h3>
                    <p className="text-sm text-slate-400 mt-1">Fulfill luxury requests of special guests to claim large check-out cash tips!</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {guests.filter(g => g.isVip).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guests.filter(g => g.isVip).map(g => {
                      const mappedNeeds = {
                        champagne: "🍾 Premium Champagne Room Service",
                        valet: "🤵 Personalized Front Desk Valet",
                        suite: "🌸 Suite Bedroom Comfort Decor",
                        spa: "🛁 Relaxing Spa & Bathroom Access"
                      };
                      const needLabel = g.vipNeed ? mappedNeeds[g.vipNeed] : "General luxury service";
                      const assignedStaffName = staff.find(s => s.id === g.vipAssignedStaff)?.name;

                      return (
                        <div key={g.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl space-y-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-amber-400">{g.name}</span>
                                <span className="animate-pulse text-amber-400"><Sparkles size={14} /></span>
                              </div>
                              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded mt-1 border bg-amber-950/60 text-amber-400 border-amber-900/30">
                                {g.state.replace(/-/g, ' ')} (Floor {g.floorIndex})
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Spend Factor</p>
                              <p className="text-xs font-black text-amber-400">{(activeBrand.vipMultiplier * 3.5).toFixed(1)}x Rate</p>
                            </div>
                          </div>

                          <div className="bg-slate-950/80 p-2.5 rounded border border-amber-500/20 text-xs">
                            <p className="font-semibold text-slate-400">Required Amenity / Service:</p>
                            <p className="font-bold text-amber-300 mt-1 flex items-center gap-1">{needLabel}</p>
                          </div>

                          {/* Satisfaction bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-400">Satisfaction</span>
                              <span className="text-amber-400 font-black">{Math.round(g.vipSatisfaction || 50)}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5">
                              <div 
                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${g.vipSatisfaction || 50}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Personal service dispatch */}
                          <div className="pt-2 border-t border-amber-500/10">
                            {g.vipAssignedStaff ? (
                              <div className="flex items-center justify-between text-xs text-slate-300">
                                <span>Attendant: <strong className="text-amber-400">{assignedStaffName}</strong></span>
                                <span className="text-emerald-400 font-bold animate-pulse">On duty...</span>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Dispatch Attendant</p>
                                {staff.length > 0 ? (
                                  <div className="flex gap-2">
                                    <select 
                                      id={`assign-vip-${g.id}`}
                                      className="flex-1 px-2 py-1 text-xs border border-slate-800 rounded bg-slate-900 text-slate-200 focus:outline-none focus:border-amber-500"
                                      defaultValue=""
                                    >
                                      <option value="" disabled>Select staff member...</option>
                                      {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => {
                                        const selectEl = document.getElementById(`assign-vip-${g.id}`) as HTMLSelectElement;
                                        if (selectEl && selectEl.value) {
                                          serviceVipGuest(g.id, selectEl.value);
                                        }
                                      }}
                                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-xs font-black transition whitespace-nowrap"
                                    >
                                      Assign
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500 italic">No staff hired yet to assign</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm italic">
                    No VIP guests are currently visiting. Establish beautiful high-satisfaction structures (Plants, Tables, Spas) and increase active ratings to spawn them!
                  </div>
                )}
              </div>
            </div>

            {/* Standard Guest Logs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-lg font-black text-white">Active Visitors List</h3>
                <p className="text-sm text-slate-400 mt-1">Live tracking of check-ins, bedroom stays, and check-outs across this hotel.</p>
              </div>
              <div className="p-5">
                {guests.filter(g => !g.isVip).length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {guests.filter(g => !g.isVip).map(g => (
                      <div key={g.id} className="flex justify-between items-center p-3 bg-slate-950/30 rounded-lg border border-slate-800 text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{g.name}</p>
                          <p className="text-[10px] text-slate-500">Floor Index: {g.floorIndex} | Satisfaction: <strong>{g.satisfaction || 75}%</strong></p>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 font-bold rounded border ${
                          g.state === 'in-room' ? 'bg-blue-950/60 text-blue-400 border-blue-900/30' :
                          g.state === 'checking-in' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/30' :
                          g.state === 'checking-out' ? 'bg-amber-950/60 text-amber-400 border-amber-900/30' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {g.state.replace(/-/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-6">No standard visitors are inside. Ensure you have Reception desks and beds drafted!</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Dynamic Pricing UI removed (empty/pricing tab) */}

        {/* Tab 5: AI & Presets */}
        {activeTab === 'presets' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-lg font-black text-white">AI Architect & Presets</h3>
              <p className="text-sm text-slate-400 mt-1">Automatically draft functional structural setups using LLM generation or preloaded templates.</p>
            </div>
            <div className="p-5">
              <div className="mb-6 p-4 border border-violet-900/30 bg-violet-950/10 rounded-xl">
                <h4 className="font-bold text-violet-400 mb-2 flex items-center gap-2">
                  <span className="text-lg">✨</span> Draft Hotel with AI
                </h4>
                <p className="text-xs text-violet-400 mb-3">Describe your ideal theme below. Requires a free Gemini API key in <code className="text-violet-300">.env.local</code>. Presets below work without a key.</p>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const prompt = (e.target as any).prompt.value;
                    if (!prompt) return;
                    
                    const btn = (e.target as any).submitBtn;
                    const prevText = btn.innerText;
                    btn.innerText = "Drafting Hotel...";
                    btn.disabled = true;

                    try {
                      const res = await fetch('/api/generate-hotel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt })
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        alert(data.error || 'AI generation failed. Add GEMINI_API_KEY to .env.local for AI features.');
                        return;
                      }
                      if (data.floors && Array.isArray(data.floors)) {
                        const parsedFloors = normalizeAiFloors(data.floors);
                        useHotelStore.setState({
                          floors: parsedFloors,
                          activeFloorIndex: 0,
                          appMode: 'Design',
                          viewMode: '2D',
                        });
                        alert(`AI Architect generated ${parsedFloors.length} floor(s) successfully!`);
                      } else if (data.grid) {
                        const parsedFloors = normalizeAiFloors([
                          { level: 0, name: 'AI Generated Floor', grid: data.grid, labels: data.labels || [] },
                        ]);
                        useHotelStore.setState({
                          floors: parsedFloors,
                          activeFloorIndex: 0,
                          appMode: 'Design',
                          viewMode: '2D',
                        });
                        alert('AI Architect has generated your ground floor successfully!');
                      } else {
                        alert("Failed to draft: " + JSON.stringify(data));
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Error contacting AI Architect.");
                    } finally {
                      btn.innerText = prevText;
                      btn.disabled = false;
                    }
                  }}
                  className="flex gap-2"
                >
                  <input 
                    type="text" 
                    name="prompt"
                    placeholder="e.g. Radisson Blu Olympiyskiy — luxury business hotel, 5 floors" 
                    className="flex-1 px-3 py-2 rounded-lg border border-violet-900 bg-slate-950 text-white focus:outline-none focus:border-violet-500 text-sm"
                  />
                  <button name="submitBtn" type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors whitespace-nowrap">
                    Draft Design
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  onClick={() => { loadPreset('small-hotel'); }}
                  className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left bg-slate-950/40"
                >
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><ArrowDownToLine size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Small Hotel Preset</h4>
                    <p className="text-xs text-slate-500 mt-0.5">2 Floors: Lobby & Rooms</p>
                  </div>
                </button>

                <button 
                  onClick={() => { loadPreset('luxury-suite'); }}
                  className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left bg-slate-950/40"
                >
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><ArrowDownToLine size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Luxury Penthouse</h4>
                    <p className="text-xs text-slate-500 mt-0.5">1 Floor: Executive Layout</p>
                  </div>
                </button>
              
                <button 
                  onClick={() => { loadPreset('auto-preset'); }}
                  className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left bg-slate-950/40"
                >
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><ArrowDownToLine size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Starter Bed & Desk</h4>
                    <p className="text-xs text-slate-500 mt-0.5">1 Floor: Basic Core Grid</p>
                  </div>
                </button>

                <button 
                  onClick={() => { loadPreset('radisson-blu-olimpiiskii'); }}
                  className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left bg-slate-950/40"
                >
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><Layers size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Radisson Blu Olimpiiskii</h4>
                    <p className="text-xs text-slate-500 mt-0.5">25 floors with 500 premium rooms in a luxury tower.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { loadPreset('spa-tower'); }}
                  className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left bg-slate-950/40"
                >
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><Sparkles size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Spa Tower</h4>
                    <p className="text-xs text-slate-500 mt-0.5">70 floors with 10 fully equipped rooms per floor plus spa, gym, and grand reception.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Room Categories */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BedDouble className="text-amber-500" />
                  Configure Room Categories
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Rooms are dynamically evaluated based on the furniture placed on each floor. Guests will check-in, receive an assigned category matching the floor amenities, and pay its custom nightly rates.
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(roomCategories || []).map((cat) => {
                    const extraTiles = Math.max(0, (cat.requiredTiles || []).length - 1);
                    const baselinePrice = 50 + extraTiles * 30;
                    const priceRatio = cat.price / baselinePrice;
                    let dealText = "Fair Price";
                    let dealColor = "text-slate-400 bg-slate-800";
                    if (priceRatio < 0.9) { dealText = "Great Bargain"; dealColor = "text-emerald-400 bg-emerald-950/50 border border-emerald-500/20"; }
                    else if (priceRatio > 1.6) { dealText = "Overpriced (Guests Complain)"; dealColor = "text-rose-400 bg-rose-950/50 border border-rose-500/20"; }
                    else if (priceRatio > 1.2) { dealText = "Premium Pricing"; dealColor = "text-amber-400 bg-amber-950/50 border border-amber-500/20"; }

                    return (
                      <div key={cat.id} className="p-4 border border-slate-800 rounded-xl bg-slate-950/30 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2 bg-slate-900 rounded-lg border border-slate-800">{cat.icon}</span>
                            <div>
                              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                {cat.name}
                                {cat.id.startsWith('rc-custom') && (
                                  <span className="text-[10px] bg-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-black uppercase">Custom</span>
                                )}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{cat.description}</p>
                            </div>
                          </div>

                          {!cat.id.startsWith('rc-custom') ? (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black uppercase">Core Type</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => deleteRoomCategory(cat.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded bg-slate-900 hover:bg-rose-950/30 transition-all border border-slate-800 hover:border-rose-500/20"
                              title="Delete category"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="border-t border-slate-800/60 pt-3 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold uppercase text-slate-500 mr-1.5">Required Layout:</span>
                          {(cat.requiredTiles || []).map((t) => (
                            <span key={t} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 capitalize">
                              🛠 {t}
                            </span>
                          ))}
                        </div>

                        <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nightly Rates</p>
                            {editingCatId === cat.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white text-sm">$</span>
                                <input
                                  type="number"
                                  value={editingCatPrice}
                                  onChange={(e) => setEditingCatPrice(Math.max(1, Number(e.target.value)))}
                                  className="w-16 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-white text-xs focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCategoryPrice(cat.id)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] px-2 py-1 rounded uppercase transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCatId(null)}
                                  className="text-slate-400 hover:text-white text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-base font-black text-emerald-400">${cat.price} / night</span>
                                <button
                                  type="button"
                                  onClick={() => { setEditingCatId(cat.id); setEditingCatPrice(cat.price); }}
                                  className="text-slate-500 hover:text-white p-1"
                                >
                                  <Edit3 size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Visitor Perception</p>
                            <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded mt-1.5 uppercase ${dealColor}`}>
                              {dealText}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Create Custom Category */}
            <form onSubmit={handleCreateCategory} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus className="text-emerald-500" />
                  Blueprint New Room Category
                </h3>
                <p className="text-slate-400 text-xs mt-1">Specify custom tile requirements and brand pricing tiers.</p>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Category Name</label>
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="e.g. Flora Deluxe, Skyline Studio"
                        className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Nightly Price ($)</label>
                        <input
                          type="number"
                          value={newCatPrice}
                          onChange={(e) => setNewCatPrice(Math.max(10, Number(e.target.value)))}
                          placeholder="80"
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Category Icon</label>
                        <select
                          value={newCatIcon}
                          onChange={(e) => setNewCatIcon(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                          <option value="🛌">🛌 Cozy Bed</option>
                          <option value="👑">👑 Crown Royal</option>
                          <option value="🌿">🌿 Flora Suite</option>
                          <option value="🌊">🌊 Ocean Breeze</option>
                          <option value="🌌">🌌 Stardust</option>
                          <option value="🏰">🏰 Penthouse Castle</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Associated Preset Layout (Optional)</label>
                      <select
                        value={newCatTemplateId}
                        onChange={(e) => setNewCatTemplateId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                      >
                        <option value="">-- No Layout Associated --</option>
                        {(floorTemplates || []).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.isBuiltIn ? 'Preset' : 'Saved'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Required Tile Checklist</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-2 p-1">
                          <input type="checkbox" checked disabled className="rounded border-slate-800 text-amber-500 accent-amber-500 cursor-not-allowed" />
                          <span className="text-xs text-slate-400 capitalize">bed (Always Required)</span>
                        </div>
                        {['bathroom', 'plant', 'table', 'window', 'elevator', 'reception'].map(tile => (
                          <label key={tile} className="flex items-center gap-2 p-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newCatRequired.includes(tile)}
                              onChange={() => toggleRequiredTile(tile)}
                              className="rounded border-slate-800 text-amber-500 accent-amber-500"
                            />
                            <span className="text-xs text-slate-300 capitalize">{tile}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Description</label>
                      <textarea
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        placeholder="A luxury master bedroom detailed with botanics and stunning panoramic windows."
                        className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm h-[80px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-lg shadow-amber-500/10 flex items-center gap-2 transition-all"
                  >
                    <Plus size={14} />
                    Register Custom Category
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Bonus & Loyalty Programs */}
        {activeTab === 'bonuses' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Gift className="text-amber-500" />
                  VIP Bonus & Loyalty Programs
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Activate exclusive hotel packages. Activating a loyalty program unlocks powerful passive privileges but requires an upfront funding cost. Guests will sign up for active clubs at check-in and pay a signup fee.
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(bonusPrograms || []).map((prog) => {
                    const activeStyle = prog.isActive 
                      ? "border-emerald-500 bg-emerald-950/20" 
                      : "border-slate-800 bg-slate-950/30";

                    return (
                      <div key={prog.id} className={`p-4 border rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all ${activeStyle}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{prog.name}</h4>
                              {prog.id.startsWith('bp-custom') && (
                                <span className="text-[9px] bg-indigo-900/40 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black uppercase">Custom</span>
                              )}
                              {prog.isActive && (
                                <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-black uppercase flex items-center gap-1">
                                  ● Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-3">{prog.description}</p>
                          </div>

                          {prog.id.startsWith('bp-custom') && (
                            <button
                              type="button"
                              onClick={() => deleteBonusProgram(prog.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded bg-slate-900 hover:bg-rose-950/30 transition-all border border-slate-800 hover:border-rose-500/20"
                              title="Delete loyalty program blueprint"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="border-t border-slate-800/60 pt-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">Privileges Unlocked:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(prog.privileges || []).map(priv => {
                              let privLabel = priv;
                              if (priv === 'lateCheckout') privLabel = "⌛ Late Checkout (1.5x stay, 1.2x rent)";
                              else if (priv === 'organicVibe') privLabel = "🌿 Organic Vibe (2x Plants Sat Boost)";
                              else if (priv === 'hygieneElite') privLabel = "🚿 Hygiene Elite (2x Bathroom Boost)";
                              else if (priv === 'staffLoungePlus') privLabel = "👔 Staff Lounge Plus (15% Wage Discount)";
                              else if (priv === 'vipWelcomeGift') privLabel = "👑 Royal Welcome (35% VIP Checkout Boost)";

                              return (
                                <span key={priv} className="text-[10px] bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded border border-slate-800 font-bold">
                                  {privLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Early-Bird Signup Fee</p>
                            <p className="text-sm font-black text-emerald-400 mt-0.5">+${prog.enrollmentFee} / guest</p>
                          </div>

                          <div>
                            {prog.isActive ? (
                              <button
                                type="button"
                                onClick={() => activateBonusProgram(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg uppercase tracking-wider transition-colors border border-slate-700"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => activateBonusProgram(prog.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] px-3.5 py-2 rounded-lg uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
                              >
                                Activate (${prog.costToActivate.toLocaleString()})
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Create Custom Loyalty Program Blueprint */}
            <form onSubmit={handleCreateBonusProgram} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950/40">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus className="text-emerald-500" />
                  Blueprint New Loyalty Program
                </h3>
                <p className="text-slate-400 text-xs mt-1">Design customizable customer tiers with tailored corporate privileges.</p>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Program Name</label>
                      <input
                        type="text"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                        placeholder="e.g. Royal Horizon Signature, Eco-Green Elite"
                        className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Activation Funding ($)</label>
                        <input
                          type="number"
                          value={newProgramCost}
                          onChange={(e) => setNewProgramCost(Math.max(100, Number(e.target.value)))}
                          placeholder="4000"
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Enrollment signup Fee ($)</label>
                        <input
                          type="number"
                          value={newProgramFee}
                          onChange={(e) => setNewProgramFee(Math.max(0, Number(e.target.value)))}
                          placeholder="45"
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Description / Marketing pitch</label>
                      <textarea
                        value={newProgramDesc}
                        onChange={(e) => setNewProgramDesc(e.target.value)}
                        placeholder="Provide high-end wellness privileges and luxury welcome gifts to checking in travelers."
                        className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500/50 text-sm h-[100px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase text-slate-400">Select Privileges to Bundles</label>
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                      {[
                        { id: 'lateCheckout', label: '⌛ Late Checkout (longer stay durations & +20% nightly rates)' },
                        { id: 'organicVibe', label: '🌿 Organic Vibe (doubles flora decoration satisfaction gains)' },
                        { id: 'hygieneElite', label: '🚿 Hygiene Elite (doubles luxury bath layout satisfaction gains)' },
                        { id: 'staffLoungePlus', label: '👔 Staff Lounge Plus (15% discount on hired employee salaries)' },
                        { id: 'vipWelcomeGift', label: '👑 Royal Welcome Gift (35% increase in VIP checkout payouts)' }
                      ].map(priv => (
                        <label key={priv.id} className="flex items-start gap-2.5 cursor-pointer select-none p-1 rounded hover:bg-slate-900 transition-colors">
                          <input
                            type="checkbox"
                            checked={newProgramPrivileges.includes(priv.id)}
                            onChange={() => togglePrivilege(priv.id)}
                            className="rounded border-slate-800 text-amber-500 accent-amber-500 mt-0.5"
                          />
                          <span className="text-xs text-slate-300 leading-relaxed">{priv.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-lg shadow-amber-500/10 flex items-center gap-2 transition-all"
                  >
                    <Plus size={14} />
                    Deploy Loyalty Blueprint
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Settings — Game Speed, Spawn Rate, Fire Safety, Guest Ledger */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Game Speed & Spawn Rate */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                <Gauge size={16} className="text-amber-500" />
                Simulation Controls
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Game Speed (1x–5x)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={gameSpeed}
                      onChange={(e) => setGameSpeed(Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-sm font-black text-amber-400 w-10 text-right">{gameSpeed}x</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Higher speeds advance game hours faster per tick.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Guest Spawn Rate (guests/sec)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.05}
                      max={20}
                      step={0.05}
                      value={guestSpawnRatePerSecond}
                      onChange={(e) => setGuestSpawnRatePerSecond(Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-sm font-black text-emerald-400 w-12 text-right">{guestSpawnRatePerSecond.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Adjust how quickly new guests arrive. Saved automatically.</p>
                </div>
              </div>
            </div>

            {/* Fire Safety Rating */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
                <Flame size={16} className="text-red-400" />
                Fire Safety Compliance
              </h3>
              {(() => {
                const rating = getFireSafetyRating();
                const ratingColor = rating >= 80 ? 'text-emerald-400' : rating >= 50 ? 'text-amber-400' : 'text-red-400';
                const ratingLabel = rating >= 80 ? 'Excellent' : rating >= 50 ? 'Fair' : 'Critical';
                return (
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-black ${ratingColor}`}>{rating}%</div>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Rating: {ratingLabel}</p>
                      <p className="text-[10px] text-slate-500">Based on exits, stairs, elevators, and bathroom coverage per floor.</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Guest Ledger */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-sky-400" />
                Guest Checkout Ledger
                <span className="text-[10px] font-bold text-slate-500 normal-case ml-2">(Last {guestLedger.length} guests)</span>
              </h3>
              {guestLedger.length === 0 ? (
                <p className="text-xs text-slate-500">No checkout records yet. Guests will appear here after checking out.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
                  {guestLedger.slice(0, 50).map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 rounded-lg p-3 border border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{entry.isVip ? '👑' : '🧑'}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{entry.guestName}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin size={8} /> {entry.nationality} · Floor {entry.floorIndex} · {entry.roomCategoryId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-400">+${entry.revenueGenerated.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500">Sat: {entry.finalSatisfaction}% · D{entry.checkOutDay}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Floor Management */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
                <Layers size={16} className="text-purple-400" />
                Floor Management
              </h3>
              <div className="space-y-2">
                {floors.map((floor, index) => (
                  <div key={floor.level} className="flex items-center justify-between bg-slate-950 rounded-lg p-3 border border-slate-800/60">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-400">L{floor.level}</span>
                      <input
                        type="text"
                        value={floor.name || `Level ${floor.level}`}
                        onChange={(e) => renameFloor(index, e.target.value)}
                        className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none px-1 py-0.5 w-40"
                        title="Rename floor"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (window.confirm(`Duplicate "${floor.name || `Level ${floor.level}`}"?`)) {
                            duplicateFloor(index);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded text-[10px] font-bold transition-colors"
                      >
                        <Copy size={10} /> Duplicate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
