// FILE: src/components/Sidebar.tsx
//
// Turn state, stone tallies and the actions available right now. Buttons only
// appear when they are legal, so the panel never offers a dead control.

import { useState } from 'react';
import { STONES_PER_PLAYER, opponentOf, stoneCount, type Player } from '../engine';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n';

function Pebbles({ player, remaining }: { player: Player; remaining: number }) {
  return (
    <div className="pebbles" aria-hidden="true">
      {Array.from({ length: STONES_PER_PLAYER }, (_, i) => (
        <span
          key={i}
          className={[
            'pebble',
            player === 'Light' ? 'is-light' : 'is-dark',
            i >= remaining && 'is-gone',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}

function Tally({ player }: { player: Player }) {
  const { t, n } = useTranslation();
  const onBoard = useGameStore((s) => stoneCount(s.game.board, player));
  const inHand = useGameStore((s) => s.game.inHand[player]);
  const humanSide = useGameStore((s) => s.settings.humanSide);
  const total = onBoard + inHand;

  return (
    <div className="tally-row">
      <span className={`turn-chip is-${player === 'Light' ? 'light' : 'dark'}`} />
      <div>
        <div className="tally-label">
          {t(`player.${player}.long` as TranslationKey)}
          {player === humanSide ? ` · ${t('player.you')}` : ''}
        </div>
        <Pebbles player={player} remaining={total} />
      </div>
      <span className="tally-count numeric">{n(total)}</span>
    </div>
  );
}

/** The one line telling the player what to do next. */
function StatusLine() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const humanSide = useGameStore((s) => s.settings.humanSide);
  const aiThinking = useGameStore((s) => s.aiThinking);

  if (game.outcome) return <p className="status-line" />;
  if (aiThinking) return <p className="status-line">{t('turn.thinking')}</p>;

  const isMine = game.turn === humanSide;
  let key: TranslationKey;
  let urgent = false;

  if (game.phase === 'blockadeRemoval') {
    key = isMine ? 'status.blockadeRemove' : 'status.blocked';
    urgent = true;
  } else if (game.blockedPlayer && game.blockedPlayer !== game.turn) {
    key = isMine ? 'status.blockadeOpen' : 'turn.opponent';
    urgent = isMine;
  } else if (game.blockedPlayer === humanSide) {
    key = 'status.blocked';
    urgent = true;
  } else if (game.phase === 'chain') {
    key = 'status.chain';
  } else if (game.phase === 'placement') {
    key = game.placementsLeftThisTurn === 1 ? 'status.placementOne' : 'status.placement';
  } else if (game.ply > 0 && game.history.every((h) => h.kind === 'place')) {
    key = 'status.openingForced';
  } else {
    key = 'status.movement';
  }

  return <p className={`status-line${urgent ? ' is-urgent' : ''}`}>{t(key)}</p>;
}

export function Sidebar() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const humanSide = useGameStore((s) => s.settings.humanSide);
  const aiThinking = useGameStore((s) => s.aiThinking);
  const newGame = useGameStore((s) => s.newGame);
  const endChain = useGameStore((s) => s.endChain);
  const resign = useGameStore((s) => s.resign);
  const offerDraw = useGameStore((s) => s.offerDraw);
  const respondToDraw = useGameStore((s) => s.respondToDraw);
  const [confirmingResign, setConfirmingResign] = useState(false);

  const isMyTurn = !game.outcome && game.turn === humanSide && !aiThinking;
  const canEndChain = isMyTurn && game.phase === 'chain' && !game.variant.chainMustContinue;
  const drawOfferedToMe = game.drawOffer !== null && game.drawOffer !== humanSide;

  return (
    <aside className="sidebar">
      <div className={`turn-banner${isMyTurn ? ' is-yours' : ''}`}>
        <span
          className={`turn-chip is-${game.turn === 'Light' ? 'light' : 'dark'}`}
          aria-hidden="true"
        />
        <div>
          <div className="who">
            {game.outcome
              ? game.outcome.kind === 'draw'
                ? t('outcome.draw')
                : game.outcome.winner === humanSide
                  ? t('outcome.youWin')
                  : t('outcome.youLose')
              : isMyTurn
                ? t('turn.yours')
                : t('turn.opponent')}
          </div>
          <div className="phase">
            {game.outcome
              ? t(`outcome.${game.outcome.kind === 'win' ? game.outcome.reason : game.outcome.reason}` as TranslationKey, {
                  player: t(
                    `player.${game.outcome.kind === 'win' ? game.outcome.winner : humanSide}` as TranslationKey,
                  ),
                })
              : t(`phase.${game.phase}` as TranslationKey)}
          </div>
        </div>
      </div>

      <div className="panel">
        <StatusLine />
        <div className="btn-row">
          {canEndChain && (
            <button type="button" className="btn is-primary" onClick={endChain}>
              {t('action.endChain')}
            </button>
          )}
          {drawOfferedToMe && (
            <>
              <button
                type="button"
                className="btn is-primary"
                onClick={() => respondToDraw(true)}
              >
                {t('action.acceptDraw')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => respondToDraw(false)}
              >
                {t('action.declineDraw')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">{t('count.stones')}</h2>
        <div className="tally">
          <Tally player={humanSide} />
          <Tally player={opponentOf(humanSide)} />
        </div>
      </div>

      <div className="panel">
        <div className="btn-row">
          <button type="button" className="btn is-primary" onClick={newGame}>
            {t('action.newGame')}
          </button>
          {!game.outcome && game.ply > 0 && !confirmingResign && (
            <>
              <button
                type="button"
                className="btn"
                onClick={offerDraw}
                disabled={!isMyTurn || game.drawOffer === humanSide}
              >
                {t('action.offerDraw')}
              </button>
              <button
                type="button"
                className="btn is-danger"
                onClick={() => setConfirmingResign(true)}
              >
                {t('action.resign')}
              </button>
            </>
          )}
        </div>

        {/* Resigning is irreversible and recorded, so it asks first. */}
        {confirmingResign && !game.outcome && (
          <div className="field" style={{ marginTop: 'var(--space-2)' }}>
            <p className="field-label">{t('action.confirmResign')}</p>
            <p className="field-hint">{t('action.confirmResignBody')}</p>
            <div className="btn-row" style={{ marginTop: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn is-danger"
                onClick={() => {
                  setConfirmingResign(false);
                  resign();
                }}
              >
                {t('action.confirm')}
              </button>
              <button
                type="button"
                className="btn is-quiet"
                onClick={() => setConfirmingResign(false)}
              >
                {t('action.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
