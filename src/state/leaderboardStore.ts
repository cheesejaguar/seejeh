// FILE: src/state/leaderboardStore.ts

import { create } from 'zustand';
import { LeaderboardData, LeaderboardEntry, AIDifficulty } from '../lib/types';
import { loadLeaderboard, calculatePlayerRating } from '../lib/leaderboard';

interface LeaderboardStore {
  // State
  data: LeaderboardData | null;
  isLoading: boolean;
  error: string | null;
  selectedDifficulty: AIDifficulty | 'all';
  lastRefresh: number;
  
  // Actions
  loadLeaderboardData: () => Promise<void>;
  refreshData: () => Promise<void>;
  setSelectedDifficulty: (difficulty: AIDifficulty | 'all') => void;
  updatePlayerRating: (playerId: number) => Promise<void>;
  clearError: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>((set, get) => ({
  // Initial state
  data: null,
  isLoading: false,
  error: null,
  selectedDifficulty: 'all',
  lastRefresh: 0,

  // Actions
  loadLeaderboardData: async () => {
    const { isLoading } = get();
    if (isLoading) return; // Prevent concurrent loads

    set({ isLoading: true, error: null });

    try {
      const data = await loadLeaderboard();
      set({ 
        data,
        isLoading: false,
        lastRefresh: Date.now()
      });
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load leaderboard',
        isLoading: false 
      });
    }
  },

  refreshData: async () => {
    await get().loadLeaderboardData();
  },

  setSelectedDifficulty: (difficulty) => {
    set({ selectedDifficulty: difficulty });
  },

  updatePlayerRating: async (playerId: number) => {
    try {
      const newRating = await calculatePlayerRating(playerId);
      
      const { data } = get();
      if (!data) return;

      // Update the entry in the current data
      const updatedEntries = data.entries.map(entry => 
        entry.player.id === playerId 
          ? { ...entry, rating: newRating }
          : entry
      );

      // Re-sort by rating
      updatedEntries.sort((a, b) => b.rating - a.rating);

      // Update ranks
      updatedEntries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      set({
        data: {
          ...data,
          entries: updatedEntries,
          userEntry: data.userEntry?.player.id === playerId
            ? { ...data.userEntry, rating: newRating }
            : data.userEntry
        }
      });
    } catch (error) {
      console.error('Failed to update player rating:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));