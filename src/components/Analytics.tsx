import React, { useMemo, useState } from 'react';
import { useHotelStore } from '../store';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Crown, CheckCircle2, Trophy, Sparkles, Layers, Briefcase, Share2, Check } from 'lucide-react';

const getMilestoneIcon = (type: string) => {
  switch (type) {
    case 'floors': return Layers;
    case 'guests': return Users;
    case 'money': return DollarSign;
    case 'staff': return Briefcase;
    default: return Sparkles;
  }
};

const getMilestoneProgress = (m: any, floorsCount: number, guestsServed: number, currentMoney: number, staffCount: number) => {
  let current = 0;
  let target = m.targetValue;
  
  switch (m.targetType) {
    case 'floors':
      current = floorsCount;
      break;
    case 'guests':
      current = guestsServed;
      break;
    case 'money':
      current = currentMoney;
      break;
    case 'staff':
      current = staffCount;
      break;
  }

  const percent = target > 0 ? (current / target) * 100 : 0;
  
  let label = '';
  if (m.targetType === 'money') {
    label = `$${current.toLocaleString()} / $${target.toLocaleString()}`;
  } else {
    label = `${current} / ${target}`;
  }

  return { percent, label };
};

const getRarityCardStyle = (m: any) => {
  if (!m.unlocked) {
    return 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700';
  }
  switch (m.rarity) {
    case 'bronze':
      return 'bg-orange-500/5 border-orange-500/20 shadow-sm';
    case 'silver':
      return 'bg-slate-400/5 border-slate-500/20 shadow-sm';
    case 'gold':
    default:
      return 'bg-amber-500/5 border-amber-500/20 shadow-sm';
  }
};

const getRarityIconStyle = (m: any) => {
  if (!m.unlocked) {
    return 'bg-slate-900 text-slate-500';
  }
  switch (m.rarity) {
    case 'bronze':
      return 'bg-orange-500/10 text-orange-400';
    case 'silver':
      return 'bg-slate-400/10 text-slate-300';
    case 'gold':
    default:
      return 'bg-amber-500/10 text-amber-400';
  }
};

const getRarityBadge = (rarity?: 'bronze' | 'silver' | 'gold') => {
  switch (rarity) {
    case 'bronze':
      return <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-900/40">Bronze</span>;
    case 'silver':
      return <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Silver</span>;
    case 'gold':
    default:
      return <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-900/40 animate-pulse">Gold</span>;
  }
};

const getRarityTrophyColor = (rarity?: 'bronze' | 'silver' | 'gold') => {
  switch (rarity) {
    case 'bronze':
      return 'text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.4)]';
    case 'silver':
      return 'text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]';
    case 'gold':
    default:
      return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]';
  }
};

export const Analytics: React.FC = () => {
  const { floors, guests, staff, money, totalGuestsServed, milestones, hotels } = useHotelStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = async (m: any) => {
    const rarityLabel = m.rarity 
      ? m.rarity.charAt(0).toUpperCase() + m.rarity.slice(1)
      : 'Gold';
    const activeHotel = hotels?.[0] || { name: 'Grand Plaza Resort' };
    const shareText = `🏆 ArchHotel Milestone Unlocked! 🏆
---------------------------------------------
⭐ Achievement: ${m.title} (${rarityLabel} Milestone)
📝 Description: ${m.description}

Built and managed with ArchHotel Suite!`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const unlockedCount = useMemo(() => milestones.filter(m => m.unlocked).length, [milestones]);

  const totalBeds = useMemo(() => {
    let count = 0;
    floors.forEach(f => {
      f.grid.forEach(row => {
        row.forEach(cell => {
          if (cell === 'bed') count++;
        });
      });
    });
    return count * 2; // Assuming 2 capacity per bed based on store logic
  }, [floors]);

  const occupancyRate = totalBeds > 0 ? (guests.length / totalBeds) * 100 : 0;

  const satisfactionScore = useMemo(() => {
    if (guests.length === 0) return 85; // Default baseline

    let totalScore = 0;
    guests.forEach(g => {
      if (g.isVip) {
        totalScore += g.vipSatisfaction !== undefined ? g.vipSatisfaction : 50;
      } else {
        totalScore += g.satisfaction !== undefined ? g.satisfaction : 75;
      }
    });

    return totalScore / guests.length;
  }, [guests]);

  const workingStaff = staff.filter(s => s.currentTask && s.currentTask !== 'Idle').length;
  const efficiency = staff.length > 0 ? (workingStaff / staff.length) * 100 : 0;

  const vipGuests = useMemo(() => guests.filter(g => g.isVip), [guests]);
  const vipSatisfactionScore = useMemo(() => {
    if (vipGuests.length === 0) return 100;
    return vipGuests.reduce((acc, v) => acc + (v.vipSatisfaction || 50), 0) / vipGuests.length;
  }, [vipGuests]);

  // Fake historical data for charts
  const revenueData = [
    { name: 'Mon', revenue: Math.max(1000, money * 0.8) },
    { name: 'Tue', revenue: Math.max(1200, money * 0.85) },
    { name: 'Wed', revenue: Math.max(1100, money * 0.9) },
    { name: 'Thu', revenue: Math.max(1400, money * 0.92) },
    { name: 'Fri', revenue: Math.max(1800, money * 0.95) },
    { name: 'Sat', revenue: Math.max(2000, money * 0.98) },
    { name: 'Sun', revenue: money },
  ];

  const occupancyData = [
    { name: '08:00', rate: Math.max(0, occupancyRate - 20) },
    { name: '10:00', rate: Math.max(0, occupancyRate - 10) },
    { name: '12:00', rate: Math.max(0, occupancyRate - 5) },
    { name: '14:00', rate: occupancyRate },
    { name: '16:00', rate: Math.min(100, occupancyRate + 5) },
    { name: '18:00', rate: Math.min(100, occupancyRate + 15) },
  ];

  const staffData = [
    { name: 'Working', value: workingStaff },
    { name: 'Idle', value: staff.length - workingStaff },
  ];
  const COLORS = ['#10b981', '#1e293b'];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Analytics Overview</h2>
          <p className="text-slate-400 text-sm mt-1">Key performance indicators and hotel statistics.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users size={16} className="text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{occupancyRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">{guests.length} / {totalBeds} capacity</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign size={16} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${money.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Current total balance</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guest Satisfaction</p>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{satisfactionScore.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Based on fulfilled needs</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIP Satisfaction</p>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Crown size={16} className="text-amber-400 animate-pulse" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-400">{vipSatisfactionScore.toFixed(1)}%</p>
            <p className="text-xs text-amber-500/80 font-medium mt-1">{vipGuests.length} VIP in-house</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Efficiency</p>
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Activity size={16} className="text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{efficiency.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Active / Total employees</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <h3 className="text-lg font-black text-white mb-4">Revenue Trend (Weekly)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc' }}
                    formatter={(value: number) => [`$${value.toFixed(0)}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <h3 className="text-lg font-black text-white mb-4">Occupancy Today</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Occupancy']}
                    cursor={{ fill: '#1e293b' }}
                  />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-black text-white mb-4">Staff Task Distribution</h3>
          <div className="flex items-center flex-col md:flex-row gap-8">
            <div className="h-48 w-48">
              {staff.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={staffData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {staffData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm italic">
                  No staff hired
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Active Tasks
                  </span>
                  <span className="text-white font-bold">{workingStaff}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${efficiency}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-800"></span> Idle
                  </span>
                  <span className="text-white font-bold">{staff.length - workingStaff}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2">
                  <div className="bg-slate-800 h-2 rounded-full" style={{ width: `${staff.length > 0 ? ((staff.length - workingStaff) / staff.length) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones Card Block */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-lg font-black text-white">Hotel Milestones</h3>
              <p className="text-xs text-slate-400 mt-0.5">Reach unique goals to grow your five-star reputation.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
              <Trophy size={14} className="text-amber-400" />
              {unlockedCount} / {milestones.length} Completed
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((m) => {
              const Icon = getMilestoneIcon(m.targetType);
              const progress = getMilestoneProgress(m, floors.length, totalGuestsServed || 0, money, staff.length);

              return (
                <div 
                  key={m.id} 
                  className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between transition-all ${getRarityCardStyle(m)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getRarityIconStyle(m)} relative`}>
                      <Icon size={18} />
                      {m.unlocked && (
                        <Trophy 
                          size={10} 
                          className={`absolute -bottom-1 -right-1 p-0.5 bg-slate-950 rounded-full border border-slate-800 ${getRarityTrophyColor(m.rarity)}`} 
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <h4 className="font-bold text-white text-xs sm:text-sm truncate" title={m.title}>
                          {m.title}
                        </h4>
                        {getRarityBadge(m.rarity)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    {m.unlocked ? (
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Unlocked!
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-normal">
                            {m.unlockedAt || 'Completed'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleShare(m)}
                            className={`p-1 rounded transition-all cursor-pointer border ${
                              copiedId === m.id 
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' 
                                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                            }`}
                            title="Share achievement"
                          >
                            {copiedId === m.id ? (
                              <Check size={10} className="text-emerald-400" />
                            ) : (
                              <Share2 size={10} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Progress</span>
                          <span>{progress.label}</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, progress.percent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
