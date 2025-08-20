// FILE: src/components/AboutModal.tsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from './ui/dialog';
import { Button } from './ui/button';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { X } from '@phosphor-icons/react';

export function AboutModal() {
  const { showAbout, setShowAbout } = useGameStore();
  const { t } = useTranslation();
  
  return (
    <Dialog open={showAbout} onOpenChange={setShowAbout}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t('about')}
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X size={16} />
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* History */}
          <div>
            <h3 className="font-semibold mb-2">
              {t('title')} - {t('subtitle')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('about.history')}
            </p>
          </div>
          
          {/* Rules Summary */}
          <div>
            <h3 className="font-semibold mb-3">{t('about.rules.title')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t('about.rules.placement')}</li>
              <li>• {t('about.rules.movement')}</li>
              <li>• {t('about.rules.capture')}</li>
              <li>• {t('about.rules.win')}</li>
            </ul>
          </div>
          
          {/* Sources */}
          <div>
            <h3 className="font-semibold mb-2">{t('about.sources')}</h3>
            <p className="text-xs text-muted-foreground">
              Additional resources: 
              <a 
                href="https://en.wikipedia.org/wiki/Seega" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Wikipedia: Seega
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}