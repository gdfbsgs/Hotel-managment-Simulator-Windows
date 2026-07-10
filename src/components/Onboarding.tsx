import React, { useState } from 'react';
import { useHotelStore } from '../store';

export const Onboarding: React.FC = () => {
  const { needsOnboarding, setOnboardingField, onboarding, completeOnboarding, createCustomBrand, addHotel } = useHotelStore();
  const [addressQuery, setAddressQuery] = useState('');
  const [searching, setSearching] = useState(false);


  if (!needsOnboarding) return null;

  const doGeocode = async () => {
    if (!addressQuery) return;
    setSearching(true);
    try {
      // Use OpenStreetMap Nominatim as a free geocode fallback (no API key required).
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        useHotelStore.getState().setOnboardingField('location', { lat: parseFloat(first.lat), lng: parseFloat(first.lon), address: first.display_name });
      }
    } catch (e) {
      console.error('Geocode failed', e);
    } finally { setSearching(false); }
  };

return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 z-10">
        <h3 className="text-xl font-bold mb-2">Welcome — Build Your Property</h3>
        <p className="text-sm text-slate-400 mb-4">Choose Hotel or Residences, then set a name and location.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Building Type</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => useHotelStore.getState().setOnboardingField('buildingType', 'hotel')}
                className={`flex-1 px-3 py-2 rounded border text-sm font-bold transition-all ${
                  onboarding.buildingType === 'hotel' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950/40 text-slate-200 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                Hotel
              </button>
              <button
                type="button"
                onClick={() => useHotelStore.getState().setOnboardingField('buildingType', 'residences')}
                className={`flex-1 px-3 py-2 rounded border text-sm font-bold transition-all ${
                  onboarding.buildingType === 'residences' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950/40 text-slate-200 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                Residences
              </button>
            </div>
          </div>

          {onboarding.buildingType === 'hotel' && (
            <>
              <div>
                <label className="text-xs text-slate-400">Chain Name</label>
                <input className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded" onChange={(e)=> useHotelStore.getState().setOnboardingField('chainId', e.target.value)} placeholder="My Chain Name" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Brand Name</label>
                <input className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded" onChange={(e)=> useHotelStore.getState().setOnboardingField('brandId', e.target.value)} placeholder="My Brand" />
              </div>

              <div className="mt-2 col-span-2">
                <label className="text-xs text-slate-400">Full Hotel Name</label>
                <input className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded" onChange={(e)=> useHotelStore.getState().setOnboardingField('hotelName', e.target.value)} placeholder="Grand Plaza Resort" />
              </div>
            </>
          )}

          {onboarding.buildingType === 'residences' && (
            <div className="col-span-2 mt-2">
              <label className="text-xs text-slate-400">Full Residence Name</label>
              <input className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded" onChange={(e)=> useHotelStore.getState().setOnboardingField('residenceName', e.target.value)} placeholder="Skyline Studio Residences" />
              <p className="text-[11px] text-slate-500 mt-1">Reception is optional for Residences (cafe/tables still work).</p>
            </div>
          )}
        </div>



        <div className="mt-4">
          <label className="text-xs text-slate-400">Location (address)</label>
          <div className="flex gap-2 mt-1">
            <input className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded" value={addressQuery} onChange={(e)=> setAddressQuery(e.target.value)} placeholder="Enter city or address" />
            <button className="px-3 py-1 bg-amber-500 rounded" onClick={doGeocode} disabled={searching}>{searching ? '...' : 'Find'}</button>
          </div>

          {onboarding.location && (
            <div className="mt-2 text-sm text-slate-300 border border-slate-800 p-2 rounded">
              <div>Found: {onboarding.location.address} ({onboarding.location.lat.toFixed(4)}, {onboarding.location.lng.toFixed(4)})</div>
              <div className="mt-2 flex gap-2">
                <a className="px-2 py-1 bg-slate-800 rounded text-xs" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${onboarding.location.lat},${onboarding.location.lng}`}>Open in Google Maps</a>
                <button className="px-2 py-1 bg-slate-800 rounded text-xs" onClick={() => useHotelStore.getState().setOnboardingField('location', null)}>Clear</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded" onClick={() => useHotelStore.getState().completeOnboarding()}>Skip</button>
          <button className="px-4 py-2 bg-amber-500 rounded font-bold" onClick={() => {
            const s = useHotelStore.getState().onboarding;
            // create brand and hotel records locally if provided
            if (s.brandId) {
              createCustomBrand({ id: `brand-${Date.now()}`, name: s.brandId, icon: '🏨', isCustom: true });
            }
            const hotelId = `h-${Date.now()}`;
            const newHotel = {
              id: hotelId,
              name: s.hotelName || 'My Hotel',
              brandId: s.brandId ? `brand-${Date.now()}` : 'b-budget',
              floors: useHotelStore.getState().floors,
              money: 15000,
              staff: [],
              guests: [],
              roomRates: { standard: 50, suite: 120 },
              roomCategories: useHotelStore.getState().roomCategories,
              bonusPrograms: useHotelStore.getState().bonusPrograms,
              activeBonusProgramId: null,
              totalGuestsServed: 0,
              milestones: useHotelStore.getState().milestones,
              marketId: 'urban-business',
              marketingBudget: 75,
            } as any;
            useHotelStore.getState().addHotel(newHotel.name, newHotel.brandId);
            useHotelStore.getState().setOnboardingField('location', s.location || null);
            useHotelStore.getState().completeOnboarding();
          }}>Finish</button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

