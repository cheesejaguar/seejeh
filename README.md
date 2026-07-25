# Seejeh · السِّيجة

A faithful implementation of **Seejeh** (Seega, سيجة) on the 7×7 board — the traditional
game of siege and capture played across Egypt, Sudan and the Levant. Two phases, custodian
capture, four levels of opponent, English and Arabic.

```bash
npm install
npm run dev        # http://localhost:5000
npm test           # 123 tests
npm run build
```

## The rules, and how they were settled

The rules were reconstructed from primary and living sources rather than assumed: Lane (1836),
Bolton (1890), Falkener (1892), Murray (1952), Bell (1979), the Ludii/Digital Ludeme Project
ruleset, and Egyptian, Palestinian, Jordanian, Tunisian and Algerian accounts of play. The full
reconstruction is in [`doc/RULES_SPEC.md`](doc/RULES_SPEC.md).

Where sources genuinely disagree, the disputed rule is a **setting**, not an assumption. Three
points are worth stating plainly, because earlier versions of this app had them wrong:

**Capture takes exactly one stone per direction.** Move a stone so that a single enemy stone is
trapped between it and another of yours, and that one stone is taken. Sweeping a whole contiguous
line is the rule of Hasami Shogi, not Seega — Ludii encodes the cap explicitly as
`("CustodialCapture" Orthogonal (max 1))`, and Lane, Bolton, Falkener and every Arabic informant
describe a single stone. Because a move can close a sandwich in more than one direction at once,
a single move takes at most three.

**There is no "reduce your opponent to seven stones" rule.** It appears in no source in any
language. The only attested numeric threshold is *one*, and it has a reason: capture requires two
of your own stones, so a player down to one can never capture again. Winning is elimination, or
reducing the opponent to a single stone.

**A blockaded player is never penalised.** If you cannot move, your opponent must move so that you
can — and their move is restricted to ones that actually open a path, since they are the ones who
profit from the blockade. Rules that take stones from the *blocked* player are attested nowhere.

### How to play

1. Take turns placing two stones at a time until all 48 are down. The centre stays empty.
2. Because 48 stones sit on 49 cells, the centre is the only gap — so the first move is forced
   into it. This is a consequence of the board, not a special rule.
3. Move one stone one square, orthogonally.
4. Trap a single enemy stone between two of yours to take it. Only the stone you *move* can trap:
   walking into a gap between two enemies is safe.
5. If your move takes a stone, that same stone may move again and take again.
6. Win by taking every enemy stone, or leaving your opponent with one.

The centre square — **عين الدَّك**, "the eye" — shelters the stone standing on it from capture,
though that stone can still help you capture. This is the Bell-derived tradition and is on by
default; it is absent from Lane, Bolton and Ludii, so it can be turned off.

## Architecture

```
src/
  engine/       Pure rules. No React, no I/O, no randomness.
  ai/           Negamax + alpha-beta search, in a Web Worker.
  leaderboard/  Local profiles, Elo ratings, records, history.
  store/        Zustand orchestration. Contains no rules.
  components/   UI.
  i18n/         Type-safe bilingual catalogues.
  styles/       Design tokens and the CSS-3D board.
```

**One source of truth for the rules.** Every state transition goes through
`applyAction(state, action)`, which is total — it never throws for a game reason, returning a
machine-readable rejection code the UI translates. Nothing outside `src/engine` implements a rule.
The previous version let the store reimplement placement, and the two drifted.

**Translations cannot silently rot.** `ar.ts` is typed as `Record<TranslationKey, string>` derived
from the English catalogue, so a missing or misspelled Arabic key is a compile error rather than a
string that renders as its own key.

**The AI runs off the main thread.** Iterative-deepening negamax with alpha-beta, a transposition
table, move ordering and a capture-only quiescence search. Seejeh is not strictly alternating — a
player keeps the move during a capture chain and during a blockade extra turn — so the search
negates only when the side to move actually changes.

**Animation stays on the compositor.** Piece movement is FLIP-animated: measure, invert with a
transform, release. Stones are layered CSS with specular highlights and cast shadows on a board
tilted in perspective. Everything respects `prefers-reduced-motion`.

## Testing

123 tests. Besides unit tests per rule, the engine is checked by **property-based tests** that
play hundreds of complete randomised games across eight variant configurations and assert design
invariants after every single ply: stones are conserved, counts never go negative, a live game
always offers the side to move a legal action, the turn only repeats for a legitimate reason, and
a finished game and the `gameOver` phase always agree.

One test asserts that the first movement-phase move is always into the centre. It is not testing a
rule — it is testing that the placement phase is correct, since any other result would mean the
board did not fill properly.

`src/tests/*/regressions.spec.ts` pin the defects found by an adversarial review of this rewrite:
that root search scores are real values rather than the alpha ceiling (a collapsed root made the
"Steady" opponent pick uniformly at random), that a draw offer lapses when play continues, that the
rating chain stays continuous across an import, and that stacked dialogs restore page scrolling.
Each was confirmed to fail before its fix.

## Rule settings

| Setting | Default | Notes |
|---|---|---|
| The eye shelters | on | Bell tradition; absent from Lane, Bolton, Ludii |
| Chain captures | on | Same stone, and every step must itself capture |
| Chains compulsory | off | Bolton says "has the right"; Lane reads as compulsory |
| One stone loses | on | A lone stone can never capture |
| Blockade | opponent opens a path | Alternatives: sacrifice a stone (Lane); blocked player loses |
| Who moves first | whoever laid out first | Arabic sources are unanimous; Bell reverses it |
| Quiet-move limit | 50 | Not traditional — the standard digital convention |
| Threefold repetition | draw | Not traditional |

## Documentation

- [`doc/RULES_SPEC.md`](doc/RULES_SPEC.md) — the reconstructed rules, source by source, with every
  disputed point named and resolved.
- [`doc/DEFECT_ANALYSIS.md`](doc/DEFECT_ANALYSIS.md) — the audit of the previous implementation
  that motivated this rewrite.
