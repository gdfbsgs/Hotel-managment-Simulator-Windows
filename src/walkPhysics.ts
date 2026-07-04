import * as THREE from 'three';
import { Floor, TileType } from './types';

export const WALK_GRID_SIZE = 20;
export const WALK_TILE_SIZE = 2;
export const WALK_OFFSET = (WALK_GRID_SIZE * WALK_TILE_SIZE) / 2;
export const PLAYER_RADIUS = 0.42;
const COLLISION_PADDING = 0.01;

const BLOCKING_TILES: TileType[] = ['wall', 'window'];

export function worldToGrid(worldX: number, worldZ: number) {
  return {
    gx: Math.floor((worldX + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE),
    gy: Math.floor((worldZ + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE),
  };
}

export function gridToWorld(gx: number, gy: number) {
  return {
    x: gx * WALK_TILE_SIZE + WALK_TILE_SIZE / 2 - WALK_OFFSET,
    z: gy * WALK_TILE_SIZE + WALK_TILE_SIZE / 2 - WALK_OFFSET,
  };
}

export function doorKey(floor: number, gx: number, gy: number) {
  return `${floor}:${gx}:${gy}`;
}

export function parseDoorKey(key: string) {
  const [floor, gx, gy] = key.split(':').map(Number);
  return { floor, gx, gy };
}

/** All grid cells in the same merged door block as (gx, gy). */
export function getDoorBlockTiles(grid: TileType[][], gx: number, gy: number) {
  if (grid[gy]?.[gx] !== 'door') return [{ gx, gy }];

  let x0 = gx;
  while (x0 > 0 && grid[gy][x0 - 1] === 'door') x0--;

  let y0 = gy;
  while (y0 > 0 && grid[y0 - 1]?.[x0] === 'door') y0--;

  let w = 1;
  while (x0 + w < grid[0].length && grid[y0][x0 + w] === 'door') w++;

  let h = 1;
  let canExpand = true;
  while (y0 + h < grid.length && canExpand) {
    for (let dx = 0; dx < w; dx++) {
      if (grid[y0 + h][x0 + dx] !== 'door') {
        canExpand = false;
        break;
      }
    }
    if (canExpand) h++;
  }

  const tiles: { gx: number; gy: number }[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ gx: x0 + dx, gy: y0 + dy });
    }
  }
  return tiles;
}

export function getDoorBlockKeys(
  grid: TileType[][],
  gx: number,
  gy: number,
  floorLevel: number
) {
  return getDoorBlockTiles(grid, gx, gy).map((t) => doorKey(floorLevel, t.gx, t.gy));
}

function isDoorTileOpen(
  grid: TileType[][],
  gx: number,
  gy: number,
  floorLevel: number,
  openDoors: Set<string>
) {
  return getDoorBlockKeys(grid, gx, gy, floorLevel).every((key) => openDoors.has(key));
}

export function isTileBlocking(
  tile: TileType | undefined,
  isDoorOpen: boolean
): boolean {
  if (!tile || tile === 'empty') return true;
  if (BLOCKING_TILES.includes(tile)) return true;
  if (tile === 'door') return !isDoorOpen;
  return false;
}

export function checkPlayerCollision(
  worldX: number,
  worldZ: number,
  floor: Floor | undefined,
  openDoors: Set<string>,
  floorLevel: number
): boolean {
  if (!floor) return true;

  const minX = worldX - PLAYER_RADIUS;
  const maxX = worldX + PLAYER_RADIUS;
  const minZ = worldZ - PLAYER_RADIUS;
  const maxZ = worldZ + PLAYER_RADIUS;

  const minGX = Math.max(0, Math.floor((minX + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE));
  const maxGX = Math.min(WALK_GRID_SIZE - 1, Math.floor((maxX + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE));
  const minGY = Math.max(0, Math.floor((minZ + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE));
  const maxGY = Math.min(WALK_GRID_SIZE - 1, Math.floor((maxZ + WALK_OFFSET - WALK_TILE_SIZE / 2) / WALK_TILE_SIZE));

  const halfTile = WALK_TILE_SIZE / 2;
  const radiusSq = (PLAYER_RADIUS + COLLISION_PADDING) ** 2;

  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      const tile = floor.grid[gy]?.[gx];
      const doorOpen =
        tile === 'door' && isDoorTileOpen(floor.grid, gx, gy, floorLevel, openDoors);
      if (!isTileBlocking(tile, doorOpen)) continue;

      const tileCenter = gridToWorld(gx, gy);
      const closestX = Math.max(tileCenter.x - halfTile, Math.min(worldX, tileCenter.x + halfTile));
      const closestZ = Math.max(tileCenter.z - halfTile, Math.min(worldZ, tileCenter.z + halfTile));
      const dx = worldX - closestX;
      const dz = worldZ - closestZ;

      if (dx * dx + dz * dz <= radiusSq) {
        return true;
      }
    }
  }

  return false;
}

export function findInteractable(
  cameraPos: THREE.Vector3,
  cameraDir: THREE.Vector3,
  floor: Floor | undefined,
  floorLevel: number,
  maxDistance = 2.8
): { type: 'door' | 'elevator'; gx: number; gy: number; key: string; distance: number } | null {
  if (!floor) return null;

  let best: { type: 'door' | 'elevator'; gx: number; gy: number; key: string; distance: number } | null = null;

  for (let gy = 0; gy < floor.grid.length; gy++) {
    for (let gx = 0; gx < floor.grid[gy].length; gx++) {
      const tile = floor.grid[gy][gx];
      if (tile !== 'door' && tile !== 'elevator') continue;

      const { x, z } = gridToWorld(gx, gy);
      const toTarget = new THREE.Vector3(x - cameraPos.x, 0, z - cameraPos.z);
      const distance = toTarget.length();
      if (distance > maxDistance) continue;

      toTarget.normalize();
      const dot = cameraDir.dot(toTarget);
      if (dot < 0.55) continue;

      if (!best || distance < best.distance) {
        best = {
          type: tile === 'door' ? 'door' : 'elevator',
          gx,
          gy,
          key: doorKey(floorLevel, gx, gy),
          distance,
        };
      }
    }
  }

  return best;
}
