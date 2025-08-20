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
    showHints,
    hoveredMove,
    previewCaptures,
    setHoveredMove,
    settings
  } = useGameStore();
  
  const handleCellClick = (cell: CellType) => {
    selectCell(cell);
  };
  
  const handleCellHover = (cell: CellType | null) => {
    setHoveredMove(cell);
  };
  
  const isWouldBeCaptured = (cell: CellType): boolean => {
    if (!settings.capturePreviewsEnabled) return false;
    return previewCaptures.some(capture => capture.r === cell.r && capture.c === cell.c);
  };
  
  const getValidMoves = (): CellType[] => {
    if (gameState.phase === 'placement') {
      return placementsFor(gameState, gameState.current);
    }
    
    if (selectedCell && (gameState.phase === 'movement' || gameState.phase === 'chain')) {
      return movesFor(gameState, selectedCell);
    }
    
    return [];
  };
  
  const validMoves = getValidMoves();
  
  const isValidMove = (cell: CellType): boolean => {
    return validMoves.some(move => move.r === cell.r && move.c === cell.c);
  };
  
  const isValidPlacement = (cell: CellType): boolean => {
    return gameState.phase === 'placement' && isValidMove(cell);
  };
  
  const isValidPieceMove = (cell: CellType): boolean => {
    return (gameState.phase === 'movement' || gameState.phase === 'chain') && 
           selectedCell && isValidMove(cell);
  };
  
  const isSelected = (cell: CellType): boolean => {
    return selectedCell?.r === cell.r && selectedCell?.c === cell.c;
  };
  
  const isRemovableInBlockade = (cell: CellType): boolean => {
    if (!blockadeRemovalMode) return false;
    return gameState.board[cell.r][cell.c] === gameState.current;
  };
  
  const isMovablePiece = (cell: CellType): boolean => {
    if (gameState.phase !== 'movement') return false;
    if (gameState.board[cell.r][cell.c] !== gameState.current) return false;
    return movesFor(gameState, cell).length > 0;
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
                isValidMove={isRemovableInBlockade(cell)}
                isValidPlacement={isValidPlacement(cell)}
                isValidPieceMove={isValidPieceMove(cell)}
                isMovablePiece={isMovablePiece(cell)}
                isWouldBeCaptured={isWouldBeCaptured(cell)}
                onClick={handleCellClick}
                onHover={handleCellHover}
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