// FILE: src/tests/leaderboard/store.spec.ts

import { describe, expect, it } from 'vitest';
import {
  LEADERBOARD_VERSION,
  MAX_GAMES_RETAINED,
  buildLeaderboard,
  computeStats,
  deleteProfile,
  emptyData,
  exportLeaderboard,
  importLeaderboard,
  parseLeaderboard,
  recordGame,
  upsertProfile,
  type RecordGameInput,
} from '../../leaderboard/store';
import { AI_RATINGS, STARTING_RATING, nextRating } from '../../leaderboard/rating';
import type { LeaderboardData } from '../../leaderboard/types';

const PROFILE = {
  id: 'p1',
  name: 'Aaron',
  source: 'local' as const,
  createdAt: 1_700_000_000_000,
};

function seeded(): LeaderboardData {
  return upsertProfile(emptyData(), PROFILE);
}

function game(overrides: Partial<RecordGameInput> = {}): RecordGameInput {
  return {
    profileId: 'p1',
    playedAt: 1_700_000_100_000,
    durationMs: 120_000,
    result: 'win',
    reason: 'elimination',
    playerColor: 'Light',
    difficulty: 'medium',
    stonesOwn: 12,
    stonesOpponent: 0,
    captures: 24,
    losses: 12,
    bestCapture: 3,
    moves: 64,
    ...overrides,
  };
}

describe('rating', () => {
  it('starts every profile at the base rating', () => {
    const stats = computeStats(seeded(), 'p1');
    expect(stats.rating).toBe(STARTING_RATING);
    expect(stats.games).toBe(0);
  });

  it('gains more for beating a stronger tier than a weaker one', () => {
    const beatHard = nextRating(STARTING_RATING, 'hard', 'win', 0);
    const beatBeginner = nextRating(STARTING_RATING, 'beginner', 'win', 0);
    expect(beatHard - STARTING_RATING).toBeGreaterThan(beatBeginner - STARTING_RATING);
  });

  it('loses more for losing to a weaker tier', () => {
    const lostToBeginner = nextRating(STARTING_RATING, 'beginner', 'loss', 0);
    const lostToHard = nextRating(STARTING_RATING, 'hard', 'loss', 0);
    expect(lostToBeginner).toBeLessThan(lostToHard);
  });

  it('settles down as games accumulate', () => {
    const provisional = nextRating(STARTING_RATING, 'medium', 'win', 0);
    const established = nextRating(STARTING_RATING, 'medium', 'win', 100);
    expect(provisional - STARTING_RATING).toBeGreaterThan(established - STARTING_RATING);
  });

  it('never falls below the floor', () => {
    let rating = STARTING_RATING;
    for (let i = 0; i < 200; i++) rating = nextRating(rating, 'beginner', 'loss', i);
    expect(rating).toBeGreaterThanOrEqual(100);
  });
});

describe('recording games', () => {
  it('chains rating from one game to the next', () => {
    let data = seeded();
    const first = recordGame(data, game());
    data = first.data;
    expect(first.record.ratingBefore).toBe(STARTING_RATING);
    expect(first.record.ratingAfter).toBeGreaterThan(STARTING_RATING);

    const second = recordGame(data, game({ playedAt: 1_700_000_200_000 }));
    expect(second.record.ratingBefore).toBe(first.record.ratingAfter);
  });

  it('computes wins, losses, draws and win rate', () => {
    let data = seeded();
    data = recordGame(data, game({ result: 'win', playedAt: 1 })).data;
    data = recordGame(data, game({ result: 'loss', playedAt: 2 })).data;
    data = recordGame(data, game({ result: 'draw', playedAt: 3 })).data;
    data = recordGame(data, game({ result: 'win', playedAt: 4 })).data;

    const stats = computeStats(data, 'p1');
    expect(stats.games).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.winRate).toBeCloseTo(0.5);
  });

  it('tracks current and best win streaks', () => {
    let data = seeded();
    const results: Array<'win' | 'loss' | 'draw'> = [
      'win', 'win', 'win', 'loss', 'win', 'win',
    ];
    results.forEach((result, i) => {
      data = recordGame(data, game({ result, playedAt: i + 1 })).data;
    });

    const stats = computeStats(data, 'p1');
    expect(stats.bestStreak).toBe(3);
    expect(stats.currentStreak).toBe(2);
  });

  it('breaks stats down by difficulty', () => {
    let data = seeded();
    data = recordGame(data, game({ difficulty: 'easy', result: 'win', playedAt: 1 })).data;
    data = recordGame(data, game({ difficulty: 'easy', result: 'loss', playedAt: 2 })).data;
    data = recordGame(data, game({ difficulty: 'hard', result: 'win', playedAt: 3 })).data;

    const stats = computeStats(data, 'p1');
    expect(stats.byDifficulty.easy.games).toBe(2);
    expect(stats.byDifficulty.easy.winRate).toBeCloseTo(0.5);
    expect(stats.byDifficulty.hard.games).toBe(1);
    expect(stats.byDifficulty.hard.winRate).toBe(1);
    expect(stats.byDifficulty.beginner.games).toBe(0);
  });

  it('captures personal records', () => {
    let data = seeded();
    data = recordGame(
      data,
      game({ result: 'win', durationMs: 300_000, moves: 90, bestCapture: 2, stonesOwn: 8, playedAt: 1 }),
    ).data;
    data = recordGame(
      data,
      game({ result: 'win', durationMs: 90_000, moves: 40, bestCapture: 3, stonesOwn: 17, playedAt: 2 }),
    ).data;
    data = recordGame(
      data,
      game({ result: 'loss', durationMs: 10_000, moves: 5, bestCapture: 4, stonesOwn: 1, playedAt: 3 }),
    ).data;

    const { records } = computeStats(data, 'p1');
    expect(records.fastestWinMs).toBe(90_000); // the loss must not count
    expect(records.fewestMovesWin).toBe(40);
    expect(records.largestCapture).toBe(4); // best capture counts in any game
    expect(records.mostStonesRemaining).toBe(17);
    expect(records.longestWinStreak).toBe(2);
  });

  it('caps retained history', () => {
    let data = seeded();
    for (let i = 0; i < MAX_GAMES_RETAINED + 25; i++) {
      data = recordGame(data, game({ playedAt: i + 1 })).data;
    }
    expect(data.games.length).toBe(MAX_GAMES_RETAINED);
  });

  it('keeps profiles independent', () => {
    let data = seeded();
    data = upsertProfile(data, { ...PROFILE, id: 'p2', name: 'Sam' });
    data = recordGame(data, game({ profileId: 'p1', result: 'win', playedAt: 1 })).data;
    data = recordGame(data, game({ profileId: 'p2', result: 'loss', playedAt: 2 })).data;

    expect(computeStats(data, 'p1').wins).toBe(1);
    expect(computeStats(data, 'p2').wins).toBe(0);
    expect(computeStats(data, 'p2').losses).toBe(1);
  });
});

describe('leaderboard rows', () => {
  it('ranks players against the AI benchmark rungs', () => {
    let data = seeded();
    for (let i = 0; i < 6; i++) {
      data = recordGame(data, game({ result: 'win', difficulty: 'hard', playedAt: i + 1 })).data;
    }

    const rows = buildLeaderboard(data);
    expect(rows.length).toBeGreaterThan(4);
    expect(rows[0].rank).toBe(1);

    // Ranks must be dense and ordered by rating.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].rank).toBe(i + 1);
      expect(rows[i].rating).toBeLessThanOrEqual(rows[i - 1].rating);
    }

    const ai = rows.filter((r) => r.kind === 'ai');
    expect(ai.map((r) => r.name).sort()).toEqual(
      ['beginner', 'easy', 'hard', 'medium'],
    );
    expect(ai.find((r) => r.name === 'hard')?.rating).toBe(AI_RATINGS.hard);
  });

  it('marks the active profile as the current user', () => {
    const data = seeded();
    const rows = buildLeaderboard(data);
    const me = rows.find((r) => r.id === 'p1');
    expect(me?.isCurrentUser).toBe(true);
  });

  it('filters by difficulty', () => {
    let data = seeded();
    data = recordGame(data, game({ difficulty: 'easy', result: 'win', playedAt: 1 })).data;
    data = recordGame(data, game({ difficulty: 'hard', result: 'loss', playedAt: 2 })).data;

    const rows = buildLeaderboard(data, { difficultyFilter: 'easy' });
    const me = rows.find((r) => r.id === 'p1');
    expect(me?.games).toBe(1);
    expect(me?.wins).toBe(1);
    expect(rows.filter((r) => r.kind === 'ai')).toHaveLength(1);
  });

  it('can omit the AI rungs', () => {
    const rows = buildLeaderboard(seeded(), { includeAI: false });
    expect(rows.every((r) => r.kind === 'player')).toBe(true);
  });
});

describe('persistence', () => {
  it('round-trips through export/parse', () => {
    let data = seeded();
    data = recordGame(data, game()).data;
    const restored = parseLeaderboard(exportLeaderboard(data));
    expect(restored.profiles).toHaveLength(1);
    expect(restored.games).toHaveLength(1);
    expect(restored.activeProfileId).toBe('p1');
  });

  it('returns empty data on garbage rather than throwing', () => {
    expect(parseLeaderboard('nonsense').profiles).toHaveLength(0);
    expect(parseLeaderboard('[]').games).toHaveLength(0);
    expect(parseLeaderboard(null).version).toBe(LEADERBOARD_VERSION);
    expect(parseLeaderboard('{"version":99}').profiles).toHaveLength(0);
  });

  it('drops games that reference a missing profile', () => {
    const payload = JSON.stringify({
      version: LEADERBOARD_VERSION,
      profiles: [PROFILE],
      games: [{ id: 'x', profileId: 'ghost', playedAt: 1 }],
      activeProfileId: 'p1',
    });
    expect(parseLeaderboard(payload).games).toHaveLength(0);
  });

  it('merges an import without duplicating records', () => {
    let mine = seeded();
    mine = recordGame(mine, game({ id: 'shared', playedAt: 1 })).data;

    let theirs = upsertProfile(emptyData(), { ...PROFILE, id: 'p2', name: 'Sam' });
    theirs = recordGame(theirs, game({ profileId: 'p2', id: 'other', playedAt: 2 })).data;
    // Same record id as one we already hold.
    theirs = recordGame(theirs, game({ profileId: 'p2', id: 'shared', playedAt: 3 })).data;

    const merged = importLeaderboard(mine, exportLeaderboard(theirs));
    expect(merged).not.toBeNull();
    if (!merged) return;
    expect(merged.profiles.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(merged.games.filter((g) => g.id === 'shared')).toHaveLength(1);
    expect(merged.games).toHaveLength(2);
  });

  it('rejects an unusable import', () => {
    expect(importLeaderboard(seeded(), 'garbage')).toBeNull();
  });
});

describe('profile management', () => {
  it('deleting a profile removes its games and reassigns the active profile', () => {
    let data = seeded();
    data = upsertProfile(data, { ...PROFILE, id: 'p2', name: 'Sam' });
    data = recordGame(data, game({ profileId: 'p1', playedAt: 1 })).data;
    data = recordGame(data, game({ profileId: 'p2', playedAt: 2 })).data;

    const after = deleteProfile(data, 'p1');
    expect(after.profiles.map((p) => p.id)).toEqual(['p2']);
    expect(after.games.every((g) => g.profileId === 'p2')).toBe(true);
    expect(after.activeProfileId).toBe('p2');
  });

  it('upsert updates rather than duplicating', () => {
    let data = seeded();
    data = upsertProfile(data, { ...PROFILE, name: 'Renamed' });
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].name).toBe('Renamed');
  });
});
