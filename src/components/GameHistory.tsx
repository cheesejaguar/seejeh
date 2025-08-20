// FILE: src/components/GameHistory.tsx

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { GameResult } from '../lib/types';
import { 
  Trophy, 
  Clock, 
  Robot, 
  Circle,
  X,
  Target,
  Calendar
} from '@phosphor-icons/react';

export function GameHistory() {
  const { stats } = useAuthStore();
  const { t } = useTranslation();

  if (!stats || stats.recentGames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('history.gameHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('history.noGamesYet')}</p>
            <p className="text-sm">{t('history.playFirstGame')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m` : '<1m';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('history.today');
    if (diffDays === 1) return t('history.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('history.daysAgo')}`;
    
    return date.toLocaleDateString();
  };

  const getResultIcon = (game: GameResult) => {
    if (game.winner === game.playerColor) {
      return <Trophy size={16} className="text-green-500" />;
    } else if (game.winner === null) {
      return <Circle size={16} className="text-yellow-500" />;
    } else {
      return <X size={16} className="text-red-500" />;
    }
  };

  const getResultText = (game: GameResult) => {
    if (game.winner === game.playerColor) return t('history.won');
    if (game.winner === null) return t('history.draw');
    return t('history.lost');
  };

  const getResultColor = (game: GameResult) => {
    if (game.winner === game.playerColor) return 'bg-green-100 text-green-800 border-green-200';
    if (game.winner === null) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'easy': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.gameHistory')}</CardTitle>
        <CardDescription>
          {t('history.recentGamesDescription', { count: stats.recentGames.length.toString() })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.recentGames.map((game, index) => (
            <div
              key={game.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getResultIcon(game)}
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Badge className={getResultColor(game)}>
                      {getResultText(game)}
                    </Badge>
                    
                    <Badge variant="outline" className={getDifficultyColor(game.aiDifficulty || 'easy')}>
                      <Robot size={12} className="mr-1" />
                      {t(`aiDifficulty.${game.aiDifficulty || 'easy'}`)}
                    </Badge>
                    
                    <Badge variant="outline">
                      <Circle 
                        size={12} 
                        className={`mr-1 ${game.playerColor === 'Light' ? 'text-gray-600' : 'text-gray-900'}`}
                        weight="fill"
                      />
                      {t(`colors.${game.playerColor.toLowerCase()}`)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatDate(game.timestamp)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDuration(game.duration)}
                </div>
                
                <div className="flex items-center gap-1">
                  <Target size={14} />
                  {game.totalMoves}
                </div>
                
                <div className="text-xs">
                  {game.finalScore.light}-{game.finalScore.dark}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {stats.totalGames > stats.recentGames.length && (
          <div className="text-center mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t('history.showingRecent')} • {t('history.totalGamesPlayed', { total: stats.totalGames.toString() })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}