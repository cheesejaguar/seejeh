// FILE: src/components/Board.tsx

import React from 'react';
import { Cell } from './Cell';
import { HintOverlay } from './HintOverlay';
import { useGameStore } from '../state/gameStore';
import { movesFor, placementsFor } from '../lib/rules';
import { Cell as CellType } from '../lib/types';

export function Board() {
  const {
    gameState,
    selectedCell,
    selectCell,
    blockadeRemovalMode,
    showHints
  } = useGameStore();
  
  const handleCellClick = (cell: CellType) => {
    selectCell(cell);
  };
  
  const getValidMoves = (): CellType[] => {
    if (gameState.phase === 'placement') {
      return placementsFor(gameState, gameState.current);
    }
    
    if (selectedCell) {
      return movesFor(gameState, selectedCell);
    }
    
    return [];
  };
  
  const validMoves = getValidMoves();
  
  const isValidMove = (cell: CellType): boolean => {
    return validMoves.some(move => move.r === cell.r && move.c === cell.c);
  };
  
  const isSelected = (cell: CellType): boolean => {
    return selectedCell?.r === cell.r && selectedCell?.c === cell.c;
  };
  
  const isRemovableInBlockade = (cell: CellType): boolean => {
    if (!blockadeRemovalMode) return false;
    return gameState.board[cell.r][cell.c] === gameState.current;
  };
  
  return (
    <div 
      className="seejeh-board"
      role="grid"
      aria-label="Seejeh game board"
    >
      {gameState.board.map((row, r) =>
        row.map((player, c) => {
          const cell = { r, c };
          return (
            <div key={`${r}-${c}`} className="relative">
              <Cell
                cell={cell}
                player={player}
                isSelected={isSelected(cell)}
                isValidMove={isValidMove(cell) || isRemovableInBlockade(cell)}
                onClick={handleCellClick}
                className={isRemovableInBlockade(cell) ? 'removable' : ''}
              />
              {showHints && <HintOverlay cell={cell} />}
            </div>
          );
        })
      )}
    </div>
  );
}