import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useHotelStore } from '../store';
import { TileType, GuestNPC, ViewportSync, ElevatorDesign } from '../types';
import {
  checkPlayerCollision,
  findInteractable,
  doorKey,
  getDoorBlockKeys,
  parseDoorKey,
  findWalkSpawn,
  WALK_OFFSET,
  gridToWorld,
} from '../walkPhysics';
import { ChevronUp, ChevronDown, Move, Eye, Hand } from 'lucide-react';



const GRID_SIZE = 20;
const TILE_SIZE = 2;

const WALL_HEIGHT = 3.8; // Taller ceiling height like in real-life luxury hotels
const FLOOR_HEIGHT = 0.1;

// --- HIGH FIDELITY PROCEDURAL TEXTURE GENERATORS ---
const createTerrazzoTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base off-white plaster with subtle tonal gradient
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Fine noise layer for authentic stone depth
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(228, 232, 240, ${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }

  // Random elegant quartz and marble chips (amber, charcoal, warm gold, cool slate)
  const colors = ['#f59e0b', '#d97706', '#64748b', '#334155', '#e2e8f0', '#cbd5e1', '#b45309'];
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1.5 + Math.random() * 10;
    const sides = 3 + Math.floor(Math.random() * 5);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2;
      const px = x + Math.cos(angle) * r + (Math.random() - 0.5) * 1.8;
      const py = y + Math.sin(angle) * r + (Math.random() - 0.5) * 1.8;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.65;
    ctx.stroke();
  }

  // Very light tile grout grid for structure
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

const createWoodTexture = (baseColor = '#7c2d12', grainColor = '#451a03') => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = grainColor;
  ctx.lineWidth = 2;
  // Draw organic flowing mahogany wood grains
  for (let y = 0; y < 256; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 10) {
      const offset = Math.sin(x * 0.05 + y * 0.08) * 3.5 + Math.cos(x * 0.02) * 2;
      ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createWallTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#cfd6dc');
  gradient.addColorStop(0.45, '#e7eef4');
  gradient.addColorStop(1, '#bdc8d1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Soft concrete noise base
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }

  // Gentle wall vein accents
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let x = 0; x < 512; x += 16) {
      ctx.lineTo(startX + x, startY + Math.sin(x * 0.03 + i) * 6 + Math.random() * 8 - 4);
    }
    ctx.stroke();
  }

  // Panel seams and structure lines
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
  ctx.lineWidth = 2;
  for (let y = 32; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() * 6 - 3));
    ctx.lineTo(512, y + (Math.random() * 6 - 3));
    ctx.stroke();
  }
  for (let x = 32; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() * 6 - 3), 0);
    ctx.lineTo(x + (Math.random() * 6 - 3), 512);
    ctx.stroke();
  }

  // Light highlights for extra depth
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let y = 48; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  return texture;
};

const createFabricTexture = (color = '#ffffff') => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  
  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#f8fafc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  // Cross-hatch vertical fabric weaving lines
  for (let x = 0; x < 128; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() * 0.8 - 0.4), 0);
    ctx.lineTo(x + (Math.random() * 0.8 - 0.4), 128);
    ctx.stroke();
  }
  // Cross-hatch horizontal fabric weaving lines
  for (let y = 0; y < 128; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() * 0.8 - 0.4));
    ctx.lineTo(128, y + (Math.random() * 0.8 - 0.4));
    ctx.stroke();
  }
  
  // Soft cloud shadow texture for depth
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 14 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  return texture;
};

const createBathroomTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, '#cffafe');
  gradient.addColorStop(1, '#bae6fd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  // Glass tile grid
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i + 1, 0);
    ctx.lineTo(i + 1, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 1);
    ctx.lineTo(256, i + 1);
    ctx.stroke();
  }

  // Subtle reflection shimmer
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 16 + Math.random() * 12;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  return texture;
};

// --- SINGLETON CACHED TEXTURE ACCESSORS FOR HIGH PERFORMANCE ---
let cachedTerrazzo: THREE.CanvasTexture | null = null;
let cachedWall: THREE.CanvasTexture | null = null;
let cachedMahogany: THREE.CanvasTexture | null = null;
let cachedWood: THREE.CanvasTexture | null = null;
let cachedFabricSheets: THREE.CanvasTexture | null = null;
let cachedFabricBlanket: THREE.CanvasTexture | null = null;
let cachedBathroom: THREE.CanvasTexture | null = null;

const getTerrazzoTexture = () => {
  if (!cachedTerrazzo) cachedTerrazzo = createTerrazzoTexture();
  return cachedTerrazzo;
};
const getWallTexture = () => {
  if (!cachedWall) cachedWall = createWallTexture();
  return cachedWall;
};
const getMahoganyTexture = () => {
  if (!cachedMahogany) cachedMahogany = createWoodTexture('#451a03', '#1c0a00');
  return cachedMahogany;
};
const getWoodTexture = () => {
  if (!cachedWood) cachedWood = createWoodTexture('#b45309', '#78350f');
  return cachedWood;
};
const getFabricSheetsTexture = () => {
  if (!cachedFabricSheets) cachedFabricSheets = createFabricTexture('#f8fafc');
  return cachedFabricSheets;
};
const getFabricBlanketTexture = () => {
  if (!cachedFabricBlanket) cachedFabricBlanket = createFabricTexture('#e11d48'); // rich crimson velvet
  return cachedFabricBlanket;
};
const getBathroomTexture = () => {
  if (!cachedBathroom) cachedBathroom = createBathroomTexture();
  return cachedBathroom;
};

const cloneTexture = (texture: THREE.Texture, repeatX = 1, repeatY = 1) => {
  const clone = texture.clone();
  clone.repeat.set(repeatX, repeatY);
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.needsUpdate = true;
  return clone;
};

interface FpsControlsProps {
  joystickRef: React.RefObject<{ x: number; y: number }>;
  openDoorsRef: React.MutableRefObject<Set<string>>;
  elevatorDoorsRef: React.MutableRefObject<Set<string>>;
  onInteractTarget: (target: { type: 'door' | 'elevator'; label: string; key: string } | null) => void;
  onInteract: () => void;
  interactSignalRef: React.MutableRefObject<number>;
  floorTransitionRef: React.MutableRefObject<{ active: boolean; fromY: number; targetY: number; progress: number }>;
  mode: string;
  setActiveFloor: (next: number) => void;
  setViewportSync?: (s: Partial<ViewportSync>) => void;
}

const FpsControls: React.FC<FpsControlsProps> = ({
  joystickRef,
  openDoorsRef,
  elevatorDoorsRef,
  onInteractTarget,
  onInteract,
  interactSignalRef,
  floorTransitionRef,
  mode,
  setActiveFloor,
  setViewportSync,
}) => {
  const { camera } = useThree();
  const { activeFloorIndex, floors, viewportSync } = useHotelStore((s) => ({
    activeFloorIndex: s.activeFloorIndex,
    floors: s.floors,
    viewportSync: s.viewportSync as ViewportSync,
  }));
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isDragging = useRef(false);
  const prevX = useRef(0);
  const prevY = useRef(0);
  const bobTimer = useRef(0);

  const prevInteractSignal = useRef(0);

  // Scenery generation based on onboarding location
  const onboardingLocation = useHotelStore((s) => s.onboarding?.location);
  const [sceneryPositions, setSceneryPositions] = useState<Array<[number, number, number]>>([]);
  // Fallback: try to extract coordinates from loaded preset labels if onboarding not set
  const floorsFromStore = useHotelStore((s) => s.floors);

  useEffect(() => {
    const loc = onboardingLocation || (() => {
      // try to find coords in floor labels
      if (!floorsFromStore || floorsFromStore.length === 0) return null;
      for (const floor of floorsFromStore) {
        if (floor.labels) {
          for (const lab of floor.labels) {
            if ((lab as any).meta && (lab as any).meta.lat && (lab as any).meta.lng) {
              return { lat: (lab as any).meta.lat, lng: (lab as any).meta.lng };
            }
          }
        }
      }
      return null;
    })();

    if (!loc) return;
    const { lat, lng } = loc as any;
    const seed = Math.abs(Math.floor((lat + lng) * 1000));
    const rng = (n: number) => { const x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
    const items: Array<[number, number, number]> = [];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = 8 + rng(i) * 48;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const h = 2 + Math.floor(rng(i + 10) * 28);
      items.push([x, h / 2, z]);
    }
    setSceneryPositions(items);
  }, [onboardingLocation, floorsFromStore]);

  useEffect(() => {
    const targetFloorIndex = activeFloorIndex;
    const activeFloor = floors[targetFloorIndex];
    const spawnTile = activeFloor ? findWalkSpawn(activeFloor.grid) : null;
    let spawn = spawnTile ? gridToWorld(spawnTile.gx, spawnTile.gy) : gridToWorld(10, 12);

    if (mode === '3D' && viewportSync) {
      if (viewportSync.cameraTarget) {
        spawn.x = viewportSync.cameraTarget.x;
        spawn.z = viewportSync.cameraTarget.z ?? spawn.z;
      }
    }

    const eyeHeight = targetFloorIndex * WALL_HEIGHT + 1.7;
    camera.position.set(spawn.x, eyeHeight, spawn.z);
    yaw.current = 0;
    pitch.current = -0.05;
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);
  }, [activeFloorIndex, floors, mode]);

  useEffect(() => {
    if (floorTransitionRef.current.active) return;
    camera.position.y = activeFloorIndex * WALL_HEIGHT + 1.7;
  }, [activeFloorIndex, floorTransitionRef]);

  useEffect(() => {
    if (!setViewportSync) return;
    if (mode !== '3D' && mode !== 'Walk') {
      setViewportSync({
        cameraTarget: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        activeFloorIndex,
      });
    }
  }, [mode, activeFloorIndex, setViewportSync]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyE') onInteract();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.no-pointer-lock') || target.closest('.joystick-container')) return;
      isDragging.current = true;
      prevX.current = e.clientX;
      prevY.current = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moved = Math.abs(e.clientX - prevX.current) + Math.abs(e.clientY - prevY.current);
      if (isDragging.current && moved < 8) {
        onInteract();
      }
      isDragging.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - prevX.current;
      const deltaY = e.clientY - prevY.current;
      prevX.current = e.clientX;
      prevY.current = e.clientY;
      yaw.current -= deltaX * 0.0035;
      pitch.current -= deltaY * 0.0035;
      pitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch.current));
    };
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onInteract]);

  useFrame((state, delta) => {
    if (interactSignalRef.current !== prevInteractSignal.current) {
      prevInteractSignal.current = interactSignalRef.current;
    }

    const transition = floorTransitionRef.current;
    if (transition.active) {
      transition.progress = Math.min(1, transition.progress + delta * 0.65);
      camera.position.y = THREE.MathUtils.lerp(transition.fromY, transition.targetY, transition.progress);
      if (transition.progress >= 1) {
        transition.active = false;
        camera.position.y = transition.targetY;
      }
      return;
    }

    const speed = 5.5 * delta;
    let isMoving = false;
    
    let forward = 0;
    let strafe = 0;
    
    if (keys.current['KeyW'] || keys.current['ArrowUp']) forward += 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) forward -= 1;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) strafe += 1;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) strafe -= 1;
    
    if (joystickRef.current) {
      if (Math.abs(joystickRef.current.y) > 0.05) {
        // INVERT MOBILE JOYSTICK: pushing forward (negative y on stick) now correctly walks forward!
        forward += -joystickRef.current.y;
      }
      if (Math.abs(joystickRef.current.x) > 0.05) {
        strafe += joystickRef.current.x;
      }
    }
    
    if (forward !== 0 || strafe !== 0) {
      isMoving = true;
    }
    
    // Calculate precise directional vectors relative to camera's orientation
    const forwardVec = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    forwardVec.negate(); // Invert because looking at negative Z is yaw = 0

    const rightVec = new THREE.Vector3();
    rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

    const dir = new THREE.Vector3();
    dir.addScaledVector(forwardVec, forward);
    dir.addScaledVector(rightVec, strafe);

    if (isMoving) {
      dir.normalize().multiplyScalar(speed);
    }
    
    // Orient the camera using the 'YXZ' rotation standard to avoid tilting artifacts
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;

    const forwardDir = new THREE.Vector3(
      -Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current)
    ).normalize();
    const activeFloor = floors[activeFloorIndex];
    const floorLevel = activeFloor?.level ?? activeFloorIndex;
    const target = findInteractable(camera.position, forwardDir, activeFloor, floorLevel);
    if (target?.type === 'door') {
      const blockKeys = activeFloor
        ? getDoorBlockKeys(activeFloor.grid, target.gx, target.gy, floorLevel)
        : [target.key];
      const doorIsOpen = blockKeys.every((key) => openDoorsRef.current.has(key));
      onInteractTarget({
        type: 'door',
        key: target.key,
        label: doorIsOpen ? 'Close door [E / Click]' : 'Open door [E / Click]',
      });
    } else if (target?.type === 'elevator') {
      onInteractTarget({ type: 'elevator', key: target.key, label: 'Call KONE elevator [E / Click]' });
    } else {
      onInteractTarget(null);
    }

    const tryMove = (pos: THREE.Vector3) =>
      !checkPlayerCollision(pos.x, pos.z, activeFloor, openDoorsRef.current, floorLevel);

    let nextPosition = camera.position.clone().add(dir);
    if (isMoving) {
      if (!tryMove(nextPosition)) {
        const slideX = camera.position.clone();
        slideX.x += dir.x;
        if (tryMove(slideX)) {
          nextPosition = slideX;
        } else {
          const slideZ = camera.position.clone();
          slideZ.z += dir.z;
          if (tryMove(slideZ)) {
            nextPosition = slideZ;
          } else {
            nextPosition = camera.position.clone();
          }
        }
      }
      camera.position.x = nextPosition.x;
      camera.position.z = nextPosition.z;
    }
    
    // Immersive head bobbing animation for realistic stride feel
    if (isMoving) {
      bobTimer.current += delta * 11;
    } else {
      bobTimer.current = Math.max(0, bobTimer.current - delta * 5);
    }
    const bobOffset = isMoving ? Math.sin(bobTimer.current) * 0.07 : 0;
    
    const baseFloorY = activeFloorIndex * WALL_HEIGHT;
    camera.position.y = baseFloorY + 1.7 + bobOffset;
  });

  return null;
};

const getMergedBlocks = (grid: TileType[][], type: TileType, rotations?: Record<string, number>) => {
  const height = grid.length;
  const width = grid[0].length;
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  const blocks: {x: number, y: number, w: number, h: number, rotation: number}[] = [];

  const getRot = (cx: number, cy: number) => {
    if (!rotations) return 0;
    return rotations[`${cx}:${cy}`] ?? 0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === type && !visited[y][x]) {
        let w = 1;
        while (x + w < width && grid[y][x + w] === type && !visited[y][x + w] && getRot(x + w, y) === getRot(x, y)) {
          w++;
        }
        let h = 1;
        let canExpand = true;
        while (y + h < height && canExpand) {
          for (let i = 0; i < w; i++) {
            if (grid[y + h][x + i] !== type || visited[y + h][x + i] || getRot(x + i, y + h) !== getRot(x, y)) {
              canExpand = false;
              break;
            }
          }
          if (canExpand) h++;
        }
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            visited[y + dy][x + dx] = true;
          }
        }
        blocks.push({ x, y, w, h, rotation: getRot(x, y) });
      }
    }
  }
  return blocks;
};

const MergedBed = ({ x, y, w, h, grid, rotation = 0 }: { x: number, y: number, w: number, h: number, grid: TileType[][], rotation?: number }) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  let touchesTop = false, touchesBottom = false, touchesLeft = false, touchesRight = false;
  for (let i = 0; i < w; i++) {
    if (y > 0 && grid[y-1][x+i] === 'wall') touchesTop = true;
    if (y + h < grid.length && grid[y+h][x+i] === 'wall') touchesBottom = true;
  }
  for (let i = 0; i < h; i++) {
    if (x > 0 && grid[y+i][x-1] === 'wall') touchesLeft = true;
    if (x + w < grid[0].length && grid[y+i][x+w] === 'wall') touchesRight = true;
  }

  const frameWidth = w * TILE_SIZE;
  const frameDepth = h * TILE_SIZE;
  const mattressWidth = frameWidth * 0.9;
  const mattressDepth = frameDepth * 0.9;
  const headboardHeight = 0.75;
  const pillowCount = w > 1 ? 2 : 1;
  const pillowSpacing = mattressWidth * 0.4;

  const centerX = x * TILE_SIZE + frameWidth / 2;
  const centerZ = y * TILE_SIZE + frameDepth / 2;

  const fabricSheets = getFabricSheetsTexture();
  const fabricBlanket = getFabricBlanketTexture();

  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      {/* Wood Base Bed Frame */}
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[frameWidth, FLOOR_HEIGHT, frameDepth]} />
         <meshStandardMaterial map={getWoodTexture()} roughness={0.68} />
      </mesh>
      {/* Mattress */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[mattressWidth, 0.42, mattressDepth]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      {/* Blanket */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[mattressWidth * 0.96, 0.2, mattressDepth * 0.96]} />
        <meshStandardMaterial map={fabricBlanket} roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Headboard */}
      <mesh position={[0, 1.02, -(frameDepth / 2 - 0.08)]}>
        <boxGeometry args={[frameWidth * 0.95, headboardHeight, 0.14]} />
        <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Pillows */}
      {[...Array(pillowCount)].map((_, i) => (
        <mesh
          key={i}
          position={[
            (i - (pillowCount - 1) / 2) * pillowSpacing,
            0.8,
            -(mattressDepth * 0.35),
          ]}
        >
          <boxGeometry args={[0.7, 0.14, 0.32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
};

const MergedFloor = ({ x, y, w, h }: { x: number, y: number, w: number, h: number }) => {
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  const texture = cloneTexture(getTerrazzoTexture(), w, h);

  return (
    <mesh position={[centerX, WALL_HEIGHT / 2, centerZ]} castShadow receiveShadow>
      <boxGeometry args={[w * TILE_SIZE, WALL_HEIGHT, h * TILE_SIZE]} />
      <meshStandardMaterial map={texture} roughness={0.4} />
    </mesh>
  );
};

const MergedWall = ({ x, y, w, h }: { x: number, y: number, w: number, h: number }) => {
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  const texture = cloneTexture(getWallTexture(), Math.max(w, h) * 1.25, 2);

  return (
    <mesh position={[centerX, WALL_HEIGHT / 2, centerZ]}>
      <boxGeometry args={[w * TILE_SIZE, WALL_HEIGHT, h * TILE_SIZE]} />
      <meshStandardMaterial map={texture} roughness={0.58} metalness={0.03} />
    </mesh>
  );
};

const MergedTable = ({ x, y, w, h, rotation = 0 }: { x: number, y: number, w: number, h: number, rotation?: number }) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
         <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[w * TILE_SIZE * 0.8, 0.1, h * TILE_SIZE * 0.8]} />
        <meshStandardMaterial map={getWoodTexture()} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[w * TILE_SIZE * 0.2, 0.5, h * TILE_SIZE * 0.2]} />
        <meshStandardMaterial map={getMahoganyTexture()} roughness={0.8} />
      </mesh>
    </group>
  );
};

const MergedReception = ({ x, y, w, h, rotation = 0 }: { x: number, y: number, w: number, h: number, rotation?: number }) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
         <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[w * TILE_SIZE * 0.9, 1.2, h * TILE_SIZE * 0.9]} />
        <meshStandardMaterial map={getMahoganyTexture()} roughness={0.7} />
      </mesh>
    </group>
  );
};

const MergedWindow = ({ x, y, w, h, grid }: { x: number, y: number, w: number, h: number, grid: TileType[][] }) => {
  let windowRotation = 0;
  if (w > h) windowRotation = 0;
  else if (h > w) windowRotation = Math.PI / 2;
  else {
    const top = y > 0 ? grid[y - 1][x] : null;
    const bottom = y + h < grid.length ? grid[y + h][x] : null;
    if (top === 'wall' || bottom === 'wall') windowRotation = Math.PI / 2;
  }
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  const glassLength = windowRotation === 0 ? w * TILE_SIZE : h * TILE_SIZE;

  // Window height scale: 65% of WALL_HEIGHT for gorgeous panoramic floor-to-ceiling glass
  const windowHeight = WALL_HEIGHT * 0.65;

  return (
    <group position={[centerX, 0, centerZ]}>
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
         <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, 0]} rotation={[0, windowRotation, 0]}>
        <boxGeometry args={[glassLength, windowHeight, TILE_SIZE * 0.15]} />
        <meshStandardMaterial color="#a5f3fc" transparent opacity={0.65} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

const MergedDoor = ({
  x, y, w, h, grid, floorLevel, isOpen,
}: {
  x: number; y: number; w: number; h: number; grid: TileType[][]; floorLevel: number; isOpen: boolean;
}) => {
  let hingeSide: 'left' | 'right' | 'top' | 'bottom' = 'left';
  let doorRotation = 0;
  if (w > h) doorRotation = 0;
  else if (h > w) doorRotation = Math.PI / 2;
  else {
    const top = y > 0 ? grid[y - 1][x] : null;
    const bottom = y + h < grid.length ? grid[y + h][x] : null;
    const left = x > 0 ? grid[y][x - 1] : null;
    const right = x + w < grid[0].length ? grid[y][x + w] : null;
    if (top === 'wall' || bottom === 'wall') doorRotation = Math.PI / 2;
    if (left === 'wall') hingeSide = 'left';
    else if (right === 'wall') hingeSide = 'right';
    else if (top === 'wall') hingeSide = 'top';
    else hingeSide = 'bottom';
  }

  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  const doorLength = doorRotation === 0 ? w * TILE_SIZE * 0.88 : h * TILE_SIZE * 0.88;
  const doorHeight = 2.15;
  const openAmount = useRef(0);
  const leafRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const target = isOpen ? 1 : 0;
    openAmount.current = THREE.MathUtils.lerp(openAmount.current, target, delta * 10);
    if (leafRef.current) {
      const swing = openAmount.current * (Math.PI / 2.1);
      leafRef.current.rotation.y = doorRotation + (hingeSide === 'right' ? -swing : swing);
    }
  });

  return (
    <group position={[centerX, 0, centerZ]}>
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
        <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
        <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
      </mesh>
      {/* Door frame — brushed steel */}
      <mesh position={[0, doorHeight / 2, 0]} rotation={[0, doorRotation, 0]}>
        <boxGeometry args={[w * TILE_SIZE * 0.98, doorHeight + 0.08, TILE_SIZE * 0.28]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.18} />
      </mesh>
      {/* Swinging door leaf */}
      <group ref={leafRef} position={[hingeSide === 'right' ? doorLength * 0.45 : -doorLength * 0.45, doorHeight / 2, 0]}>
        <mesh position={[hingeSide === 'right' ? -doorLength / 2 : doorLength / 2, 0, 0]} rotation={[0, doorRotation, 0]}>
          <boxGeometry args={[doorLength, doorHeight - 0.05, TILE_SIZE * 0.12]} />
          <meshStandardMaterial map={getMahoganyTexture()} roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Handle */}
        <mesh position={[hingeSide === 'right' ? -doorLength * 0.82 : doorLength * 0.82, 0, TILE_SIZE * 0.08]} rotation={[0, doorRotation, 0]}>
          <boxGeometry args={[0.08, 0.25, 0.04]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

    </group>
  );
};

const MergedBathroom = ({ x, y, w, h, rotation = 0 }: { x: number, y: number, w: number, h: number, rotation?: number }) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      {/* Beautiful Aqua Mosaic tiles */}
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
         <meshStandardMaterial map={getBathroomTexture()} roughness={0.3} />
      </mesh>
      {/* Porcelain sink vanity counter */}
      <mesh position={[0, 0.4, 0]}>
         <boxGeometry args={[w * TILE_SIZE * 0.5, 0.8, h * TILE_SIZE * 0.5]} />
         <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.1} />
      </mesh>
    </group>
  );
};

const MergedStaff = ({ x, y, w, h, rotation = 0 }: { x: number, y: number, w: number, h: number, rotation?: number }) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
         <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
         <meshStandardMaterial color="#ffe4e6" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
         <boxGeometry args={[w * TILE_SIZE * 0.7, 0.1, h * TILE_SIZE * 0.3]} />
         <meshStandardMaterial color="#9f1239" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
         <boxGeometry args={[w * TILE_SIZE * 0.2, 0.3, h * TILE_SIZE * 0.1]} />
         <meshStandardMaterial color="#e11d48" />
      </mesh>
    </group>
  );
};

const GuestAvatar = ({ guest }: { guest: GuestNPC }) => {
  const bob = useRef(0);
  const sway = useRef(0);
  const orientation = useMemo(() => {
    if (guest.targetX === undefined || guest.targetY === undefined) return 0;
    const dx = guest.targetX - guest.x;
    const dz = guest.targetY - guest.y;
    return Math.atan2(dx, dz);
  }, [guest.targetX, guest.targetY, guest.x, guest.y]);

  useFrame((state, delta) => {
    const baseSpeed = guest.state === 'in-room' ? 1.2 : 2.8;
    bob.current = Math.sin(state.clock.elapsedTime * baseSpeed) * (guest.state === 'in-room' ? 0.02 : 0.06);
    sway.current = Math.sin(state.clock.elapsedTime * baseSpeed * 0.5) * 0.08;
  });

  const statusIcon = guest.isVip
    ? '👑'
    : guest.need === 'hungry'
    ? '🍔'
    : guest.need === 'tired'
    ? '💤'
    : '🚶';

  return (
    <group rotation={[0, orientation, 0]}>
      <group position={[0, 0.15 + bob.current, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.9, 16]} />
          <meshStandardMaterial color={guest.isVip ? '#f59e0b' : '#2563eb'} metalness={guest.isVip ? 0.3 : 0.05} roughness={guest.isVip ? 0.18 : 0.35} />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color={guest.isVip ? '#fde047' : '#fbcfe8'} roughness={0.4} />
        </mesh>
        <mesh position={[0.35, 0.9, 0]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.14, 0.5, 0.1]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.14, 0.5, 0.1]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        {guest.isVip && (
          <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI, 0]}>
            <coneGeometry args={[0.16, 0.24, 10]} />
            <meshStandardMaterial color="#fde047" metalness={0.9} roughness={0.15} />
          </mesh>
        )}
      </group>

      <Text
        position={[0, 1.95 + bob.current, 0]}
        fontSize={0.32}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#020617"
      >
        {statusIcon}
      </Text>

      {guest.feedback && Date.now() < guest.feedback.visibleUntil && (
        <Text
          position={[0, 2.3 + bob.current, 0]}
          fontSize={0.22}
          color={guest.feedback.type === 'happy' ? '#34d399' : guest.feedback.type === 'angry' ? '#fb7185' : '#cbd5e1'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#020617"
        >
          {guest.feedback.emoji}
        </Text>
      )}
    </group>
  );
};

const MergedElevator = ({
  x, y, w, h, floorLevel, doorsOpen, rotation = 0, design = 'modern',
}: {
  x: number; y: number; w: number; h: number; floorLevel: number; doorsOpen: boolean; rotation?: number; design?: ElevatorDesign;
}) => {
  const rotRad = (rotation || 0) * Math.PI / 180;
  const centerX = x * TILE_SIZE + (w * TILE_SIZE) / 2;
  const centerZ = y * TILE_SIZE + (h * TILE_SIZE) / 2;
  const shaftW = w * TILE_SIZE * 0.92;
  const shaftD = h * TILE_SIZE * 0.92;
  const doorSlide = useRef(0);
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const doorWidth = shaftW * 0.36;
  const doorOffset = doorWidth * 0.7;

  useFrame((_, delta) => {
    const targetOpen = doorsOpen ? 1 : 0;
    doorSlide.current = THREE.MathUtils.damp(doorSlide.current, targetOpen, 7, delta);
    const doorGap = doorOffset + doorSlide.current * (doorWidth * 0.4);
    if (leftDoorRef.current) leftDoorRef.current.position.x = -doorGap;
    if (rightDoorRef.current) rightDoorRef.current.position.x = doorGap;
  });

  const landing = (
    <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
      <boxGeometry args={[w * TILE_SIZE, FLOOR_HEIGHT, h * TILE_SIZE]} />
      <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.35} />
    </mesh>
  );

  const callPanel = (labelColor: string, labelText: string, bgColor: string) => (
    <group position={[shaftW * 0.48 + 0.08, 1.25, shaftD * 0.42]}>
      <mesh>
        <boxGeometry args={[0.14, 0.55, 0.03]} />
        <meshStandardMaterial color={bgColor} metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.12, 0.02]}>
        <circleGeometry args={[0.035, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={doorsOpen ? 1.2 : 0.3} />
      </mesh>
      <Text position={[0, -0.08, 0.02]} fontSize={0.09} color={labelColor} anchorX="center" anchorY="middle">
        {String(floorLevel + 1)}
      </Text>
      <Text position={[0, -0.22, 0.02]} fontSize={0.045} color="#64748b" anchorX="center" anchorY="middle">
        {labelText}
      </Text>
    </group>
  );

  const doors = (
    <group position={[0, 1.15, shaftD * 0.46 + 0.02]}>
      <mesh ref={leftDoorRef} position={[-doorOffset, 0, 0]}>
        <boxGeometry args={[doorWidth, 2.2, 0.04]} />
        <meshPhysicalMaterial color="#f1f5f9" transmission={0.75} transparent opacity={0.85} metalness={0.15} roughness={0.05} />
      </mesh>
      <mesh ref={rightDoorRef} position={[doorOffset, 0, 0]}>
        <boxGeometry args={[doorWidth, 2.2, 0.04]} />
        <meshPhysicalMaterial color="#f1f5f9" transmission={0.75} transparent opacity={0.85} metalness={0.15} roughness={0.05} />
      </mesh>
    </group>
  );

  if (design === 'modern') {
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
        {landing}
        <mesh position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
          <meshPhysicalMaterial color="#e2e8f0" metalness={0.05} roughness={0.05} transmission={0.88} transparent opacity={0.35} thickness={0.15} />
        </mesh>
        {[[-shaftW / 2, -shaftD / 2], [shaftW / 2, -shaftD / 2], [-shaftW / 2, shaftD / 2], [shaftW / 2, shaftD / 2]].map(([px, pz], i) => (
          <mesh key={i} position={[px, WALL_HEIGHT / 2, pz]}>
            <boxGeometry args={[0.06, WALL_HEIGHT, 0.06]} />
            <meshStandardMaterial color="#b8c0cc" metalness={0.96} roughness={0.12} />
          </mesh>
        ))}
        <group position={[0, 0.05, 0]}>
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[shaftW * 0.78, 2.5, shaftD * 0.78]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.02} />
          </mesh>
          <mesh position={[0, 2.62, 0]}>
            <boxGeometry args={[shaftW * 0.7, 0.04, shaftD * 0.7]} />
            <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 1.35, -shaftD * 0.36]}>
            <boxGeometry args={[shaftW * 0.72, 2.4, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.98} roughness={0.02} />
          </mesh>
        </group>
        {doors}
        {callPanel('#38bdf8', 'KONE', '#0f172a')}
      </group>
    );
  }

  if (design === 'classic') {
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
        {landing}
        <mesh position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
          <meshStandardMaterial color="#78350f" roughness={0.75} metalness={0.05} />
        </mesh>
        {[[-shaftW / 2, -shaftD / 2], [shaftW / 2, -shaftD / 2], [-shaftW / 2, shaftD / 2], [shaftW / 2, shaftD / 2]].map(([px, pz], i) => (
          <mesh key={i} position={[px, WALL_HEIGHT / 2, pz]}>
            <boxGeometry args={[0.1, WALL_HEIGHT, 0.1]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[shaftW * 0.8, 2.6, shaftD * 0.8]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.6} metalness={0.02} />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[shaftW * 0.75, 0.06, shaftD * 0.75]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
        {doors}
        {callPanel('#fbbf24', 'Classic', '#451a03')}
      </group>
    );
  }

  if (design === 'freight') {
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
        {landing}
        <mesh position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
          <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.3} />
        </mesh>
        {[[-shaftW / 2, -shaftD / 2], [shaftW / 2, -shaftD / 2], [-shaftW / 2, shaftD / 2], [shaftW / 2, shaftD / 2]].map(([px, pz], i) => (
          <mesh key={i} position={[px, WALL_HEIGHT / 2, pz]}>
            <boxGeometry args={[0.14, WALL_HEIGHT, 0.14]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[shaftW * 0.85, 2.8, shaftD * 0.85]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.05} />
        </mesh>
        <group position={[0, 2.75, 0]}>
          <mesh position={[-shaftW * 0.25, 0, 0]}>
            <boxGeometry args={[0.06, 0.04, shaftD * 0.6]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
          </mesh>
          <mesh position={[shaftW * 0.25, 0, 0]}>
            <boxGeometry args={[0.06, 0.04, shaftD * 0.6]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
          </mesh>
        </group>
        {doors}
        {callPanel('#ef4444', 'FREIGHT', '#1e293b')}
      </group>
    );
  }

  if (design === 'panoramic') {
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
        {landing}
        <mesh position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
          <meshPhysicalMaterial color="#7dd3fc" metalness={0.0} roughness={0.0} transmission={0.95} transparent opacity={0.25} thickness={0.4} />
        </mesh>
        {[-1, 1].map((side, i) => (
          <mesh key={i} position={[side * shaftW / 2, WALL_HEIGHT / 2, 0]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <boxGeometry args={[shaftD, WALL_HEIGHT, 0.04]} />
            <meshPhysicalMaterial color="#e0f2fe" metalness={0.1} roughness={0.0} transmission={0.6} transparent opacity={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[shaftW * 0.82, 2.6, shaftD * 0.82]} />
          <meshStandardMaterial color="#f0f9ff" roughness={0.2} metalness={0.0} />
        </mesh>
        <mesh position={[0, 2.6, shaftD * 0.38]}>
          <boxGeometry args={[shaftW * 0.7, 0.04, 0.04]} />
          <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={0.9} />
        </mesh>
        {doors}
        {callPanel('#7dd3fc', 'PANORAMA', '#0c4a6e')}
      </group>
    );
  }

  if (design === 'service') {
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
        {landing}
        <mesh position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
          <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[shaftW * 0.84, 2.4, shaftD * 0.84]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} metalness={0.02} />
        </mesh>
        {[-1, 1].map((side, i) => (
          <mesh key={i} position={[side * shaftW * 0.3, 1.6, shaftD * 0.38]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={doorsOpen ? 1.4 : 0.2} />
          </mesh>
        ))}
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[shaftW * 0.6, 0.08, shaftD * 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
        </mesh>
        {doors}
        {callPanel('#f59e0b', 'SERVICE', '#0f172a')}
      </group>
    );
  }

  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, rotRad, 0]}>
      {landing}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[shaftW, WALL_HEIGHT, shaftD]} />
        <meshPhysicalMaterial color="#e2e8f0" metalness={0.05} roughness={0.05} transmission={0.88} transparent opacity={0.35} thickness={0.15} />
      </mesh>
      {[[-shaftW / 2, -shaftD / 2], [shaftW / 2, -shaftD / 2], [-shaftW / 2, shaftD / 2], [shaftW / 2, shaftD / 2]].map(([px, pz], i) => (
        <mesh key={i} position={[px, WALL_HEIGHT / 2, pz]}>
          <boxGeometry args={[0.06, WALL_HEIGHT, 0.06]} />
          <meshStandardMaterial color="#b8c0cc" metalness={0.96} roughness={0.12} />
        </mesh>
      ))}
      <group position={[0, 0.05, 0]}>
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[shaftW * 0.78, 2.5, shaftD * 0.78]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.02} />
        </mesh>
        <mesh position={[0, 2.62, 0]}>
          <boxGeometry args={[shaftW * 0.7, 0.04, shaftD * 0.7]} />
          <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 1.35, -shaftD * 0.36]}>
          <boxGeometry args={[shaftW * 0.72, 2.4, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.98} roughness={0.02} />
        </mesh>
      </group>
      {doors}
      {callPanel('#38bdf8', 'KONE', '#0f172a')}
    </group>
  );
};

const TileModel = ({ type, position }: { type: TileType; position: [number, number, number] }) => {
  const [px, py, pz] = position;
  switch (type) {
    case 'floor':
      return (
        <mesh position={[px, py + FLOOR_HEIGHT / 2, pz]}>
          <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
          {/* Apply Terrazzo Lobby Flooring */}
          <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
        </mesh>
      );
    case 'wall':
      return (
        <mesh position={[px, py + WALL_HEIGHT / 2, pz]}>
          <boxGeometry args={[TILE_SIZE, WALL_HEIGHT, TILE_SIZE]} />
          {/* Apply premium architectural wall finish */}
          <meshStandardMaterial
            color="#dbe3ea"
            map={getWallTexture()}
            roughness={0.58}
            metalness={0.03}
          />
        </mesh>
      );
    case 'plant':
      return (
        <group position={[px, py, pz]}>
          <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
             <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
             <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.2, 0.15, 0.6, 8]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#16a34a" roughness={0.9} />
          </mesh>
        </group>
      );
    case 'elevator':
      return (
        <group position={[px, py, pz]}>
          <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
            <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
            <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.35} />
          </mesh>
          <mesh position={[0, WALL_HEIGHT / 2, 0]}>
            <boxGeometry args={[TILE_SIZE * 0.9, WALL_HEIGHT, TILE_SIZE * 0.9]} />
            <meshPhysicalMaterial color="#e2e8f0" transmission={0.85} transparent opacity={0.4} roughness={0.05} />
          </mesh>
        </group>
      );
    case 'stairs':
      return (
        <group position={[px, py, pz]}>
          <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
             <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
             <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
          </mesh>
          <mesh position={[0, WALL_HEIGHT / 2, 0]}>
            <boxGeometry args={[TILE_SIZE * 0.9, WALL_HEIGHT, TILE_SIZE * 0.9]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.2, 0.2, -0.2]}>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0.2, 0.8, 0.2]}>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      );
    case 'bathroom':
      return (
        <group position={[px, py, pz]}>
          <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
             <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
             <meshStandardMaterial map={getBathroomTexture()} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
             <boxGeometry args={[TILE_SIZE * 0.5, 0.8, TILE_SIZE * 0.5]} />
             <meshStandardMaterial color="#ffffff" roughness={0.05} />
          </mesh>
        </group>
      );
    case 'staff':
      return (
        <group position={[px, py, pz]}>
          <mesh position={[0, FLOOR_HEIGHT / 2, 0]}>
             <boxGeometry args={[TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE]} />
             <meshStandardMaterial map={getTerrazzoTexture()} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
             <boxGeometry args={[TILE_SIZE * 0.7, 0.1, TILE_SIZE * 0.3]} />
             <meshStandardMaterial color="#9f1239" />
          </mesh>
        </group>
      );
    default:
      return null;
  }
};

export const Viewer3D: React.FC<{ mode?: string }> = ({ mode = '3D' }) => {
  const setViewportSync = useHotelStore((s) => s.setViewportSync);
  const { floors, guests, activeFloorIndex, setActiveFloor, viewportSync } = useHotelStore((s) => ({
    floors: s.floors,
    guests: s.guests,
    activeFloorIndex: s.activeFloorIndex,
    setActiveFloor: s.setActiveFloor,
    viewportSync: s.viewportSync as ViewportSync,
  }));

  const offsetX = WALK_OFFSET;
  const offsetZ = WALK_OFFSET;

  const visibleFloors = useMemo(() => {
    // In Walk mode, keep rendering the active floor ONLY for performance, BUT
    // the user reported seeing only 1 floor after switching. That’s expected.
    // To make it visually clearer when moving between floors, we render floors
    // that are near the current active floor (active-1..active+1).
    if (mode === 'Walk') {
      const from = Math.max(0, activeFloorIndex - 1);
      const to = Math.min(floors.length - 1, activeFloorIndex + 1);
      return floors.slice(from, to + 1);
    }
    return floors;
  }, [mode, floors, activeFloorIndex]);

  const visibleFloorBlocks = useMemo(
    () =>
      visibleFloors.map((floor) => ({
        floor,
        floorBlocks: getMergedBlocks(floor.grid, 'floor', floor.rotations),
        wallBlocks: getMergedBlocks(floor.grid, 'wall', floor.rotations),
        bedBlocks: getMergedBlocks(floor.grid, 'bed', floor.rotations),
        tableBlocks: getMergedBlocks(floor.grid, 'table', floor.rotations),
        receptionBlocks: getMergedBlocks(floor.grid, 'reception', floor.rotations),
        windowBlocks: getMergedBlocks(floor.grid, 'window', floor.rotations),
        doorBlocks: getMergedBlocks(floor.grid, 'door', floor.rotations),
        elevatorBlocks: getMergedBlocks(floor.grid, 'elevator', floor.rotations),
        bathroomBlocks: getMergedBlocks(floor.grid, 'bathroom', floor.rotations),
        staffBlocks: getMergedBlocks(floor.grid, 'staff', floor.rotations),
      })),
    [visibleFloors]
  );

  const openDoorsRef = useRef<Set<string>>(new Set());
  const elevatorDoorsRef = useRef<Set<string>>(new Set());
  const interactSignalRef = useRef(0);
  const floorTransitionRef = useRef({ active: false, fromY: 1.7, targetY: 1.7, progress: 0 });
  const doorCloseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const cameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    if (mode !== '3D' && mode !== 'Walk') {
      const cam = cameraRef.current;
      if (cam) {
        setViewportSync({
          cameraTarget: {
            x: cam.position.x,
            y: cam.position.y,
            z: cam.position.z,
          },
          activeFloorIndex,
        });
      }
    }
  }, [mode, setViewportSync, activeFloorIndex]);

  const [openDoors, setOpenDoors] = useState<Set<string>>(new Set());
  const [elevatorDoorsOpen, setElevatorDoorsOpen] = useState<Set<string>>(new Set());
  const interactTargetRef = useRef<{ type: 'door' | 'elevator'; label: string; key: string } | null>(null);
  const prevInteractTargetRef = useRef<{ type: 'door' | 'elevator'; label: string; key: string } | null>(null);
  const prevShowElevatorPanelRef = useRef(false);
  const prevNearElevatorKeyRef = useRef<string | null>(null);

  const [interactTarget, setInteractTarget] = useState<{ type: 'door' | 'elevator'; label: string; key: string } | null>(null);
  const [showElevatorPanel, setShowElevatorPanel] = useState(false);
  const [nearElevatorKey, setNearElevatorKey] = useState<string | null>(null);

  const syncOpenDoors = useCallback((next: Set<string>) => {
    openDoorsRef.current = next;
    setOpenDoors(new Set(next));
  }, []);

  const syncElevatorDoors = useCallback((next: Set<string>) => {
    elevatorDoorsRef.current = next;
    setElevatorDoorsOpen(new Set(next));
  }, []);

  const scheduleDoorClose = useCallback((key: string) => {
    const existing = doorCloseTimers.current.get(key);
    if (existing) clearTimeout(existing);
    doorCloseTimers.current.set(
      key,
      setTimeout(() => {
        const next = new Set(openDoorsRef.current);
        next.delete(key);
        syncOpenDoors(next);
        doorCloseTimers.current.delete(key);
      }, 5000)
    );
  }, [syncOpenDoors]);

  const handleInteractTarget = useCallback((target: { type: 'door' | 'elevator'; label: string; key: string } | null) => {
    interactTargetRef.current = target;
    const prev = prevInteractTargetRef.current;
    const targetKey = target?.key ?? null;
    const prevKey = prev?.key ?? null;
    const targetType = target?.type ?? null;
    const prevType = prev?.type ?? null;
    const targetLabel = target?.label ?? null;
    const prevLabel = prev?.label ?? null;
    if (targetKey !== prevKey || targetType !== prevType || targetLabel !== prevLabel) {
      prevInteractTargetRef.current = target;
      setInteractTarget(target);
    }

    const shouldShowElevatorPanel = target?.type === 'elevator';
    const nextNearElevatorKey = target?.key ?? null;
    if (shouldShowElevatorPanel !== prevShowElevatorPanelRef.current) {
      prevShowElevatorPanelRef.current = shouldShowElevatorPanel;
      setShowElevatorPanel(shouldShowElevatorPanel);
    }
    if (nextNearElevatorKey !== prevNearElevatorKeyRef.current) {
      prevNearElevatorKeyRef.current = nextNearElevatorKey;
      setNearElevatorKey(nextNearElevatorKey);
    }
  }, []);

  const handleInteract = useCallback(() => {
    const target = interactTargetRef.current;
    if (!target) return;

    interactSignalRef.current += 1;

    if (target.type === 'door') {
      const activeFloor = floors[activeFloorIndex];
      if (!activeFloor) return;
      const { gx, gy } = parseDoorKey(target.key);
      const blockKeys = getDoorBlockKeys(activeFloor.grid, gx, gy, activeFloor.level);
      const next = new Set(openDoorsRef.current);
      const isOpen = blockKeys.every((key) => next.has(key));
      if (isOpen) {
        blockKeys.forEach((key) => next.delete(key));
      } else {
        blockKeys.forEach((key) => {
          next.add(key);
          scheduleDoorClose(key);
        });
      }
      syncOpenDoors(next);
      return;
    }

    if (target.type === 'elevator') {
      setShowElevatorPanel(true);
      setNearElevatorKey(target.key);
      const next = new Set(elevatorDoorsRef.current);
      next.add(target.key);
      syncElevatorDoors(next);
    }
  }, [activeFloorIndex, floors, scheduleDoorClose, syncOpenDoors, syncElevatorDoors]);

  const rideElevatorTo = useCallback((targetFloor: number) => {
    if (targetFloor === activeFloorIndex) {
      setShowElevatorPanel(false);
      return;
    }
    const fromY = activeFloorIndex * WALL_HEIGHT + 1.7;
    const targetY = targetFloor * WALL_HEIGHT + 1.7;
    floorTransitionRef.current = { active: true, fromY, targetY, progress: 0 };
    setTimeout(() => {
      setActiveFloor(targetFloor);
      setShowElevatorPanel(false);
      if (nearElevatorKey) {
        const next = new Set(elevatorDoorsRef.current);
        next.delete(nearElevatorKey);
        syncElevatorDoors(next);
      }
    }, 1200);
  }, [activeFloorIndex, nearElevatorKey, setActiveFloor, syncElevatorDoors]);

  // Visual Joystick Touch / Gesture State
  const joystickRef = useRef({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickContainerRef = useRef<HTMLDivElement>(null);

  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // @ts-ignore
    e.target.setPointerCapture?.(e.pointerId);
    setJoystickActive(true);
    updateJoystick(e);
  };

  const handleJoystickMove = (e: PointerEvent) => {
    if (!joystickActive) return;
    updateJoystick(e);
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    joystickRef.current = { x: 0, y: 0 };
  };

  const updateJoystick = (e: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    
    const maxRadius = 35; // Cap joystick reach
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    
    setJoystickPos({ x: dx, y: dy });
    joystickRef.current = { x: dx / maxRadius, y: dy / maxRadius };
  };

  useEffect(() => {
    if (joystickActive) {
      const handleGlobalPointerMove = (e: PointerEvent) => {
        updateJoystick(e);
      };
      const handleGlobalPointerUp = () => {
        handleJoystickEnd();
      };
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [joystickActive]);

  // Types that are merged visually
  const mergedTypes = ['floor', 'wall', 'bed', 'table', 'reception', 'window', 'door', 'elevator', 'bathroom', 'staff'];

  return (
    <div className={`flex-1 bg-slate-950 w-full h-full relative overflow-hidden select-none touch-none`}>
      {mode === 'Walk' ? (
        <>
          {/* Top-center instruction overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 text-slate-200 px-5 py-2.5 rounded-full border border-slate-800 backdrop-blur-md text-xs font-bold pointer-events-none shadow-2xl flex items-center gap-2">
            <Eye size={14} className="text-amber-500 animate-pulse" />
            <span>WASD / Joystick to walk · Drag to look · <strong className="text-amber-400">E or Click</strong> to interact</span>
          </div>

          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-5 h-5 border border-white/40 rounded-sm relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-amber-400 rounded-full" />
            </div>
          </div>

          {/* Interaction prompt */}
          {interactTarget && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 z-10 pointer-events-none">
              <div className="bg-slate-950/90 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xl">
                <Hand size={14} />
                {interactTarget.label}
              </div>
            </div>
          )}

          {/* TRANSFLUCENT VIRTUAL JOYSTICK FOR MOBILE */}
          <div className="absolute bottom-6 left-6 z-20 joystick-container">
            <div 
              ref={joystickContainerRef}
              onPointerDown={handleJoystickStart}
              className="w-24 h-24 rounded-full border-2 border-slate-600/30 bg-slate-950/60 backdrop-blur-md flex items-center justify-center relative touch-none pointer-events-auto shadow-2xl cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <div 
                className="w-10 h-10 rounded-full bg-amber-500/90 shadow-lg flex items-center justify-center absolute transition-all duration-75 border border-amber-400"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  touchAction: 'none'
                }}
              >
                <Move size={14} className="text-slate-950" />
              </div>
            </div>
          </div>

          {/* KONE ELEVATOR FLOOR CONTROLLER — appears after calling the elevator */}
          {showElevatorPanel && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-slate-950/95 border border-sky-500/50 p-3 rounded-2xl backdrop-blur-md shadow-2xl shadow-sky-500/10 no-pointer-lock min-w-[72px]">
            <span className="text-[8px] font-black text-sky-400 text-center uppercase tracking-widest">KONE</span>
            <span className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider mb-1">MonoSpace</span>
            {floors.map((f, i) => (
              <button
                key={f.level}
                onClick={() => rideElevatorTo(i)}
                disabled={i === activeFloorIndex}
                className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                  i === activeFloorIndex
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-sky-700'
                }`}
              >
                {i + 1}F
              </button>
            ))}
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => activeFloorIndex < floors.length - 1 && rideElevatorTo(activeFloorIndex + 1)}
                disabled={activeFloorIndex >= floors.length - 1}
                className="flex-1 p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-20 rounded-lg text-sky-400"
              >
                <ChevronUp size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => activeFloorIndex > 0 && rideElevatorTo(activeFloorIndex - 1)}
                disabled={activeFloorIndex <= 0}
                className="flex-1 p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-20 rounded-lg text-sky-400"
              >
                <ChevronDown size={16} className="mx-auto" />
              </button>
            </div>
            <button
              onClick={() => setShowElevatorPanel(false)}
              className="mt-1 text-[9px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider"
            >
              Close panel
            </button>
          </div>
          )}
        </>
      ) : (
        <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none z-10">
          <div className="inline-block bg-slate-900/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl border border-slate-850 text-xs font-bold text-slate-300 uppercase tracking-wider">
            Left Click: Rotate | Right Click: Pan | Scroll: Zoom — switch to <strong className="text-amber-400">Walk</strong> for doors &amp; elevator
          </div>
        </div>
      )}

      {/* 3D RENDER CANVAS */}
      <Canvas camera={{ position: mode === 'Walk' ? [0, 1.7, 0] : [25, 25, 25], fov: mode === 'Walk' ? 70 : 50 }}>
        {mode === 'Walk' ? (
          <FpsControls
            joystickRef={joystickRef}
            openDoorsRef={openDoorsRef}
            elevatorDoorsRef={elevatorDoorsRef}
            onInteractTarget={handleInteractTarget}
            onInteract={handleInteract}
            interactSignalRef={interactSignalRef}
            floorTransitionRef={floorTransitionRef}
            mode={mode}
            setActiveFloor={setActiveFloor}
            setViewportSync={(s) => useHotelStore.getState().setViewportSync(s)}
          />
        ) : (
          <OrbitControls 
            makeDefault 
            target={[0, 5, 0]} 
            minDistance={5} 
            maxDistance={100} 
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        )}
        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.5} />
        
        {/* Ground Plane */}
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Generated placeholder scenery (boxes) from onboarding location */}
        {(() => {
          // Scenery (placeholder boxes) is rendered from the internal state.
          // Viewer3D originally had a missing reference; this wrapper ensures JSX stays valid.
          const positions: Array<[number, number, number]> = [];
          return positions.map((p, i) => (
            <mesh key={`sc-${i}`} position={p} castShadow>
              <boxGeometry args={[4, Math.max(1, p[1]), 4]} />
              <meshStandardMaterial color={`hsl(${(i * 36) % 360} 40% 30%)`} />
            </mesh>
          ));
        })()}


        <group position={[-offsetX, 0, -offsetZ]}>
          {visibleFloorBlocks.map(({ floor, floorBlocks, wallBlocks, bedBlocks, tableBlocks, receptionBlocks, windowBlocks, doorBlocks, elevatorBlocks, bathroomBlocks, staffBlocks }) => (
            <group key={floor.level} position={[0, floor.level * WALL_HEIGHT, 0]}>
              {floor.grid.map((row, y) => (
                row.map((cell, x) => {
                  if (mergedTypes.includes(cell)) return null;
                  if (mode === 'Walk' && cell === 'window') return null;
                  return (
                    <TileModel
                      key={`${floor.level}-${x}-${y}`}
                      type={cell}
                      position={[x * TILE_SIZE + TILE_SIZE / 2, 0, y * TILE_SIZE + TILE_SIZE / 2]}
                    />
                  );
                })
              ))}

              {/* Render merged blocks */}
              {floorBlocks.map((b, i) => <MergedFloor key={`floor-${i}`} {...b} />)}
              {wallBlocks.map((b, i) => <MergedWall key={`wall-${i}`} {...b} />)}
              {bedBlocks.map((b, i) => <MergedBed key={`bed-${i}`} {...b} grid={floor.grid} />)}
              {tableBlocks.map((b, i) => <MergedTable key={`table-${i}`} {...b} />)}
              {receptionBlocks.map((b, i) => <MergedReception key={`rec-${i}`} {...b} />)}
              {mode !== 'Walk' ? windowBlocks.map((b, i) => <MergedWindow key={`win-${i}`} {...b} grid={floor.grid} />) : []}
              {doorBlocks.map((b, i) => {
                const blockKeys = getDoorBlockKeys(floor.grid, b.x, b.y, floor.level);
                const isOpen = blockKeys.some((key) => openDoors.has(key));
                return (
                  <MergedDoor
                    key={`door-${i}`}
                    {...b}
                    grid={floor.grid}
                    floorLevel={floor.level}
                    isOpen={isOpen}
                  />
                );
              })}
              {elevatorBlocks.map((b, i) => {
                const key = doorKey(floor.level, b.x, b.y);
                return (
                  <MergedElevator
                    key={`ele-${i}`}
                    {...b}
                    floorLevel={floor.level}
                    doorsOpen={elevatorDoorsOpen.has(key) || showElevatorPanel}
                    design={floor.elevatorDesign}
                  />
                );
              })}
              {bathroomBlocks.map((b, i) => <MergedBathroom key={`bath-${i}`} {...b} />)}
              {staffBlocks.map((b, i) => <MergedStaff key={`staff-${i}`} {...b} />)}

              {/* Render labels */}
{(floor.labels || []).map((label) => (
                 <Text
                   key={label.id}
                   position={[
                     label.x * TILE_SIZE + TILE_SIZE / 2,
                     0.2,
                     label.y * TILE_SIZE + TILE_SIZE / 2,
                   ]}
                   rotation={[-Math.PI / 2, 0, 0]}
                   fontSize={mode === 'Walk' ? 1.2 : 1.5}
                   color="#f8fafc"
                   anchorX="center"
                   anchorY="middle"
                   outlineWidth={0.05}
                   outlineColor="#0f172a"
                 >
                   {label.text}
                 </Text>
               ))}

              {/* Render guests for this floor */}
{mode !== 'Walk' ? (
                 guests.filter((g) => g.floorIndex === floor.level).map((guest) => (
                   <group
                     key={guest.id}
                     position={[
                       guest.x * TILE_SIZE + TILE_SIZE / 2,
                       0,
                       guest.y * TILE_SIZE + TILE_SIZE / 2,
                     ]}
                   >
                     <GuestAvatar guest={guest} />
                   </group>
                 ))
               : []}
            </group>
          ))}
        </group>
      </Canvas>
    </div>
  );
};
