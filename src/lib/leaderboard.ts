// FILE: src/lib/leaderboard.ts

import { LeaderboardData, LeaderboardEntry, PlayerStats, AIDifficulty, GitHubUser } from './types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_GAMES_FOR_RANKING = 10;

interface RawPlayerData {
  user: GitHubUser;
  stats: PlayerStats;
}

/**
 * Load leaderboard data from KV store with caching
 */
export async function loadLeaderboard(): Promise<LeaderboardData> {
  try {
    // Check for cached data first
    const cached = await spark.kv.get<LeaderboardData>('leaderboard:cached');
    if (cached && (Date.now() - cached.lastUpdated) < CACHE_DURATION) {
      return cached;
    }

    // Get all player stats
    const allPlayerKeys = await spark.kv.keys();
    const playerDataKeys = allPlayerKeys.filter(key => key.startsWith('player:'));
    
    const rawPlayerData: RawPlayerData[] = [];
    
    for (const key of playerDataKeys) {
      const playerId = key.split(':')[1];
      const userKey = `user:${playerId}`;
      const statsKey = `stats:${playerId}`;
      
      const [user, stats] = await Promise.all([
        spark.kv.get<GitHubUser>(userKey),
        spark.kv.get<PlayerStats>(statsKey)
      ]);
      
      if (user && stats && stats.totalGames >= MIN_GAMES_FOR_RANKING) {
        rawPlayerData.push({ user, stats });
      }
    }

    // Calculate ratings and create leaderboard entries
    const entries = await Promise.all(
      rawPlayerData.map(async (data, index) => {
        const rating = calculateRatingFromStats(data.stats);
        
        return {
          rank: 0, // Will be set after sorting
          player: {
            id: data.user.id,
            login: data.user.login,
            avatar_url: data.user.avatar_url
          },
          rating,
          gamesPlayed: data.stats.totalGames,
          winRate: data.stats.winRate,
          lastActive: Math.max(
            ...data.stats.recentGames.map(game => game.timestamp),
            0
          ),
          overallStats: {
            wins: data.stats.wins,
            draws: data.stats.draws,
            losses: data.stats.losses
          },
          difficultyBreakdown: data.stats.difficultyStats
        } as LeaderboardEntry;
      })
    );

    // Sort by rating (highest first)
    entries.sort((a, b) => b.rating - a.rating);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get current user's entry if authenticated
    let userEntry: LeaderboardEntry | undefined;
    try {
      const currentUser = await spark.user();
      if (currentUser) {
        userEntry = entries.find(entry => entry.player.id === currentUser.id);
      }
    } catch {
      // User not authenticated, userEntry remains undefined
    }

    const leaderboardData: LeaderboardData = {
      entries: entries.slice(0, 100), // Top 100
      userEntry,
      totalPlayers: entries.length,
      lastUpdated: Date.now(),
      minGamesForRanking: MIN_GAMES_FOR_RANKING
    };

    // Cache the result
    await spark.kv.set('leaderboard:cached', leaderboardData);

    return leaderboardData;
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    throw new Error('Failed to load leaderboard data');
  }
}

/**
 * Calculate a player's rating based on their stats
 * Uses a modified ELO-like system with difficulty multipliers
 */
export function calculateRatingFromStats(stats: PlayerStats): number {
  if (stats.totalGames === 0) return 1200; // Starting rating

  let baseRating = 1200;
  
  // Base rating from win rate
  const winRateBonus = (stats.winRate - 0.5) * 400; // +/- 200 points from 50% win rate
  baseRating += winRateBonus;

  // Difficulty multipliers
  const difficultyMultipliers: Record<AIDifficulty, number> = {
    beginner: 0.8,
    easy: 1.0,
    medium: 1.2,
    hard: 1.5
  };

  // Calculate weighted performance across difficulties
  let weightedPerformance = 0;
  let totalWeightedGames = 0;

  for (const [difficulty, stats_diff] of Object.entries(stats.difficultyStats)) {
    if (stats_diff.games > 0) {
      const multiplier = difficultyMultipliers[difficulty as AIDifficulty];
      const difficultyRating = 1200 + (stats_diff.winRate - 0.5) * 400;
      
      weightedPerformance += difficultyRating * multiplier * stats_diff.games;
      totalWeightedGames += stats_diff.games * multiplier;
    }
  }

  if (totalWeightedGames > 0) {
    baseRating = weightedPerformance / totalWeightedGames;
  }

  // Bonus for game volume (encourages more play)
  const volumeBonus = Math.min(stats.totalGames * 2, 100); // Up to 100 points
  baseRating += volumeBonus;

  // Bonus for consistency (win streak)
  const streakBonus = Math.min(stats.bestWinStreak * 5, 50); // Up to 50 points
  baseRating += streakBonus;

  // Bonus for being active (recent games)
  const recentGameBonus = Math.min(stats.recentGames.length * 3, 30); // Up to 30 points
  baseRating += recentGameBonus;

  return Math.round(Math.max(800, Math.min(2400, baseRating))); // Clamp between 800-2400
}

/**
 * Calculate and update a specific player's rating
 */
export async function calculatePlayerRating(playerId: number): Promise<number> {
  const stats = await spark.kv.get<PlayerStats>(`stats:${playerId}`);
  if (!stats) {
    throw new Error('Player stats not found');
  }

  const rating = calculateRatingFromStats(stats);
  
  // Update the player's rating in their data
  await spark.kv.set(`rating:${playerId}`, rating);
  
  return rating;
}

/**
 * Get leaderboard filtered by difficulty
 */
export function filterLeaderboardByDifficulty(
  data: LeaderboardData, 
  difficulty: AIDifficulty | 'all'
): LeaderboardEntry[] {
  if (difficulty === 'all') {
    return data.entries;
  }

  // Filter and re-rank based on difficulty-specific performance
  const filtered = data.entries
    .filter(entry => entry.difficultyBreakdown[difficulty]?.games >= 5) // Min 5 games in difficulty
    .map(entry => ({
      ...entry,
      rating: calculateDifficultySpecificRating(entry, difficulty),
      gamesPlayed: entry.difficultyBreakdown[difficulty].games,
      winRate: entry.difficultyBreakdown[difficulty].winRate
    }))
    .sort((a, b) => b.rating - a.rating);

  // Reassign ranks
  filtered.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return filtered;
}

function calculateDifficultySpecificRating(entry: LeaderboardEntry, difficulty: AIDifficulty): number {
  const diffStats = entry.difficultyBreakdown[difficulty];
  if (!diffStats || diffStats.games === 0) return 800;

  const difficultyMultipliers: Record<AIDifficulty, number> = {
    beginner: 0.8,
    easy: 1.0,
    medium: 1.2,
    hard: 1.5
  };

  const baseRating = 1200 + (diffStats.winRate - 0.5) * 400;
  const multiplier = difficultyMultipliers[difficulty];
  const volumeBonus = Math.min(diffStats.games * 3, 150);
  
  return Math.round((baseRating * multiplier) + volumeBonus);
}

/**
 * Invalidate leaderboard cache
 */
export async function invalidateLeaderboardCache(): Promise<void> {
  await spark.kv.delete('leaderboard:cached');
}