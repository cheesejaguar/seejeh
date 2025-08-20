// FILE: src/components/HintOverlay.tsx

import React from 'react';
import { Cell } from '../lib/types';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';

interface HintOverlayProps {
  cell: Cell;
}

export const HintOverlay: React.FC<HintOverlayProps> = ({ cell }) => {
  const { currentHint, topMoves, showHints } = useGameStore();
  const { t } = useTranslation();

  if (!showHints || !currentHint) return null;

  // Check if this cell is part of any hint
  const getHintForCell = () => {
    for (let i = 0; i < topMoves.length; i++) {
      const move = topMoves[i];
      
      if (move.move.type === 'placement') {
        // For placement moves, check if this cell matches the placement
        const targetCell = move.move.cells[0];
        if (targetCell && targetCell.r === cell.r && targetCell.c === cell.c) {
          return { rank: i + 1, move, isSource: false, isTarget: true };
        }
      } else if (move.move.type === 'movement') {
        // For movement moves, check both source and target
        if (move.move.from && move.move.from.r === cell.r && move.move.from.c === cell.c) {
          return { rank: i + 1, move, isSource: true, isTarget: false };
        }
        if (move.move.to && move.move.to.r === cell.r && move.move.to.c === cell.c) {
          return { rank: i + 1, move, isSource: false, isTarget: true };
        }
      }
    }
    return null;
  };

  const hint = getHintForCell();
  if (!hint) return null;

  const getHintColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-green-500/80'; // Best move
      case 2: return 'bg-yellow-500/80'; // Second best
      case 3: return 'bg-orange-500/80'; // Third best
      default: return 'bg-gray-500/80';
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
        absolute inset-0 rounded-sm border-2 
        ${hint.isTarget ? 'border-white' : 'border-white/60'}
        ${getHintColor(hint.rank)}
        flex items-center justify-center
      `}>
        {/* Rank number */}
        <span className="text-white font-bold text-sm drop-shadow">
          {hint.rank}
        </span>
      </div>

      {/* Arrow indicator for movement hints */}
      {hint.move.move.type === 'movement' && hint.isSource && (
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <div className="w-full h-full bg-white rounded-full border border-gray-400 flex items-center justify-center">
            <span className="text-xs text-gray-600">→</span>
          </div>
        </div>
      )}

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
        <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {getQualityText(hint.rank)}: {hint.move.description}
        </div>
      </div>
    </div>
  );
};