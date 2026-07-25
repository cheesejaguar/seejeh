// FILE: src/store/gameStore.ts
//
// UI state and orchestration. This layer contains NO game rules — every state
// transition goes through `applyAction`. The previous store reimplemented
// placement and drifted from the engine, which is exactly the failure this
// separation removes.
//
// AI turns are driven by a single async loop guarded by a generation counter
// rather than chained setTimeouts, so a new game or a settings change cannot
// leave a stale AI turn running against a state it no longer owns.

import { create } from 'zustand';
import {
  applyAction,
  createGame,
  deserializeGame,
  legalMoves,
  movesFrom,
  opponentOf,
  serializeGame,
  stoneCount,
  type Action,
  type ActionResult,
  type GameEvent,
  type GameState,
  type Move,
  type Player,
  type RejectionCode,
  type VariantFlags,
} from '../engine';
import { requestBestMove } from '../ai/client';
import type { AIMove, Difficulty } from '../ai/search';
import {
  buildLeaderboard,
  computeStats,
  emptyData,
  exportLeaderboard,
  importLeaderboard,
  loadLeaderboard,
  recordGame,
  saveLeaderboard,
  upsertProfile,
  type RecordGameInput,
} from '../leaderboard/store';
import type { LeaderboardData, PlayerProfile } from '../leaderboard/types';
import { loadSettings, saveSettings, type Settings } from './settings';
import { sound } from '../lib/sound';
import { createTranslator, type TranslationKey } from '../i18n';

const GAME_KEY = 'seejeh.game.v1';

export interface Toast {
  id: number;
  key: TranslationKey;
  params?: Record<string, string | number>;
  tone: 'info' | 'error';
}

/** Stats accumulated over the current game, for the leaderboard record. */
interface Session {
  startedAt: number;
  captures: number;
  losses: number;
  bestCapture: number;
  moves: number;
  recorded: boolean;
}

export type Panel = 'none' | 'settings' | 'leaderboard' | 'about';

interface GameStore {
  game: GameState;
  legal: Move[];
  /** Cells to visibly mark as targets — a subset of `legal`, see computeTargets. */
  targets: Move[];
  selected: number | null;
  hovered: number | null;
  /** Cells the hovered/selected move would take, for the preview. */
  doomed: number[];
  /** Cells touched by the last applied action, for the trace animation. */
  lastTouched: number[];
  /**
   * The exact stone movement the engine just applied. The board animates from
   * this rather than inferring an origin from which cells became empty — with
   * captures, several cells empty at once and the inference picked the wrong one.
   */
  lastMove: { from: number; to: number } | null;
  /**
   * Stones being animated out. Carries the owner because the board cell is
   * already empty by the time this renders — without it the capture animation
   * would have nothing to draw.
   */
  vanishing: Array<{ at: number; player: Player }>;
  /** Cells whose stones just arrived, for the drop animation. */
  arriving: number[];

  settings: Settings;
  leaderboard: LeaderboardData;
  session: Session | null;

  aiThinking: boolean;
  panel: Panel;
  toasts: Toast[];
  /** Announcement text for the screen-reader live region. */
  announcement: string;
  resultSeen: boolean;
  lastRatingDelta: number | null;

  newGame: () => void;
  selectCell: (index: number) => void;
  hoverCell: (index: number | null) => void;
  endChain: () => void;
  resign: () => void;
  offerDraw: () => void;
  respondToDraw: (accept: boolean) => void;

  setPanel: (panel: Panel) => void;
  dismissResult: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateVariant: (patch: Partial<VariantFlags>) => void;
  setProfileName: (name: string) => void;
  ensureProfile: (profile: Partial<PlayerProfile> & { id: string; name: string }) => void;
  exportData: () => string;
  importData: (text: string) => boolean;
  clearData: () => void;
  pushToast: (key: TranslationKey, tone?: 'info' | 'error', params?: Record<string, string | number>) => void;
}

// --- Helpers ---------------------------------------------------------------

function persistGame(state: GameState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GAME_KEY, serializeGame(state));
    }
  } catch {
    /* ignore */
  }
}

function restoreGame(): GameState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return deserializeGame(localStorage.getItem(GAME_KEY));
  } catch {
    return null;
  }
}

function localProfileId(): string {
  return 'local:default';
}

function toAction(move: AIMove): Action {
  switch (move.kind) {
    case 'place':
      return { type: 'place', at: move.at };
    case 'move':
      return { type: 'move', from: move.from, to: move.to };
    case 'removeStone':
      return { type: 'removeStone', at: move.at };
    case 'endChain':
      return { type: 'endChain' };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Which cells should be visibly marked as targets.
 *
 * Deliberately NOT "every legal move": during placement all 48 empty holes are
 * legal, and marking them all just turns the board into noise. A marker is only
 * shown where the player has a real choice to point at.
 */
function computeTargets(game: GameState, selected: number | null): Move[] {
  if (game.outcome) return [];
  switch (game.phase) {
    case 'placement':
      return [];
    case 'chain':
    case 'blockadeRemoval':
      return legalMoves(game);
    case 'movement':
      return selected === null ? [] : movesFrom(game, selected);
    default:
      return [];
  }
}

/** Generation counter: any in-flight AI turn from an older generation aborts. */
let aiGeneration = 0;
let toastSeq = 0;

export const useGameStore = create<GameStore>((set, get) => {
  const initialSettings = loadSettings();
  const restored = restoreGame();
  const initialGame = restored ?? createGame(initialSettings.variant);
  const board = loadLeaderboard();

  // Guarantee there is always a profile to record games against.
  const seeded =
    board.profiles.length > 0
      ? board
      : upsertProfile(board, {
          id: localProfileId(),
          name: '',
          source: 'local',
          createdAt: Date.now(),
        });

  function isAITurn(game: GameState, settings: Settings): boolean {
    return !game.outcome && game.turn !== settings.humanSide;
  }

  /**
   * Builds the screen-reader announcement in the player's own language. The
   * previous version emitted English assembled from raw engine enum values,
   * which an Arabic user's screen reader would read out as gibberish.
   */
  function announce(game: GameState, events: readonly GameEvent[]): string {
    const { t, tCount } = createTranslator(get().settings.language);
    const human = get().settings.humanSide;
    const parts: string[] = [];

    for (const event of events) {
      if (event.type === 'stonesCaptured') {
        parts.push(tCount('event.captured', event.cells.length));
      }
      if (event.type === 'blockade') {
        parts.push(
          event.blocked === human ? t('event.blockadeYou') : t('event.blockadeOpponent'),
        );
      }
      if (event.type === 'gameEnded') {
        const outcome = event.outcome;
        if (outcome.kind === 'draw') {
          parts.push(`${t('outcome.draw')}. ${t(`outcome.${outcome.reason}` as TranslationKey)}`);
        } else {
          const headline =
            outcome.winner === human ? t('outcome.youWin') : t('outcome.youLose');
          parts.push(
            `${headline}. ${t(`outcome.${outcome.reason}` as TranslationKey, {
              player: t(`player.${outcome.winner}` as TranslationKey),
            })}`,
          );
        }
      }
    }

    if (parts.length === 0 && !game.outcome) {
      parts.push(game.turn === human ? t('turn.yours') : t('turn.opponent'));
    }
    return parts.join(' ');
  }

  /** Records a finished game exactly once. */
  function recordIfFinished(game: GameState): void {
    const { session, settings, leaderboard } = get();
    if (!game.outcome || !session || session.recorded) return;

    const human = settings.humanSide;
    const result =
      game.outcome.kind === 'draw'
        ? ('draw' as const)
        : game.outcome.winner === human
          ? ('win' as const)
          : ('loss' as const);

    const profileId = leaderboard.activeProfileId ?? localProfileId();
    const input: RecordGameInput = {
      profileId,
      playedAt: session.startedAt,
      durationMs: Date.now() - session.startedAt,
      result,
      reason: game.outcome.kind === 'win' ? game.outcome.reason : game.outcome.reason,
      playerColor: human,
      difficulty: settings.difficulty,
      stonesOwn: stoneCount(game.board, human),
      stonesOpponent: stoneCount(game.board, opponentOf(human)),
      captures: session.captures,
      losses: session.losses,
      bestCapture: session.bestCapture,
      moves: session.moves,
    };

    const { data, record } = recordGame(leaderboard, input);
    saveLeaderboard(data);

    // Mark recorded BEFORE any await point so a second call cannot slip in.
    set({
      leaderboard: data,
      session: { ...session, recorded: true },
      lastRatingDelta: record.ratingAfter - record.ratingBefore,
      resultSeen: false,
    });
  }

  /** Commits a successful engine result and fans out its side effects. */
  function commit(result: ActionResult & { ok: true }): void {
    const { settings, session } = get();
    const human = settings.humanSide;

    let captures = session?.captures ?? 0;
    let losses = session?.losses ?? 0;
    let bestCapture = session?.bestCapture ?? 0;
    let moves = session?.moves ?? 0;
    const vanishing: Array<{ at: number; player: Player }> = [];
    const arriving: number[] = [];
    const touched: number[] = [];
    let lastMove: { from: number; to: number } | null = null;

    for (const event of result.events) {
      switch (event.type) {
        case 'stonePlaced':
          arriving.push(event.at);
          touched.push(event.at);
          sound.play('place');
          break;
        case 'stoneMoved':
          touched.push(event.from, event.to);
          lastMove = { from: event.from, to: event.to };
          // Only the player's own moves count toward their record, otherwise
          // the "fewest moves to win" statistic is inflated by the opponent.
          if (event.player === human) moves += 1;
          sound.play('move');
          break;
        case 'stonesCaptured':
          // The captured stones belong to the mover's opponent.
          vanishing.push(
            ...event.cells.map((cell) => ({ at: cell, player: opponentOf(event.by) })),
          );
          if (event.by === human) {
            captures += event.cells.length;
            if (event.cells.length > bestCapture) bestCapture = event.cells.length;
          } else {
            losses += event.cells.length;
          }
          sound.play('capture');
          break;
        case 'stoneRemoved':
          vanishing.push({ at: event.at, player: event.player });
          if (event.player === human) losses += 1;
          sound.play('capture');
          break;
        case 'chainStarted':
          sound.play('chain');
          break;
        case 'gameEnded':
          sound.play(
            event.outcome.kind === 'win' && event.outcome.winner === human ? 'win' : 'lose',
          );
          break;
        default:
          break;
      }
    }

    const game = result.state;
    const selected = game.phase === 'chain' ? game.chainFrom : null;
    set({
      game,
      legal: legalMoves(game),
      targets: computeTargets(game, selected),
      selected,
      hovered: null,
      doomed: [],
      lastTouched: touched,
      lastMove,
      vanishing,
      arriving,
      announcement: announce(game, result.events),
      session: session
        ? { ...session, captures, losses, bestCapture, moves }
        : session,
    });

    persistGame(game);
    recordIfFinished(game);

    if (vanishing.length > 0 || arriving.length > 0) {
      // Clear the animation markers once the CSS animations have run.
      window.setTimeout(
        () => {
          set((s) => ({
            vanishing: s.vanishing === vanishing ? [] : s.vanishing,
            arriving: s.arriving === arriving ? [] : s.arriving,
          }));
        },
        settings.reducedMotion ? 40 : 480,
      );
    }
  }

  /**
   * Plays out every consecutive AI turn — including a second placement, a
   * capture chain, and blockade extra turns — in one loop.
   */
  async function runAI(): Promise<void> {
    // Guard BEFORE claiming a generation: bumping first would invalidate the
    // in-flight loop and then return, leaving aiThinking stuck true forever.
    if (get().aiThinking) return;
    if (!isAITurn(get().game, get().settings)) return;

    const generation = ++aiGeneration;
    set({ aiThinking: true });
    try {
      // Bounded to prevent any conceivable runaway loop.
      for (let guard = 0; guard < 500; guard++) {
        if (generation !== aiGeneration) return;
        const { game, settings } = get();
        if (!isAITurn(game, settings)) break;

        // Answer an outstanding draw offer before moving, otherwise offering a
        // draw is a dead end: the offer would sit unanswered forever.
        if (game.drawOffer && game.drawOffer !== game.turn) {
          await delay(settings.reducedMotion ? 90 : 700);
          if (generation !== aiGeneration) return;
          const current = get().game;
          if (current.drawOffer && current.drawOffer !== current.turn) {
            // Accept only when genuinely behind on material; otherwise play on.
            const mine = stoneCount(current.board, current.turn);
            const theirs = stoneCount(current.board, opponentOf(current.turn));
            const accept = mine < theirs - 2;
            const answered = applyAction(current, {
              type: accept ? 'acceptDraw' : 'declineDraw',
              player: current.turn,
            });
            if (answered.ok) {
              commit(answered);
              get().pushToast(accept ? 'outcome.draw' : 'draw.declined');
              if (accept) break;
            }
          }
        }

        const difficulty: Difficulty = settings.difficulty;
        const startedAt = Date.now();
        let result;
        try {
          result = await requestBestMove(game, {
            difficulty,
            seed: (game.ply + 1) * 2654435761,
          });
        } catch {
          break;
        }

        if (generation !== aiGeneration) return;
        if (!result.move) break;

        // A shallow search can return in ~20ms, which would wipe the player's
        // capture animation before it renders a single frame and makes the
        // opponent feel instantaneous. Pad short searches up to a floor so
        // every reply is legible; long searches are not delayed further.
        const minThinkMs = get().settings.reducedMotion ? 90 : 520;
        const elapsed = Date.now() - startedAt;
        if (elapsed < minThinkMs) await delay(minThinkMs - elapsed);
        if (generation !== aiGeneration) return;

        // Re-read state: it cannot have changed (input is locked during an AI
        // turn), but reading fresh keeps this correct if that ever changes.
        const applied = applyAction(get().game, toAction(result.move));
        if (!applied.ok) break;

        commit(applied);

        if (generation !== aiGeneration) return;
        // A shorter pause between the AI's own consecutive actions (its second
        // placement, or a capture chain) so each step reads separately.
        await delay(get().settings.reducedMotion ? 60 : 300);
      }
    } finally {
      if (generation === aiGeneration) set({ aiThinking: false });
    }
  }

  function scheduleAI(): void {
    if (isAITurn(get().game, get().settings)) void runAI();
  }

  function play(action: Action): boolean {
    const { game, aiThinking, settings } = get();
    if (game.outcome) {
      get().pushToast('reject.gameOver', 'error');
      return false;
    }
    if (aiThinking || isAITurn(game, settings)) return false;

    const result = applyAction(game, action);
    if (!result.ok) {
      get().pushToast(`reject.${result.rejection.code}` as TranslationKey, 'error');
      sound.play('invalid');
      return false;
    }

    commit(result);
    scheduleAI();
    return true;
  }

  const startingGame = initialGame;

  // If a restored game is already the AI's turn, resume it after mount.
  if (isAITurn(startingGame, initialSettings)) {
    setTimeout(() => void runAI(), 120);
  }

  return {
    game: startingGame,
    legal: legalMoves(startingGame),
    targets: computeTargets(
      startingGame,
      startingGame.phase === 'chain' ? startingGame.chainFrom : null,
    ),
    selected: startingGame.phase === 'chain' ? startingGame.chainFrom : null,
    hovered: null,
    doomed: [],
    lastTouched: [],
    lastMove: null,
    vanishing: [],
    arriving: [],

    settings: initialSettings,
    leaderboard: seeded,
    session: startingGame.outcome
      ? null
      : {
          startedAt: Date.now(),
          captures: 0,
          losses: 0,
          bestCapture: 0,
          moves: 0,
          recorded: false,
        },

    aiThinking: false,
    panel: 'none',
    toasts: [],
    announcement: '',
    resultSeen: startingGame.outcome !== null,
    lastRatingDelta: null,

    newGame: () => {
      aiGeneration++; // abandon any in-flight AI turn
      const { settings } = get();
      const game = createGame(settings.variant);
      set({
        game,
        legal: legalMoves(game),
        targets: computeTargets(game, null),
        selected: null,
        hovered: null,
        doomed: [],
        lastTouched: [],
        lastMove: null,
        vanishing: [],
        arriving: [],
        aiThinking: false,
        resultSeen: false,
        lastRatingDelta: null,
        announcement: '',
        session: {
          startedAt: Date.now(),
          captures: 0,
          losses: 0,
          bestCapture: 0,
          moves: 0,
          recorded: false,
        },
      });
      persistGame(game);
      sound.play('start');
      scheduleAI();
    },

    selectCell: (index: number) => {
      const { game, selected, settings, aiThinking } = get();
      if (game.outcome || aiThinking || isAITurn(game, settings)) return;

      switch (game.phase) {
        case 'placement':
          play({ type: 'place', at: index });
          return;

        case 'blockadeRemoval':
          play({ type: 'removeStone', at: index });
          return;

        case 'chain':
          // Only the chaining stone may move, so any legal target is a chain step.
          if (get().legal.some((m) => m.to === index)) {
            play({ type: 'move', from: game.chainFrom, to: index });
          }
          return;

        case 'movement': {
          // Clicking one of your own stones (re)selects it.
          const isOwn = game.board[index] === (game.turn === 'Light' ? 1 : 2);
          if (isOwn) {
            const options = movesFrom(game, index);
            const nextSelected = options.length > 0 ? index : null;
            set({
              selected: nextSelected,
              targets: computeTargets(game, nextSelected),
              doomed: [],
              hovered: null,
            });
            if (options.length > 0) sound.play('select');
            return;
          }
          if (selected !== null) {
            const move = movesFrom(game, selected).find((m) => m.to === index);
            if (move) play({ type: 'move', from: selected, to: index });
          }
          return;
        }

        default:
          return;
      }
    },

    hoverCell: (index: number | null) => {
      const { game, selected, settings } = get();
      if (index === null) {
        set({ hovered: null, doomed: [] });
        return;
      }
      if (!settings.showCapturePreview) {
        set({ hovered: index });
        return;
      }

      let doomed: number[] = [];
      if (game.phase === 'chain') {
        doomed = get().legal.find((m) => m.to === index)?.captures.slice() ?? [];
      } else if (game.phase === 'movement' && selected !== null) {
        doomed = movesFrom(game, selected).find((m) => m.to === index)?.captures.slice() ?? [];
      }
      set({ hovered: index, doomed });
    },

    endChain: () => {
      play({ type: 'endChain' });
    },

    resign: () => {
      const { game, settings } = get();
      if (game.outcome) return;
      const result = applyAction(game, { type: 'resign', player: settings.humanSide });
      if (result.ok) {
        aiGeneration++;
        set({ aiThinking: false });
        commit(result);
      }
    },

    offerDraw: () => {
      if (play({ type: 'offerDraw', player: get().settings.humanSide })) {
        get().pushToast('draw.sent');
      }
    },

    respondToDraw: (accept: boolean) => {
      const player = get().settings.humanSide;
      play(accept ? { type: 'acceptDraw', player } : { type: 'declineDraw', player });
    },

    setPanel: (panel) => set({ panel }),
    dismissResult: () => set({ resultSeen: true }),

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      saveSettings(settings);
      sound.setEnabled(settings.soundEnabled);
      sound.setVolume(settings.volume);

      // Changing which side you play can hand the turn to the AI immediately.
      if (patch.humanSide !== undefined || patch.difficulty !== undefined) {
        aiGeneration++;
        set({ aiThinking: false });
        scheduleAI();
      }
    },

    updateVariant: (patch) => {
      const settings = { ...get().settings, variant: { ...get().settings.variant, ...patch } };
      set({ settings });
      saveSettings(settings);
      // Rule changes only take effect in a new game, so the running game is
      // left alone rather than mutated into an inconsistent state.
    },

    setProfileName: (name: string) => {
      const { leaderboard } = get();
      const id = leaderboard.activeProfileId ?? localProfileId();
      const existing = leaderboard.profiles.find((p) => p.id === id);
      const data = upsertProfile(leaderboard, {
        id,
        name,
        source: existing?.source ?? 'local',
        createdAt: existing?.createdAt ?? Date.now(),
        avatarUrl: existing?.avatarUrl,
      });
      set({ leaderboard: data });
      saveLeaderboard(data);
    },

    ensureProfile: (profile) => {
      const { leaderboard } = get();
      const existing = leaderboard.profiles.find((p) => p.id === profile.id);
      if (existing && existing.name === profile.name) return;
      const data = upsertProfile(leaderboard, {
        id: profile.id,
        name: profile.name,
        source: profile.source ?? 'local',
        createdAt: existing?.createdAt ?? Date.now(),
        avatarUrl: profile.avatarUrl,
      });
      set({ leaderboard: { ...data, activeProfileId: profile.id } });
      saveLeaderboard({ ...data, activeProfileId: profile.id });
    },

    exportData: () => exportLeaderboard(get().leaderboard),

    importData: (text: string) => {
      const merged = importLeaderboard(get().leaderboard, text);
      if (!merged) return false;
      set({ leaderboard: merged });
      saveLeaderboard(merged);
      return true;
    },

    clearData: () => {
      const fresh = upsertProfile(emptyData(), {
        id: localProfileId(),
        name: '',
        source: 'local',
        createdAt: Date.now(),
      });
      set({ leaderboard: fresh, lastRatingDelta: null });
      saveLeaderboard(fresh);
    },

    pushToast: (key, tone = 'info', params) => {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts, { id, key, tone, params }] }));
      // Each toast owns its own timer, so an older one cannot clear a newer.
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 2600);
    },
  };
});

// --- Selectors -------------------------------------------------------------
//
// Selectors MUST return a stable reference or a primitive. A selector that
// derives a fresh object on every call makes useSyncExternalStore believe the
// store changed on every render, which React reports as "Maximum update depth
// exceeded". So the derived views below take `LeaderboardData` as a plain
// argument and are memoised at the call site instead of being selectors.

export const selectGame = (s: GameStore) => s.game;
export const selectSettings = (s: GameStore) => s.settings;
export const selectLeaderboardData = (s: GameStore) => s.leaderboard;

export function statsFor(data: LeaderboardData) {
  return computeStats(data, data.activeProfileId ?? localProfileId());
}

export function rowsFor(data: LeaderboardData) {
  return buildLeaderboard(data);
}

export function activeProfileOf(data: LeaderboardData) {
  return data.profiles.find((p) => p.id === data.activeProfileId) ?? null;
}

export type { GameStore };
export type { Player, RejectionCode };
