// FILE: src/state/gameStore.ts

import { create } from 'zustand';
import { GameState, Language, GameSettings, Cell, Player, AIDifficulty, GameSession, GameResult } from '../lib/types';
import { 
  initialState7x7, 
  applyPlacement, 
  applyMove, 
  applyChainStep, 
  endChain,
  invokeBlockadeIfAny,
  hasAnyLegalMove,
  isCenter,
  countStones,
  previewCaptures,
  offerStalemate,
  rejectStalemate,
  resignGame,
  detectStalemate
} from '../lib/rules';
import { saveGameState, loadGameState, saveSettings, loadSettings } from '../lib/serialize';
import { getBestAIMove, isAITurn, getOptimalMove, getTopMoves, shouldAIAcceptStalemate, shouldAIOfferStalemate } from '../lib/ai';
import { soundSystem } from '../lib/soundSystem';

interface GameStore {
  // Game state
  gameState: GameState;
  selectedCell: Cell | null;
  currentSession: GameSession | null;
  
  // UI state
  settings: GameSettings;
  showAbout: boolean;
  showSettings: boolean;
  showProfile: boolean;
  toastMessage: string | null;
  blockadeRemovalMode: boolean;
  aiThinking: boolean;
  
  // Preview state
  hoveredMove: Cell | null;
  previewCaptures: Cell[];
  
  // Hint system
  showHints: boolean;
  currentHint: { move: any; score: number; description: string } | null;
  topMoves: Array<{ move: any; score: number; description: string }>;
  hintsEnabled: boolean;
  
  // Actions
  newGame: () => void;
  loadSavedGame: () => void;
  selectCell: (cell: Cell) => void;
  placeStone: (cell: Cell) => void;
  moveStone: (from: Cell, to: Cell) => void;
  chainStep: (to: Cell) => void;
  endChainCapture: () => void;
  endTurn: () => void;
  removeBlockadeStone: (cell: Cell) => void;
  
  // Stalemate and resignation actions
  offerStalemate: () => void;
  rejectStalemate: () => void;
  resignGame: () => void;
  
  // AI actions
  makeAIMove: () => Promise<void>;
  checkForAITurn: () => void;
  
  // Hint actions
  toggleHints: () => void;
  getHint: () => void;
  clearHints: () => void;
  
  // Preview actions
  setHoveredMove: (cell: Cell | null) => void;
  updatePreviewCaptures: () => void;
  
  // UI actions
  setLanguage: (language: Language) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  toggleVariant: (variant: keyof GameSettings['variant']) => void;
  setShowAbout: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowProfile: (show: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setCapturePreviewsEnabled: (enabled: boolean) => void;
  
  // Sound actions
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  
  // Game session tracking
  startGameSession: () => void;
  endGameSession: () => Promise<void>;
}

const defaultSettings: GameSettings = {
  language: 'en',
  aiDifficulty: 'beginner',
  players: {
    Light: { type: 'human' as const },
    Dark: { type: 'ai' as const, difficulty: 'beginner' }
  },
  variant: {
    firstMoveMustEnterCenter: false,
    antiShuttle: false,
    blockadeOneRemoval: true
  },
  hintsEnabled: false,
  soundEnabled: true,
  soundVolume: 0.5,
  capturePreviewsEnabled: true
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initialState7x7(),
  selectedCell: null,
  currentSession: null,
  settings: loadSettings() || defaultSettings,
  showAbout: false,
  showSettings: false,
  showProfile: false,
  toastMessage: null,
  blockadeRemovalMode: false,
  aiThinking: false,
  
  // Preview state
  hoveredMove: null,
  previewCaptures: [],
  
  // Hint system
  showHints: false,
  currentHint: null,
  topMoves: [],
  hintsEnabled: (loadSettings() || defaultSettings).hintsEnabled,

  newGame: () => {
    const { settings, endGameSession } = get();
    
    // End current session if any
    if (get().currentSession) {
      endGameSession();
    }
    
    const newState = initialState7x7(settings.variant);
    set({ 
      gameState: newState, 
      selectedCell: null,
      blockadeRemovalMode: false,
      aiThinking: false,
      showHints: false,
      currentHint: null,
      topMoves: [],
      previewCaptures: [],
      hoveredMove: null
    });
    saveGameState(newState);
    
    // Play new game sound
    soundSystem.play('newGame');
    
    // Start new session
    get().startGameSession();
    
    // Check if AI should move first
    setTimeout(() => get().checkForAITurn(), 100);
  },

  loadSavedGame: () => {
    const saved = loadGameState();
    if (saved) {
      set({ 
        gameState: saved, 
        selectedCell: null,
        blockadeRemovalMode: !hasAnyLegalMove(saved, saved.current),
        aiThinking: false,
        previewCaptures: [],
        hoveredMove: null
      });
      
      // Check if it's AI's turn after loading
      setTimeout(() => get().checkForAITurn(), 100);
    }
  },

  selectCell: (cell: Cell) => {
    const { gameState, selectedCell, settings, aiThinking } = get();
    
    // Don't allow interaction during AI thinking
    if (aiThinking) return;
    
    // Don't allow interaction if it's AI's turn
    if (isAITurn(gameState, settings.players)) return;
    
    if (gameState.phase === 'placement') {
      get().placeStone(cell);
      // Clear hints after move
      get().clearHints();
      return;
    }
    
    // If blockade mode, handle stone removal
    if (get().blockadeRemovalMode) {
      get().removeBlockadeStone(cell);
      return;
    }
    
    // If cell has current player's stone, select it
    if (gameState.board[cell.r][cell.c] === gameState.current) {
      set({ 
        selectedCell: cell,
        previewCaptures: [], // Clear preview when selecting a new piece
        hoveredMove: null
      });
      soundSystem.play('select');
      return;
    }
    
    // If cell is empty and we have a selection, try to move
    if (gameState.board[cell.r][cell.c] === null && selectedCell) {
      if (gameState.phase === 'chain') {
        get().chainStep(cell);
      } else {
        get().moveStone(selectedCell, cell);
      }
      // Clear hints and preview after move
      get().clearHints();
      set({ 
        previewCaptures: [], 
        hoveredMove: null 
      });
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
        
        // Play placement sound
        soundSystem.play('place');
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
        
        // Play placement sound
        soundSystem.play('place');
        
        // Check for AI turn after placement
        setTimeout(() => get().checkForAITurn(), 300);
      }
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  moveStone: (from: Cell, to: Cell) => {
    const { gameState, currentSession } = get();
    
    try {
      const newState = applyMove(gameState, from, to);
      
      // Update session move count
      if (currentSession) {
        set({
          currentSession: {
            ...currentSession,
            moves: currentSession.moves + 1
          }
        });
      }
      
      // Check for blockade after turn change
      const needsBlockadeResolution = !hasAnyLegalMove(newState, newState.current);
      
      set({ 
        gameState: newState, 
        selectedCell: null,
        blockadeRemovalMode: needsBlockadeResolution && !newState.winner
      });
      saveGameState(newState);
      
      // Play appropriate sound
      if (newState.capturedLastMove.length > 0) {
        soundSystem.play('capture');
        get().showToast(`Captured ${newState.capturedLastMove.length} stones`);
      } else {
        soundSystem.play('move');
      }
      
      // Check if game ended
      if (newState.winner) {
        setTimeout(() => {
          soundSystem.play('win');
          get().endGameSession();
        }, 300);
      }
      
      // Check for AI turn after human move
      setTimeout(() => get().checkForAITurn(), 300);
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  chainStep: (to: Cell) => {
    const { gameState, currentSession } = get();
    
    try {
      const newState = applyChainStep(gameState, to);
      
      // Update session move count
      if (currentSession) {
        set({
          currentSession: {
            ...currentSession,
            moves: currentSession.moves + 1
          }
        });
      }
      
      set({ gameState: newState, selectedCell: newState.chainOrigin || null });
      saveGameState(newState);
      
      if (newState.capturedLastMove.length > 0) {
        soundSystem.play('chainCapture');
        get().showToast(`Captured ${newState.capturedLastMove.length} stones`);
      }
      
      // Check for AI turn after chain step
      setTimeout(() => get().checkForAITurn(), 300);
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
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
      
      // Play move sound for ending chain
      soundSystem.play('move');
      
      // Check if game ended and end session
      if (newState.winner) {
        setTimeout(() => {
          soundSystem.play('win');
          get().endGameSession();
        }, 300);
      }
      
      // Check for AI turn after chain end
      setTimeout(() => get().checkForAITurn(), 300);
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  endTurn: () => {
    const { gameState } = get();
    
    try {
      // Only allow ending turn if no moves available during movement phase
      if (gameState.phase !== 'movement' || hasAnyLegalMove(gameState, gameState.current)) {
        get().showToast('You have available moves');
        soundSystem.play('invalid');
        return;
      }
      
      // Switch to next player
      const nextPlayer = gameState.current === 'Light' ? 'Dark' : 'Light';
      const newState = { 
        ...gameState, 
        current: nextPlayer,
        capturedLastMove: []
      };
      
      // Check for blockade after turn change
      const needsBlockadeResolution = !hasAnyLegalMove(newState, newState.current);
      
      set({ 
        gameState: newState, 
        selectedCell: null,
        blockadeRemovalMode: needsBlockadeResolution && !newState.winner
      });
      saveGameState(newState);
      
      // Play turn end sound
      soundSystem.play('move');
      
      // Check for AI turn after human turn end
      setTimeout(() => get().checkForAITurn(), 300);
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
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
      soundSystem.play('capture'); // Use capture sound for stone removal
      
      // Check for AI turn after blockade resolution
      setTimeout(() => get().checkForAITurn(), 300);
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  // AI Actions
  makeAIMove: async () => {
    const { gameState, settings } = get();
    
    if (!isAITurn(gameState, settings.players) || gameState.winner) {
      return;
    }
    
    set({ aiThinking: true });
    
    try {
      // Add a small delay to show thinking state
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      if (gameState.phase === 'placement') {
        // Handle AI placement - need to place two stones per turn
        if (gameState.placementCount === 0) {
          // First stone of AI turn
          const aiMove1 = getBestAIMove(gameState, settings.aiDifficulty);
          if (!aiMove1 || aiMove1.type !== 'placement') {
            set({ aiThinking: false });
            return;
          }
          
          // Place first stone
          get().placeStone(aiMove1.cells[0]);
          
          // Small delay before second placement
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Get current state after first placement
          const currentState = get().gameState;
          
          // Only proceed with second stone if still in placement and it's still AI's turn
          if (currentState.phase === 'placement' && currentState.placementCount === 1 && 
              isAITurn(currentState, settings.players)) {
            const aiMove2 = getBestAIMove(currentState, settings.aiDifficulty);
            if (aiMove2 && aiMove2.type === 'placement') {
              get().placeStone(aiMove2.cells[0]);
            }
          }
        } else if (gameState.placementCount === 1) {
          // Second stone of AI turn (fallback case)
          const aiMove = getBestAIMove(gameState, settings.aiDifficulty);
          if (aiMove && aiMove.type === 'placement') {
            get().placeStone(aiMove.cells[0]);
          }
        }
      } else {
        // Check for stalemate decisions first
        const humanPlayer = gameState.current === 'Light' ? 'Dark' : 'Light';
        
        // If human offered stalemate, decide whether to accept
        if (gameState.stalemateOffers[humanPlayer]) {
          const shouldAccept = shouldAIAcceptStalemate(gameState, settings.aiDifficulty);
          
          if (shouldAccept) {
            get().offerStalemate(); // Accept by offering stalemate too
            set({ aiThinking: false });
            return;
          } else {
            get().rejectStalemate(); // Reject the offer
            // Continue with normal move
          }
        }
        
        // Check if AI should offer stalemate
        if (!gameState.stalemateOffers[gameState.current] && 
            shouldAIOfferStalemate(gameState, settings.aiDifficulty)) {
          get().offerStalemate();
          set({ aiThinking: false });
          return;
        }
        
        // Handle AI movement
        const aiMove = getBestAIMove(gameState, settings.aiDifficulty);
        
        if (!aiMove) {
          set({ aiThinking: false });
          return;
        }
        
        if (aiMove.from && aiMove.to) {
          get().moveStone(aiMove.from, aiMove.to);
        }
      }
      
      set({ aiThinking: false });
    } catch (error) {
      set({ aiThinking: false });
      get().showToast('AI move failed');
      soundSystem.play('invalid');
    }
  },

  checkForAITurn: () => {
    const { gameState, settings, aiThinking, blockadeRemovalMode } = get();
    
    if (aiThinking || blockadeRemovalMode || gameState.winner) {
      return;
    }
    
    if (isAITurn(gameState, settings.players)) {
      get().makeAIMove();
    }
  },

  // Hint Actions
  toggleHints: () => {
    const { hintsEnabled } = get();
    const newHintsEnabled = !hintsEnabled;
    const newSettings = { ...get().settings, hintsEnabled: newHintsEnabled };
    set({ 
      hintsEnabled: newHintsEnabled,
      settings: newSettings,
      showHints: false,
      currentHint: null,
      topMoves: []
    });
    saveSettings(newSettings);
  },

  getHint: () => {
    const { gameState, settings, aiThinking } = get();
    
    // Don't show hints during AI turn or when AI is thinking
    if (aiThinking || isAITurn(gameState, settings.players) || gameState.winner) {
      return;
    }
    
    try {
      const topMoves = getTopMoves(gameState, 3);
      const optimalMove = topMoves[0] || null;
      
      set({ 
        showHints: true,
        currentHint: optimalMove,
        topMoves
      });
      
      if (optimalMove) {
        get().showToast(`Hint: ${optimalMove.description}`);
      } else {
        get().showToast('No moves available');
      }
    } catch (error) {
      get().showToast('Could not generate hint');
    }
  },

  clearHints: () => {
    set({ 
      showHints: false,
      currentHint: null,
      topMoves: []
    });
  },

  setHoveredMove: (cell: Cell | null) => {
    set({ hoveredMove: cell });
    if (cell) {
      get().updatePreviewCaptures();
    } else {
      set({ previewCaptures: [] });
    }
  },

  updatePreviewCaptures: () => {
    const { gameState, selectedCell, hoveredMove } = get();
    
    if (!selectedCell || !hoveredMove || gameState.phase === 'placement') {
      set({ previewCaptures: [] });
      return;
    }
    
    const capturedCells = previewCaptures(gameState, selectedCell, hoveredMove);
    set({ previewCaptures: capturedCells });
  },

  setLanguage: (language: Language) => {
    const newSettings = { ...get().settings, language };
    set({ settings: newSettings });
    saveSettings(newSettings);
    
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  },

  setAIDifficulty: (difficulty: AIDifficulty) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      aiDifficulty: difficulty,
      players: {
        Light: { type: 'human' as const },
        Dark: { type: 'ai' as const, difficulty }
      }
    };
    set({ settings: newSettings });
    saveSettings(newSettings);
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
  setShowProfile: (show: boolean) => set({ showProfile: show }),
  
  showToast: (message: string) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
  
  clearToast: () => set({ toastMessage: null }),
  
  setSoundEnabled: (enabled: boolean) => {
    const { settings } = get();
    const newSettings = { ...settings, soundEnabled: enabled };
    set({ settings: newSettings });
    saveSettings(newSettings);
    soundSystem.setEnabled(enabled);
  },
  
  setSoundVolume: (volume: number) => {
    const { settings } = get();
    const newSettings = { ...settings, soundVolume: volume };
    set({ settings: newSettings });
    saveSettings(newSettings);
    soundSystem.setVolume(volume);
  },
  
  setCapturePreviewsEnabled: (enabled: boolean) => {
    const { settings } = get();
    const newSettings = { ...settings, capturePreviewsEnabled: enabled };
    set({ settings: newSettings });
    saveSettings(newSettings);
  },
  
  startGameSession: () => {
    const session: GameSession = {
      startTime: Date.now(),
      moves: 0
    };
    set({ currentSession: session });
  },

  // Stalemate and resignation actions
  offerStalemate: () => {
    const { gameState, settings } = get();
    
    if (gameState.winner || isAITurn(gameState, settings.players)) {
      return;
    }
    
    try {
      const newState = offerStalemate(gameState);
      set({ gameState: newState, selectedCell: null });
      saveGameState(newState);
      
      if (newState.winner !== undefined) {
        get().showToast(newState.winner ? 'Stalemate accepted - game decided by stone count' : 'Stalemate - game is a draw');
        get().endGameSession();
      } else {
        get().showToast('Stalemate offered - waiting for opponent response');
      }
      
      soundSystem.play('move');
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  rejectStalemate: () => {
    const { gameState, settings } = get();
    
    if (gameState.winner || isAITurn(gameState, settings.players)) {
      return;
    }
    
    try {
      const newState = rejectStalemate(gameState, gameState.current);
      set({ gameState: newState });
      saveGameState(newState);
      get().showToast('Stalemate offer rejected - game continues');
      soundSystem.play('move');
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  resignGame: () => {
    const { gameState, settings } = get();
    
    if (gameState.winner || isAITurn(gameState, settings.players)) {
      return;
    }
    
    try {
      const newState = resignGame(gameState, gameState.current);
      set({ gameState: newState, selectedCell: null });
      saveGameState(newState);
      get().showToast(`${gameState.current} player resigned`);
      get().endGameSession();
      soundSystem.play('capture'); // Use capture sound for dramatic effect
    } catch (error) {
      get().showToast((error as Error).message);
      soundSystem.play('invalid');
    }
  },

  endGameSession: async () => {
    const { currentSession, gameState, settings } = get();
    if (!currentSession) return;
    
    const endTime = Date.now();
    const duration = Math.floor((endTime - currentSession.startTime) / 1000);
    
    // Only save completed games (with a winner or explicit end)
    if (gameState.winner || duration > 30) { // At least 30 seconds played
      const gameResult: GameResult = {
        id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: currentSession.startTime,
        winner: gameState.winner || null,
        winReason: gameState.winReason,
        opponent: 'AI',
        aiDifficulty: settings.aiDifficulty,
        duration,
        totalMoves: gameState.moveHistory.length,
        playerColor: 'Light', // Human is always Light in current setup
        finalScore: {
          light: countStones(gameState, 'Light'),
          dark: countStones(gameState, 'Dark')
        },
        variant: gameState.variant
      };
      
      // Save to auth store if user is logged in
      try {
        // Import dynamically to avoid circular dependency
        const { useAuthStore } = await import('./authStore');
        const authStore = useAuthStore.getState();
        if (authStore.isAuthenticated) {
          await authStore.addGameResult(gameResult);
        }
      } catch (error) {
        console.error('Failed to save game result:', error);
      }
    }
    
    set({ currentSession: null });
  }
}));

// Initialize sound system with current settings
const initializeSoundSystem = () => {
  const settings = useGameStore.getState().settings;
  soundSystem.setEnabled(settings.soundEnabled);
  soundSystem.setVolume(settings.soundVolume);
};

// Initialize on first load
initializeSoundSystem();