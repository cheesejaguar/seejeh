// FILE: src/components/LeaderboardPanel.tsx

import { useMemo, useState } from 'react';
import type { Difficulty } from '../ai/search';
import { ratingTitle } from '../leaderboard/rating';
import { ratedGames } from '../leaderboard/store';
import {
  activeProfileOf,
  rowsFor,
  statsFor,
  useGameStore,
} from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n';
import { Dialog } from './Dialog';

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard'];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}

export function LeaderboardPanel() {
  const { t, tCount, n, percent, duration, relative } = useTranslation();
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  // Subscribe to the stable data object, then derive. Deriving inside the
  // selector would return a new object each call and loop forever.
  const leaderboard = useGameStore((s) => s.leaderboard);
  const setProfileName = useGameStore((s) => s.setProfileName);

  const rows = useMemo(() => rowsFor(leaderboard), [leaderboard]);
  const stats = useMemo(() => statsFor(leaderboard), [leaderboard]);
  const profile = useMemo(() => activeProfileOf(leaderboard), [leaderboard]);
  const history = useMemo(
    () => (profile ? ratedGames(leaderboard, profile.id).slice(-10).reverse() : []),
    [leaderboard, profile],
  );

  const [name, setName] = useState('');
  const displayName = profile?.name || t('profile.guest');

  return (
    <Dialog
      open={panel === 'leaderboard'}
      title={t('board.title')}
      onClose={() => setPanel('none')}
    >
      <section>
        <h3 className="panel-title">{t('stats.title')}</h3>
        <div className="stat-grid">
          <Stat
            label={t('stats.rating')}
            value={n(stats.rating)}
            sub={t(`title.${ratingTitle(stats.rating)}` as TranslationKey)}
          />
          <Stat label={t('stats.games')} value={n(stats.games)} />
          <Stat label={t('stats.winRate')} value={percent(stats.winRate)} />
          <Stat label={t('stats.streak')} value={n(stats.currentStreak)} />
          <Stat label={t('stats.bestStreak')} value={n(stats.bestStreak)} />
          <Stat
            label={t('stats.avgLength')}
            value={stats.games ? duration(stats.averageDurationMs) : t('stats.none')}
          />
          <Stat
            label={t('stats.avgMoves')}
            value={stats.games ? n(stats.averageMoves) : t('stats.none')}
          />
          <Stat label={t('stats.captured')} value={n(stats.totalCaptures)} />
          <Stat label={t('stats.lost')} value={n(stats.totalLosses)} />
        </div>
      </section>

      <section>
        <h3 className="panel-title">{t('board.subtitle')}</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('board.rank')}</th>
                <th scope="col">{t('board.player')}</th>
                <th scope="col">{t('board.rating')}</th>
                <th scope="col">{t('board.games')}</th>
                <th scope="col">{t('board.record')}</th>
                <th scope="col">{t('board.winRate')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.isCurrentUser ? 'is-you' : row.kind === 'ai' ? 'is-ai' : ''}
                >
                  <td>
                    <span className={`rank-badge${row.rank === 1 ? ' is-top' : ''}`}>
                      {n(row.rank)}
                    </span>
                  </td>
                  <td>
                    {row.kind === 'ai'
                      ? t(`settings.difficulty.${row.name}` as TranslationKey)
                      : row.name || t('profile.guest')}{' '}
                    {row.isCurrentUser && <span className="tag is-you">{t('board.you')}</span>}
                    {row.kind === 'ai' && <span className="tag">{t('board.aiRung')}</span>}
                  </td>
                  <td className="numeric">{n(row.rating)}</td>
                  <td className="numeric">{row.kind === 'ai' ? '—' : n(row.games)}</td>
                  <td className="numeric">
                    {row.kind === 'ai'
                      ? '—'
                      : `${n(row.wins)} / ${n(row.draws)} / ${n(row.losses)}`}
                  </td>
                  <td className="numeric">
                    {row.kind === 'ai' || row.games === 0 ? '—' : percent(row.winRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="panel-title">{t('stats.records')}</h3>
        <div className="stat-grid">
          <Stat
            label={t('stats.fastestWin')}
            value={
              stats.records.fastestWinMs === null
                ? t('stats.none')
                : duration(stats.records.fastestWinMs)
            }
          />
          <Stat
            label={t('stats.fewestMoves')}
            value={
              stats.records.fewestMovesWin === null
                ? t('stats.none')
                : n(stats.records.fewestMovesWin)
            }
          />
          <Stat label={t('stats.largestCapture')} value={n(stats.records.largestCapture)} />
          <Stat label={t('stats.mostRemaining')} value={n(stats.records.mostStonesRemaining)} />
          <Stat label={t('stats.highestRating')} value={n(stats.records.highestRating)} />
        </div>
      </section>

      <section>
        <h3 className="panel-title">{t('stats.byDifficulty')}</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('settings.difficulty')}</th>
                <th scope="col">{t('board.games')}</th>
                <th scope="col">{t('board.record')}</th>
                <th scope="col">{t('board.winRate')}</th>
              </tr>
            </thead>
            <tbody>
              {DIFFICULTIES.map((level) => {
                const row = stats.byDifficulty[level];
                return (
                  <tr key={level}>
                    <td>{t(`settings.difficulty.${level}` as TranslationKey)}</td>
                    <td className="numeric">{n(row.games)}</td>
                    <td className="numeric">
                      {`${n(row.wins)} / ${n(row.draws)} / ${n(row.losses)}`}
                    </td>
                    <td className="numeric">
                      {row.games === 0 ? '—' : percent(row.winRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="panel-title">{t('history.title')}</h3>
        {history.length === 0 ? (
          <p className="prose">{t('history.empty')}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {history.map((game) => (
                  <tr key={game.id}>
                    <td>
                      {game.result === 'win'
                        ? t('history.won')
                        : game.result === 'loss'
                          ? t('history.lost')
                          : t('history.drew')}
                    </td>
                    <td>{t(`settings.difficulty.${game.difficulty}` as TranslationKey)}</td>
                    <td className="numeric">{tCount('history.moves', game.moves)}</td>
                    <td className="numeric">
                      {game.ratingAfter - game.ratingBefore >= 0 ? '+' : '−'}
                      {n(Math.abs(game.ratingAfter - game.ratingBefore))}
                    </td>
                    <td>{relative(game.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="panel-title">{t('profile.title')}</h3>
        <div className="control-row">
          <div className="field">
            <label className="field-label" htmlFor="profile-name">
              {t('profile.name')}
            </label>
            <span className="field-hint">{displayName}</span>
          </div>
          <div className="btn-row">
            <input
              id="profile-name"
              type="text"
              value={name}
              placeholder={t('profile.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={name.trim().length === 0}
              onClick={() => {
                setProfileName(name.trim());
                setName('');
              }}
            >
              {t('profile.save')}
            </button>
          </div>
        </div>
      </section>
    </Dialog>
  );
}
