import { RoomCategory, TileType } from './types';

/** Residential-focused room categories.
 *  Tile mapping uses existing tile types:
 *  - bed      => apartment bedroom
 *  - bathroom => bathroom
 *  - table    => kitchen/dining
 *  - plant    => sofa/comfort decor (proxy)
 */
export const RESIDENTIAL_ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: 'rc-studio',
    name: 'Studio',
    price: 80000,
    icon: '🏙️',
    requiredTiles: ['bed', 'bathroom'],
    description: 'Studio apartment (no internal walls except bathroom). Requires bed + bathroom.'
  },
  {
    id: 'rc-1bed-apartment',
    name: '1 Bedroom Apartment',
    price: 110000,
    icon: '🛏️',
    requiredTiles: ['bed', 'bathroom', 'table'],
    description: '1BR apartment with kitchen area (table proxy). Requires bed + bathroom + table.'
  },
  {
    id: 'rc-2bed-apartment',
    name: '2 Bedroom Apartment',
    price: 160000,
    icon: '🛌',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    description: '2BR apartment. Requires bed + bathroom + table + plant (comfort).'
  },
  {
    id: 'rc-3bed-apartment',
    name: '3 Bedroom Apartment',
    price: 220000,
    icon: '🏡',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    description: '3BR apartment (bigger layout). Requires bed + bathroom + table + plant.'
  },
  {
    id: 'rc-4bed-apartment',
    name: '4 Bedroom Apartment',
    price: 290000,
    icon: '🏠',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    requiredBedroomUnits: 4,
    minBathrooms: 2,
    requiresDoorToBedrooms: true,
    bedClusterWallSeparation: true,
    description: '4BR apartment (4 BHK). Requires 4 private bedroom units (bed tiles grouped as bedrooms), plus 2+ bathrooms, and at least one door leading to bedroom areas.'
  }
];




export function isKitchenRequired(catId: string): boolean {
  return catId === 'rc-studio-kitchen' || catId === 'rc-family' || catId === 'rc-luxury-sofa';
}

export function isSofaRequired(catId: string): boolean {
  return catId === 'rc-luxury-sofa';
}

export function isApartment(catId: string): boolean {
  return catId === 'rc-apartment' || catId === 'rc-studio-kitchen' || catId === 'rc-family' || catId === 'rc-luxury-sofa';
}

export function residentialExtraTiles(catId: string): TileType[] {
  // convenience helper if we later want richer UI; for now categories encode requirements
  if (!catId) return [];
  const map: Record<string, TileType[]> = {
    'rc-apartment': [],
    'rc-studio-kitchen': ['table'],
    'rc-family': ['table', 'bathroom'],
    'rc-luxury-sofa': ['table', 'bathroom', 'plant'],
  };
  return map[catId] || [];
}

