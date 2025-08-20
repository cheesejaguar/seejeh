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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { X, Robot } from '@phosphor-icons/react';
import { AIDifficulty } from '../lib/types';

export function SettingsModal() {
  const { 
    showSettings, 
    setShowSettings, 
    settings, 
    toggleVariant,
    setAIDifficulty
  } = useGameStore();
  
  const { t } = useTranslation();
  
  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
          
          {/* AI Difficulty */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Robot size={16} className="text-primary" />
              {t('difficulty')}
            </Label>
            <RadioGroup
              value={settings.aiDifficulty}
              onValueChange={(value: AIDifficulty) => setAIDifficulty(value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beginner" id="diff-beginner" />
                <Label htmlFor="diff-beginner" className="text-sm">
                  {t('aiDifficulty.beginner')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="diff-easy" />
                <Label htmlFor="diff-easy" className="text-sm">
                  {t('aiDifficulty.easy')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="diff-medium" />
                <Label htmlFor="diff-medium" className="text-sm">
                  {t('aiDifficulty.medium')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="diff-hard" />
                <Label htmlFor="diff-hard" className="text-sm">
                  {t('aiDifficulty.hard')}
                </Label>
              </div>
            </RadioGroup>
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