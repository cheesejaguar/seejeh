// FILE: src/lib/auth.ts

import { GitHubUser, PlayerStats, GameResult, AIDifficulty } from './types';

/**
 * Authentication utilities using Spark's built-in GitHub auth
 */

export async function getCurrentUser(): Promise<GitHubUser | null> {
  try {
    const user = await spark.user();
    
    if (user && user.login) {
      return {
        id: user.id,
        login: user.login,
        avatar_url: user.avatarUrl,
        email: user.email,
        name: user.login // Use login as fallback for name
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
}

export function generateDefaultStats(): PlayerStats {
  return {
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    winRate: 0,
    averageGameDuration: 0,
    averageMovesPerGame: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,
    favoriteColor: 'Light',
    difficultyStats: {
      beginner: { games: 0, wins: 0, winRate: 0 },
      easy: { games: 0, wins: 0, winRate: 0 },
      medium: { games: 0, wins: 0, winRate: 0 },
      hard: { games: 0, wins: 0, winRate: 0 }
    },
    recentGames: []
  };
}

export function calculateStats(games: GameResult[]): PlayerStats {
  if (games.length === 0) {
    return generateDefaultStats();
  }

  const stats = generateDefaultStats();
  stats.totalGames = games.length;
  
  // Count outcomes
  let currentStreak = 0;
  let bestStreak = 0;
  let lastWin = false;
  
  // Track color preference
  const colorCounts = { Light: 0, Dark: 0 };
  
  // Track difficulty stats
  const difficultyData: Record<AIDifficulty, { games: number; wins: number }> = {
    beginner: { games: 0, wins: 0 },
    easy: { games: 0, wins: 0 },
    medium: { games: 0, wins: 0 },
    hard: { games: 0, wins: 0 }
  };
  
  let totalDuration = 0;
  let totalMoves = 0;
  
  for (const game of games.reverse()) { // Process chronologically for streak calculation
    // Count outcomes
    if (game.winner === game.playerColor) {
      stats.wins++;
      if (lastWin) {
        currentStreak++;
      } else {
        currentStreak = 1;
        lastWin = true;
      }
      bestStreak = Math.max(bestStreak, currentStreak);
    } else if (game.winner === null) {
      stats.draws++;
      currentStreak = 0;
      lastWin = false;
    } else {
      stats.losses++;
      currentStreak = 0;
      lastWin = false;
    }
    
    // Track other stats
    colorCounts[game.playerColor]++;
    totalDuration += game.duration;
    totalMoves += game.totalMoves;
    
    // Track difficulty stats
    if (game.aiDifficulty) {
      difficultyData[game.aiDifficulty].games++;
      if (game.winner === game.playerColor) {
        difficultyData[game.aiDifficulty].wins++;
      }
    }
  }
  
  stats.currentWinStreak = lastWin ? currentStreak : 0;
  stats.bestWinStreak = bestStreak;
  stats.winRate = stats.totalGames > 0 ? stats.wins / stats.totalGames : 0;
  stats.averageGameDuration = stats.totalGames > 0 ? totalDuration / stats.totalGames : 0;
  stats.averageMovesPerGame = stats.totalGames > 0 ? totalMoves / stats.totalGames : 0;
  stats.favoriteColor = colorCounts.Light >= colorCounts.Dark ? 'Light' : 'Dark';
  
  // Calculate difficulty win rates
  for (const difficulty of Object.keys(difficultyData) as AIDifficulty[]) {
    const data = difficultyData[difficulty];
    stats.difficultyStats[difficulty] = {
      games: data.games,
      wins: data.wins,
      winRate: data.games > 0 ? data.wins / data.games : 0
    };
  }
  
  stats.recentGames = games.slice(-10); // Last 10 games
  
  return stats;
}

export async function saveGameResult(game: GameResult): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    const key = `games:${user.id}`;
    const existingGames = await spark.kv.get<GameResult[]>(key) || [];
    
    const updatedGames = [...existingGames, game];
    await spark.kv.set(key, updatedGames);
    
    // Also update cached stats
    const stats = calculateStats(updatedGames);
    await spark.kv.set(`stats:${user.id}`, stats);
    
    // Save user info for leaderboard (only if not already saved or outdated)
    const userKey = `user:${user.id}`;
    const existingUser = await spark.kv.get<GitHubUser>(userKey);
    if (!existingUser || existingUser.login !== user.login || existingUser.avatar_url !== user.avatar_url) {
      await spark.kv.set(userKey, user);
    }
    
    // Mark this player as having data for leaderboard purposes
    const playerKey = `player:${user.id}`;
    await spark.kv.set(playerKey, { lastActive: Date.now() });
  } catch (error) {
    console.error('Failed to save game result:', error);
  }
}

export async function loadPlayerStats(userId: number): Promise<PlayerStats> {
  try {
    // Ensure user data is saved for leaderboard if this is the current user
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const userKey = `user:${userId}`;
      const existingUser = await spark.kv.get<GitHubUser>(userKey);
      if (!existingUser) {
        await spark.kv.set(userKey, currentUser);
        await spark.kv.set(`player:${userId}`, { lastActive: Date.now() });
      }
    }
    
    // Try to get cached stats first
    const cachedStats = await spark.kv.get<PlayerStats>(`stats:${userId}`);
    if (cachedStats) {
      return cachedStats;
    }
    
    // Calculate from games if no cache
    const games = await spark.kv.get<GameResult[]>(`games:${userId}`) || [];
    const stats = calculateStats(games);
    
    // Cache the calculated stats
    await spark.kv.set(`stats:${userId}`, stats);
    
    return stats;
  } catch (error) {
    console.error('Failed to load player stats:', error);
    return generateDefaultStats();
  }
}

export async function loadGameHistory(userId: number): Promise<GameResult[]> {
  try {
    return await spark.kv.get<GameResult[]>(`games:${userId}`) || [];
  } catch (error) {
    console.error('Failed to load game history:', error);
    return [];
  }
}

export async function clearUserData(userId: number): Promise<void> {
  try {
    await spark.kv.delete(`games:${userId}`);
    await spark.kv.delete(`stats:${userId}`);
    await spark.kv.delete(`user:${userId}`);
    await spark.kv.delete(`player:${userId}`);
    await spark.kv.delete(`rating:${userId}`);
    
    // Also invalidate leaderboard cache since this player's data changed
    const { invalidateLeaderboardCache } = await import('./leaderboard');
    await invalidateLeaderboardCache();
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}