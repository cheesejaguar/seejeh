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
  onClick: (cell: CellType) => void;
  className?: string;
}

export function Cell({
  cell,
  player,
  isSelected,
  isValidMove,
  onClick,
  className
}: CellProps) {
  const isCenterCell = isCenter(cell);
  
  const handleClick = () => onClick(cell);
  
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
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Cell ${cell.r + 1}, ${cell.c + 1}${isCenterCell ? ' (center, safe)' : ''}${player ? ` - ${player} stone` : ' - empty'}`}
    >
      {player && (
        <div
          className={cn(
            'seejeh-stone',
            player.toLowerCase(),
            isSelected && 'selected'
          )}
          aria-hidden="true"
        >
          {player === 'Light' ? '○' : '●'}
        </div>
      )}
    </div>
  );
}