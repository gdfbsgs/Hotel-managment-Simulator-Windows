import React from 'react';
import { useHotelStore } from '../store';
import { DEFAULT_BRANDS } from '../db';
import { HOTEL_MARKETS, getPhaseLabel, getSeasonMultiplier } from '../operations';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Building2,
  Clock,
  DollarSign,
  Globe,
  Megaphone,
  Star,
  TrendingUp,
  Users,
  Waves,
  CloudSun,
  CloudRain,
  Snowflake,
  Thermometer,
  Sun,
  Cloud,
  Umbrella
} from 'lucide-react';

function KpiCard({
  label,
  value,
  sub,
  accent = 'text-white',
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon: React.FC<{ size?: number; className?: string }>;
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon size={14} className="text-slate-600" />
      </div>
      <p className={`text-xl sm:text-2xl font-black ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1 font-medium">{sub}</p>}
    </div>
  );
}

export const OperationsDashboard: React.FC = () => {
  const {
    operationsReport,
    operationsHistory,
    marketId,
    marketingBudget,
    setMarket,
    setMarketingBudget,
    gameDay,
    gameHour,
    guests,
    floors,
    staff,
    money,
    activeHotelBrandId,
    customBrands,
    chainName,
    setChainName,
    hotels,
    activeHotelId,
    weather,
    season,
    updateWeather,
    updateSeason,
  } = useHotelStore();

  const allBrands = [...DEFAULT_BRANDS, ...(customBrands || [])];
  const activeBrand = allBrands.find((b) => b.id === activeHotelBrandId) || DEFAULT_BRANDS[0];
  const activeHotel = hotels.find((h) => h.id === activeHotelId);
  const market = HOTEL_MARKETS.find((m) => m.id === marketId) || HOTEL_MARKETS[0];
  const season = getSeasonMultiplier(gameDay);
  const report = operationsReport;

  const hourLabel = `${String(gameHour).padStart(2, '0')}:00`;
  const dayLabel = `Day ${gameDay}`;

  const demandPercent = report?.demandScore ?? 50;
  const occupancy = report?.occupancyRate ?? 0;
  const adr = report?.adr ?? 0;
  const revpar = report?.revpar ?? 0;
  const gop = report?.gop ?? 0;
  const margin = report?.operatingMargin ?? 0;
  const compAdr = report?.compSetAdr ?? market.compSetAdr;
  const adrVsMarket = compAdr > 0 ? Math.round(((adr - compAdr) / compAdr) * 100) : 0;

  const recentGop = operationsHistory.slice(-6);
  const maxRev = Math.max(...recentGop.map((r) => r.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Live ops header — airline-style command center */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-amber-500 animate-pulse" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Live Operations Center</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{activeHotel?.name || 'Active Property'}</h3>
            <p className="text-slate-400 text-sm mt-1">
              {chainName} · {activeBrand.icon} {activeBrand.name} · {market.icon} {market.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock size={18} className="text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Hotel Time</p>
                <p className="text-sm font-black text-white">{dayLabel} · {hourLabel}</p>
                <p className="text-[10px] text-amber-500/80">{report ? getPhaseLabel(report.phase as any) : 'Starting shift...'}</p>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{season.icon}</span>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Season</p>
                <p className="text-sm font-black text-white">{season.name}</p>
                <p className="text-[10px] text-slate-400">Demand ×{season.multiplier.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">
                {weather?.type === 'sunny' ? '☀️' : weather?.type === 'cloudy' ? '☁️' : weather?.type === 'rainy' ? '🌧️' : weather?.type === 'snowy' ? '❄️' : '⛈️'}
              </span>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Weather</p>
                <p className="text-sm font-black text-white">{weather?.description || 'Clear'}</p>
                <p className="text-[10px] text-slate-400">{weather?.temperature || 22}°C</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core KPIs — RevPAR, ADR, Occupancy like airline yield metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Occupancy" value={`${occupancy}%`} sub={`${report?.guestsInHouse ?? 0} / ${report?.guestCapacity ?? 0} guests`} accent="text-sky-400" icon={BedDouble} />
        <KpiCard label="ADR" value={`$${adr}`} sub={adrVsMarket >= 0 ? `+${adrVsMarket}% vs market ($${compAdr})` : `${adrVsMarket}% vs market ($${compAdr})`} accent="text-emerald-400" icon={DollarSign} />
        <KpiCard label="RevPAR" value={`$${revpar}`} sub={`${report?.roomsAvailable ?? 0} rooms in inventory`} accent="text-amber-400" icon={TrendingUp} />
        <KpiCard label="GOP / Hour" value={`$${(gop ?? 0).toLocaleString()}`} sub={`${margin}% operating margin`} accent={gop >= 0 ? 'text-emerald-400' : 'text-red-400'} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Demand meter */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-violet-400" />
            <h4 className="font-black text-white text-sm">Market Demand</h4>
          </div>
          <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-2">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${demandPercent}%` }}
            />
          </div>
          <p className="text-2xl font-black text-white">{demandPercent}<span className="text-sm text-slate-500">/100</span></p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{market.description}</p>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Business</p>
              <p className="text-sm font-black text-white">{Math.round(market.businessShare * 100)}%</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Leisure</p>
              <p className="text-sm font-black text-white">{Math.round(market.leisureShare * 100)}%</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Groups</p>
              <p className="text-sm font-black text-white">{Math.round(market.groupShare * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Live guest flow */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-sky-400" />
            <h4 className="font-black text-white text-sm">Guest Flow (Live)</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">Arrivals in progress</span>
              </div>
              <span className="text-lg font-black text-white">{report?.arrivalsInProgress ?? guests.filter(g => g.state === 'checking-in').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <BedDouble size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-300">In-house guests</span>
              </div>
              <span className="text-lg font-black text-white">{report?.guestsInHouse ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-950/20 border border-orange-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={16} className="text-orange-400" />
                <span className="text-xs font-bold text-orange-300">Departures in progress</span>
              </div>
              <span className="text-lg font-black text-white">{report?.departuresInProgress ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Guest satisfaction</span>
              </div>
              <span className="text-lg font-black text-white">{report?.avgSatisfaction ?? 75}%</span>
            </div>
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-emerald-400" />
            <h4 className="font-black text-white text-sm">Revenue Mix (Hourly)</h4>
          </div>
               {report ? (
                 <div className="space-y-2">
                   {[
                     { label: 'Room Revenue', value: report.roomRevenue, color: 'bg-emerald-500' },
                     { label: 'F&B / Amenities', value: report.fbRevenue, color: 'bg-amber-500' },
                     { label: 'VIP Ancillary', value: report.ancillaryRevenue, color: 'bg-violet-500' },
                   ].map((row) => (
                     <div key={row.label}>
                       <div className="flex justify-between text-xs mb-1">
                         <span className="text-slate-400">{row.label}</span>
                         <span className="font-bold text-white">${(row.value ?? 0).toLocaleString()}</span>
                       </div>
                       <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                         <div className={`h-full ${row.color} rounded-full`} style={{ width: `${report.revenue > 0 ? (row.value / report.revenue) * 100 : 0}%` }} />
                       </div>
                     </div>
                   ))}
                   <div className="pt-3 mt-3 border-t border-slate-800 flex justify-between">
                     <span className="text-xs font-bold text-slate-400">Total Revenue</span>
                     <span className="text-sm font-black text-emerald-400">${(report.revenue ?? 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-xs font-bold text-slate-400">Operating Costs</span>
                     <span className="text-sm font-black text-red-400">-${(report.expenses?.total ?? 0).toLocaleString()}</span>
                   </div>
                 </div>
               ) : (
            <p className="text-xs text-slate-500">Operations data loads after the first hourly tick...</p>
          )}
        </div>
      </div>

      {/* Market selection + marketing — like picking routes/hubs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-amber-500" />
              <h4 className="font-black text-white text-sm">Property Market Position</h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">Like choosing hub cities in Airline Simulator — each market has unique demand curves.</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HOTEL_MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  marketId === m.id
                    ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{m.icon}</span>
                  <span className="text-xs font-black text-white">{m.name}</span>
                </div>
                <p className="text-[10px] text-slate-500">Comp ADR ${m.compSetAdr} · Demand {m.baseDemand}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-fuchsia-400" />
              <h4 className="font-black text-white text-sm">Marketing & Distribution</h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">Boost demand like airline route promotion. Daily spend: ${marketingBudget}/day</p>
          </div>
          <div className="p-5 space-y-4">
            <input
              type="range"
              min={0}
              max={500}
              step={25}
              value={marketingBudget}
              onChange={(e) => setMarketingBudget(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>$0 (Organic)</span>
              <span className="font-black text-amber-400">${marketingBudget}/day</span>
              <span>$500 (Aggressive)</span>
            </div>
            {report && (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  ['Staff Payroll', report.expenses.staffPayroll],
                  ['Electricity', report.expenses.electricity],
                  ['Water', report.expenses.water],
                  ['Utilities', report.expenses.utilities],
                  ['Housekeeping', report.expenses.housekeeping],
                  ['Maintenance', report.expenses.maintenance],
                  ['Marketing', report.expenses.marketing],
                  ['Property Tax', report.expenses.propertyTax],
                  ['Income Tax', report.expenses.incomeTax],
                  ['Room Tax', report.expenses.roomTax],
                  ['Waste Mgmt', report.expenses.wasteManagement],
                  ['Security', report.expenses.security],
                  ['Staff Training', report.expenses.staffTraining],
                  ['Insurance', report.expenses.insurance],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-slate-300">${((val as number) ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini revenue trend */}
      {recentGop.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Waves size={16} className="text-sky-400" />
            <h4 className="font-black text-white text-sm">Recent Hourly Performance</h4>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {recentGop.map((r, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${r.gop >= 0 ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                  style={{ height: `${Math.max(8, (r.revenue / maxRev) * 100)}%` }}
                  title={`Hour ${r.gameHour}: $${r.revenue} revenue`}
                />
                <span className="text-[8px] text-slate-600">{r.gameHour}h</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3">
            Treasury: <strong className="text-emerald-400">${money.toLocaleString()}</strong> · Staff: {staff.length} · Floors: {floors.length} · Star Rating: {report?.starRating?.toFixed(1) ?? '—'}★
          </p>
        </div>
      )}
    </div>
  );
};
