// FILE: src/components/HintOverlay.tsx

import React from 'react';
import { Cell } from '../lib/types';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';

interface HintOverlayProps {
  cell: Cell;
}

export const HintOverlay: React.FC<HintOverlayProps> = ({ cell }) => {
  const { currentHint, topMoves, showHints, hoveredHintIndex } = useGameStore();
  const { t } = useTranslation();

  if (!showHints || !topMoves.length) return null;

  // Check if this cell is part of any hint
  const getHintForCell = () => {
    // If hovering over a specific hint, only show that one
    if (hoveredHintIndex !== null) {
      const move = topMoves[hoveredHintIndex];
      if (!move) return null;
      
      if (move.move.type === 'placement') {
        const targetCell = move.move.cells[0];
        if (targetCell && targetCell.r === cell.r && targetCell.c === cell.c) {
          return { rank: hoveredHintIndex + 1, move, isSource: false, isTarget: true };
        }
      } else if (move.move.type === 'movement') {
        if (move.move.from && move.move.from.r === cell.r && move.move.from.c === cell.c) {
          return { rank: hoveredHintIndex + 1, move, isSource: true, isTarget: false };
        }
        if (move.move.to && move.move.to.r === cell.r && move.move.to.c === cell.c) {
          return { rank: hoveredHintIndex + 1, move, isSource: false, isTarget: true };
        }
      }
      return null;
    }
    
    // Default: show only the best move (rank 1)
    const bestMove = topMoves[0];
    if (!bestMove) return null;
    
    if (bestMove.move.type === 'placement') {
      const targetCell = bestMove.move.cells[0];
      if (targetCell && targetCell.r === cell.r && targetCell.c === cell.c) {
        return { rank: 1, move: bestMove, isSource: false, isTarget: true };
      }
    } else if (bestMove.move.type === 'movement') {
      if (bestMove.move.from && bestMove.move.from.r === cell.r && bestMove.move.from.c === cell.c) {
        return { rank: 1, move: bestMove, isSource: true, isTarget: false };
      }
      if (bestMove.move.to && bestMove.move.to.r === cell.r && bestMove.move.to.c === cell.c) {
        return { rank: 1, move: bestMove, isSource: false, isTarget: true };
      }
    }
    return null;
  };

  const hint = getHintForCell();
  if (!hint) return null;

  const getHintColor = (rank: number) => {
    const isHovered = hoveredHintIndex === rank - 1;
    switch (rank) {
      case 1: return isHovered ? 'bg-green-600/90' : 'bg-green-500/80'; // Best move
      case 2: return isHovered ? 'bg-yellow-600/90' : 'bg-yellow-500/80'; // Second best
      case 3: return isHovered ? 'bg-orange-600/90' : 'bg-orange-500/80'; // Third best
      default: return isHovered ? 'bg-gray-600/90' : 'bg-gray-500/80';
    }
  };

  const getQualityText = (rank: number) => {
    switch (rank) {
      case 1: return t('hints.moveQuality.excellent');
      case 2: return t('hints.moveQuality.good');
      case 3: return t('hints.moveQuality.okay');
      default: return '';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Hint indicator */}
      <div className={`
        absolute inset-0 rounded-sm border-2 transition-all duration-200
        ${hint.isTarget ? 'border-white' : 'border-white/60'}
        ${getHintColor(hint.rank)}
        flex items-center justify-center
        ${hoveredHintIndex === hint.rank - 1 ? 'z-20 scale-105' : 'z-10'}
        ${hint.rank === 1 && hoveredHintIndex === null ? 'animate-pulse' : ''}
      `}>
        {/* Rank number */}
        <span className={`
          text-white font-bold drop-shadow transition-all duration-200
          ${hoveredHintIndex === hint.rank - 1 ? 'text-base' : 'text-sm'}
        `}>
          {hint.rank}
        </span>
      </div>

      {/* Arrow indicator for movement hints */}
      {hint.move.move.type === 'movement' && hint.isSource && (
        <div className="absolute -top-1 -right-1 w-3 h-3 z-30">
          <div className={`
            w-full h-full bg-white rounded-full border border-gray-400 flex items-center justify-center transition-all duration-200
            ${hoveredHintIndex === hint.rank - 1 ? 'scale-110' : ''}
          `}>
            <span className="text-xs text-gray-600">→</span>
          </div>
        </div>
      )}

      {/* Enhanced tooltip - always visible for hovered moves, only for rank 1 when not hovering */}
      {(hoveredHintIndex === hint.rank - 1 || (hint.rank === 1 && hoveredHintIndex === null)) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-40">
          <div className={`
            bg-black/90 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg
            transition-all duration-200
            ${hoveredHintIndex === hint.rank - 1 ? 'scale-105' : ''}
          `}>
            <div className="font-medium">{getQualityText(hint.rank)}</div>
            <div className="opacity-90">{hint.move.description}</div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-black/90 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};