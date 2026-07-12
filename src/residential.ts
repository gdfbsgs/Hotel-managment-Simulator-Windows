import { RoomCategory, TileType } from './types';

/** Residential-focused room categories.
 *  Tile mapping uses existing tile types:
 *  - bed      => apartment bedroom
 *  - bathroom => bathroom
 *  - table    => kitchen/dining
 *  - plant    => comfort decor
 */
export const RESIDENTIAL_ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: 'rc-studio',
    name: 'Studio',
    price: 80000,
    icon: '🏙️',
    requiredTiles: ['bed', 'bathroom'],
    description: 'Studio apartment. Requires bed + bathroom.'
  },
  {
    id: 'rc-1bed-apartment',
    name: '1 Bedroom Apartment',
    price: 110000,
    icon: '🛏️',
    requiredTiles: ['bed', 'bathroom', 'table'],
    description: '1BR apartment with kitchen area. Requires bed + bathroom + table.'
  },
  {
    id: 'rc-2bed-apartment',
    name: '2 Bedroom Apartment',
    price: 160000,
    icon: '🛌',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    description: '2BR apartment. Requires bed + bathroom + table + plant.'
  },
  {
    id: 'rc-3bed-apartment',
    name: '3 Bedroom Apartment',
    price: 220000,
    icon: '🏡',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    minBathrooms: 2,
    description: '3BR apartment with 2+ bathrooms. Requires bed + bathroom + table + plant, and at least 2 bathrooms.'
  },
  {
    id: 'rc-4bed-apartment',
    name: '4 Bedroom Apartment',
    price: 290000,
    icon: '🏠',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    minBathrooms: 2,
    requiresDoorToBedrooms: true,
    minBedroomUnits: 4,
    description: '4BR apartment (4 BHK). Requires bed + bathroom + table + plant, 2+ bathrooms, doors to bedrooms, and at least 4 bedroom units.'
  },
  {
    id: 'rc-5bed-apartment',
    name: '5 Bedroom Apartment',
    price: 380000,
    icon: '🏰',
    requiredTiles: ['bed', 'bathroom', 'table', 'plant'],
    minBathrooms: 3,
    requiresDoorToBedrooms: true,
    minBedroomUnits: 5,
    bedClusterWallSeparation: true,
    description: '5BR apartment (5 BHK). Requires bed + bathroom + table + plant, 3+ bathrooms, doors to bedrooms, at least 5 bedroom units, and separated bedroom clusters.'
  }
];
