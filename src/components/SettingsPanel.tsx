// FILE: src/components/SettingsPanel.tsx

import { useRef, useState } from 'react';
import type { Difficulty } from '../ai/search';
import type { BlockadeRule, FirstMoverRule } from '../engine';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n';
import { Dialog } from './Dialog';

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard'];
const BLOCKADE_RULES: BlockadeRule[] = [
  'opponentMovesAgain',
  'opponentRemovesOwnStone',
  'blockedPlayerLoses',
];
const FIRST_MOVERS: FirstMoverRule[] = ['firstPlacer', 'secondPlacer'];

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="control-row">
      <div className="field">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function SettingsPanel() {
  const { t, n } = useTranslation();
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const updateVariant = useGameStore((s) => s.updateVariant);
  const exportData = useGameStore((s) => s.exportData);
  const importData = useGameStore((s) => s.importData);
  const clearData = useGameStore((s) => s.clearData);
  const pushToast = useGameStore((s) => s.pushToast);
  const newGame = useGameStore((s) => s.newGame);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Switching sides mid-game would attribute one game's captures to one colour
  // and its result to the other, writing a self-contradictory record — and it
  // would let a player answer their own draw offer.
  const gameInProgress = useGameStore((s) => s.game.ply > 0 && !s.game.outcome);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seejeh-record.json';
    link.click();
    URL.revokeObjectURL(url);
    pushToast('settings.exported');
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const ok = importData(text);
    pushToast(ok ? 'settings.imported' : 'settings.importFailed', ok ? 'info' : 'error');
  };

  return (
    <Dialog
      open={panel === 'settings'}
      title={t('settings.title')}
      onClose={() => setPanel('none')}
    >
      <section>
        <h3 className="panel-title">{t('settings.opponent')}</h3>
        <Row label={t('settings.difficulty')} hint={t(`settings.difficulty.${settings.difficulty}Hint` as TranslationKey)}>
          <div className="segmented" role="group" aria-label={t('settings.difficulty')}>
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={settings.difficulty === level}
                onClick={() => updateSettings({ difficulty: level })}
              >
                {t(`settings.difficulty.${level}` as TranslationKey)}
              </button>
            ))}
          </div>
        </Row>
        <Row
          label={t('settings.yourColour')}
          hint={gameInProgress ? t('settings.yourColourLocked') : undefined}
        >
          <div className="segmented" role="group" aria-label={t('settings.yourColour')}>
            <button
              type="button"
              aria-pressed={settings.humanSide === 'Light'}
              disabled={gameInProgress}
              onClick={() => updateSettings({ humanSide: 'Light' })}
            >
              {t('player.Light')}
            </button>
            <button
              type="button"
              aria-pressed={settings.humanSide === 'Dark'}
              disabled={gameInProgress}
              onClick={() => updateSettings({ humanSide: 'Dark' })}
            >
              {t('player.Dark')}
            </button>
          </div>
        </Row>
      </section>

      <section>
        <h3 className="panel-title">{t('settings.presentation')}</h3>
        <Row label={t('settings.sound')}>
          <Toggle
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
            label={t('settings.sound')}
          />
        </Row>
        {settings.soundEnabled && (
          <Row label={t('settings.volume')} htmlFor="volume">
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
            />
          </Row>
        )}
        <Row label={t('settings.showCaptures')} hint={t('settings.showCapturesHint')}>
          <Toggle
            checked={settings.showCapturePreview}
            onChange={(showCapturePreview) => updateSettings({ showCapturePreview })}
            label={t('settings.showCaptures')}
          />
        </Row>
        <Row label={t('settings.animations')}>
          <div className="segmented" role="group" aria-label={t('settings.animations')}>
            <button
              type="button"
              aria-pressed={!settings.reducedMotion}
              onClick={() => updateSettings({ reducedMotion: false })}
            >
              {t('settings.animations.full')}
            </button>
            <button
              type="button"
              aria-pressed={settings.reducedMotion}
              onClick={() => updateSettings({ reducedMotion: true })}
            >
              {t('settings.animations.reduced')}
            </button>
          </div>
        </Row>
      </section>

      <section>
        <h3 className="panel-title">{t('settings.rules')}</h3>
        <p className="field-hint" style={{ marginBottom: 'var(--space-3)' }}>
          {t('about.notesBody')}
        </p>

        <Row label={t('variant.centerIsSafe')} hint={t('variant.centerIsSafe.hint')}>
          <Toggle
            checked={settings.variant.centerIsSafe}
            onChange={(centerIsSafe) => updateVariant({ centerIsSafe })}
            label={t('variant.centerIsSafe')}
          />
        </Row>
        <Row label={t('variant.chainCaptures')} hint={t('variant.chainCaptures.hint')}>
          <Toggle
            checked={settings.variant.chainCaptures}
            onChange={(chainCaptures) => updateVariant({ chainCaptures })}
            label={t('variant.chainCaptures')}
          />
        </Row>
        {settings.variant.chainCaptures && (
          <Row
            label={t('variant.chainMustContinue')}
            hint={t('variant.chainMustContinue.hint')}
          >
            <Toggle
              checked={settings.variant.chainMustContinue}
              onChange={(chainMustContinue) => updateVariant({ chainMustContinue })}
              label={t('variant.chainMustContinue')}
            />
          </Row>
        )}
        <Row label={t('variant.loneStoneLoses')} hint={t('variant.loneStoneLoses.hint')}>
          <Toggle
            checked={settings.variant.loneStoneLoses}
            onChange={(loneStoneLoses) => updateVariant({ loneStoneLoses })}
            label={t('variant.loneStoneLoses')}
          />
        </Row>
        <Row label={t('variant.blockade')} htmlFor="blockade">
          <select
            id="blockade"
            value={settings.variant.blockade}
            onChange={(e) => updateVariant({ blockade: e.target.value as BlockadeRule })}
          >
            {BLOCKADE_RULES.map((rule) => (
              <option key={rule} value={rule}>
                {t(`variant.blockade.${rule}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('variant.firstMover')} htmlFor="firstMover">
          <select
            id="firstMover"
            value={settings.variant.firstMover}
            onChange={(e) =>
              updateVariant({ firstMover: e.target.value as FirstMoverRule })
            }
          >
            {FIRST_MOVERS.map((rule) => (
              <option key={rule} value={rule}>
                {t(`variant.firstMover.${rule}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label={t('variant.noProgressLimit')}
          hint={t('variant.noProgressLimit.hint')}
          htmlFor="noProgress"
        >
          <input
            id="noProgress"
            type="number"
            min={0}
            max={400}
            step={10}
            value={settings.variant.noProgressLimit}
            onChange={(e) =>
              updateVariant({ noProgressLimit: Math.max(0, Number(e.target.value)) })
            }
          />
        </Row>
        <Row label={t('variant.repetitionDraw')}>
          <Toggle
            checked={settings.variant.repetitionDraw}
            onChange={(repetitionDraw) => updateVariant({ repetitionDraw })}
            label={t('variant.repetitionDraw')}
          />
        </Row>

        <div className="btn-row" style={{ marginTop: 'var(--space-3)' }}>
          <button type="button" className="btn is-primary" onClick={newGame}>
            {t('action.newGame')}
          </button>
        </div>
      </section>

      <section>
        <h3 className="panel-title">{t('settings.data')}</h3>
        <div className="btn-row">
          <button type="button" className="btn" onClick={handleExport}>
            {t('settings.export')}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            {t('settings.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(e) => {
              void handleImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {confirmClear ? (
            <>
              <button
                type="button"
                className="btn is-danger"
                onClick={() => {
                  clearData();
                  setConfirmClear(false);
                }}
              >
                {t('action.confirm')}
              </button>
              <button
                type="button"
                className="btn is-quiet"
                onClick={() => setConfirmClear(false)}
              >
                {t('action.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn is-danger"
              onClick={() => setConfirmClear(true)}
            >
              {t('settings.clear')}
            </button>
          )}
        </div>
        <p className="field-hint" style={{ marginTop: 'var(--space-2)' }}>
          {t('settings.clearHint')}
        </p>
      </section>
    </Dialog>
  );
}
