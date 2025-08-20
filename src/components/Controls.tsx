// FILE: src/components/Controls.tsx

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useGameStore } from '../state/gameStore';
import { countStones } from '../lib/rules';
import { useTranslation } from '../hooks/useTranslation';
import { isAITurn } from '../lib/ai';
import { Settings, RotateCcw, Robot } from '@phosphor-icons/react';

export function Controls() {
  const {
    gameState,
    settings,
    newGame,
    endChainCapture,
    setShowSettings,
    blockadeRemovalMode,
    aiThinking
  } = useGameStore();
  
  const { t } = useTranslation();
  
  const lightCount = countStones(gameState, 'Light');
  const darkCount = countStones(gameState, 'Dark');
  const isCurrentAI = isAITurn(gameState, settings.players);
  
  const getPhaseInstructions = () => {
    if (blockadeRemovalMode) {
      return t('toast.blockade');
    }
    
    if (aiThinking) {
      return t('aiThinking');
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
  
  const getCurrentPlayerDisplay = () => {
    const playerName = t(`player.${gameState.current}`);
    if (isCurrentAI) {
      return (
        <div className="flex items-center gap-2">
          <Robot size={16} className="text-primary" />
          <span>{playerName}</span>
          <Badge variant="secondary" size="sm">AI</Badge>
        </div>
      );
    }
    return playerName;
  };
  
  return (
    <div className="space-y-4">
      {/* AI Opponent Info */}
      <Card className="border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm">
            <Robot size={16} className="text-primary" />
            <span className="font-medium">{t('mode.human-vs-ai')}</span>
            <Badge variant="outline">
              {t(`aiDifficulty.${settings.aiDifficulty}`)}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Game Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>{t('currentPlayer')}</span>
            <Badge variant={gameState.current === 'Light' ? 'secondary' : 'default'}>
              {getCurrentPlayerDisplay()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>{t('player.Light')}: {lightCount}</span>
              {settings.players.Light.type === 'ai' && (
                <Robot size={14} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>{t('player.Dark')}: {darkCount}</span>
              {settings.players.Dark.type === 'ai' && (
                <Robot size={14} className="text-muted-foreground" />
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <Badge 
              variant="outline" 
              className={`mr-2 ${aiThinking ? 'animate-pulse' : ''}`}
            >
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
              disabled={aiThinking}
            >
              <RotateCcw size={16} className="mr-2" />
              {t('newGame')}
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="sm"
              disabled={aiThinking}
            >
              <Settings size={16} />
            </Button>
          </div>
          
          {gameState.phase === 'chain' && !isCurrentAI && (
            <Button
              onClick={endChainCapture}
              variant="default"
              size="sm"
              className="w-full"
              disabled={aiThinking}
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