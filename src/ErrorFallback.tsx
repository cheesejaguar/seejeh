import type { FallbackProps } from 'react-error-boundary';
import { createTranslator, directionOf, type Language } from './i18n';
import { loadSettings } from './store/settings';

/**
 * Reads the language directly from storage rather than the store: the store may
 * be exactly what failed, and a crash screen an Arabic reader cannot read is
 * not a crash screen.
 */
function languageFromStorage(): Language {
  try {
    return loadSettings().language;
  } catch {
    return 'en';
  }
}

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // In development, rethrow so the dev overlay shows the real stack.
  if (import.meta.env.DEV) throw error;

  const language = languageFromStorage();
  const { t } = createTranslator(language);
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      className="app"
      dir={directionOf(language)}
      lang={language}
      style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}
    >
      <div className="panel" style={{ maxWidth: '34rem' }}>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>{t('error.title')}</h2>
        <p className="prose">{t('error.body')}</p>
        <pre
          className="numeric"
          // The message itself is developer output and stays left-to-right even
          // in an RTL document.
          dir="ltr"
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--bg-sunken)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--step--2)',
            overflow: 'auto',
            maxHeight: '10rem',
            whiteSpace: 'pre-wrap',
            textAlign: 'start',
          }}
        >
          {message}
        </pre>
        <div className="btn-row" style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn is-primary" onClick={resetErrorBoundary}>
            {t('error.retry')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('error.reload')}
          </button>
        </div>
      </div>
    </div>
  );
}
