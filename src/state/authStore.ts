// FILE: src/state/authStore.ts

import { create } from 'zustand';
import { AuthState, GitHubUser, PlayerStats, GameResult } from '../lib/types';
import { 
  getCurrentUser, 
  loadPlayerStats, 
  loadGameHistory, 
  saveGameResult,
  clearUserData 
} from '../lib/auth';
import { invalidateLeaderboardCache } from '../lib/leaderboard';

interface AuthStore extends AuthState {
  // Actions
  login: () => Promise<void>;
  logout: () => void;
  loadUserData: () => Promise<void>;
  addGameResult: (game: GameResult) => Promise<void>;
  clearData: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  stats: null,
  isLoading: false,
  error: null,

  // Actions
  login: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      
      if (user) {
        const stats = await loadPlayerStats(user.id);
        
        set({
          isAuthenticated: true,
          user,
          stats,
          isLoading: false
        });
      } else {
        set({
          error: 'GitHub authentication required. Please ensure you are logged in.',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      set({
        error: 'Failed to authenticate with GitHub. Please try again.',
        isLoading: false
      });
    }
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      stats: null,
      error: null
    });
  },

  loadUserData: async () => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    
    try {
      const stats = await loadPlayerStats(user.id);
      set({ stats, isLoading: false });
    } catch (error) {
      console.error('Failed to load user data:', error);
      set({ 
        error: 'Failed to load your game data.',
        isLoading: false 
      });
    }
  },

  addGameResult: async (game: GameResult) => {
    const { user, stats } = get();
    if (!user || !stats) return;

    try {
      await saveGameResult(game);
      
      // Reload stats to reflect the new game
      const updatedStats = await loadPlayerStats(user.id);
      set({ stats: updatedStats });
      
      // Invalidate leaderboard cache since rankings may have changed
      await invalidateLeaderboardCache();
    } catch (error) {
      console.error('Failed to save game result:', error);
      set({ error: 'Failed to save game result.' });
    }
  },

  clearData: async () => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    
    try {
      await clearUserData(user.id);
      const defaultStats = await loadPlayerStats(user.id); // Will return default stats
      set({ stats: defaultStats, isLoading: false });
    } catch (error) {
      console.error('Failed to clear user data:', error);
      set({ 
        error: 'Failed to clear your data.',
        isLoading: false 
      });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  }
}));