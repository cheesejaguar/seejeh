// FILE: src/components/Controls.tsx

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useGameStore } from '../state/gameStore';
import { countStones } from '../lib/rules';
import { useTranslation } from '../hooks/useTranslation';
import { Settings, RotateCcw } from '@phosphor-icons/react';

export function Controls() {
  const {
    gameState,
    newGame,
    endChainCapture,
    setShowSettings,
    blockadeRemovalMode
  } = useGameStore();
  
  const { t } = useTranslation();
  
  const lightCount = countStones(gameState, 'Light');
  const darkCount = countStones(gameState, 'Dark');
  
  const getPhaseInstructions = () => {
    if (blockadeRemovalMode) {
      return t('toast.blockade');
    }
    
    switch (gameState.phase) {
      case 'placement':
        return t('placementInstructions');
      case 'movement':
        return t('movementInstructions');
      case 'chain':
        return t('chainInstructions');
      default:
        return '';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Game Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>{t('currentPlayer')}</span>
            <Badge variant={gameState.current === 'Light' ? 'secondary' : 'default'}>
              {t(`player.${gameState.current}`)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{t('player.Light')}: {lightCount}</span>
            <span>{t('player.Dark')}: {darkCount}</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline" className="mr-2">
              {t(`phase.${gameState.phase}`)}
            </Badge>
            {getPhaseInstructions()}
          </div>
          
          {gameState.phase === 'placement' && (
            <div className="text-sm">
              {t('stonesToPlace')}: {gameState.stonesToPlace[gameState.current]}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Actions */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={newGame}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RotateCcw size={16} className="mr-2" />
              {t('newGame')}
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="sm"
            >
              <Settings size={16} />
            </Button>
          </div>
          
          {gameState.phase === 'chain' && (
            <Button
              onClick={endChainCapture}
              variant="default"
              size="sm"
              className="w-full"
            >
              {t('endChain')}
            </Button>
          )}
          
          {gameState.winner && (
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-lg font-semibold text-primary">
                {t('winner', { player: t(`player.${gameState.winner}`) })}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {t('gameOver')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}