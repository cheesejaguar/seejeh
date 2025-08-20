// FILE: src/components/UserProfile.tsx

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { 
  SignOut, 
  Trophy, 
  Target, 
  Clock, 
  TrendUp,
  Fire,
  Palette,
  Trash
} from '@phosphor-icons/react';

export function UserProfile() {
  const { user, stats, logout, clearData, isLoading } = useAuthStore();
  const { t } = useTranslation();

  if (!user || !stats) return null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{user.name || user.login}</CardTitle>
              <CardDescription>@{user.login}</CardDescription>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
            >
              <SignOut size={16} className="mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.totalGames}</div>
                <div className="text-xs text-muted-foreground">{t('profile.totalGames')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-green-500" />
              <div>
                <div className="text-2xl font-bold">{formatPercentage(stats.winRate)}</div>
                <div className="text-xs text-muted-foreground">{t('profile.winRate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Fire size={20} className="text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.currentWinStreak}</div>
                <div className="text-xs text-muted-foreground">{t('profile.winStreak')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{formatDuration(stats.averageGameDuration)}</div>
                <div className="text-xs text-muted-foreground">{t('profile.avgDuration')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.detailedStats')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Results */}
            <div>
              <h4 className="font-semibold mb-2">{t('profile.gameResults')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('profile.wins')}:</span>
                  <span className="text-green-600 font-medium">{stats.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('profile.draws')}:</span>
                  <span className="text-yellow-600 font-medium">{stats.draws}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('profile.losses')}:</span>
                  <span className="text-red-600 font-medium">{stats.losses}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>{t('profile.bestStreak')}:</span>
                  <span className="font-medium">{stats.bestWinStreak}</span>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h4 className="font-semibold mb-2">{t('profile.preferences')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>{t('profile.favoriteColor')}:</span>
                  <div className="flex items-center gap-2">
                    <Palette size={16} />
                    <span className="font-medium">{t(`colors.${stats.favoriteColor.toLowerCase()}`)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>{t('profile.avgMoves')}:</span>
                  <span className="font-medium">{Math.round(stats.averageMovesPerGame)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div>
            <h4 className="font-semibold mb-2">{t('profile.difficultyStats')}</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(stats.difficultyStats).map(([difficulty, data]) => (
                <div key={difficulty} className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium capitalize">{t(`aiDifficulty.${difficulty}`)}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.games} {t('profile.games')} • {formatPercentage(data.winRate)} {t('profile.winRate')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{t('profile.dataManagement')}</CardTitle>
          <CardDescription>
            {t('profile.dataWarning')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={clearData}
            variant="destructive"
            size="sm"
            disabled={isLoading}
          >
            <Trash size={16} className="mr-2" />
            {isLoading ? t('profile.clearing') : t('profile.clearAllData')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}