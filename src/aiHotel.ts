import { Floor, Label, TileType } from './types';

export const GRID_SIZE = 20;

export const CHAR_TO_TILE: Record<string, TileType> = {
  ' ': 'empty',
  '.': 'floor',
  '#': 'wall',
  D: 'door',
  W: 'window',
  B: 'bed',
  b: 'bathroom',
  R: 'reception',
  S: 'staff',
  P: 'plant',
  T: 'table',
  E: 'elevator',
  X: 'stairs',
};

const VALID_CHARS = new Set(Object.keys(CHAR_TO_TILE));

export interface RawAiFloor {
  level?: number;
  name?: string;
  grid?: string[];
  labels?: Label[];
}

function normalizeAsciiRow(row: string): string {
  let out = '';
  for (let x = 0; x < GRID_SIZE; x++) {
    const c = x < row.length ? row[x] : ' ';
    out += VALID_CHARS.has(c) ? c : '#';
  }
  return out;
}

export function normalizeAsciiRows(rows: string[]): string[] {
  const normalized: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    normalized.push(y < rows.length ? normalizeAsciiRow(rows[y]) : ' '.repeat(GRID_SIZE));
  }
  return normalized;
}

export function asciiRowsToGrid(rows: string[]): TileType[][] {
  return normalizeAsciiRows(rows).map((row) =>
    row.split('').map((c) => CHAR_TO_TILE[c] ?? 'empty')
  );
}

function ensurePerimeterWalls(rows: string[]): string[] {
  const grid = rows.map((row) => row.split(''));

  for (let x = 0; x < GRID_SIZE; x++) {
    if (grid[0][x] === ' ' || grid[0][x] === '.') grid[0][x] = '#';
    const bottom = GRID_SIZE - 1;
    if (grid[bottom][x] === ' ' || grid[bottom][x] === '.') grid[bottom][x] = '#';
  }
  for (let y = 0; y < GRID_SIZE; y++) {
    if (grid[y][0] === ' ' || grid[y][0] === '.') grid[y][0] = '#';
    if (grid[y][GRID_SIZE - 1] === ' ' || grid[y][GRID_SIZE - 1] === '.') grid[y][GRID_SIZE - 1] = '#';
  }

  return grid.map((row) => row.join(''));
}

function injectRoomDoors(rows: string[]): string[] {
  const grid = rows.map((row) => row.split(''));

  const isHall = (x: number, y: number) => grid[y]?.[x] === '.';
  const isRoomTile = (x: number, y: number) => {
    const c = grid[y]?.[x];
    return c === 'B' || c === 'b' || c === 'R' || c === 'S' || c === 'T' || c === 'P';
  };

  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      if (grid[y][x] !== '#') continue;

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const;

      const hallSide = neighbors.some(([nx, ny]) => isHall(nx, ny));
      const roomSide = neighbors.some(([nx, ny]) => isRoomTile(nx, ny));
      if (hallSide && roomSide) {
        grid[y][x] = 'D';
      }
    }
  }

  return grid.map((row) => row.join(''));
}

function findElevatorAnchor(rowsList: string[][]): { x: number; y: number } | null {
  for (const rows of rowsList) {
    for (let y = 0; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE - 1; x++) {
        const block =
          rows[y][x] === 'E' &&
          rows[y][x + 1] === 'E' &&
          rows[y + 1][x] === 'E' &&
          rows[y + 1][x + 1] === 'E';
        if (block) return { x, y };
      }
    }
  }

  for (const rows of rowsList) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (rows[y][x] === 'E') return { x, y };
      }
    }
  }

  return null;
}

function findStairsAnchor(rowsList: string[][]): { x: number; y: number } | null {
  for (const rows of rowsList) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (rows[y][x] === 'X') return { x, y };
      }
    }
  }
  return null;
}

function hasElevatorBlock(rows: string[]): boolean {
  for (let y = 0; y < GRID_SIZE - 1; y++) {
    for (let x = 0; x < GRID_SIZE - 1; x++) {
      if (
        rows[y][x] === 'E' &&
        rows[y][x + 1] === 'E' &&
        rows[y + 1][x] === 'E' &&
        rows[y + 1][x + 1] === 'E'
      ) {
        return true;
      }
    }
  }
  return false;
}

function getNeighborCoords(x: number, y: number) {
  return [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];
}

function isRoomTile(x: number, y: number, grid: string[][]) {
  const c = grid[y]?.[x];
  return c === 'B' || c === 'b' || c === 'R' || c === 'S' || c === 'T' || c === 'P';
}

function isWalkableChar(c: string | undefined) {
  return c === '.' || c === 'D' || c === 'E' || c === 'X';
}

function stampElevator(rows: string[], x: number, y: number): string[] {
  const grid = rows.map((row) => row.split(''));
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < GRID_SIZE && py < GRID_SIZE && grid[py][px] !== '#') {
        grid[py][px] = 'E';
      }
    }
  }
  return grid.map((row) => row.join(''));
}

function stampStairs(rows: string[], x: number, y: number): string[] {
  const grid = rows.map((row) => row.split(''));
  if (grid[y][x] !== '#') grid[y][x] = 'X';
  return grid.map((row) => row.join(''));
}

function detectBestServiceAnchors(floors: string[][]): { elevator: { x: number; y: number } | null; stairs: { x: number; y: number } | null } {
  const elevatorVotes = new Map<string, number>();
  const stairsVotes = new Map<string, number>();

  for (const rows of floors) {
    for (let y = 0; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE - 1; x++) {
        if (
          rows[y][x] === 'E' &&
          rows[y][x + 1] === 'E' &&
          rows[y + 1][x] === 'E' &&
          rows[y + 1][x + 1] === 'E'
        ) {
          const key = `${x},${y}`;
          elevatorVotes.set(key, (elevatorVotes.get(key) || 0) + 1);
        }
      }
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (rows[y][x] === 'X') {
          const key = `${x},${y}`;
          stairsVotes.set(key, (stairsVotes.get(key) || 0) + 1);
        }
      }
    }
  }

  let bestElevator: { x: number; y: number } | null = null;
  let bestElevatorScore = 0;
  for (const [key, score] of elevatorVotes) {
    if (score > bestElevatorScore) {
      bestElevatorScore = score;
      const [x, y] = key.split(',').map(Number);
      bestElevator = { x, y };
    }
  }

  let bestStairs: { x: number; y: number } | null = null;
  let bestStairsScore = 0;
  for (const [key, score] of stairsVotes) {
    if (score > bestStairsScore) {
      bestStairsScore = score;
      const [x, y] = key.split(',').map(Number);
      bestStairs = { x, y };
    }
  }

  return { elevator: bestElevator, stairs: bestStairs };
}

function repairVerticalServices(floors: string[][]): string[][] {
  if (floors.length === 0) return floors;

  const { elevator, stairs } = detectBestServiceAnchors(floors);
  const elevatorAnchor = elevator ?? { x: 9, y: 13 };
  const stairsAnchor = stairs ?? { x: 17, y: 10 };

  return floors.map((rows) => {
    let next = stampElevator(rows, elevatorAnchor.x, elevatorAnchor.y);
    next = stampStairs(next, stairsAnchor.x, stairsAnchor.y);
    return next;
  });
}

function clampLabels(labels: Label[] | undefined): Label[] {
  if (!labels?.length) return [];
  return labels
    .filter(
      (l) =>
        typeof l.x === 'number' &&
        typeof l.y === 'number' &&
        l.x >= 0 &&
        l.x < GRID_SIZE &&
        l.y >= 0 &&
        l.y < GRID_SIZE &&
        typeof l.text === 'string' &&
        l.text.trim().length > 0
    )
    .map((l, i) => ({
      id: l.id || `ai-label-${i + 1}`,
      x: l.x,
      y: l.y,
      text: l.text.trim(),
    }));
}

export function repairAsciiFloorRows(rows: string[]): string[] {
  let next = normalizeAsciiRows(rows);
  next = ensurePerimeterWalls(next);
  next = injectRoomDoors(next);
  return next;
}

function validateAiFloorCharacters(rows: string[], index: number, totalFloors: number): string[] {
  const grid = rows.map((row) => row.split(''));
  const errors: string[] = [];

  const isRoomTile = (x: number, y: number) => {
    const c = grid[y]?.[x];
    return c === 'B' || c === 'b' || c === 'R' || c === 'S' || c === 'T' || c === 'P';
  };

  const isWalkableChar = (c: string | undefined) => c === '.' || c === 'D' || c === 'E' || c === 'X';

  let hasWalkable = false;
  let doorCount = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const c = grid[y][x];
      if (c === 'D') doorCount++;
      if (isWalkableChar(c)) hasWalkable = true;
      if (y === 0 || y === GRID_SIZE - 1 || x === 0 || x === GRID_SIZE - 1) {
        if (c === '.' || isRoomTile(x, y)) {
          errors.push(`border tile at ${x},${y} must be wall, window, door, elevator, or stairs`);
        }
      }
    }
  }

  if (!hasWalkable) {
    errors.push('floor has no walkable hallway, door, elevator, or staircase tiles');
  }

  const hasElevator = hasElevatorBlock(rows);
  if (!hasElevator) {
    errors.push('floor must include a 2x2 elevator bank (EE block)');
  }

  if (doorCount === 0) {
    errors.push('floor must include at least one door D');
  }

  const walkableStart = grid.flatMap((row, y) => row.map((c, x) => ({ c, x, y }))).find((cell) => isWalkableChar(cell.c));
  if (walkableStart) {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const queue = [{ x: walkableStart.x, y: walkableStart.y }];
    visited[walkableStart.y][walkableStart.x] = true;

    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbor of [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ]) {
        if (neighbor.x < 0 || neighbor.x >= GRID_SIZE || neighbor.y < 0 || neighbor.y >= GRID_SIZE) continue;
        if (visited[neighbor.y][neighbor.x]) continue;
        if (isWalkableChar(grid[neighbor.y][neighbor.x])) {
          visited[neighbor.y][neighbor.x] = true;
          queue.push(neighbor);
        }
      }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (isWalkableChar(grid[y][x]) && !visited[y][x]) {
          errors.push(`unreachable walkable tile ${grid[y][x]} at ${x},${y}`);
        }
        if (grid[y][x] === 'D') {
          const neighborCoords = [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 },
          ];
          const adjacentHall = neighborCoords.filter((n) => grid[n.y]?.[n.x] === '.').length;
          const adjacentRoom = neighborCoords.filter((n) => isRoomTile(n.x, n.y)).length;
          const adjacentOutside = neighborCoords.some(
            (n) => n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE || grid[n.y]?.[n.x] === ' '
          );
          if (adjacentHall !== 1) {
            errors.push(`door at ${x},${y} must have exactly one adjacent hallway tile, found ${adjacentHall}`);
          }
          if (!adjacentOutside && adjacentRoom !== 1) {
            errors.push(`door at ${x},${y} must have exactly one adjacent room tile, found ${adjacentRoom}`);
          }
        }
      }
    }
  }

  return errors;
}

export function normalizeAiFloors(rawFloors: RawAiFloor[]): Floor[] {
  if (!rawFloors.length) return [];

  const sorted = [...rawFloors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  let asciiFloors = sorted.map((f) => repairAsciiFloorRows(f.grid ?? []));
  asciiFloors = repairVerticalServices(asciiFloors);

  asciiFloors.forEach((rows, index) => {
    const errors = validateAiFloorCharacters(rows, index, asciiFloors.length);
    if (errors.length) {
      console.warn(`AI-generated floor ${index} validation warnings: ${errors.join('; ')}`);
    }
  });

  return sorted.map((f, index) => ({
    level: f.level ?? index,
    name: f.name?.trim() || `Level ${f.level ?? index}`,
    grid: asciiRowsToGrid(asciiFloors[index]),
    labels: clampLabels(f.labels),
  }));
}

export function enrichUserPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();

  const wantsManyFloors = /\b(\d{1,2})\s*-?\s*floor|\bfull copy\b|\btower\b|\bhigh[- ]rise\b/.test(lower);
  const isBrandChain =
    lower.includes('radisson') ||
    lower.includes('marriott') ||
    lower.includes('olimp') ||
    lower.includes('olymp');

  const wantsSuites = /\bsuite\b|\bpenthouses?\b|\bexecutive\b/.test(lower);
  const wantsConference = /\bconference\b|\bmeeting\b|\bevent\b|\bbanquet\b/.test(lower);
  const wantsSpa = /\bspa\b|\bwellness\b|\bgym\b|\bfitness\b/.test(lower);
  const wantsPool = /\bpool\b|\bindoor\s*pool\b|\bs Swimming\b/.test(lower);
  const wantsRestaurant = /\brestaurant\b|\bfine\s*dining\b|\bbuffet\b/.test(lower);
  const wantsBoutique = /\bboutique\b|\bdesign\b|\barts?\b|\bhip\b/.test(lower);

  const lines = [prompt.trim()];

  if (isBrandChain) {
    lines.push(
      '',
      'Hotel brief (branded upscale hotel — stylized game floor plan, not a literal blueprint):',
      '- Generate 4 to 6 floors: a polished branded ground-floor lobby plus guest room floors above.',
      '- Ground floor: main entrance, reception desk (R), concierge/staff area (S), lounge seating (T), plant decor (P), and a clear route to the elevator bank.',
      '- Elevator bank: a single 2x2 EE core in the same location on every floor. Emergency stairs X in a consistent service position on every floor.',
      '- Guest floors: clean corridors with mixed room sizes — standard 2x2 bed rooms, a few larger executive/suite modules, and bathrooms (b) inside rooms.',
      '- Hallways must be continuous, avoid isolated rooms, and group guest rooms around a central corridor.',
      '- Staff/service spaces near the back of the lobby and adjacent to the elevator core, never inside guest rooms.',
      '- Add realistic hospitality details: reception zone, meeting/lounge area, clear guest circulation from entrance to guest floors.',
      '- Do NOT output a literal floor plan of a real hotel. Use the brand style as inspiration and create a playable 20x20 tile layout.'
    );
  } else if (wantsBoutique) {
    lines.push(
      '',
      'Hotel brief (boutique/design hotel — stylized game floor plan):',
      '- Generate 3 to 5 floors with an artistic, intimate feel.',
      '- Asymmetric layouts, cozy nooks, mixed room sizes, vintage decor hints (P, T, R in interesting patterns).',
      '- Ground floor: reception, small lounge/library, direct access to elevator core.',
      '- Guest floors: mix of standard rooms and larger boutique suites with unique shapes.',
      '- Keep circulation intuitive but visually interesting.'
    );
  } else if (wantsManyFloors) {
    lines.push('', 'Generate up to 6 playable floors with identical elevator and stair coordinates on every floor.');
  } else {
    lines.push('', 'Generate 2 floors (lobby + guest rooms) unless the prompt specifies otherwise.');
  }

  if (wantsSuites) {
    lines.push(
      '',
      'Suite/penthouse requirement: include at least one larger suite per guest floor. A suite should have multiple beds (BB or BBB), an en-suite bathroom (bb), and a small seating area (TT).'
    );
  }
  if (wantsConference) {
    lines.push(
      '',
      'Conference/events requirement: include a conference room with large tables (TTTT), staff service (S), and direct elevator access on one floor.'
    );
  }
  if (wantsSpa) {
    lines.push(
      '',
      'Spa/wellness requirement: include a spa area with multiple bathrooms (bbbb), plants (P), and relaxation seating (TT).'
    );
  }
  if (wantsPool) {
    lines.push(
      '',
      'Pool requirement: include an indoor pool area — use floor tiles (....) for the pool surface, surrounded by lounge seating (T) and plants (P).'
    );
  }
  if (wantsRestaurant) {
    lines.push(
      '',
      'Restaurant requirement: include a dining area with multiple tables (TT), kitchen/service area (S), and ambient decor (P).'
    );
  }

  if (lower.includes('full copy') || lower.includes('copy')) {
    lines.push(
      '',
      'Important: Do NOT produce an exact copy of an existing hotel. Use the request as inspiration only and create a stylized, playable 20x20 game layout.'
    );
  }

  lines.push(
    '',
    'Hard constraints:',
    '- Output EXACTLY 20 rows; each row EXACTLY 20 characters.',
    '- Use ONLY the allowed tile characters. Treat unknown or invalid characters as solid wall tiles (#).',
    '- Use spaces only outside the building envelope. Interior walkable areas must use . hallways or other valid room tiles.',
    '- Every guest room must be a closed rectangle of # walls with exactly one D connecting to a . hallway.',
    '- Every door D must connect to exactly one room tile and exactly one hallway tile.',
    '- Walls (#) are solid barriers. Guests and players cannot move through # or blocked W window tiles.',
    '- Hallways must be continuous . tiles linking all room doors, elevators (E), and stairs (X).',
    '- No isolated hallway tiles: all . tiles must be reachable from each other through connected corridors.',
    '- Use a 2x2 EE elevator bank (not isolated single E tiles on different walls).',
    '- Stairs X are recommended but optional if a 2x2 EE elevator bank is present on every floor.',
    '- Do NOT output a literal architectural copy of a real hotel. Keep the design simplified and game-friendly.'
  );

  return lines.join('\n');
}

export function buildSystemInstruction(): string {
  return `You are an expert hotel architect for a tile-based hotel simulator.

The grid is EXACTLY 20 columns (x: 0-19) by 20 rows (y: 0-19). Each row is one string of 20 characters.

Tile characters (use ONLY these):
' ' = empty/outside (use sparingly inside the building)
'.' = hallway/lobby floor (walkable)
'#' = wall (structural)
'D' = door (required between hallway and rooms)
'W' = window (on exterior walls only)
'B' = bed (guest room sleeping area, often 2x2)
'b' = bathroom (inside guest rooms)
'R' = reception desk (ground floor)
'S' = staff area
'P' = plant/decoration
'T' = table/seating
'E' = elevator (always use a 2x2 block: EE on two rows)
'X' = emergency stairs (single tile, same position on all floors; optional if elevators exist)

MANDATORY LAYOUT RULES:
1. Every floor is a closed building: outer border is mostly '#' with windows 'W' and doors 'D' for entrances.
2. Every guest room is a walled rectangle. Each room has EXACTLY ONE 'D' tile opening onto a '.' hallway.
3. A continuous '.' corridor must connect every room door, the elevator bank, and emergency stairs.
4. Elevators: use a 2x2 'EE' block at the SAME x,y on every floor (example: x=9-10, y=13-14).
5. Emergency stairs 'X': same x,y on every floor (optional if elevators exist on every floor).
6. Never place random single 'E' tiles on opposite ends of the map.
7. When asked to recreate a real hotel, produce an INSPIRED stylized layout (not a real architectural copy).
8. Ground floor should feel like a real hotel lobby: reception (R), seating (T), plants (P), staff area (S), and a clear path from entrance to elevators.
9. Upper floors should have quiet guest-room corridors with beds (B), bathrooms (b), and occasional plants (P) or tables (T).
10. For suites/penthouses: use multiple beds (BBB), en-suite bathrooms (bbb), and lounge tables (TT).
11. For conference floors: large table clusters (TTTT), staff service (S), and direct elevator access.

EXAMPLE guest floor snippet (rows are 20 chars; shown split for clarity):
####################
#BB.b.#BB.b.#BB.b..#
#BB.b.#BB.b.#BB.b..#
#..D..#..D..#..D...#
#.....#.....#......#
#.....#.....#......#
####.######.########
#.................W#
#.................W#
####.######.########
#.....#.....#......#
#BB.b.#BB.b.#BB.b..#
#BB.b.#BB.b.#BB.b..#
#..D..#..D..#..D...#
#.....#.....#......#
#.....#.....#......#
##########EE########
##########EE########
####################
####################

Return valid JSON only. Each floor.grid must have exactly 20 strings of exactly 20 characters.`;
}
