// FILE: src/engine/board.ts
//
// Board primitives for 7x7 Seejeh.
//
// The board is a flat Uint8Array of 49 cells indexed `r * 7 + c`. A flat typed
// array keeps copy-on-write cheap (49 bytes) which matters because both the UI
// reducer and the AI search allocate a new board per ply.

export const SIZE = 7;
export const CELL_COUNT = SIZE * SIZE; // 49
export const CENTER = 24; // r=3, c=3
export const STONES_PER_PLAYER = 24; // 48 stones on 49 cells => the centre is the only gap
export const PLACEMENTS_PER_TURN = 2;

export const EMPTY = 0;
export const LIGHT = 1;
export const DARK = 2;

export type CellValue = typeof EMPTY | typeof LIGHT | typeof DARK;
export type Board = Uint8Array;

/** Direction indices. Order is stable and relied upon by the STEP table. */
export const UP = 0;
export const DOWN = 1;
export const LEFT = 2;
export const RIGHT = 3;
export const DIRECTIONS = [UP, DOWN, LEFT, RIGHT] as const;

const DELTAS: readonly (readonly [number, number])[] = [
  [-1, 0], // UP
  [1, 0], // DOWN
  [0, -1], // LEFT
  [0, 1], // RIGHT
];

/**
 * STEP[i * 4 + d] is the index one step from `i` in direction `d`, or -1 when
 * that step leaves the board. Precomputing this removes every row/column
 * bounds check from the hot path and, importantly, makes horizontal wrap-around
 * (the classic flat-array bug) structurally impossible.
 */
export const STEP: Int8Array = (() => {
  const table = new Int8Array(CELL_COUNT * 4).fill(-1);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      for (let d = 0; d < 4; d++) {
        const nr = r + DELTAS[d][0];
        const nc = c + DELTAS[d][1];
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          table[i * 4 + d] = nr * SIZE + nc;
        }
      }
    }
  }
  return table;
})();

/** Orthogonal neighbours of each cell, precomputed. */
export const NEIGHBOURS: readonly (readonly number[])[] = (() => {
  const all: number[][] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const list: number[] = [];
    for (let d = 0; d < 4; d++) {
      const n = STEP[i * 4 + d];
      if (n >= 0) list.push(n);
    }
    all.push(list);
  }
  return all;
})();

export function step(index: number, dir: number): number {
  return STEP[index * 4 + dir];
}

export function rowOf(index: number): number {
  return (index / SIZE) | 0;
}

export function colOf(index: number): number {
  return index % SIZE;
}

export function toIndex(r: number, c: number): number {
  return r * SIZE + c;
}

export function inBounds(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < CELL_COUNT;
}

export function isCenter(index: number): boolean {
  return index === CENTER;
}

export function areAdjacent(a: number, b: number): boolean {
  if (!inBounds(a) || !inBounds(b)) return false;
  for (let d = 0; d < 4; d++) {
    if (STEP[a * 4 + d] === b) return true;
  }
  return false;
}

export function createBoard(): Board {
  return new Uint8Array(CELL_COUNT);
}

export function cloneBoard(board: Board): Board {
  return new Uint8Array(board);
}

export function countStones(board: Board, value: CellValue): number {
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] === value) n++;
  }
  return n;
}

/** Serialises a board to a 49-character string: '.' empty, 'L' Light, 'D' Dark. */
export function boardToString(board: Board): string {
  let out = '';
  for (let i = 0; i < CELL_COUNT; i++) {
    out += board[i] === LIGHT ? 'L' : board[i] === DARK ? 'D' : '.';
  }
  return out;
}

export function boardFromString(text: string): Board {
  if (typeof text !== 'string' || text.length !== CELL_COUNT) {
    throw new Error(`Board string must be exactly ${CELL_COUNT} characters`);
  }
  const board = createBoard();
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = text[i];
    board[i] = ch === 'L' ? LIGHT : ch === 'D' ? DARK : EMPTY;
    if (ch !== 'L' && ch !== 'D' && ch !== '.') {
      throw new Error(`Invalid board character '${ch}' at ${i}`);
    }
  }
  return board;
}

/**
 * Parses an ASCII diagram into a board. Used heavily by tests so that positions
 * read like the board they describe. Whitespace is ignored.
 */
export function boardFromDiagram(diagram: string): Board {
  const compact = diagram.replace(/\s+/g, '');
  return boardFromString(compact);
}

export function boardToDiagram(board: Board): string {
  const rows: string[] = [];
  for (let r = 0; r < SIZE; r++) {
    let row = '';
    for (let c = 0; c < SIZE; c++) {
      const v = board[toIndex(r, c)];
      row += v === LIGHT ? 'L' : v === DARK ? 'D' : '.';
    }
    rows.push(row);
  }
  return rows.join('\n');
}
