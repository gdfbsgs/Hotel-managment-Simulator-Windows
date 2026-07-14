import React, { useState, useRef } from 'react';
import { useHotelStore } from '../store';
import { TileType } from '../types';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';

const GRID_SIZE = 20;
const BASE_TILE_SIZE = 40; // in pixels

const getTileColor = (type: TileType | 'eraser' | 'text') => {
  switch (type) {
    case 'floor': return 'bg-slate-800/70 border border-slate-700/20';
    case 'wall': return 'bg-slate-500 border border-slate-400/40';
    case 'door': return 'bg-amber-600 border border-amber-500/40';
    case 'window': return 'bg-sky-500/80 border border-sky-400/40 shadow-[0_0_6px_rgba(56,189,248,0.3)]';
    case 'bed': return 'bg-rose-500/80 border border-rose-400/40';
    case 'reception': return 'bg-orange-600 border border-orange-500/40';
    case 'staff': return 'bg-rose-600 border border-rose-500/40';
    case 'bathroom': return 'bg-cyan-500/80 border border-cyan-400/40';
    case 'plant': return 'bg-emerald-500/80 border border-emerald-400/40';
    case 'table': return 'bg-amber-700 border border-amber-600/40';
    case 'elevator': return 'bg-purple-500/80 border border-purple-400/60 relative after:content-["E"] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-[10px] after:font-black';
    case 'stairs': return 'bg-red-600/80 border border-red-500/60 relative after:content-["🪜"] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[12px]';
    default: return 'bg-slate-950/40 border border-slate-900/30';
  }
};

export const Editor2D: React.FC = () => {
  const { floors, activeFloorIndex, selectedTool, setTile, addLabel, removeLabel, guests, setTileTexture, textureMap, rotateFurnitureAt } = useHotelStore();

  const handleRotateCell = (x: number, y: number) => {
    rotateFurnitureAt(x, y);
  };
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [drawAxis, setDrawAxis] = useState<'x' | 'y' | null>(null);

  const [labelPrompt, setLabelPrompt] = useState<{x: number, y: number} | null>(null);
  const [labelText, setLabelText] = useState('');
  const [selectedTexture, setSelectedTexture] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<{x:number,y:number} | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x1:number,y1:number,x2:number,y2:number} | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveStartRef = useRef<{x:number,y:number} | null>(null);
  const moveSnapshotRef = useRef<any[] | null>(null);
  const [panOffset, setPanOffset] = useState<{x:number,y:number}>({ x: 0, y: 0 });
  const panStartRef = useRef<{x:number,y:number} | null>(null);
  const isPanningRef = useRef(false);

  const activeFloor = floors[activeFloorIndex];
  const grid = activeFloor?.grid;
  const labels = activeFloor?.labels || [];
  const prevFloor = activeFloorIndex > 0 ? floors[activeFloorIndex - 1] : null;

  const floorGuests = guests.filter(g => g.floorIndex === activeFloorIndex);

  if (!grid) return null;

  const handlePointerDown = (x: number, y: number) => {
    if (selectedTool === 'text') {
      setLabelPrompt({x, y});
      setLabelText('');
      return;
    }
    if (selectedTool === 'select') {
      // start selection or begin move
      if (selectionRect && x >= selectionRect.x1 && x <= selectionRect.x2 && y >= selectionRect.y1 && y <= selectionRect.y2) {
        // begin moving
        setIsMoving(true);
        moveStartRef.current = { x, y };
        // snapshot selection
        const snap: any[] = [];
        for (let sy = selectionRect.y1; sy <= selectionRect.y2; sy++) {
          const row: any[] = [];
          for (let sx = selectionRect.x1; sx <= selectionRect.x2; sx++) {
            row.push({ type: grid[sy][sx], texture: textureMap?.[`${activeFloorIndex}:${sx}:${sy}`] });
          }
          snap.push(row);
        }
        moveSnapshotRef.current = snap;
      } else {
        setSelectionStart({ x, y });
        setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
      }
      return;
    }

    setIsDrawing(true);
    setStartPos({x, y});
    setDrawAxis(null);
    setTile(x, y, selectedTool);
    if (selectedTexture && (selectedTool === 'floor' || selectedTool === 'wall')) {
      setTileTexture(x, y, selectedTexture);
    }
  };

  const handlePointerEnter = (x: number, y: number) => {
    if (selectedTool === 'select') {
      if (selectionStart) {
        const x1 = Math.min(selectionStart.x, x);
        const x2 = Math.max(selectionStart.x, x);
        const y1 = Math.min(selectionStart.y, y);
        const y2 = Math.max(selectionStart.y, y);
        setSelectionRect({ x1, y1, x2, y2 });
      }
      return;
    }

    if (isDrawing && selectedTool !== 'text') {
      if (snapToGrid && startPos) {
        let currentAxis = drawAxis;
        if (!currentAxis) {
          if (x !== startPos.x) {
            currentAxis = 'x';
            setDrawAxis('x');
          } else if (y !== startPos.y) {
            currentAxis = 'y';
            setDrawAxis('y');
          }
        }
        
        if (currentAxis === 'x' && y !== startPos.y) return;
        if (currentAxis === 'y' && x !== startPos.x) return;
      }
      setTile(x, y, selectedTool);
      if (selectedTexture && (selectedTool === 'floor' || selectedTool === 'wall')) {
        setTileTexture(x, y, selectedTexture);
      }
    }
  };

  const handlePointerUp = () => {
    if (isMoving) {
      // finalize move: place snapshot at offset
      const mvStart = moveStartRef.current;
      if (mvStart && moveSnapshotRef.current && selectionRect) {
        // calculate offset by comparing previous start to current pointer (approx)
        const dx = (startPos ? (startPos.x - mvStart.x) : 0);
        const dy = (startPos ? (startPos.y - mvStart.y) : 0);
        const snap = moveSnapshotRef.current;
        for (let sy = 0; sy < snap.length; sy++) {
          for (let sx = 0; sx < snap[0].length; sx++) {
            const srcX = selectionRect.x1 + sx;
            const srcY = selectionRect.y1 + sy;
            const dstX = srcX + dx;
            const dstY = srcY + dy;
            if (dstX >= 0 && dstX < GRID_SIZE && dstY >= 0 && dstY < GRID_SIZE) {
              const cell = snap[sy][sx];
              setTile(dstX, dstY, cell.type === 'empty' ? 'floor' : (cell.type as any));
              if (cell.texture) setTileTexture(dstX, dstY, cell.texture);
            }
            // clear source
            setTile(srcX, srcY, 'eraser');
            setTileTexture(srcX, srcY, null);
          }
        }
      }
      setIsMoving(false);
      moveStartRef.current = null;
      moveSnapshotRef.current = null;
    }

    setIsDrawing(false);
    setStartPos(null);
    setDrawAxis(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-1 border-r border-slate-800 pr-4">
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 hover:bg-slate-800 rounded text-slate-400" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-semibold text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1 hover:bg-slate-800 rounded text-slate-400" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 ml-1" title="Reset Zoom">
            <Maximize size={16} />
          </button>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Texture</label>
            <select value={selectedTexture || ''} onChange={(e) => setSelectedTexture(e.target.value || null)} className="bg-slate-950 border border-slate-800 text-xs px-2 py-1 rounded">
              <option value="">Default</option>
              <option value="texture-grey-floor">Grey Floor</option>
              <option value="texture-grey-wall">Grey Wall</option>
              <option value="texture-terrazzo">Terrazzo</option>
              <option value="texture-bathroom">Bathroom</option>
            </select>
          </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer" onClick={() => setSnapToGrid(!snapToGrid)}>
            Snap to Grid (Orthogonal)
          </label>
          <button 
            className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${snapToGrid ? 'bg-amber-500' : 'bg-slate-850'}`}
            onClick={() => setSnapToGrid(!snapToGrid)}
          >
            <div className={`w-3 h-3 rounded-full transition-transform ${snapToGrid ? 'translate-x-4 bg-slate-950' : 'translate-x-0 bg-slate-400'}`}></div>
          </button>
        </div>
        </div>
      </div>
      
      <div 
        className="flex flex-1 items-center justify-center p-8 overflow-auto touch-none relative bg-slate-950"
        onPointerUp={(e) => { if (isPanningRef.current) { isPanningRef.current = false; panStartRef.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); } handlePointerUp(); }}
        onPointerLeave={(e) => { if (isPanningRef.current) { isPanningRef.current = false; panStartRef.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); } handlePointerUp(); }}
        onPointerDown={(e) => {
          if (selectedTool === 'select') {
            isPanningRef.current = true;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (selectedTool === 'select' && isPanningRef.current && panStartRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
            panStartRef.current = { x: e.clientX, y: e.clientY };
          }
        }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 bg-slate-900 p-3 rounded-2xl shadow-2xl border border-slate-800">
          <div className="relative">
            <div 
              className="grid bg-slate-950 gap-[1px] border border-slate-850 overflow-hidden rounded-lg"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
            >
              {grid.map((row, y) => (
                row.map((cell, x) => (
                  <div
                    key={`${x}-${y}`}
                    className={`${selectedTool === 'text' ? 'cursor-text' : 'cursor-crosshair'} select-none ${getTileColor(cell)} transition-colors duration-75 hover:opacity-85 relative`}
                    style={{ width: `${BASE_TILE_SIZE * zoom}px`, height: `${BASE_TILE_SIZE * zoom}px` }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handlePointerDown(x, y);
                    }}
                    onPointerEnter={(e) => {
                      e.preventDefault();
                      handlePointerEnter(x, y);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Right-click rotates furniture blocks.
                      handleRotateCell(x, y);
                    }}
                    draggable={false}
                  >
                    {prevFloor && prevFloor.grid[y][x] !== 'empty' && cell === 'empty' && (
                      <div className="absolute inset-0 border-[2px] border-slate-750/30 border-dashed pointer-events-none" />
                    )}
                      {selectionRect && x >= selectionRect.x1 && x <= selectionRect.x2 && y >= selectionRect.y1 && y <= selectionRect.y2 && (
                        <div className="absolute inset-0 bg-amber-500/10 pointer-events-none" />
                      )}
                      {textureMap && textureMap[`${activeFloorIndex}:${x}:${y}`] && (
                        <div className="absolute bottom-1 right-1 text-[9px] px-1 py-0.5 rounded bg-slate-900/60 text-slate-200 pointer-events-none">{textureMap[`${activeFloorIndex}:${x}:${y}`].replace('texture-','')}</div>
                      )}
                      {activeFloor?.rotations?.[`${x}:${y}`] ? (
                        <div className="absolute top-0.5 right-0.5 text-[8px] px-0.5 py-0 rounded bg-amber-500/80 text-slate-950 font-black pointer-events-none leading-none">
                          {activeFloor.rotations[`${x}:${y}`]}°
                        </div>
                      ) : null}
                  </div>
                ))
              ))}
            </div>
            
            {labels.map((label) => (
              <div
                key={label.id}
                className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none group"
                style={{
                  left: `${(label.x + 0.5) * (BASE_TILE_SIZE * zoom) + (label.x * 1)}px`, // accounting for 1px gap
                  top: `${(label.y + 0.5) * (BASE_TILE_SIZE * zoom) + (label.y * 1)}px`,
                  zIndex: 20
                }}
              >
                <div className="bg-slate-950/90 backdrop-blur-sm px-2 py-0.5 rounded shadow border border-slate-800 text-slate-100 font-bold whitespace-nowrap pointer-events-auto flex items-center gap-1"
                     style={{ fontSize: `${Math.max(10, 12 * zoom)}px` }}>
                  {label.text}
                  {selectedTool === 'eraser' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeLabel(activeFloorIndex, label.id); }}
                      className="text-rose-500 hover:bg-rose-500/15 p-0.5 rounded -mr-1"
                      title="Delete Label"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {floorGuests.map(guest => {
              const hasFeedback = guest.feedback && Date.now() < guest.feedback.visibleUntil;
              const feedbackColorClass = guest.feedback?.type === 'happy'
                ? 'border-emerald-800 bg-emerald-950/95 text-emerald-300'
                : guest.feedback?.type === 'angry'
                ? 'border-rose-800 bg-rose-950/95 text-rose-300'
                : 'border-slate-800 bg-slate-900/95 text-slate-300';

              const satisfactionVal = guest.isVip ? (guest.vipSatisfaction || 50) : (guest.satisfaction || 75);

              return (
                <div
                  key={guest.id}
                  className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 transition-all duration-1000 ease-linear"
                  style={{
                    left: `${(guest.x + 0.5) * (BASE_TILE_SIZE * zoom) + (guest.x * 1)}px`,
                    top: `${(guest.y + 0.5) * (BASE_TILE_SIZE * zoom) + (guest.y * 1)}px`,
                    width: `${BASE_TILE_SIZE * zoom * (guest.isVip ? 0.82 : 0.6)}px`,
                    height: `${BASE_TILE_SIZE * zoom * (guest.isVip ? 0.82 : 0.6)}px`,
                  }}
                  title={`${guest.name}${guest.isVip ? ` (VIP - Needs: ${guest.vipNeed})` : ''} | Satisfaction: ${Math.round(satisfactionVal)}%`}
                >
                  {/* Thought Bubble */}
                  {hasFeedback && guest.feedback && (
                    <div 
                      className={`absolute bottom-full mb-3 px-3 py-2 border rounded-xl shadow-lg backdrop-blur-xs flex flex-col items-center text-center gap-0.5 whitespace-nowrap z-50 animate-bounce ${feedbackColorClass}`}
                      style={{
                        fontSize: `${Math.max(9, 11 * zoom)}px`,
                        lineHeight: '1.2'
                      }}
                    >
                      <div className="flex items-center gap-1 font-extrabold">
                        <span>{guest.feedback.emoji}</span>
                        <span>{guest.feedback.text}</span>
                      </div>
                      <div className="text-[9px] opacity-75 font-mono font-bold">
                        Satisfaction: {Math.round(satisfactionVal)}%
                      </div>
                      {/* Triangle pointer */}
                      <div className={`absolute top-[96%] left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
                        guest.feedback?.type === 'happy' ? 'bg-emerald-950 border-emerald-800' :
                        guest.feedback?.type === 'angry' ? 'bg-rose-950 border-rose-800' :
                        'bg-slate-900 border-slate-800'
                      }`} />
                    </div>
                  )}

                  {guest.isVip ? (
                    <div className="w-full h-full bg-amber-500 rounded-full border-2 border-amber-300 shadow-md flex items-center justify-center text-slate-950 font-black relative animate-pulse">
                      <span style={{ fontSize: `${Math.max(10, 12 * zoom)}px` }}>👑</span>
                      <span className="absolute -bottom-1.5 bg-amber-600 text-[7px] px-1 rounded-full text-white font-black scale-90 whitespace-nowrap border border-amber-300">VIP</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-blue-600 rounded-full border-2 border-slate-850 shadow-sm flex items-center justify-center text-white font-bold relative" style={{ fontSize: `${Math.max(8, 10 * zoom)}px` }}>
                      {guest.name[0]}
                      {/* Little satisfaction indicator dot */}
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                        satisfactionVal >= 80 ? 'bg-emerald-500 animate-pulse' :
                        satisfactionVal < 45 ? 'bg-rose-500' :
                        'bg-amber-400'
                      }`} />
                    </div>
                  )}
                </div>
              );
            })}

            {labelPrompt && (
              <div 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg shadow-2xl border border-slate-800 z-50 pointer-events-auto"
                style={{
                  left: `${(labelPrompt.x + 0.5) * (BASE_TILE_SIZE * zoom) + (labelPrompt.x * 1)}px`,
                  top: `${(labelPrompt.y + 0.5) * (BASE_TILE_SIZE * zoom) + (labelPrompt.y * 1)}px`
                }}
              >
                <input 
                  autoFocus
                  type="text" 
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  placeholder="Enter label..."
                  className="px-2 py-1 text-sm bg-slate-950 border border-slate-800 rounded outline-none focus:border-amber-500 text-white w-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (labelText.trim()) {
                        addLabel(activeFloorIndex, {
                          id: Math.random().toString(36).substr(2, 9),
                          x: labelPrompt.x,
                          y: labelPrompt.y,
                          text: labelText.trim()
                        });
                      }
                      setLabelPrompt(null);
                    } else if (e.key === 'Escape') {
                      setLabelPrompt(null);
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (labelText.trim()) {
                      addLabel(activeFloorIndex, {
                        id: Math.random().toString(36).substr(2, 9),
                        x: labelPrompt.x,
                        y: labelPrompt.y,
                        text: labelText.trim()
                      });
                    }
                    setLabelPrompt(null);
                  }}
                  className="px-2.5 py-1 text-xs bg-amber-500 text-slate-950 font-black rounded hover:bg-amber-600"
                >
                  Save
                </button>
                <button 
                  onClick={() => setLabelPrompt(null)}
                  className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 font-bold rounded hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
