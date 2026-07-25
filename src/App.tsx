// FILE: src/App.tsx

import { useEffect } from 'react';
import { Board, LiveRegion } from './components/Board';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { AboutPanel } from './components/AboutPanel';
import { ResultCard } from './components/ResultCard';
import { Toasts } from './components/Toasts';
import { useGameStore } from './store/gameStore';
import { useTranslation } from './hooks/useTranslation';
import { directionOf } from './i18n';
import { hasStoredSettings } from './store/settings';
import { sound } from './lib/sound';

/**
 * Spark supplies a GitHub identity when the app runs inside it. It is used only
 * to label the local profile — it never gates play, so the game behaves
 * identically with or without it. (The previous build blocked the entire UI
 * behind a sign-in prompt.)
 */
function useSparkIdentity() {
  const ensureProfile = useGameStore((s) => s.ensureProfile);

  useEffect(() => {
    let cancelled = false;
    const globalSpark = (globalThis as { spark?: { user?: () => Promise<unknown> } }).spark;
    if (!globalSpark?.user) return;

    void (async () => {
      try {
        const user = (await globalSpark.user?.()) as
          | { id?: number; login?: string; avatarUrl?: string }
          | undefined;
        if (cancelled || !user?.login) return;
        ensureProfile({
          id: `github:${user.id ?? user.login}`,
          name: user.login,
          avatarUrl: user.avatarUrl,
          source: 'github',
        });
      } catch {
        /* not signed in, or Spark unavailable — the local profile stands */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureProfile]);
}

export default function App() {
  const { t } = useTranslation();
  const language = useGameStore((s) => s.settings.language);
  const theme = useGameStore((s) => s.settings.theme);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const volume = useGameStore((s) => s.settings.volume);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setPanel = useGameStore((s) => s.setPanel);

  useSparkIdentity();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = directionOf(language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Expose the in-app Animation setting to CSS. Without this the setting only
  // reached the JS-driven FLIP, and every CSS animation kept running.
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);

  // Adopt the OS reduced-motion preference only when the player has not made a
  // choice of their own. Applying it unconditionally on every load made the
  // "Full" option impossible to keep.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    if (hasStoredSettings()) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateSettings({ reducedMotion: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sound.setEnabled(soundEnabled);
    sound.setVolume(volume);
  }, [soundEnabled, volume]);

  return (
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <h1>{t('app.title')}</h1>
          <span className="tagline">{t('app.subtitle')}</span>
        </div>

        <nav className="masthead-actions" aria-label={t('nav.play')}>
          <button type="button" className="btn is-quiet" onClick={() => setPanel('leaderboard')}>
            {t('nav.leaderboard')}
          </button>
          <button type="button" className="btn is-quiet" onClick={() => setPanel('about')}>
            {t('nav.about')}
          </button>
          <button type="button" className="btn is-quiet" onClick={() => setPanel('settings')}>
            {t('nav.settings')}
          </button>
          <button
            type="button"
            className="btn is-icon"
            aria-label={t('nav.theme')}
            title={t('nav.theme')}
            onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            type="button"
            className="btn"
            aria-label={t('nav.languageLabel')}
            onClick={() => updateSettings({ language: language === 'ar' ? 'en' : 'ar' })}
          >
            {t('nav.language')}
          </button>
        </nav>
      </header>

      <main className="layout">
        <Board />
        <Sidebar />
      </main>

      <footer className="footer-note">{t('app.boardName')}</footer>

      <SettingsPanel />
      <LeaderboardPanel />
      <AboutPanel />
      <ResultCard />
      <Toasts />
      <LiveRegion />
    </div>
  );
}
