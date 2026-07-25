// FILE: src/leaderboard/store.ts
//
// Pure query/mutation layer over LeaderboardData, plus a versioned local
// persistence adapter. Nothing here touches React or the game engine, so it is
// exhaustively testable in isolation.

import type { Difficulty } from '../ai/search';
import { AI_RATINGS, STARTING_RATING, nextRating } from './rating';
import type {
  DifficultyBreakdown,
  GameRecord,
  LeaderboardData,
  LeaderboardRow,
  PersonalRecords,
  PlayerProfile,
  ProfileStats,
} from './types';
import type { Player } from '../engine';

export const LEADERBOARD_VERSION = 1;
export const STORAGE_KEY = 'seejeh.leaderboard.v1';
/** Match history is capped so localStorage cannot grow without bound. */
export const MAX_GAMES_RETAINED = 500;

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'easy', 'medium', 'hard'];

export function emptyData(): LeaderboardData {
  return { version: LEADERBOARD_VERSION, profiles: [], games: [], activeProfileId: null };
}

function emptyBreakdown(): Record<Difficulty, DifficultyBreakdown> {
  const out = {} as Record<Difficulty, DifficultyBreakdown>;
  for (const d of DIFFICULTIES) {
    out[d] = { games: 0, wins: 0, draws: 0, losses: 0, winRate: 0 };
  }
  return out;
}

function emptyRecords(): PersonalRecords {
  return {
    fastestWinMs: null,
    fewestMovesWin: null,
    largestCapture: 0,
    mostStonesRemaining: 0,
    longestWinStreak: 0,
    highestRating: STARTING_RATING,
  };
}

export function gamesForProfile(
  data: LeaderboardData,
  profileId: string,
): GameRecord[] {
  return data.games
    .filter((g) => g.profileId === profileId)
    .sort((a, b) => a.playedAt - b.playedAt);
}

/**
 * Replays the Elo chain over a profile's games in chronological order and
 * returns each game with its rating recomputed.
 *
 * The per-record ratingBefore/ratingAfter are only valid while games arrive in
 * time order. Importing a file — or any clock skew — interleaves records from
 * an independent chain and leaves visible discontinuities, with the current
 * rating taken from whichever game happens to sort last. Deriving the chain on
 * read makes the stored values advisory and the displayed rating always correct.
 */
export function ratedGames(data: LeaderboardData, profileId: string): GameRecord[] {
  const games = gamesForProfile(data, profileId);
  let rating = STARTING_RATING;
  return games.map((game, index) => {
    const before = rating;
    rating = nextRating(before, game.difficulty, game.result, index);
    return { ...game, ratingBefore: before, ratingAfter: rating };
  });
}

/**
 * Derives all statistics for a profile from its game history. Stats are always
 * recomputed rather than incrementally mutated, so they can never drift out of
 * sync with the underlying records.
 */
export function computeStats(
  data: LeaderboardData,
  profileId: string,
): ProfileStats {
  const games = ratedGames(data, profileId);
  const byDifficulty = emptyBreakdown();

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let durationTotal = 0;
  let movesTotal = 0;
  let captures = 0;
  let stonesLost = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let highestRating = STARTING_RATING;
  const colourCounts: Record<Player, number> = { Light: 0, Dark: 0 };

  let fastestWinMs: number | null = null;
  let fewestMovesWin: number | null = null;
  let largestCapture = 0;
  let mostStonesRemaining = 0;

  for (const game of games) {
    const tier = byDifficulty[game.difficulty] ?? byDifficulty.medium;
    const updated: DifficultyBreakdown = {
      games: tier.games + 1,
      wins: tier.wins + (game.result === 'win' ? 1 : 0),
      draws: tier.draws + (game.result === 'draw' ? 1 : 0),
      losses: tier.losses + (game.result === 'loss' ? 1 : 0),
      winRate: 0,
    };
    byDifficulty[game.difficulty] = {
      ...updated,
      winRate: updated.games > 0 ? updated.wins / updated.games : 0,
    };

    if (game.result === 'win') {
      wins++;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      if (fastestWinMs === null || game.durationMs < fastestWinMs) {
        fastestWinMs = game.durationMs;
      }
      if (fewestMovesWin === null || game.moves < fewestMovesWin) {
        fewestMovesWin = game.moves;
      }
      if (game.stonesOwn > mostStonesRemaining) mostStonesRemaining = game.stonesOwn;
    } else if (game.result === 'draw') {
      draws++;
      currentStreak = 0;
    } else {
      losses++;
      currentStreak = 0;
    }

    durationTotal += game.durationMs;
    movesTotal += game.moves;
    captures += game.captures;
    stonesLost += game.losses;
    colourCounts[game.playerColor]++;
    if (game.bestCapture > largestCapture) largestCapture = game.bestCapture;
    if (game.ratingAfter > highestRating) highestRating = game.ratingAfter;
  }

  const total = games.length;
  const last = games.at(-1);

  const favouriteColour: Player | null =
    total === 0
      ? null
      : colourCounts.Light === colourCounts.Dark
        ? null
        : colourCounts.Light > colourCounts.Dark
          ? 'Light'
          : 'Dark';

  return {
    profileId,
    rating: last?.ratingAfter ?? STARTING_RATING,
    games: total,
    wins,
    draws,
    losses,
    winRate: total > 0 ? wins / total : 0,
    currentStreak,
    bestStreak,
    averageDurationMs: total > 0 ? Math.round(durationTotal / total) : 0,
    averageMoves: total > 0 ? Math.round(movesTotal / total) : 0,
    totalCaptures: captures,
    totalLosses: stonesLost,
    favouriteColour,
    lastPlayedAt: last?.playedAt ?? null,
    byDifficulty,
    records: {
      ...emptyRecords(),
      fastestWinMs,
      fewestMovesWin,
      largestCapture,
      mostStonesRemaining,
      longestWinStreak: bestStreak,
      highestRating,
    },
  };
}

export interface RecordGameInput {
  profileId: string;
  playedAt: number;
  durationMs: number;
  result: GameRecord['result'];
  reason: GameRecord['reason'];
  playerColor: Player;
  difficulty: Difficulty;
  stonesOwn: number;
  stonesOpponent: number;
  captures: number;
  losses: number;
  bestCapture: number;
  moves: number;
  id?: string;
}

/**
 * Appends a finished game, computing the rating change from the profile's
 * history at that moment. Returns new data — the caller decides when to persist.
 */
export function recordGame(
  data: LeaderboardData,
  input: RecordGameInput,
): { data: LeaderboardData; record: GameRecord } {
  const played = ratedGames(data, input.profileId);
  const ratingBefore = played.at(-1)?.ratingAfter ?? STARTING_RATING;
  const ratingAfter = nextRating(
    ratingBefore,
    input.difficulty,
    input.result,
    played.length,
  );

  const record: GameRecord = {
    id: input.id ?? `g_${input.playedAt.toString(36)}_${played.length}`,
    profileId: input.profileId,
    playedAt: input.playedAt,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    result: input.result,
    reason: input.reason,
    playerColor: input.playerColor,
    difficulty: input.difficulty,
    stonesOwn: input.stonesOwn,
    stonesOpponent: input.stonesOpponent,
    captures: input.captures,
    losses: input.losses,
    bestCapture: input.bestCapture,
    moves: input.moves,
    ratingBefore,
    ratingAfter,
  };

  const games = [...data.games, record];
  const trimmed =
    games.length > MAX_GAMES_RETAINED ? games.slice(games.length - MAX_GAMES_RETAINED) : games;

  return { data: { ...data, games: trimmed }, record };
}

export function upsertProfile(
  data: LeaderboardData,
  profile: PlayerProfile,
): LeaderboardData {
  const existing = data.profiles.findIndex((p) => p.id === profile.id);
  const profiles =
    existing >= 0
      ? data.profiles.map((p, i) => (i === existing ? { ...p, ...profile } : p))
      : [...data.profiles, profile];
  return { ...data, profiles, activeProfileId: data.activeProfileId ?? profile.id };
}

export function deleteProfile(data: LeaderboardData, profileId: string): LeaderboardData {
  const profiles = data.profiles.filter((p) => p.id !== profileId);
  return {
    ...data,
    profiles,
    games: data.games.filter((g) => g.profileId !== profileId),
    activeProfileId:
      data.activeProfileId === profileId ? (profiles[0]?.id ?? null) : data.activeProfileId,
  };
}

/**
 * The ladder: every human profile that has played, interleaved with the four AI
 * tiers as fixed benchmarks. Showing the AI rungs means a solo player always
 * has something to climb toward, which a single-row local leaderboard would not.
 */
export function buildLeaderboard(
  data: LeaderboardData,
  options: { includeAI?: boolean; difficultyFilter?: Difficulty | 'all' } = {},
): LeaderboardRow[] {
  const includeAI = options.includeAI ?? true;
  const filter = options.difficultyFilter ?? 'all';

  const playerRows: LeaderboardRow[] = data.profiles
    .map((profile) => {
      const stats = computeStats(data, profile.id);
      const scoped =
        filter === 'all'
          ? {
              games: stats.games,
              wins: stats.wins,
              draws: stats.draws,
              losses: stats.losses,
              winRate: stats.winRate,
            }
          : {
              games: stats.byDifficulty[filter].games,
              wins: stats.byDifficulty[filter].wins,
              draws: stats.byDifficulty[filter].draws,
              losses: stats.byDifficulty[filter].losses,
              winRate: stats.byDifficulty[filter].winRate,
            };

      return {
        rank: 0,
        kind: 'player' as const,
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        rating: stats.rating,
        ...scoped,
        lastPlayedAt: stats.lastPlayedAt,
        isCurrentUser: profile.id === data.activeProfileId,
      };
    })
    .filter((row) => row.games > 0 || row.isCurrentUser);

  const aiRows: LeaderboardRow[] = includeAI
    ? DIFFICULTIES.filter((d) => filter === 'all' || d === filter).map((difficulty) => ({
        rank: 0,
        kind: 'ai' as const,
        id: `ai:${difficulty}`,
        name: difficulty,
        rating: AI_RATINGS[difficulty],
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        winRate: 0,
        lastPlayedAt: null,
        isCurrentUser: false,
      }))
    : [];

  const rows = [...playerRows, ...aiRows].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.games !== a.games) return b.games - a.games;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

// --- Persistence -----------------------------------------------------------

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/** localStorage adapter that degrades to a no-op when storage is unavailable. */
export const localStorageAdapter: StorageAdapter = {
  read(key) {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* quota exceeded or storage disabled — data stays in memory */
    }
  },
  remove(key) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export function parseLeaderboard(text: string | null): LeaderboardData {
  if (!text) return emptyData();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return emptyData();
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyData();

  const data = raw as Record<string, unknown>;
  if (data.version !== LEADERBOARD_VERSION) return emptyData();

  const profiles = Array.isArray(data.profiles)
    ? (data.profiles.filter(
        (p): p is PlayerProfile =>
          !!p &&
          typeof p === 'object' &&
          typeof (p as PlayerProfile).id === 'string' &&
          typeof (p as PlayerProfile).name === 'string',
      ) as PlayerProfile[])
    : [];

  const profileIds = new Set(profiles.map((p) => p.id));
  const games = Array.isArray(data.games)
    ? (data.games.filter(
        (g): g is GameRecord =>
          !!g &&
          typeof g === 'object' &&
          typeof (g as GameRecord).id === 'string' &&
          profileIds.has((g as GameRecord).profileId) &&
          Number.isFinite((g as GameRecord).playedAt),
      ) as GameRecord[])
    : [];

  const activeProfileId =
    typeof data.activeProfileId === 'string' && profileIds.has(data.activeProfileId)
      ? data.activeProfileId
      : (profiles[0]?.id ?? null);

  return { version: LEADERBOARD_VERSION, profiles, games, activeProfileId };
}

export function loadLeaderboard(
  adapter: StorageAdapter = localStorageAdapter,
): LeaderboardData {
  return parseLeaderboard(adapter.read(STORAGE_KEY));
}

export function saveLeaderboard(
  data: LeaderboardData,
  adapter: StorageAdapter = localStorageAdapter,
): void {
  adapter.write(STORAGE_KEY, JSON.stringify(data));
}

export function exportLeaderboard(data: LeaderboardData): string {
  return JSON.stringify(data, null, 2);
}

/** Merges an imported file into existing data, de-duplicating by record id. */
export function importLeaderboard(
  current: LeaderboardData,
  text: string,
): LeaderboardData | null {
  const incoming = parseLeaderboard(text);
  if (incoming.profiles.length === 0 && incoming.games.length === 0) return null;

  const profiles = [...current.profiles];
  for (const profile of incoming.profiles) {
    if (!profiles.some((p) => p.id === profile.id)) profiles.push(profile);
  }

  const seen = new Set(current.games.map((g) => g.id));
  const games = [...current.games];
  for (const game of incoming.games) {
    if (!seen.has(game.id)) {
      seen.add(game.id);
      games.push(game);
    }
  }
  games.sort((a, b) => a.playedAt - b.playedAt);

  return {
    version: LEADERBOARD_VERSION,
    profiles,
    games: games.slice(-MAX_GAMES_RETAINED),
    activeProfileId: current.activeProfileId ?? profiles[0]?.id ?? null,
  };
}
