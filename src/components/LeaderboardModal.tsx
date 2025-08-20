// FILE: src/components/LeaderboardModal.tsx

import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { useLeaderboardStore } from '../state/leaderboardStore';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { filterLeaderboardByDifficulty } from '../lib/leaderboard';
import { AIDifficulty, LeaderboardEntry } from '../lib/types';
import { 
  Trophy, 
  Medal, 
  Refresh, 
  Clock, 
  TrendingUp,
  User,
  Target
} from '@phosphor-icons/react';

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaderboardModal({ open, onOpenChange }: LeaderboardModalProps) {
  const { 
    data, 
    isLoading, 
    error, 
    selectedDifficulty,
    lastRefresh,
    loadLeaderboardData,
    refreshData,
    setSelectedDifficulty,
    clearError
  } = useLeaderboardStore();
  
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  // Load data when modal opens
  useEffect(() => {
    if (open && (!data || Date.now() - lastRefresh > 60000)) { // Refresh if older than 1 minute
      loadLeaderboardData();
    }
  }, [open, data, lastRefresh, loadLeaderboardData]);

  // Clear error when modal closes
  useEffect(() => {
    if (!open) {
      clearError();
    }
  }, [open, clearError]);

  // Filter entries based on selected difficulty
  const filteredEntries = useMemo(() => {
    if (!data) return [];
    return filterLeaderboardByDifficulty(data, selectedDifficulty);
  }, [data, selectedDifficulty]);

  const userEntry = useMemo(() => {
    if (!data?.userEntry || !isAuthenticated) return null;
    
    if (selectedDifficulty === 'all') {
      return data.userEntry;
    } else {
      const filtered = filteredEntries.find(entry => entry.player.id === user?.id);
      return filtered || null;
    }
  }, [data?.userEntry, isAuthenticated, selectedDifficulty, filteredEntries, user?.id]);

  const handleRefresh = async () => {
    await refreshData();
  };

  const formatLastActive = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('history.today');
    if (days === 1) return t('history.yesterday');
    return `${days} ${t('history.daysAgo')}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={20} className="text-yellow-500" weight="fill" />;
      case 2:
        return <Medal size={20} className="text-gray-400" weight="fill" />;
      case 3:
        return <Medal size={20} className="text-amber-600" weight="fill" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1800) return 'text-purple-600 bg-purple-50';
    if (rating >= 1600) return 'text-blue-600 bg-blue-50';
    if (rating >= 1400) return 'text-green-600 bg-green-50';
    if (rating >= 1200) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const canBeRanked = (gamesPlayed: number) => {
    return gamesPlayed >= (data?.minGamesForRanking || 10);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy size={24} />
            {t('leaderboard.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <label className="text-sm font-medium">
                {t('leaderboard.filterByDifficulty')}:
              </label>
              <Select 
                value={selectedDifficulty} 
                onValueChange={(value) => setSelectedDifficulty(value as AIDifficulty | 'all')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('leaderboard.allDifficulties')}</SelectItem>
                  <SelectItem value="beginner">{t('aiDifficulty.beginner')}</SelectItem>
                  <SelectItem value="easy">{t('aiDifficulty.easy')}</SelectItem>
                  <SelectItem value="medium">{t('aiDifficulty.medium')}</SelectItem>
                  <SelectItem value="hard">{t('aiDifficulty.hard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Refresh size={16} className={isLoading ? 'animate-spin' : ''} />
                {t('leaderboard.refreshData')}
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive text-sm">{t('leaderboard.errorLoading')}: {error}</p>
            </div>
          )}

          {/* Your Stats (if authenticated and ranked) */}
          {isAuthenticated && userEntry && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User size={20} />
                {t('leaderboard.yourStats')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">#{userEntry.rank}</div>
                  <div className="text-sm text-muted-foreground">{t('leaderboard.yourRank')}</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold px-2 py-1 rounded-lg ${getRatingColor(userEntry.rating)}`}>
                    {userEntry.rating}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('leaderboard.rating')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(userEntry.winRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">{t('leaderboard.winRate')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userEntry.gamesPlayed}</div>
                  <div className="text-sm text-muted-foreground">{t('leaderboard.gamesPlayed')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Unranked Notice (if authenticated but not enough games) */}
          {isAuthenticated && !userEntry && data && (
            <div className="bg-muted/50 border rounded-lg p-4 text-center">
              <Target size={32} className="mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                {t('leaderboard.unranked')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('leaderboard.minGamesRequired', { count: data.minGamesForRanking })}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !data && (
            <div className="space-y-3">
              <div className="text-center text-muted-foreground py-8">
                {t('leaderboard.loading')}
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="w-8 h-8" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="w-12 h-4" />
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard Table */}
          {data && !isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {selectedDifficulty === 'all' 
                    ? t('leaderboard.globalRankings')
                    : `${t('leaderboard.topPlayers')} - ${t(`aiDifficulty.${selectedDifficulty}`)}`
                  }
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={12} />
                  {t('leaderboard.lastUpdated', { 
                    time: new Date(data.lastUpdated).toLocaleTimeString() 
                  })}
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                  <p>{t('leaderboard.noPlayersYet')}</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                    <div className="col-span-1">{t('leaderboard.rank')}</div>
                    <div className="col-span-4">{t('leaderboard.player')}</div>
                    <div className="col-span-2">{t('leaderboard.rating')}</div>
                    <div className="col-span-2">{t('leaderboard.gamesPlayed')}</div>
                    <div className="col-span-2">{t('leaderboard.winRate')}</div>
                    <div className="col-span-1">{t('leaderboard.lastActive')}</div>
                  </div>

                  {filteredEntries.slice(0, 50).map((entry) => (
                    <div 
                      key={entry.player.id}
                      className={`grid grid-cols-12 gap-2 p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                        entry.player.id === user?.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div className="col-span-4 flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.player.avatar_url} alt={entry.player.login} />
                          <AvatarFallback>{entry.player.login[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{entry.player.login}</div>
                          {entry.player.id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <Badge className={getRatingColor(entry.rating)}>
                          {entry.rating}
                        </Badge>
                      </div>
                      
                      <div className="col-span-2 flex items-center text-sm">
                        {entry.gamesPlayed}
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-1">
                          <TrendingUp 
                            size={14} 
                            className={entry.winRate >= 0.6 ? 'text-green-500' : 'text-muted-foreground'} 
                          />
                          <span className="text-sm">
                            {(entry.winRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                        {formatLastActive(entry.lastActive)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}