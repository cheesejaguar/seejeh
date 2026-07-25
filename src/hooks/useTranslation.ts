// FILE: src/hooks/useTranslation.ts

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { createTranslator, type Translator } from '../i18n';

export function useTranslation(): Translator {
  const language = useGameStore((s) => s.settings.language);
  return useMemo(() => createTranslator(language), [language]);
}
