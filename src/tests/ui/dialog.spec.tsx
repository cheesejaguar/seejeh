// FILE: src/tests/ui/dialog.spec.tsx
//
// Regression test for the stacked-dialog scroll lock.

import { useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog } from '../../components/Dialog';

afterEach(cleanup);

/**
 * Mirrors App.tsx's tree: several always-mounted panels whose Dialog merely
 * toggles `open`, plus a result card that early-returns null — so its Dialog
 * subtree is deleted from INSIDE a surviving component.
 *
 * That nesting depth matters. React processes a fiber's deletions before
 * recursing into its surviving children, so a Dialog deleted as a direct child
 * of the root unmounts in a different order than one deleted from inside a
 * surviving parent. The original naive save/restore only failed in the latter
 * shape — which is the shape the real app has.
 */
function Harness() {
  const [panel, setPanel] = useState<'none' | 'settings' | 'leaderboard'>('settings');
  const [resultSeen, setResultSeen] = useState(false);

  return (
    <div>
      <Dialog open={panel === 'settings'} title="Settings" onClose={() => setPanel('none')}>
        <button type="button">settings body</button>
      </Dialog>
      <Dialog
        open={panel === 'leaderboard'}
        title="Standings"
        onClose={() => setPanel('none')}
      >
        <button type="button">standings body</button>
      </Dialog>
      <ResultLike
        seen={resultSeen}
        onViewStandings={() => {
          // One React batch, exactly as ResultCard's "See standings" does.
          setResultSeen(true);
          setPanel('leaderboard');
        }}
      />
    </div>
  );
}

function ResultLike({
  seen,
  onViewStandings,
}: {
  seen: boolean;
  onViewStandings: () => void;
}) {
  // Early return, exactly like ResultCard.
  if (seen) return null;
  return (
    <Dialog open title="You lose" onClose={onViewStandings}>
      <button type="button" data-testid="view-standings" onClick={onViewStandings}>
        See standings
      </button>
    </Dialog>
  );
}

describe('stacked dialogs restore page scrolling', () => {
  it('does not strand overflow:hidden when dialogs close out of LIFO order', () => {
    document.body.style.overflow = '';
    const view = render(<Harness />);

    // Settings + the result card are both open: the page is locked.
    expect(document.body.style.overflow).toBe('hidden');

    // The batch that broke it: the result card closes AND settings closes
    // while the leaderboard opens, all in one commit.
    act(() => {
      view.getByTestId('view-standings').click();
    });
    expect(document.body.style.overflow).toBe('hidden'); // leaderboard still open

    // Close the last dialog — scrolling must come back.
    act(() => {
      const close = document.querySelector<HTMLButtonElement>('[role="dialog"] .btn.is-quiet');
      close?.click();
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores correctly for a plain LIFO open/close too', () => {
    document.body.style.overflow = '';
    function Single() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Settings" onClose={() => setOpen(false)}>
          <button type="button">body</button>
        </Dialog>
      );
    }
    const view = render(<Single />);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      view.container.ownerDocument
        .querySelector<HTMLButtonElement>('[role="dialog"] .btn.is-quiet')
        ?.click();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves a pre-existing overflow value rather than clobbering it', () => {
    document.body.style.overflow = 'scroll';
    function Single() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Settings" onClose={() => setOpen(false)}>
          <button type="button">body</button>
        </Dialog>
      );
    }
    const view = render(<Single />);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      view.container.ownerDocument
        .querySelector<HTMLButtonElement>('[role="dialog"] .btn.is-quiet')
        ?.click();
    });
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
  });
});
