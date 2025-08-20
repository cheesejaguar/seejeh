// FILE: src/components/LoginPrompt.tsx

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { GithubLogo, ChartBar, Trophy, Clock } from '@phosphor-icons/react';

export function LoginPrompt() {
  const { login, isLoading, error } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <GithubLogo size={32} className="text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.loginDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <ChartBar size={20} className="text-primary shrink-0" />
                <span>{t('auth.featureStats')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Trophy size={20} className="text-primary shrink-0" />
                <span>{t('auth.featureHistory')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock size={20} className="text-primary shrink-0" />
                <span>{t('auth.featureProgress')}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button 
              onClick={login}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <GithubLogo size={20} className="mr-2" />
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Set a flag to allow guest play
                  localStorage.setItem('guestMode', 'true');
                  window.location.reload();
                }}
                className="text-muted-foreground"
              >
                {t('auth.playAsGuest')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}