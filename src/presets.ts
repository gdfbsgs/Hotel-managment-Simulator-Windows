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
    for (let x = 0; x < Math.min(GRID_SIZE, ascii[y].length); x++) {
      const char = ascii[y][x];
      grid[y][x] = charToTile[char] || 'empty';
    }
  }
  return grid;
}

function createHighRiseFloors(): Floor[] {
  const floors: Floor[] = [];

  floors.push({
    level: 0,
    name: 'Grand Lobby',
    grid: parseGrid([
      '####################',
      '#P...RRR...EE...P..#',
      '#P...RRR...EE...P..#',
      '#.....TTT........W#',
      '#.....TTT........W#',
      '#.................#',
      '#.......#######...#',
      '#.......#.....#...#',
      '#.......#.....#...#',
      '#.......#.....#...#',
      '#.......#.....#...#',
      '#.......#.....#...#',
      '#.......#######...#',
      '#..................#',
      '####################',
      '      EE            ',
      '      EE            ',
    ]),
    labels: [
      { id: 'h-1', x: 7, y: 1, text: 'Reception' },
      { id: 'h-2', x: 10, y: 3, text: 'Lounge' },
      { id: 'h-3', x: 10, y: 4, text: 'Café' },
    ]
  });

  const guestFloorGrid = parseGrid([
    '####################',
    '#B#B#B#B#B#B#B#B#B#B#',
    '#B#B#B#B#B#B#B#B#B#B#',
    '#.........EE.......#',
    '#.........EE.......#',
    '#.....#.....#.....W#',
    '###D#####D#####D####',
    '#..................#',
    '#..................#',
    '###D#####D#####D####',
    '#..................#',
    '#..................#',
    '###D#####D#####D####',
    '#..................#',
    '#..................#',
    'W.....W.....W.....W',
    '####################',
    '      EE            ',
    '      EE            ',
  ]);

  for (let level = 1; level <= 25; level++) {
    floors.push({
      level,
      name: `Guest Floor ${level}`,
      grid: guestFloorGrid,
      labels: level === 1 ? [
        { id: 'h-4', x: 5, y: 5, text: 'Sky Corridor' },
      ] : []
    });
  }

  return floors;
}

export const PRESETS: Record<string, Floor[]> = {
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
      ]),
      labels: [
        { id: '10', x: 2, y: 2, text: 'Dining' },
        { id: '11', x: 14, y: 2, text: 'Master Bed' },
        { id: '12', x: 14, y: 8, text: 'Lounge' },
        { id: '13', x: 2, y: 10, text: 'Study' },
      ]
    }
  ],
  'auto-preset': [
    {
      level: 0,
      name: 'Ground Floor',
      grid: parseGrid([
        '####################',
        '#bBB##...EE...##BBb#',
        '#....#........#....#',
        '#....D........D....#',
        '######........######',
        '#bBB##........##SSS#',
        '#....#........#....#',
        '#....D........D....#',
        '######........######',
        '#TT.##...RR...##.TT#',
        '#...D....RR....D...#',
        '######........######',
        '#P................P#',
        '#W................W#',
        '#..................#',
        '#######DDDDDD#######',
      ]),
      labels: [
        { id: '1', x: 2, y: 2, text: 'Room 1' },
        { id: '2', x: 17, y: 2, text: 'Room 2' },
        { id: '3', x: 2, y: 6, text: 'Room 3' },
        { id: '4', x: 17, y: 6, text: 'Staff' },
        { id: '5', x: 2, y: 10, text: 'Management' },
        { id: '6', x: 10, y: 10, text: 'Reception' },
        { id: '7', x: 17, y: 10, text: 'Lounge' },
      ]
    }
  ],
  'high-rise': createHighRiseFloors(),
  'radisson-blu-olimpiiskii': createHighRiseFloors()
};
