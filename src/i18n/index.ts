// FILE: src/i18n/index.ts

import { en, type Catalogue, type TranslationKey } from './en';
import { ar } from './ar';

export type Language = 'en' | 'ar';
export type { TranslationKey, Catalogue };

export const CATALOGUES: Record<Language, Catalogue> = { en, ar };

export const LANGUAGES: readonly Language[] = ['en', 'ar'];

export function directionOf(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export type TParams = Record<string, string | number>;

// Intl constructors are expensive and these are hot: number formatting runs for
// every one of the 49 cell labels on every board render.
const numberFormatters = new Map<Language, Intl.NumberFormat>();
const percentFormatters = new Map<Language, Intl.NumberFormat>();
const relativeFormatters = new Map<Language, Intl.RelativeTimeFormat>();
const pluralRules = new Map<Language, Intl.PluralRules>();

function localeOf(language: Language): string {
  return language === 'ar' ? 'ar-EG' : 'en-GB';
}

function numberFormatter(language: Language): Intl.NumberFormat {
  let f = numberFormatters.get(language);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(language));
    numberFormatters.set(language, f);
  }
  return f;
}

function percentFormatter(language: Language): Intl.NumberFormat {
  let f = percentFormatters.get(language);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(language), {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    percentFormatters.set(language, f);
  }
  return f;
}

function relativeFormatter(language: Language): Intl.RelativeTimeFormat {
  let f = relativeFormatters.get(language);
  if (!f) {
    f = new Intl.RelativeTimeFormat(localeOf(language), { numeric: 'auto' });
    relativeFormatters.set(language, f);
  }
  return f;
}

function pluralRule(language: Language): Intl.PluralRules {
  let f = pluralRules.get(language);
  if (!f) {
    f = new Intl.PluralRules(localeOf(language));
    pluralRules.set(language, f);
  }
  return f;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = params[key];
    // `?? match` rather than `|| match`, so a legitimate 0 is not swallowed.
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Formats numbers in the digits the reader expects — Eastern Arabic numerals
 * for Arabic, Western for English.
 */
export function formatNumber(value: number, language: Language): string {
  return numberFormatter(language).format(value);
}

export function formatPercent(value: number, language: Language): string {
  return percentFormatter(language).format(value);
}

export function formatDuration(ms: number, language: Language): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const digits = (n: number) => formatNumber(n, language).padStart(2, language === 'ar' ? '٠' : '0');
  return `${formatNumber(minutes, language)}:${digits(seconds)}`;
}

export function formatRelativeDate(timestamp: number, language: Language, now = Date.now()): string {
  const diffDays = Math.round((timestamp - now) / 86_400_000);
  const rtf = relativeFormatter(language);
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round((timestamp - now) / 3_600_000);
    if (Math.abs(diffHours) < 1) {
      return rtf.format(Math.round((timestamp - now) / 60_000), 'minute');
    }
    return rtf.format(diffHours, 'hour');
  }
  return rtf.format(diffDays, 'day');
}

/**
 * Builds a translator for a language.
 *
 * Plural-aware lookup: `tCount('event.captured', n)` resolves
 * `event.captured.<category>` using Intl.PluralRules, falling back to
 * `.other`. Arabic distinguishes six categories, so "took 2 stones" and
 * "took 3 stones" genuinely need different strings.
 */
const translators = new Map<Language, Translator>();

/** Returns the shared translator for a language, building it on first use. */
export function createTranslator(language: Language): Translator {
  const cached = translators.get(language);
  if (cached) return cached;
  const built = buildTranslator(language);
  translators.set(language, built);
  return built;
}

function buildTranslator(language: Language) {
  const catalogue = CATALOGUES[language] ?? en;
  const plural = pluralRule(language);

  const t = (key: TranslationKey, params?: TParams): string =>
    interpolate(catalogue[key] ?? en[key] ?? key, params);

  const tCount = (baseKey: string, count: number, params?: TParams): string => {
    const category = plural.select(count);
    const candidates = [`${baseKey}.${category}`, `${baseKey}.other`] as TranslationKey[];
    for (const candidate of candidates) {
      const value = catalogue[candidate] ?? en[candidate];
      // The count is interpolated in the reader's own digits — an Arabic string
      // must read "٣ حركات", not "3 حركات".
      if (value) return interpolate(value, { count: formatNumber(count, language), ...params });
    }
    return baseKey;
  };

  return {
    t,
    tCount,
    language,
    dir: directionOf(language),
    n: (value: number) => formatNumber(value, language),
    percent: (value: number) => formatPercent(value, language),
    duration: (ms: number) => formatDuration(ms, language),
    relative: (timestamp: number) => formatRelativeDate(timestamp, language),
  };
}

export type Translator = ReturnType<typeof buildTranslator>;
