// FILE: src/hooks/useTranslation.ts

import { useMemo } from 'react';
import { useGameStore } from '../state/gameStore';
import enTranslations from '../i18n/en.json';
import arTranslations from '../i18n/ar.json';

const translations = {
  en: enTranslations,
  ar: arTranslations
};

export function useTranslation() {
  const { settings } = useGameStore();
  
  const t = useMemo(() => {
    const currentTranslations = translations[settings.language];
    
    return (key: string, params?: Record<string, string>) => {
      const keys = key.split('.');
      let value: any = currentTranslations;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      if (typeof value !== 'string') {
        return key; // Return key if translation not found
      }
      
      // Simple template replacement
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return params[paramKey] || match;
        });
      }
      
      return value;
    };
  }, [settings.language]);
  
  return { t };
}