// FILE: src/components/Controls.tsx

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { HintsPanel } from './HintsPanel';
import { useGameStore } from '../state/gameStore';
import { countStones, hasAnyLegalMove } from '../lib/rules';
import { useTranslation } from '../hooks/useTranslation';
import { isAITurn } from '../lib/ai';
import { Settings, RotateCcw, Robot, ArrowRight, Flag, Handshake } from '@phosphor-icons/react';

export function Controls() {
  const {
    gameState,
    settings,
    newGame,
    endChainCapture,
    endTurn,
    setShowSettings,
    blockadeRemovalMode,
    aiThinking,
    offerStalemate,
    rejectStalemate,
    resignGame
  } = useGameStore();
  
  const { t } = useTranslation();
  
  const lightCount = countStones(gameState, 'Light');
  const darkCount = countStones(gameState, 'Dark');
  const isCurrentAI = isAITurn(gameState, settings.players);
  const hasMovesAvailable = hasAnyLegalMove(gameState, gameState.current);
  
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
        // Check if player has any moves available
        if (!hasMovesAvailable && !isCurrentAI) {
          return t('movementInstructionsNoMoves');
        }
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
      
      {/* No Moves Warning */}
      {gameState.phase === 'movement' && !hasMovesAvailable && !isCurrentAI && !blockadeRemovalMode && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <div>
                <div className="font-medium text-accent">{t('toast.noMovesAvailable')}</div>
                <div className="text-muted-foreground mt-1">{t('toast.noMovesEndTurn')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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
            <span className={!hasMovesAvailable && gameState.phase === 'movement' && !isCurrentAI ? 'text-accent font-medium' : ''}>
              {getPhaseInstructions()}
            </span>
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
          
          {gameState.phase === 'movement' && !hasMovesAvailable && !isCurrentAI && !blockadeRemovalMode && (
            <Button
              onClick={endTurn}
              variant="default"
              size="sm"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={aiThinking}
            >
              <ArrowRight size={16} className="mr-2" />
              {t('endTurn')}
            </Button>
          )}
          
          {gameState.winner && (
            <div className="win-announcement text-center p-6 bg-primary/10 rounded-lg border-2 border-primary/30 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-bold">
                    {gameState.winner ? '🏆' : '🤝'}
                  </span>
                </div>
                <div className="text-xl font-bold text-primary">
                  {gameState.winner ? t('winner', { player: t(`player.${gameState.winner}`) }) : t('draw')}
                </div>
              </div>
              
              {gameState.winReason && (
                <div className="bg-background/50 rounded-md p-3 mb-3 border border-border">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {gameState.winReason.type === 'stoneCount' && (
                      t('winReason.stoneCount', {
                        opponent: t(`player.${gameState.winReason.loser}`),
                        count: gameState.winReason.loserStoneCount
                      })
                    )}
                    {gameState.winReason.type === 'resignation' && (
                      t('winReason.resignation', {
                        player: t(`player.${gameState.winReason.resignedPlayer}`)
                      })
                    )}
                    {gameState.winReason.type === 'stalemate' && (
                      t(`winReason.stalemate.${gameState.winReason.drawType}`)
                    )}
                  </div>
                  {gameState.winReason.type === 'stoneCount' && (
                    <div className="text-xs text-muted-foreground">
                      {t('winReason.threshold', { threshold: 7 })}
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                {t('gameOver')}
              </div>
            </div>
          )}
          
          {/* Stalemate Offer Display */}
          {!gameState.winner && (gameState.stalemateOffers.Light || gameState.stalemateOffers.Dark) && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Handshake size={16} className="text-accent" />
                <span className="font-medium text-accent">{t('stalemateOffer.offered')}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('stalemateOffer.description')}
              </p>
              
              {/* Show accept/reject buttons if opponent offered stalemate and it's human turn */}
              {gameState.stalemateOffers[gameState.current === 'Light' ? 'Dark' : 'Light'] && 
               !isCurrentAI && (
                <div className="flex gap-2">
                  <Button
                    onClick={offerStalemate}
                    variant="default"
                    size="sm"
                    className="flex-1 bg-accent hover:bg-accent/90"
                    disabled={aiThinking}
                  >
                    <Handshake size={16} className="mr-2" />
                    {t('stalemateOffer.accept')}
                  </Button>
                  <Button
                    onClick={rejectStalemate}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={aiThinking}
                  >
                    {t('stalemateOffer.reject')}
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Game Actions - only show during active game for human player */}
          {!gameState.winner && !isCurrentAI && gameState.phase !== 'placement' && (
            <div className="flex gap-2">
              <Button
                onClick={offerStalemate}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={aiThinking || gameState.stalemateOffers[gameState.current]}
              >
                <Handshake size={16} className="mr-2" />
                {t('stalemate')}
              </Button>
              
              <Button
                onClick={resignGame}
                variant="outline"
                size="sm"
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                disabled={aiThinking}
              >
                <Flag size={16} className="mr-2" />
                {t('resignation')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Hints Panel */}
      <HintsPanel />
    </div>
  );
}