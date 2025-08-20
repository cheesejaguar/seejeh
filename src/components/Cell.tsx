// FILE: src/components/Cell.tsx

import React from 'react';
import { Cell as CellType, Player } from '../lib/types';
import { isCenter } from '../lib/rules';
import { cn } from '../lib/utils';

interface CellProps {
  cell: CellType;
  player: Player | null;
  isSelected: boolean;
  isValidMove: boolean;
  isValidPlacement?: boolean;
  isValidPieceMove?: boolean;
  isMovablePiece?: boolean;
  isWouldBeCaptured?: boolean;
  onClick: (cell: CellType) => void;
  onHover?: (cell: CellType | null) => void;
  className?: string;
}

export function Cell({
  cell,
  player,
  isSelected,
  isValidMove,
  isValidPlacement = false,
  isValidPieceMove = false,
  isMovablePiece = false,
  isWouldBeCaptured = false,
  onClick,
  onHover,
  className
}: CellProps) {
  const isCenterCell = isCenter(cell);
  
  const handleClick = () => onClick(cell);
  
  const handleMouseEnter = () => {
    if (onHover && isValidPieceMove) {
      onHover(cell);
    }
  };
  
  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(cell);
    }
  };
  
  return (
    <div
      className={cn(
        'seejeh-cell',
        isCenterCell && 'center',
        isSelected && 'selected',
        isValidMove && 'valid-move',
        isValidPlacement && 'valid-placement',
        isValidPieceMove && 'valid-piece-move',
        isWouldBeCaptured && 'capture-preview',
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Cell ${cell.r + 1}, ${cell.c + 1}${isCenterCell ? ' (center, safe)' : ''}${player ? ` - ${player} stone` : ' - empty'}${isMovablePiece ? ' - can be moved' : ''}${isValidPlacement ? ' - can place stone' : ''}${isValidPieceMove ? ' - can move here' : ''}${isValidMove ? ' - valid action' : ''}${isWouldBeCaptured ? ' - would be captured' : ''}`}
    >
      {player && (
        <div
          className={cn(
            'seejeh-stone',
            player.toLowerCase(),
            isSelected && 'selected',
            isMovablePiece && !isSelected && 'movable',
            isWouldBeCaptured && 'capture-preview'
          )}
          aria-hidden="true"
        >
          {player === 'Light' ? '○' : '●'}
        </div>
      )}
    </div>
  );
}