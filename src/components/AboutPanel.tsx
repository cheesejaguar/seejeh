// FILE: src/components/AboutPanel.tsx

import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n';
import { Dialog } from './Dialog';

// Ordered because the rules genuinely are a sequence: you lay out, then the
// opening is forced, then you move, then you take.
const RULES: TranslationKey[] = [
  'about.rule.layout',
  'about.rule.opening',
  'about.rule.move',
  'about.rule.capture',
  'about.rule.chain',
  'about.rule.win',
];

export function AboutPanel() {
  const { t, n } = useTranslation();
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);

  return (
    <Dialog open={panel === 'about'} title={t('about.title')} onClose={() => setPanel('none')}>
      <section>
        <h3 className="panel-title">{t('about.heritage')}</h3>
        <p className="prose">{t('about.heritageBody')}</p>
      </section>

      <section>
        <h3 className="panel-title">{t('about.rules')}</h3>
        <ol className="rules-list">
          {RULES.map((key, index) => (
            <li key={key}>
              <span className="marker" aria-hidden="true">
                {n(index + 1)}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="panel-title">{t('about.notes')}</h3>
        <p className="prose">{t('about.notesBody')}</p>
      </section>

      <section>
        <h3 className="panel-title">{t('about.sources')}</h3>
        <p className="prose">{t('about.sourcesBody')}</p>
      </section>
    </Dialog>
  );
}
