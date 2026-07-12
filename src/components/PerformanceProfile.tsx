import React, { useEffect, useState, useRef } from 'react';
import { useHotelStore } from '../store';
import { ViewMode } from '../types';

export const PerformanceProfile: React.FC = () => {
  const viewMode = useHotelStore((s) => s.viewMode);
  const guests = useHotelStore((s) => s.guests);
  const floors = useHotelStore((s) => s.floors);
  const [fps, setFps] = useState<number>(0);
  const frames = useRef<number[]>([]);

  useEffect(() => {
    if (viewMode !== '3D' && viewMode !== 'Walk') return;

    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (dt > 0) {
        frames.current.push(1000 / dt);
        if (frames.current.length > 60) frames.current.shift();
        const avg = frames.current.reduce((a, b) => a + b, 0) / frames.current.length;
        setFps(Math.round(avg));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [viewMode]);

  if (viewMode !== '3D' && viewMode !== 'Walk') return null;

  const tileCount = floors.reduce((acc, f) => acc + f.grid.flat().filter(t => t !== 'empty').length, 0);
  const guestCount = guests.length;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-300 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">FPS</span>
          <span className={fps >= 50 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>
            {fps}
          </span>
        </div>
        <div className="w-px h-3 bg-slate-800" />
        <div className="flex items-center gap-1">
          <span className="text-slate-500">TILES</span>
          <span className="text-sky-400">{tileCount}</span>
        </div>
        <div className="w-px h-3 bg-slate-800" />
        <div className="flex items-center gap-1">
          <span className="text-slate-500">GUESTS</span>
          <span className="text-purple-400">{guestCount}</span>
        </div>
      </div>
    </div>
  );
};
