// FILE: src/state/gameStore.ts

import { create } from 'zustand';
import { GameState, Language, GameSettings, Cell, Player } from '../lib/types';
import { 
  initialState7x7, 
  applyPlacement, 
  applyMove, 
  applyChainStep, 
  endChain,
  invokeBlockadeIfAny,
  hasAnyLegalMove,
  isCenter
} from '../lib/rules';
import { saveGameState, loadGameState, saveSettings, loadSettings } from '../lib/serialize';

interface GameStore {
  // Game state
  gameState: GameState;
  selectedCell: Cell | null;
  
  // UI state
  settings: GameSettings;
  showAbout: boolean;
  showSettings: boolean;
  toastMessage: string | null;
  blockadeRemovalMode: boolean;
  
  // Actions
  newGame: () => void;
  loadSavedGame: () => void;
  selectCell: (cell: Cell) => void;
  placeStone: (cell: Cell) => void;
  moveStone: (from: Cell, to: Cell) => void;
  chainStep: (to: Cell) => void;
  endChainCapture: () => void;
  removeBlockadeStone: (cell: Cell) => void;
  
  // UI actions
  setLanguage: (language: Language) => void;
  toggleVariant: (variant: keyof GameSettings['variant']) => void;
  setShowAbout: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

const defaultSettings: GameSettings = {
  language: 'en',
  variant: {
    firstMoveMustEnterCenter: false,
    antiShuttle: false,
    blockadeOneRemoval: true
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initialState7x7(),
  selectedCell: null,
  settings: loadSettings() || defaultSettings,
  showAbout: false,
  showSettings: false,
  toastMessage: null,
  blockadeRemovalMode: false,

  newGame: () => {
    const { settings } = get();
    const newState = initialState7x7(settings.variant);
    set({ 
      gameState: newState, 
      selectedCell: null,
      blockadeRemovalMode: false 
    });
    saveGameState(newState);
  },

  loadSavedGame: () => {
    const saved = loadGameState();
    if (saved) {
      set({ 
        gameState: saved, 
        selectedCell: null,
        blockadeRemovalMode: !hasAnyLegalMove(saved, saved.current)
      });
    }
  },

  selectCell: (cell: Cell) => {
    const { gameState, selectedCell } = get();
    
    if (gameState.phase === 'placement') {
      get().placeStone(cell);
      return;
    }
    
    // If blockade mode, handle stone removal
    if (get().blockadeRemovalMode) {
      get().removeBlockadeStone(cell);
      return;
    }
    
    // If cell has current player's stone, select it
    if (gameState.board[cell.r][cell.c] === gameState.current) {
      set({ selectedCell: cell });
      return;
    }
    
    // If cell is empty and we have a selection, try to move
    if (gameState.board[cell.r][cell.c] === null && selectedCell) {
      if (gameState.phase === 'chain') {
        get().chainStep(cell);
      } else {
        get().moveStone(selectedCell, cell);
      }
    }
  },

  placeStone: (cell: Cell) => {
    const { gameState } = get();
    
    try {
      if (gameState.placementCount === 0) {
        // First stone of the turn - just place it and increment counter
        const newState = { ...gameState };
        newState.board = gameState.board.map(row => [...row]);
        newState.board[cell.r][cell.c] = gameState.current;
        newState.placementCount = 1;
        newState.stonesToPlace = {
          ...gameState.stonesToPlace,
          [gameState.current]: gameState.stonesToPlace[gameState.current] - 1
        };
        
        set({ gameState: newState });
        saveGameState(newState);
      } else if (gameState.placementCount === 1) {
        // Second stone - place it and end turn
        const currentPlayer = gameState.current;
        const newState = { ...gameState };
        newState.board = gameState.board.map(row => [...row]);
        newState.board[cell.r][cell.c] = currentPlayer;
        newState.placementCount = 0;
        newState.current = currentPlayer === 'Light' ? 'Dark' : 'Light';
        newState.stonesToPlace = {
          ...gameState.stonesToPlace,
          [currentPlayer]: gameState.stonesToPlace[currentPlayer] - 1
        };
        
        // Check if placement phase is complete
        if (newState.stonesToPlace.Light <= 0 && newState.stonesToPlace.Dark <= 0) {
          newState.phase = 'movement';
        }
        
        set({ gameState: newState });
        saveGameState(newState);
      }
    } catch (error) {
      get().showToast((error as Error).message);
    }
  },

  moveStone: (from: Cell, to: Cell) => {
    const { gameState } = get();
    
    try {
      const newState = applyMove(gameState, from, to);
      
      // Check for blockade after turn change
      const needsBlockadeResolution = !hasAnyLegalMove(newState, newState.current);
      
      set({ 
        gameState: newState, 
        selectedCell: null,
        blockadeRemovalMode: needsBlockadeResolution && !newState.winner
      });
      saveGameState(newState);
      
      if (newState.capturedLastMove.length > 0) {
        get().showToast(`Captured ${newState.capturedLastMove.length} stones`);
      }
    } catch (error) {
      get().showToast((error as Error).message);
    }
  },

  chainStep: (to: Cell) => {
    const { gameState } = get();
    
    try {
      const newState = applyChainStep(gameState, to);
      set({ gameState: newState, selectedCell: newState.chainOrigin || null });
      saveGameState(newState);
      
      if (newState.capturedLastMove.length > 0) {
        get().showToast(`Captured ${newState.capturedLastMove.length} stones`);
      }
    } catch (error) {
      get().showToast((error as Error).message);
    }
  },

  endChainCapture: () => {
    const { gameState } = get();
    
    try {
      const newState = endChain(gameState);
      const needsBlockadeResolution = !hasAnyLegalMove(newState, newState.current);
      
      set({ 
        gameState: newState, 
        selectedCell: null,
        blockadeRemovalMode: needsBlockadeResolution && !newState.winner
      });
      saveGameState(newState);
    } catch (error) {
      get().showToast((error as Error).message);
    }
  },

  removeBlockadeStone: (cell: Cell) => {
    const { gameState } = get();
    
    try {
      const newState = invokeBlockadeIfAny(gameState, cell);
      set({ 
        gameState: newState, 
        selectedCell: null,
        blockadeRemovalMode: false
      });
      saveGameState(newState);
      get().showToast('Blockade stone removed');
    } catch (error) {
      get().showToast((error as Error).message);
    }
  },

  setLanguage: (language: Language) => {
    const newSettings = { ...get().settings, language };
    set({ settings: newSettings });
    saveSettings(newSettings);
    
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  },

  toggleVariant: (variant: keyof GameSettings['variant']) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      variant: {
        ...settings.variant,
        [variant]: !settings.variant[variant]
      }
    };
    set({ settings: newSettings });
    saveSettings(newSettings);
  },

  setShowAbout: (show: boolean) => set({ showAbout: show }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  
  showToast: (message: string) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
  
  clearToast: () => set({ toastMessage: null })
}));