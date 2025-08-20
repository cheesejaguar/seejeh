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
import { Slider } from './ui/slider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { X, Robot, SpeakerHigh, SpeakerX, Info } from '@phosphor-icons/react';
import { AIDifficulty } from '../lib/types';

export function SettingsModal() {
  const { 
    showSettings, 
    setShowSettings, 
    settings, 
    toggleVariant,
    setAIDifficulty,
    toggleHints,
    setSoundEnabled,
    setSoundVolume,
    setCapturePreviewsEnabled
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
          
          {/* Hints */}
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="hints"
              className="text-sm leading-relaxed"
            >
              {t('hints.enableHints')}
            </Label>
            <Switch
              id="hints"
              checked={settings.hintsEnabled}
              onCheckedChange={toggleHints}
            />
          </div>
          
          {/* Capture Previews */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label 
                htmlFor="capturePreviews"
                className="text-sm leading-relaxed"
              >
                {t('ui.capturePreviewsEnabled')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Info size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="max-w-xs text-center"
                  sideOffset={5}
                >
                  {t('ui.capturePreviewsTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="capturePreviews"
              checked={settings.capturePreviewsEnabled}
              onCheckedChange={setCapturePreviewsEnabled}
            />
          </div>
          
          {/* Sound Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              {settings.soundEnabled ? <SpeakerHigh size={16} className="text-primary" /> : <SpeakerX size={16} className="text-muted-foreground" />}
              {t('sound.title')}
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="soundEnabled"
                  className="text-sm leading-relaxed"
                >
                  {t('sound.enabled')}
                </Label>
                <Switch
                  id="soundEnabled"
                  checked={settings.soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
              
              {settings.soundEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t('sound.volume')} ({Math.round(settings.soundVolume * 100)}%)
                  </Label>
                  <Slider
                    value={[settings.soundVolume]}
                    onValueChange={(value) => setSoundVolume(value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
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