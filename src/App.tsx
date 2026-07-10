/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100vh',
            width: '100vw',
            background: '#0b1220',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 860,
              width: '100%',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(2,6,23,0.65)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
              Runtime error (white screen fix)
            </h2>
            <p style={{ marginTop: 8, opacity: 0.9 }}>
              The app crashed while rendering. See console for stack trace.
            </p>
            <pre
              style={{
                marginTop: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'rgba(15,23,42,0.9)',
                border: '1px solid rgba(148,163,184,0.25)',
                padding: 12,
                borderRadius: 10,
                color: '#f8fafc',
                maxHeight: 360,
                overflow: 'auto',
              }}
            >
              {String(this.state.error?.stack || this.state.error || 'Unknown error')}
            </pre>
            <p style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
              If you share the stack trace line(s) here, we can patch the exact issue.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


import { Sidebar } from './components/Sidebar';
import { Editor2D } from './components/Editor2D';
import { Viewer3D } from './components/Viewer3D';
import { Management } from './components/Management';
import { Analytics } from './components/Analytics';
import { AnimatedMoney } from './components/AnimatedMoney';
import { useHotelStore } from './store';
import { DEFAULT_BRANDS } from './db';
import { Box, Layers, LogIn, LogOut, Save, User as UserIcon, Trophy, Sparkles, Star, Building2, TrendingUp, Menu, X, Share2, Check } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import Onboarding from './components/Onboarding';

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  const { 
    viewMode, 
    setViewMode, 
    appMode, 
    setAppMode, 
    user, 
    setUser, 
    login, 
    logout, 
    loadFromCloud, 
    saveToCloud,
    saveToLocal,
    loadFromLocal,
    money, 
    activeMilestoneNotification, 
    dismissMilestoneNotification,
    floors,
    totalGuestsServed,
    guests,
    hotels,
    activeHotelId,
    activeHotelBrandId,
    customBrands
  } = useHotelStore();

  const starRating = React.useMemo(() => {
    const currentFloorsCount = floors.length;
    const currentGuestsCount = totalGuestsServed || 0;
    
    // Average guest satisfaction score
    const inRoomGuests = guests.filter(g => g.state === 'in-room');
    const avgSatisfaction = inRoomGuests.length > 0
      ? inRoomGuests.reduce((acc, g) => acc + (g.isVip ? (g.vipSatisfaction || 50) : (g.satisfaction || 75)), 0) / inRoomGuests.length
      : 75;

    // Award rating points:
    // - Base: 1.0 star
    // - Floors: max 1.5 stars (0.15 stars per floor, capped at 10 floors)
    // - Guests Served: max 1.5 stars (0.05 stars per guest served, up to 30 guests)
    // - Satisfaction: max 1.0 star (avgSatisfaction / 100 * 1.0)
    const floorStars = Math.min(1.5, currentFloorsCount * 0.15);
    const guestStars = Math.min(1.5, currentGuestsCount * 0.05);
    const satisfactionStars = (avgSatisfaction / 100) * 1.0;

    const totalRating = 1.0 + floorStars + guestStars + satisfactionStars;
    return Math.min(5.0, Math.max(1.0, Math.round(totalRating * 10) / 10));
  }, [floors, totalGuestsServed, guests]);

  const activeHotel = (hotels || []).find(h => h.id === activeHotelId) || hotels?.[0] || { name: 'Grand Plaza Resort', brandId: 'b-budget' };
  const allBrands = [...DEFAULT_BRANDS, ...(customBrands || [])];
  const activeBrand = allBrands.find(b => b.id === (activeHotel.brandId || activeHotelBrandId)) || DEFAULT_BRANDS[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadFromCloud(u.uid);
      } else {
        const loaded = loadFromLocal();
        setSaveStatus(loaded ? 'saved' : 'idle');
        if (!loaded) {
          // trigger onboarding when no local save exists
          useHotelStore.getState().startOnboarding();
        }
      }
    });
    return unsub;
  }, [loadFromCloud, loadFromLocal]);

  useEffect(() => {
    if (user) return;

    const autoSave = setInterval(() => {
      setSaveStatus('saving');
      saveToLocal();
      setSaveStatus('saved');
    }, 30000);

    return () => clearInterval(autoSave);
  }, [user, saveToLocal]);

  useEffect(() => {
    const handleAutoSave = () => {
      if (!user) {
        if (saveToLocal()) {
          setSaveStatus('saved');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleAutoSave);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleAutoSave);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, saveToLocal]);

  useEffect(() => {
    // Process guests and earn money every 5 seconds
    const interval = setInterval(() => {
      useHotelStore.getState().processGuests();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Tick NPCs for movement and state updates every 1 second
    const interval = setInterval(() => {
      useHotelStore.getState().tickNPCs();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    if (!activeMilestoneNotification) return;
    const rarityLabel = activeMilestoneNotification.rarity 
      ? activeMilestoneNotification.rarity.charAt(0).toUpperCase() + activeMilestoneNotification.rarity.slice(1)
      : 'Gold';
    const shareText = `🏆 ArchHotel Milestone Unlocked! 🏆
---------------------------------------------
⭐ Achievement: ${activeMilestoneNotification.title} (${rarityLabel} Milestone)
📝 Description: ${activeMilestoneNotification.description}

🏨 Hotel: ${activeHotel.name}
🏷️ Brand: ${activeBrand.name} ${activeBrand.icon}
📐 Layout: ${floors.length} Floor(s)
👥 Guests Served: ${totalGuestsServed}

Built and managed with ArchHotel Suite!`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const rarityStyles = {
    bronze: {
      badgeBg: 'bg-orange-950/40 border-orange-500/20 text-orange-400',
      iconColor: 'text-orange-500',
      iconBg: 'border-orange-500/20 bg-orange-950/10',
      cardBorder: 'border-orange-500/30',
      glowColor: 'bg-orange-500/10',
      sparklesColor: 'text-orange-400',
      labelText: 'Bronze Milestone 🥉',
    },
    silver: {
      badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
      iconColor: 'text-slate-300',
      iconBg: 'border-slate-700 bg-slate-800/20',
      cardBorder: 'border-slate-700',
      glowColor: 'bg-slate-500/10',
      sparklesColor: 'text-slate-400',
      labelText: 'Silver Milestone 🥈',
    },
    gold: {
      badgeBg: 'bg-amber-950/40 border-amber-500/20 text-amber-400',
      iconColor: 'text-amber-400',
      iconBg: 'border-amber-500/20 bg-amber-950/10',
      cardBorder: 'border-amber-500/30',
      glowColor: 'bg-amber-500/10',
      sparklesColor: 'text-amber-400',
      labelText: 'Gold Milestone 🥇',
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden pb-16 sm:pb-0">
      <nav className="h-16 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/15 shrink-0">
              <span className="text-slate-950 font-black text-base">{activeBrand.icon}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold tracking-tight text-white leading-none text-sm">
                {activeHotel.name}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-[0.18em] mt-0.5">
                {activeBrand.name}
              </span>
            </div>
          </div>
          <div className="hidden xl:flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/85 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {appMode} Mode
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
              View {viewMode}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {Array.from({ length: 5 }).map((_, i) => {
              const val = i + 1;
              const isFilled = val <= Math.round(starRating);
              return (
                <Star
                  key={i}
                  size={10}
                  className={`${isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                />
              );
            })}
            <span className="text-[9px] text-slate-400 font-bold font-mono ml-1">({starRating.toFixed(1)} ★)</span>
          </div>
        </div>

        <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider hidden sm:flex">


          <span
            onClick={() => setAppMode('Design')}
            className={`cursor-pointer transition-colors ${appMode === 'Design' ? 'text-amber-500 border-b-2 border-amber-500 pb-1.5 mt-1' : 'text-slate-400 hover:text-white mt-1'}`}>
            Design
          </span>
          <span
            onClick={() => setAppMode('Management')}
            className={`cursor-pointer transition-colors ${appMode === 'Management' ? 'text-amber-500 border-b-2 border-amber-500 pb-1.5 mt-1' : 'text-slate-400 hover:text-white mt-1'}`}>
            Management
          </span>
          <span
            onClick={() => setAppMode('Analytics')}
            className={`cursor-pointer transition-colors ${appMode === 'Analytics' ? 'text-amber-500 border-b-2 border-amber-500 pb-1.5 mt-1' : 'text-slate-400 hover:text-white mt-1'}`}>
            Analytics
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <AnimatedMoney money={money} />
          {appMode === 'Design' && (
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 shadow-inner scale-90 sm:scale-100">
              <button
                onClick={() => setViewMode('2D')}
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all uppercase tracking-wide ${
                  viewMode === '2D'
                    ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}>
                2D
              </button>
              <button
                onClick={() => setViewMode('3D')}
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all uppercase tracking-wide ${
                  viewMode === '3D'
                    ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}>
                3D
              </button>
              <button
                onClick={() => setViewMode('Walk')}
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all uppercase tracking-wide ${
                  viewMode === 'Walk'
                    ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}>
                Walk
              </button>
            </div>
          )}
          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />
          {user ? (
            <>
              <button onClick={saveToCloud} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded font-medium shadow-sm hover:bg-emerald-700 transition-colors hidden sm:flex">
                <Save size={14} /> Save Cloud
              </button>
              <div className="relative group">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer">
                  {user.photoURL ? <img src={user.photoURL} alt="User" /> : <UserIcon size={16} className="text-slate-300" />}
                </div>
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-900 border border-slate-800 shadow-lg rounded py-1 z-50 min-w-[120px]">
                  <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800 truncate">{user.email}</div>
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-850 flex items-center gap-2">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setSaveStatus('saving');
                  const ok = saveToLocal();
                  setSaveStatus(ok ? 'saved' : 'idle');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded font-medium shadow-sm hover:bg-emerald-700 transition-colors hidden sm:flex"
              >
                <Save size={14} /> Save
              </button>
              <button onClick={login} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 text-slate-950 rounded font-bold shadow-md hover:bg-amber-600 transition-colors">
                <LogIn size={14} /> Sign In
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        <Onboarding />
        {appMode === 'Design' && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              {viewMode === '2D' && <Sidebar />}
            </div>

            {/* Mobile Sidebar Overlay */}
            {viewMode === '2D' && mobileSidebarOpen && (
              <div className="md:hidden fixed inset-y-14 right-0 w-64 bg-slate-900 border-l border-slate-800 z-30 shadow-2xl overflow-y-auto">
                <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <span className="text-xs font-bold text-slate-400 uppercase">Toolbox & Floors</span>
                  <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <Sidebar />
              </div>
            )}

            {/* Floating Mobile Toolbox Button */}
            {viewMode === '2D' && (
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="md:hidden fixed bottom-20 right-4 z-30 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-full shadow-2xl font-black flex items-center gap-1.5 border border-amber-400 text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                {mobileSidebarOpen ? <X size={14} /> : <Layers size={14} />}
                <span>{mobileSidebarOpen ? 'Close Tools' : 'Tools & Floors'}</span>
              </button>
            )}

            <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
              {viewMode === '2D' ? <Editor2D /> : <Viewer3D mode={viewMode} />}
            </main>
          </>
        )}
        {appMode === 'Management' && <Management />}
        {appMode === 'Analytics' && <Analytics />}
      </div>
      
      {/* Mobile Bottom Navigation Bar (Visible only on screens < sm) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 z-30 flex items-center justify-around px-2 shadow-xl shrink-0">
        <button
          onClick={() => setAppMode('Design')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-all ${
            appMode === 'Design' ? 'text-amber-500 font-black scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers size={18} />
          <span className="text-[10px] mt-1 font-bold">Design</span>
        </button>
        
        <button
          onClick={() => setAppMode('Management')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-all ${
            appMode === 'Management' ? 'text-amber-500 font-black scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 size={18} />
          <span className="text-[10px] mt-1 font-bold">HQ & Staff</span>
        </button>
        
        <button
          onClick={() => setAppMode('Analytics')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-all ${
            appMode === 'Analytics' ? 'text-amber-500 font-black scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp size={18} />
          <span className="text-[10px] mt-1 font-bold">Analytics</span>
        </button>

        <button
          onClick={() => {
            setSaveStatus('saving');
            const ok = saveToLocal();
            setSaveStatus(ok ? 'saved' : 'idle');
          }}
          className="flex flex-col items-center justify-center w-20 h-full transition-all text-slate-400 hover:text-white"
        >
          <Save size={18} />
          <span className="text-[10px] mt-1 font-bold">Save</span>
        </button>
      </div>

      <footer className="h-7 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-medium z-20 relative hidden sm:flex">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Engine Active</span>
          <span>Grid: 0.50m</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-500">
            {user ? 'Cloud sync available' : saveStatus === 'saved' ? 'Saved locally' : saveStatus === 'saving' ? 'Saving...' : 'Auto-saves every 30s'}
          </span>
        </div>
      </footer>

      {/* Milestone Celebratory Modal */}
      <AnimatePresence>
        {activeMilestoneNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissMilestoneNotification}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              id="milestone-overlay-backdrop"
            />

            {/* Modal Card */}
            {(() => {
              const rStyles = rarityStyles[activeMilestoneNotification.rarity || 'gold'];
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                  className={`relative w-full max-w-md bg-slate-900 border ${rStyles.cardBorder} rounded-2xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden z-10`}
                  id="milestone-celebrate-card"
                >
                  {/* Decorative Background Glows */}
                  <div className={`absolute -top-24 -left-24 w-48 h-48 ${rStyles.glowColor} rounded-full blur-3xl pointer-events-none`} />
                  <div className={`absolute -bottom-24 -right-24 w-48 h-48 ${rStyles.glowColor} rounded-full blur-3xl pointer-events-none`} />

                  {/* Sparkles / Trophy Icon with Pulse & Rotation */}
                  <div className="relative flex justify-center mb-6">
                    <motion.div
                      initial={{ rotate: -15, scale: 0.5 }}
                      animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.8 }}
                      className={`w-20 h-20 bg-slate-950 rounded-2xl flex items-center justify-center border ${rStyles.iconBg} shadow-md relative`}
                    >
                      <Trophy className={`${rStyles.iconColor} w-10 h-10 animate-bounce`} id="milestone-trophy-icon" />
                      <Sparkles className={`absolute top-2 right-2 ${rStyles.sparklesColor} w-4 h-4 animate-pulse`} />
                      <Sparkles className={`absolute bottom-2 left-2 ${rStyles.sparklesColor} w-4 h-4 animate-pulse`} />
                    </motion.div>
                  </div>

                  {/* Congratulatory Text */}
                  <span className={`text-[10px] font-bold ${rStyles.badgeBg} tracking-widest uppercase px-2.5 py-1 rounded-full border inline-block mb-3`}>
                    {rStyles.labelText}
                  </span>
                  
                  <h3 className="text-2xl font-black text-white tracking-tight font-sans leading-none mb-2" id="milestone-title-text">
                    {activeMilestoneNotification.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                    {activeMilestoneNotification.description}
                  </p>

                  {/* Unlocked Badge Detail */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Unlocked on {activeMilestoneNotification.unlockedAt || 'ArchHotel'}
                    </span>
                  </div>

                  {/* Share and Dismiss Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleShare}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                        copiedShare 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      id="milestone-share-btn"
                    >
                      {copiedShare ? (
                        <>
                          <Check size={16} className="text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={16} />
                          <span>Share</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        dismissMilestoneNotification();
                        setCopiedShare(false);
                      }}
                      className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/10 border border-amber-400 transition-colors cursor-pointer flex items-center justify-center"
                      id="milestone-dismiss-btn"
                    >
                      Awesome! Let's build on!
                    </motion.button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
