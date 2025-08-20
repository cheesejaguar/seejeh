// FILE: src/components/LanguageSwitcher.tsx

import React from 'react';
import { Button } from './ui/button';
import { useGameStore } from '../state/gameStore';
import { Language } from '../lib/types';

export function LanguageSwitcher() {
  const { settings, setLanguage } = useGameStore();
  
  const toggleLanguage = () => {
    const newLanguage: Language = settings.language === 'en' ? 'ar' : 'en';
    setLanguage(newLanguage);
  };
  
  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="min-w-[3rem]"
      aria-label={`Switch to ${settings.language === 'en' ? 'Arabic' : 'English'}`}
    >
      {settings.language === 'en' ? 'العربية' : 'English'}
    </Button>
  );
}