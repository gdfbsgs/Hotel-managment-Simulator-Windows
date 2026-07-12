import { Floor, TileType } from './types';

const charToTile: Record<string, TileType> = {
  ' ': 'empty',
  '.': 'floor',
  '#': 'wall',
  'D': 'door',
  'W': 'window',
  'B': 'bed',
  'b': 'bathroom',
  'R': 'reception',
  'S': 'staff',
  'P': 'plant',
  'T': 'table',
  'E': 'elevator',
  'X': 'stairs'
};

const GRID_SIZE = 20;

function parseGrid(ascii: string[]): TileType[][] {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty') as TileType[]);
  for (let y = 0; y < Math.min(GRID_SIZE, ascii.length); y++) {
    const row = ascii[y].padEnd(GRID_SIZE, ' ');
    for (let x = 0; x < Math.min(GRID_SIZE, row.length); x++) {
      const char = row[x];
      grid[y][x] = (charToTile as any)[char] || 'empty';
    }
  }
  return grid;
}

// Minimal simplified presets to avoid heavy preset data that can cause rendering or memory issues.
export const PRESETS: Record<string, Floor[]> = {
  'empty': [
    {
      level: 0,
      name: 'Empty Ground',
      grid: parseGrid([
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: []
    }
  ],
  'basic-two-floor': [
    {
      level: 0,
      name: 'Ground Basic',
      grid: parseGrid([
        '####################',
        '#...........R......#',
        '#...........R......#',
        '#..................#',
        '#....TTT...........#',
        '#....TTT...........#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#P.................#',
        '#..............W...#',
        '####################',
        '      E E           ',
        '      E E           ',
        '                    ',
        '                    '
      ]),
      labels: [{ id: 'r1', x: 12, y: 1, text: 'Reception' }]
    },
    {
      level: 1,
      name: 'Guest Level 1',
      grid: parseGrid([
        '####################',
        '#B.B.B.B.B.B.B.B.B.#',
        '#B.B.B.B.B.B.B.B.B.#',
        '#..................#',
        '#....W.....W....W..#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
        '      E E           ',
        '      E E           ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: []
    }
  ],
  'auto-preset': [
    {
      level: 0,
      name: 'Auto Ground',
      grid: parseGrid([
        '####################',
        '#..............P...#',
        '#....RRR...........#',
        '#....RRR...........#',
        '#..................#',
        '#..................#',
        '#..........TTT.....#',
        '#..........TTT.....#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.........W........#',
        '####################',
        '      E E           ',
        '      E E           ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [{ id: 'a1', x: 6, y: 2, text: 'Reception' }]
    }
  ]
  ,
  'radisson-collection-sochi': [
    {
      level: 0,
      name: 'Radisson Collection Sochi - Ground',
      grid: parseGrid([
        '####################',
        '#....RRR....TTT....#',
        '#....RRR....TTT....#',
        '#..................#',
        '#....P.............#',
        '#..................#',
        '#..................#',
        '#.....E....E.......#',
        '#.....E....E.......#',
        '#..................#',
        '#..................#',
        '#..WWW.......WWW...#',
        '#..WWW.......WWW...#',
        '#..................#',
        '####################',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [{ id: 'sochi-addr', x: 3, y: 1, text: 'Radisson Collection Sochi', meta: { lat: 43.5853, lng: 39.7231 } }]
    },
    {
      level: 1,
      name: 'Radisson Collection Sochi - Guest Level 1',
      grid: parseGrid([
        '####################',
        '#B.B.B.B.B.B.B.B.B.#',
        '#B.B.B.B.B.B.B.B.B.#',
        '#..................#',
        '#....W.....W....W..#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....E....E.......#',
        '#.....E....E.......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: []
    },
    {
      level: 2,
      name: 'Radisson Collection Sochi - Guest Level 2',
      grid: parseGrid([
        '####################',
        '#B.B.B.B.B.B.B.B.B.#',
        '#B.B.B.B.B.B.B.B.B.#',
        '#..................#',
        '#....W.....W....W..#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....E....E.......#',
        '#.....E....E.......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: []
    }
  ],
  'radisson-blu-olimpiiskii': [
    {
      level: 0,
      name: 'Radisson Blu Olimpiiskii - Ground',
      grid: parseGrid([
        '####################',
        '#...RRR.....TTT....#',
        '#...RRR.....TTT....#',
        '#..................#',
        '#..P...............#',
        '#..................#',
        '#....WWW....WWW....#',
        '#....WWW....WWW....#',
        '#..................#',
        '#.....E....E.......#',
        '#.....E....E.......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [{ id: 'oli-addr', x: 4, y: 1, text: 'Radisson Blu Olimpiiskii', meta: { lat: 55.7646, lng: 37.6413 } }]
    },
    {
      level: 1,
      name: 'Radisson Blu Olimpiiskii - Guest Level 1',
      grid: parseGrid([
        '####################',
        '#B.B.B.B.B.B.B.B.B.#',
        '#B.B.B.B.B.B.B.B.B.#',
        '#..................#',
        '#....W.....W....W..#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....E....E.......#',
        '#.....E....E.......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: []
    }
  ]
  ,
  'small-hotel': [
    {
      level: 0,
      name: 'Ground Floor Lobby',
      grid: parseGrid([
        '####################',
        '#P........#P...P...#',
        '#.........#........#',
        '#...RRR...D........#',
        '#...RRR...#...TT...#',
        '#.........#...TT...#',
        '#.........#........#',
        '#####D#####........#',
        '#.........#........#',
        'W.........#...TT...#',
        'W.........#...TT...#',
        'W.........#........#',
        '#.........#........#',
        '#P........#P...P...#',
        '#########D##########',
        '      EE            ',
        '      EE            ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [
        { id: '1', x: 4, y: 3, text: 'Reception' },
        { id: '2', x: 14, y: 4, text: 'Cafe' },
        { id: '3', x: 4, y: 11, text: 'Lobby Lounge' },
      ]
    },
    {
      level: 1,
      name: 'Standard Rooms',
      grid: parseGrid([
        '####################',
        '#BB...#BB...#BB....#',
        '#BB...#BB...#BB....#',
        '#.....#.....#......#',
        'W.....W.....W......#',
        '###D#####D#####D####',
        '...................W',
        '...................W',
        '###D#####D#####D####',
        '#.....#.....#......#',
        '#BB...#BB...#BB....#',
        '#BB...#BB...#BB....#',
        'W.....W.....W......#',
        '####################',
        '      EE            ',
        '      EE            ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [
        { id: '4', x: 2, y: 2, text: 'Room 101' },
        { id: '5', x: 8, y: 2, text: 'Room 102' },
        { id: '6', x: 14, y: 2, text: 'Room 103' },
        { id: '7', x: 2, y: 10, text: 'Room 104' },
        { id: '8', x: 8, y: 10, text: 'Room 105' },
        { id: '9', x: 14, y: 10, text: 'Room 106' },
      ]
    }
  ],
  'residences': [
    {
      level: 0,
      name: 'Residence Ground Floor',
      grid: parseGrid([
        '####################',
        '#T.....#.....#....T#',
        '#......#.....#.....#',
        '#......D.....#.....#',
        '#......#.....#.....#',
        '###D######D######D###',
        '#..................#',
        '#....TT....TT......#',
        '#....TT....TT......#',
        '#..................#',
        '#....bb....bb......#',
        '#....bb....bb......#',
        '#..................#',
        '#P..............P..#',
        '#########D##########',
        '      EE            ',
        '      EE            ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [
        { id: 'r1', x: 4, y: 1, text: 'Studio 1A' },
        { id: 'r2', x: 10, y: 1, text: 'Studio 1B' },
        { id: 'r3', x: 16, y: 1, text: 'Studio 1C' },
        { id: 'r4', x: 4, y: 7, text: 'Kitchen Lounge' },
        { id: 'r5', x: 10, y: 10, text: 'Bath' },
      ]
    },
    {
      level: 1,
      name: 'Residence Upper Floor',
      grid: parseGrid([
        '####################',
        '#BB...#BB...#BB....#',
        '#BB...#BB...#BB....#',
        '#.....#.....#......#',
        'W.....W.....W......#',
        '###D#####D#####D####',
        '#....b#.....#b.....#',
        '#....b#.....#b.....#',
        '#..................#',
        '#.....#.....#......#',
        '#BB...#BB...#BB....#',
        '#BB...#BB...#BB....#',
        'W.....W.....W......#',
        '####################',
        '      EE            ',
        '      EE            ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [
        { id: 'r6', x: 2, y: 2, text: 'Apt 2A' },
        { id: 'r7', x: 8, y: 2, text: 'Apt 2B' },
        { id: 'r8', x: 14, y: 2, text: 'Apt 2C' },
      ]
    }
  ],
  'luxury-suite': [
    {
      level: 0,
      name: 'Penthouse Suite',
      grid: parseGrid([
        '####################',
        '#T.....#BBBB.......#',
        '#......#BBBB.......#',
        '#......D...........W',
        'W......#...........W',
        'W......#####D#######',
        '#......#...........#',
        '###D####...........#',
        '#......#...........#',
        '#......#.....P.....#',
        '#..TT..D...........W',
        '#..TT..#...........W',
        '#......#...........#',
        '####################',
        '      EE            ',
        '      EE            ',
        '                    ',
        '                    ',
        '                    '
      ]),
      labels: [
        { id: '10', x: 2, y: 2, text: 'Dining' },
        { id: '11', x: 14, y: 2, text: 'Master Bed' },
        { id: '12', x: 14, y: 8, text: 'Lounge' },
        { id: '13', x: 2, y: 10, text: 'Study' },
      ]
    }
  ]
};

// Post-process presets to enforce bathroom enclosure rules and window placement and align elevator shafts
function sanitizePresets(presets: Record<string, Floor[]>) {
  const inBounds = (x: number, y: number) => x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;

  const isBedNearby = (grid: any[][], x: number, y: number) => {
    const neigh = [ [1,0],[-1,0],[0,1],[0,-1] ];
    return neigh.some(([dx,dy]) => {
      const nx = x+dx, ny = y+dy;
      return inBounds(nx,ny) && grid[ny][nx] === 'bed';
    });
  };

  const findSafeSpot = (grid: any[][], x: number, y: number) => {
    for (let r = 1; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!inBounds(nx, ny)) continue;
          if (grid[ny][nx] !== 'floor') continue;
          if (!isBedNearby(grid, nx, ny)) return { nx, ny };
        }
      }
    }
    return null;
  };

  const neighbors = ([x,y]: number[]) => [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];

  for (const key of Object.keys(presets)) {
    const floors = presets[key];
    // collect elevator positions from all floors (union) so presets keep elevator shafts
    const elevatorSet = new Set<string>();
    for (const f of floors) {
      const fg = f.grid;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (fg[y][x] === 'elevator') elevatorSet.add(`${x},${y}`);
        }
      }
    }
    const elevatorPositions: {x:number,y:number}[] = Array.from(elevatorSet).map(s => {
      const [x,y] = s.split(',').map(Number);
      return { x, y };
    });

    for (const floor of floors) {
      const grid = floor.grid;

      // Ensure windows exist only on outer boundary
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] === 'window') {
            if (!(x === 0 || x === GRID_SIZE-1 || y === 0 || y === GRID_SIZE-1)) {
              grid[y][x] = 'floor';
            }
          }
        }
      }

      // Collect existing bathroom tiles to process safely
      const bathrooms: { x: number; y: number }[] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] === 'bathroom') bathrooms.push({ x, y });
        }
      }

      for (const b of bathrooms) {
        let bx = b.x, by = b.y;
        if (isBedNearby(grid, bx, by)) {
          const spot = findSafeSpot(grid, bx, by);
          if (spot) {
            grid[by][bx] = 'floor';
            bx = spot.nx; by = spot.ny;
            grid[by][bx] = 'bathroom';
          }
        }

        for (const [nx, ny] of neighbors([bx, by])) {
          if (!inBounds(nx, ny)) continue;
          const tile = grid[ny][nx];
          if (tile === 'floor' || tile === 'empty') grid[ny][nx] = 'wall';
        }

        const doorDirs = [[1,0],[0,1],[-1,0],[0,-1]];
        let placedDoor = false;
        for (const [dx,dy] of doorDirs) {
          const dxp = bx + dx, dyp = by + dy;
          if (!inBounds(dxp, dyp)) continue;
          const t = grid[dyp][dxp];
          if (t === 'wall') continue;
          grid[dyp][dxp] = 'door';
          placedDoor = true;
          break;
        }
        if (!placedDoor) {
          const rx = Math.min(GRID_SIZE-1, bx+1);
          if (grid[by][rx] !== 'bed') grid[by][rx] = 'door';
        }
      }

      // enforce elevator positions from collected set across all floors
      if (elevatorPositions.length > 0) {
        for (const pos of elevatorPositions) {
          const { x, y } = pos;
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x] = 'elevator';
          }
        }
      }
    }
  }
}

sanitizePresets(PRESETS);
