// FILE: src/components/SettingsModal.tsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from './ui/dialog';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { X } from '@phosphor-icons/react';

export function SettingsModal() {
  const { 
    showSettings, 
    setShowSettings, 
    settings, 
    toggleVariant 
  } = useGameStore();
  
  const { t } = useTranslation();
  
  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t('settings')}
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X size={16} />
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Language */}
          <div className="flex items-center justify-between">
            <Label htmlFor="language">{t('language')}</Label>
            <LanguageSwitcher />
          </div>
          
          {/* Variant Rules */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('rules')}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="firstMove"
                  className="text-sm leading-relaxed"
                >
                  {t('variant.firstMoveMustEnterCenter')}
                </Label>
                <Switch
                  id="firstMove"
                  checked={settings.variant.firstMoveMustEnterCenter}
                  onCheckedChange={() => toggleVariant('firstMoveMustEnterCenter')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="antiShuttle"
                  className="text-sm leading-relaxed"
                >
                  {t('variant.antiShuttle')}
                </Label>
                <Switch
                  id="antiShuttle"
                  checked={settings.variant.antiShuttle}
                  onCheckedChange={() => toggleVariant('antiShuttle')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="blockade"
                  className="text-sm leading-relaxed"
                >
                  {t('variant.blockadeOneRemoval')}
                </Label>
                <Switch
                  id="blockade"
                  checked={settings.variant.blockadeOneRemoval}
                  onCheckedChange={() => toggleVariant('blockadeOneRemoval')}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}