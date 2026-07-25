// FILE: src/components/ResultCard.tsx

import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n';
import { Dialog } from './Dialog';

export function ResultCard() {
  const { t, n } = useTranslation();
  const outcome = useGameStore((s) => s.game.outcome);
  const resultSeen = useGameStore((s) => s.resultSeen);
  const humanSide = useGameStore((s) => s.settings.humanSide);
  const ratingDelta = useGameStore((s) => s.lastRatingDelta);
  const dismissResult = useGameStore((s) => s.dismissResult);
  const newGame = useGameStore((s) => s.newGame);
  const setPanel = useGameStore((s) => s.setPanel);

  if (!outcome || resultSeen) return null;

  const isWin = outcome.kind === 'win' && outcome.winner === humanSide;
  const isDraw = outcome.kind === 'draw';
  const headline = isDraw
    ? t('outcome.draw')
    : isWin
      ? t('outcome.youWin')
      : t('outcome.youLose');
  const tone = isDraw ? 'is-draw' : isWin ? 'is-win' : 'is-loss';

  const reason =
    outcome.kind === 'win'
      ? t(`outcome.${outcome.reason}` as TranslationKey, {
          player: t(`player.${outcome.winner}` as TranslationKey),
        })
      : t(`outcome.${outcome.reason}` as TranslationKey);

  return (
    <Dialog open title={headline} onClose={dismissResult}>
      <div className="result-card">
        <p className={`result-headline ${tone}`}>{headline}</p>
        <p className="result-reason">{reason}</p>

        {ratingDelta !== null && (
          <p
            className={`rating-delta numeric ${ratingDelta >= 0 ? 'is-up' : 'is-down'}`}
          >
            {t('outcome.ratingChange', {
              delta: `${ratingDelta >= 0 ? '+' : '−'}${n(Math.abs(ratingDelta))}`,
            })}
          </p>
        )}

        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn is-primary"
            onClick={() => {
              dismissResult();
              newGame();
            }}
          >
            {t('outcome.playAgain')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              dismissResult();
              setPanel('leaderboard');
            }}
          >
            {t('outcome.viewLeaderboard')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
