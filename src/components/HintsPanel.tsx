// FILE: src/components/HintsPanel.tsx

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Lightbulb, X, Eye, EyeSlash } from '@phosphor-icons/react';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { isAITurn } from '../lib/ai';

export const HintsPanel: React.FC = () => {
  const { 
    hintsEnabled, 
    showHints, 
    topMoves, 
    gameState, 
    settings,
    aiThinking,
    hoveredHintIndex,
    toggleHints,
    getHint,
    clearHints,
    setHoveredHintIndex
  } = useGameStore();
  
  const { t } = useTranslation();

  // Don't show hints during AI turn or when game is over
  const canShowHints = !aiThinking && !isAITurn(gameState, settings.players) && !gameState.winner;

  const formatMoveDescription = (move: any, rank: number) => {
    const quality = rank === 1 ? t('hints.moveQuality.excellent') : 
                   rank === 2 ? t('hints.moveQuality.good') : 
                   t('hints.moveQuality.okay');
    
    if (move.move.type === 'placement') {
      const cell = move.move.cells[0];
      return `${quality}: ${move.description} (${String.fromCharCode(65 + cell.c)}${cell.r + 1})`;
    } else {
      const from = move.move.from;
      const to = move.move.to;
      return `${quality}: ${move.description} (${String.fromCharCode(65 + from.c)}${from.r + 1} → ${String.fromCharCode(65 + to.c)}${to.r + 1})`;
    }
  };

  if (!hintsEnabled) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb size={16} />
            {t('hints.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={toggleHints}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Lightbulb size={14} className="mr-2" />
            {t('hints.enableHints')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb size={16} />
            {t('hints.title')}
          </CardTitle>
          <Button
            onClick={toggleHints}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X size={12} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Control buttons */}
        <div className="flex gap-2">
          <Button
            onClick={getHint}
            disabled={!canShowHints}
            variant="default"
            size="sm"
            className="flex-1"
          >
            <Lightbulb size={14} className="mr-2" />
            {t('hints.getHint')}
          </Button>
          
          {showHints && (
            <Button
              onClick={clearHints}
              variant="outline"
              size="sm"
            >
              {showHints ? <EyeSlash size={14} /> : <Eye size={14} />}
            </Button>
          )}
        </div>

        {/* Hints display */}
        {showHints && topMoves.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground">
                {t('hints.topMoves')}
              </h4>
              <p className="text-xs text-muted-foreground/80">
                {t('hints.defaultBest') || 'Best move shown by default'}
              </p>
            </div>
            <div className="space-y-1">
              {topMoves.slice(0, 3).map((move, index) => (
                <div
                  key={index}
                  className={`
                    p-2 rounded text-xs border cursor-pointer transition-all
                    ${index === 0 ? 'bg-green-50 border-green-200 hover:bg-green-100' : 
                      index === 1 ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' : 
                      'bg-orange-50 border-orange-200 hover:bg-orange-100'}
                    ${hoveredHintIndex === index ? 'ring-2 ring-blue-300' : ''}
                  `}
                  onMouseEnter={() => setHoveredHintIndex(index)}
                  onMouseLeave={() => setHoveredHintIndex(null)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`
                      w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-yellow-500' : 
                        'bg-orange-500'}
                    `}>
                      {index + 1}
                    </span>
                    <span className="flex-1">
                      {formatMoveDescription(move, index + 1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {t('hints.hoverPreview') || 'Hover over moves above to preview them on the board'}
            </p>
          </div>
        )}

        {/* Help text */}
        {!canShowHints && (
          <p className="text-xs text-muted-foreground">
            {aiThinking ? t('aiThinking') : 
             gameState.winner ? t('gameOver') :
             'Hints available on your turn'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};