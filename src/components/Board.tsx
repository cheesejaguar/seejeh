// FILE: src/components/Board.tsx
//
// The board: 49 dug holes in a tilted earth plane.
//
// Two things matter here for performance:
//  1. Every subscription is a narrow selector, so moving a stone re-renders the
//     handful of holes that changed rather than all 49.
//  2. Piece movement is animated with FLIP — measure before, measure after,
//     invert with a transform, then release. Layout is never touched mid-flight,
//     so the whole animation stays on the compositor.

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CELL_COUNT, CENTER, SIZE, colOf, rowOf } from '../engine';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';

const ROWS = Array.from({ length: SIZE }, (_, r) => r);
const COLS = Array.from({ length: SIZE }, (_, c) => c);

interface HoleProps {
  index: number;
  focused: boolean;
  onFocusCell: (index: number) => void;
  registerRef: (index: number, el: HTMLButtonElement | null) => void;
}

const Hole = memo(function Hole({ index, focused, onFocusCell, registerRef }: HoleProps) {
  const { t, n } = useTranslation();

  // Narrow selectors: each hole subscribes only to what changes its own render.
  const occupant = useGameStore((s) => s.game.board[index]);
  const phase = useGameStore((s) => s.game.phase);
  const isSelected = useGameStore((s) => s.selected === index);
  const isChainOrigin = useGameStore((s) => s.game.chainFrom === index);
  // Marked targets only — during placement every empty hole is legal, and
  // marking all 48 turns the board into noise rather than guidance.
  const isTarget = useGameStore((s) => s.targets.some((m) => m.to === index));
  const wouldTake = useGameStore((s) =>
    s.targets.some((m) => m.to === index && m.captures.length > 0),
  );
  // Placement gets a quieter affordance: the hole responds on hover only.
  const isPlaceable = useGameStore(
    (s) => s.game.phase === 'placement' && s.legal.some((m) => m.to === index),
  );
  const isDoomed = useGameStore((s) => s.doomed.includes(index));
  // A captured stone's cell is already empty, so the animation needs the owner
  // carried alongside it. Returns a primitive, so the selector stays stable.
  const vanishingPlayer = useGameStore(
    (s) => s.vanishing.find((v) => v.at === index)?.player ?? null,
  );
  const isArriving = useGameStore((s) => s.arriving.includes(index));
  const isTraced = useGameStore((s) => s.lastTouched.includes(index));
  const interactive = useGameStore(
    (s) => !s.aiThinking && !s.game.outcome && s.game.turn === s.settings.humanSide,
  );
  const isMovable = useGameStore((s) => {
    if (s.game.phase !== 'movement') return false;
    if (s.game.board[index] !== (s.game.turn === 'Light' ? 1 : 2)) return false;
    return s.legal.some((m) => m.from === index);
  });

  const selectCell = useGameStore((s) => s.selectCell);
  const hoverCell = useGameStore((s) => s.hoverCell);

  const isEye = index === CENTER;
  const occupantPlayer = occupant === 1 ? 'Light' : occupant === 2 ? 'Dark' : null;
  // While a capture animates, keep drawing the stone that is being taken.
  const player = occupantPlayer ?? vanishingPlayer;
  const isVanishing = occupantPlayer === null && vanishingPlayer !== null;
  const row = rowOf(index);
  const col = colOf(index);

  const playable = interactive && (isTarget || isMovable || isPlaceable);

  const holeClass = [
    'hole',
    isEye && 'is-eye',
    isEye && player && 'is-sheltering',
    isTarget && interactive && 'is-target',
    wouldTake && interactive && 'is-taking',
    isPlaceable && interactive && 'is-placeable',
    playable && 'is-playable',
    isTraced && 'is-lastmove',
  ]
    .filter(Boolean)
    .join(' ');

  const stoneClass = [
    'stone',
    player === 'Light' ? 'is-light' : 'is-dark',
    isSelected && !isChainOrigin && 'is-selected',
    isChainOrigin && phase === 'chain' && 'is-chaining',
    isMovable && !isSelected && 'is-movable',
    isDoomed && 'is-doomed',
    isVanishing && 'is-taken',
    isArriving && 'is-dropping',
    phase === 'blockadeRemoval' && isTarget && 'is-sacrificial',
  ]
    .filter(Boolean)
    .join(' ');

  // One readable sentence rather than a pile of fragments.
  //
  // Affordances are gated on `interactive` exactly as the visual classes are.
  // Without that gate the label announced "can place here" on all 48 holes
  // during the opponent's turn, while nothing was highlighted and activating
  // the hole did nothing at all — the screen-reader user was told about moves
  // they could not make.
  const descriptors: string[] = [];
  descriptors.push(
    occupantPlayer
      ? t('a11y.stone', { player: t(`player.${occupantPlayer}`) })
      : t('a11y.empty'),
  );
  if (interactive) {
    if (isSelected) descriptors.push(t('a11y.selected'));
    if (isMovable) descriptors.push(t('a11y.movable'));
    if (isPlaceable) descriptors.push(t('a11y.canPlace'));
    else if (isTarget && phase === 'blockadeRemoval') descriptors.push(t('a11y.canBeRemoved'));
    else if (isTarget) descriptors.push(t('a11y.canMove'));
    if (wouldTake) descriptors.push(t('a11y.wouldTake'));
    if (isDoomed) descriptors.push(t('a11y.wouldBeTaken'));
  }

  const position = isEye
    ? t('a11y.cellEye', { row: n(row + 1), col: n(col + 1) })
    : t('a11y.cell', { row: n(row + 1), col: n(col + 1) });

  return (
    <button
      ref={(el) => registerRef(index, el)}
      type="button"
      role="gridcell"
      className={holeClass}
      // Roving tabindex: exactly one hole is in the tab order, so the board is a
      // single tab stop instead of 49.
      tabIndex={focused ? 0 : -1}
      aria-label={`${position}. ${descriptors.join(', ')}`}
      onClick={() => {
        onFocusCell(index);
        selectCell(index);
      }}
      onFocus={() => onFocusCell(index)}
      onMouseEnter={() => hoverCell(index)}
      onMouseLeave={() => hoverCell(null)}
    >
      {player && (
        <span
          className={stoneClass}
          // Only real occupants carry data-stone. A ghost being animated out is
          // not a board position, so FLIP must not track it as one.
          data-stone={occupantPlayer ? index : undefined}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

export function Board() {
  const { t } = useTranslation();
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const previous = useRef<Map<number, DOMRect>>(new Map());
  const [focusedCell, setFocusedCell] = useState(CENTER);

  const board = useGameStore((s) => s.game.board);
  const move = useGameStore((s) => s.lastMove);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const registerRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(index, el);
    else cellRefs.current.delete(index);
  }, []);

  const onFocusCell = useCallback((index: number) => setFocusedCell(index), []);

  // --- FLIP -----------------------------------------------------------------
  useLayoutEffect(() => {
    const container = boardRef.current;
    if (!container) return;

    if (reducedMotion) {
      previous.current = new Map();
      return;
    }

    const next = new Map<number, DOMRect>();
    const stones = container.querySelectorAll<HTMLElement>('[data-stone]');
    const prev = previous.current;

    stones.forEach((stone) => {
      const index = Number(stone.dataset.stone);
      const rect = stone.getBoundingClientRect();
      next.set(index, rect);

      // Animate only the stone the engine actually moved. Inferring the origin
      // from which cells became empty is ambiguous the moment a capture is
      // involved — several cells empty at once, and the guess could pick a
      // captured square, animating the move backwards or sideways.
      if (!move || index !== move.to) return;

      const before = prev.get(move.from);
      if (!before) return;

      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      if (dx === 0 && dy === 0) return;

      stone.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', composite: 'add' },
      );
    });

    previous.current = next;
  }, [board, move, reducedMotion]);

  // --- Keyboard grid navigation --------------------------------------------
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const isRTL = document.documentElement.dir === 'rtl';
      const col = colOf(focusedCell);
      const row = rowOf(focusedCell);
      let next = focusedCell;

      switch (event.key) {
        case 'ArrowUp':
          next = focusedCell - SIZE;
          break;
        case 'ArrowDown':
          next = focusedCell + SIZE;
          break;
        case 'ArrowLeft':
          // Arrow keys follow what the reader SEES, so they flip under RTL.
          if (isRTL) next = col === SIZE - 1 ? focusedCell : focusedCell + 1;
          else next = col === 0 ? focusedCell : focusedCell - 1;
          break;
        case 'ArrowRight':
          if (isRTL) next = col === 0 ? focusedCell : focusedCell - 1;
          else next = col === SIZE - 1 ? focusedCell : focusedCell + 1;
          break;
        case 'Home':
          next = row * SIZE;
          break;
        case 'End':
          next = row * SIZE + SIZE - 1;
          break;
        default:
          return;
      }

      // Consume the key even when the move is a no-op at the board edge,
      // otherwise ArrowUp/ArrowDown scrolls the page out from under the player.
      event.preventDefault();
      if (next < 0 || next >= CELL_COUNT || next === focusedCell) return;
      setFocusedCell(next);
      cellRefs.current.get(next)?.focus();
    },
    [focusedCell],
  );

  return (
    <div className="board-stage">
      <div
        ref={boardRef}
        className="board"
        role="grid"
        aria-label={t('a11y.board')}
        aria-describedby="board-help"
        onKeyDown={handleKeyDown}
      >
        {ROWS.map((r) => (
          <div className="board-row" role="row" key={r}>
            {COLS.map((c) => {
              const index = r * SIZE + c;
              return (
                <Hole
                  key={index}
                  index={index}
                  focused={focusedCell === index}
                  onFocusCell={onFocusCell}
                  registerRef={registerRef}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p id="board-help" className="visually-hidden">
        {t('a11y.boardHelp')}
      </p>
    </div>
  );
}

/** Announces turn changes, captures and results to screen readers. */
export function LiveRegion() {
  const announcement = useGameStore((s) => s.announcement);
  const { t } = useTranslation();
  const [text, setText] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setText(announcement), 60);
    return () => window.clearTimeout(id);
  }, [announcement]);

  return (
    <div
      className="visually-hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={t('a11y.liveRegion')}
    >
      {text}
    </div>
  );
}
