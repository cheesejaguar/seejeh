# Seejeh 7×7 — Consolidated Defect Register for the From-Scratch Rewrite

**Sources:** 4 independent audits, 96 raw findings → **71 distinct defects** after dedup, grouped into 7 subsystems.
**Scope of the rewrite:** `src/lib/rules.ts` (629 L), `src/lib/ai.ts` (817 L), `src/state/gameStore.ts` (965 L), `src/lib/serialize.ts`, `src/i18n/*.json`, `src/components/*`, `src/index.css` / `src/main.css` / `src/styles/theme.css`.
**Note:** a second, apparently unused engine exists at `/Users/aaron/Documents/seejeh/src/engine/{board,rules,types}.ts` — the rewrite must land on exactly one engine directory and delete the other.

---

## 0. Executive summary

The current app is **not playable past the placement phase** and **cannot produce a correct game outcome** even when it is.

Three defects alone are terminal:

1. **`gameStore.ts:628` TDZ ReferenceError** — every AI movement-phase turn throws before it starts. The build script is `tsc -b --noCheck && vite build`, so TypeScript already reports TS2448 at lines 599/613/620 and the build ships anyway.
2. **`rules.ts:447` `checkWin`** returns `winner: 'Dark'` for the *empty starting board*, because it counts board stones against a ≤7 threshold without consulting `phase`. This makes the entire placement phase a "terminal node" for the AI (it plays row-major `(0,0),(0,1),(0,2)…`) and makes `offerStalemate` during placement instantly end the game.
3. **`ai.ts:195` minimax** alternates min/max by ply parity instead of by `state.current`, so in a game where the mover *keeps the move* after a capture (chain) and places two stones per turn, the engine scores its own follow-ups as the opponent's. A free 2-stone capture ranks **#10 of 13** legal moves.

Under these, `hard`-vs-`hard` self-play is a bit-identical 24–24 draw every time, and a human can end any game instantly by clicking "offer stalemate" — all four difficulty tiers accept while losing.

The recurring **structural** causes, which the rewrite must eliminate by construction rather than by patch, are:

| # | Root cause | Defects it produced |
|---|---|---|
| C1 | **Rules logic reimplemented in 3 places** (`rules.ts`, `gameStore.placeStone`, `ai.applyMoveToState`) | R7, R8, R9, gs-placestone-duplicate-logic, ai-12, rules-chain-no-capture-required |
| C2 | **Legality split across `movesFor` (permissive) and `applyMove` (throws)** | R12, R14, ai-13, chain-phase-any-empty-cell, silent-invalid-clicks |
| C3 | **Player-relative queries read `state.current` instead of taking a player parameter** | R1, R2, R21, ai-01 |
| C4 | **Terminal detection is a chain of overriding functions, not a single classifier** | R3, R4, R5, R6, R17, R18, R23 |
| C5 | **The turn machine is timer-driven with silent `return`s and no "who owes a move" invariant** | 5 distinct permanent-freeze bugs in the store |
| C6 | **`winner: null` means "draw" but is falsy**, so every `if (winner)` guard misses draws | ai-14, draw-no-game-over-ui, gs-play-after-win |
| C7 | **Presentation strings built in the domain layer** (`rules.ts` throws English, `ai.ts` returns English prose) | the entire i18n gap list |
| C8 | **No schema/version on persisted data** | S1, S2, ser-*, and the boot white-screen |

---

## 1. Severity-ranked master list

Severity key: **CRITICAL** = wrong game outcome, crash, or unrecoverable freeze · **HIGH** = wrong rule enforced or stuck/unrecorded game · **MEDIUM** = UX/quality/perf · **LOW** = polish.

### CRITICAL (13)

| ID | Subsystem | Defect | Merged from |
|---|---|---|---|
| **X-01** | State machine | TDZ `ReferenceError` in `makeAIMove`: inner `const { settings } = get()` at `gameStore.ts:628` shadows the outer binding read at 599/613/620. AI never moves in the movement phase. `--noCheck` hides TS2448. | gs-tdz-settings, gamestore-settings-tdz |
| **X-02** | Rules | `checkWin` reports a stone-count win on an empty board (`phase` ignored). `checkWin(initialState7x7()) === {winner:'Dark'}`. | R4 |
| **X-03** | AI | Minimax flips `maximizingPlayer` per ply instead of deriving it from `state.current`; `const currentPlayer = state.current` at `ai.ts:208` is computed and never used. Captures (which retain the move) are scored as opponent replies. | ai-01 |
| **X-04** | AI | Because of X-02, `evaluatePosition` returns ±10000 for every placement node and minimax terminates at the root; strict `>` at `ai.ts:383` keeps `moves[0]`, so all tiers place in row-major scan order for 24 stones. | ai-02, ai-16 |
| **X-05** | AI | Capture bonus is computed by `resolveCaptures(newState, move.to)` — the *post*-capture state — so it is always `[]`. `weights.captures` (the largest weight in every tier) is dead in `getBestAIMove`, `getOptimalMove`, `getTopMoves`, `analyzeAIMove`. | ai-03 |
| **X-06** | AI | The (always-zero) capture bonus is added to `bestScore` (the running maximum) rather than the candidate's score, so a capturing move *raises the bar* for every later candidate. `getTopMoves` does it correctly → three entry points score differently. | ai-04 |
| **X-07** | AI | `shouldAIAcceptStalemate` is polarity-inverted in all four tiers: it accepts when 3+ stones **behind**, which under `rules.ts:472-482` is an immediate loss. Verified: AI 9 vs human 14 → `true` for beginner/easy/medium/hard. | ai-05 |
| **X-08** | State machine | AI stalemate offer/accept/reject are silent no-ops: `makeAIMove` calls `get().offerStalemate()` / `rejectStalemate()`, both of which early-return `if (isAITurn(...))`. The branch then does `set({aiThinking:false}); return;` with no move and no rescheduled timer → permanent freeze. | gs-ai-stalemate-noop, ai-06 |
| **X-09** | State machine | AI blockade deadlock: `checkForAITurn` returns early on `blockadeRemovalMode`, but nothing can ever clear it for an AI, and `selectCell` returns at 217 on `isAITurn` so the human can't either. Board frozen until New Game. | gs-blockade-ai-deadlock |
| **X-10** | State machine | `getBestAIMove` returning `null` → `set({aiThinking:false}); return;` at 622 (also 537, 561). There is no AI equivalent of `endTurn`/pass and no retry timer. Frozen. | gs-ai-no-legal-move |
| **X-11** | Rules | `hasAnyLegalMove(state, player)` delegates to `movesFor`, which hard-codes `state.current`, so it is **unconditionally false for the player not to move**. | R1 |
| **X-12** | Rules | Consequently `detectStalemate` ends the game the instant the side to move is blocked, awarding a "stalemate/insufficient" win to the opponent even when that opponent has 7 legal moves. Makes the `blockadeOneRemoval` variant (default **on**) unreachable. | R2 |
| **X-13** | Rules | `checkWin` tests `lightCount <= 7` first and returns; with Light=3 and Dark=1, **Dark wins**. | R3 |

### HIGH (21)

| ID | Subsystem | Defect | Merged from |
|---|---|---|---|
| **H-01** | Rules | `detectStalemate`'s verdict overwrites the winner `checkWin` just set, one line earlier, and can invert it (verified: Dark stone-count win → Light "insufficient" win). | R5, R17 |
| **H-02** | Rules | `applyPlacement(s, cell, cell)` — same cell twice — consumes 2 stones, places 1. Exercised by `src/tests/gameSimulation.spec.ts:47`. | R7 |
| **H-03** | Rules | `applyMove` permits moving **any** piece during `phase === 'chain'`, leaving `phase:'chain'` + flipped `current` + the *opponent's* `chainOrigin`. | R14 |
| **H-04** | Rules | A chain step may be non-capturing → the player gets a capture **plus** a free ordinary move. The AI path (`gameStore.ts:577-592`) enforces the opposite, so human and AI play different rules. | R12, rules-chain-no-capture-required |
| **H-05** | Rules | Custodian scan treats an enemy stone on the protected centre as **transparent**: it is skipped when collecting but does not stop the scan, so stones beyond it are swept up. Duplicated verbatim in `previewCaptures`. | R10, R11, ai-23 |
| **H-06** | AI | `getLastAIMoveAnalysis` always throws — it replays the last move against the state that already contains it (`board[from]` is null, `current` has flipped) → `Error: No piece to move or not your piece` into the ErrorBoundary. | ai-07 |
| **H-07** | AI | Chain-phase move generation emits non-capturing continuations and returns `null` for "chain over", so a real multi-capture chain is silently abandoned whenever the (broken) eval prefers a quiet step. | ai-08 |
| **H-08** | AI | The whole search is synchronous on the main thread: measured **928 ms worst ply**, ~6 s CPU for the 48 placement plies, ~18 s per self-play game; `JSON.parse(JSON.stringify(state))` per node deep-clones the growing `moveHistory`. `getHint` runs the *hard* config from a click handler regardless of difficulty. | ai-09, ai-sync-minimax-freeze |
| **H-09** | AI | `evaluateSafety` rewards friendly orthogonal neighbours — i.e. it rewards exactly the long line that the custodian rule captures wholesale. A 4-stone line scores **+18** on hard and dies to one enemy move. | ai-10 |
| **H-10** | AI | No en-prise term and no quiescence search: the eval cannot see "my stone has an enemy on one side and an enemy-reachable empty square on the other", so the AI hangs material one ply past the horizon. | ai-11 |
| **H-11** | State machine | `placeStone` reimplements `applyPlacement` (which is imported and unused) and drops three of its rules: no bounds check, no `stonesToPlace <= 0` turn-end, no `placementCount >= 2` guard → odd counts strand the turn and drive `stonesToPlace` to −1. | gs-placestone-duplicate-logic |
| **H-12** | State machine | The `placementCount === 0` branch of `placeStone` never schedules `checkForAITurn`, and `placeStone` swallows its own errors, so a failed AI first placement strands the turn forever. | gs-placestone-no-ai-reschedule |
| **H-13** | State machine | `endGameSession` double-records: check-then-`await import()`-then-clear race between `moveStone`'s +300 ms timer and `endChainCapture` / New Game. | gs-endgamesession-double-record |
| **H-14** | State machine | `newGame` calls `endGameSession()` un-awaited, then `startGameSession()`; the in-flight call resumes and nulls the *new* session → **every game after the first New Game click is unrecorded**. | gs-newgame-session-clobber |
| **H-15** | State machine | `startGameSession` is only called from `newGame`, so the first game after page load (and every restored save) is never recorded at all. | gs-no-session-on-load |
| **H-16** | State machine | `chainStep` has no `if (newState.winner)` branch — games won by a chain capture play no sound, never call `endGameSession`, and never recompute `blockadeRemovalMode`. | gs-chainstep-no-winner |
| **H-17** | Persistence | `loadGameState` JSON.parses with no schema, no version tag and no migration; a payload missing `board`/`stalemateOffers`/`variant`/`capturedLastMove` throws out of `App.tsx`'s mount effect → white screen recoverable only by manually clearing localStorage. | S1, ser-no-schema-validation |
| **H-18** | Persistence | `loadSettings` returns the raw parsed object (only `capturePreviewsEnabled` is backfilled) and the store does `loadSettings() \|\| defaultSettings`, so a stored blob with **any** missing key wins over defaults entirely → `settings.players` undefined → TypeError on first board click. | S2, ser-settings-no-merge |
| **H-19** | UI/perf | Every component calls `useGameStore()` with **no selector** (App, Board, Cell-via-parent, Controls, HintsPanel, HintOverlay, Toast, SettingsModal, MoveAnalysisPanel, LanguageSwitcher **and `useTranslation` itself**), so any `set()` re-renders the whole app. Cell is not memoized. | gs-no-selectors, unselective-store-subscriptions |
| **H-20** | i18n | Duplicate top-level `"about"` key in **both** `en.json` and `ar.json` (line 6 string, line 103 object). Last wins → `t('about')` renders the literal lowercase `"about"` in the header button and the dialog title. | i18n-duplicate-about-key |
| **H-21** | UI | `LeaderboardModal` imports `Refresh` and `TrendingUp`, which do not exist in `@phosphor-icons/react` v2.1.7 (real names: `ArrowsClockwise`, `TrendUp`). Only the spark `icon-proxy` Vite plugin rescues it, rewriting both to `Question`; outside that plugin React throws "Element type is invalid". | leaderboard-nonexistent-icons |
| **H-22** | UI | Draws render **no** game-over UI: the announcement is gated on `{gameState.winner && …}` but a draw is `winner === null`, so the `🤝` / `t('draw')` / `winReason.stalemate.*` branches inside are unreachable dead code. | draw-no-game-over-ui |
| **H-23** | a11y | 49 unconditional `tabIndex={0}` cells, no roving tabindex, no arrow-key grid navigation (only Enter/Space handled). | board-49-tab-stops |
| **H-24** | i18n | 11 hardcoded English toast strings in `gameStore` while the matching keys sit unused, plus 15 internal `Error` messages from `rules.ts` surfaced verbatim as toasts. | hardcoded-toast-strings, raw-error-messages-as-toasts |

### MEDIUM (23)

| ID | Subsystem | Defect | Merged from |
|---|---|---|---|
| **M-01** | Rules | `applyPlacement` allows 3 stones in a turn when `placementCount === 1` (guard is `>= 2`, not `count + n > 2`). | R8 |
| **M-02** | Rules | No `stonesToPlace[current] > 0` guard; counter goes negative and extra stones hit the board. | R9 |
| **M-03** | Rules | `chainOrigin` is never cleared when a chain step ends the turn → store selects an empty square belonging to the wrong player. | R13 |
| **M-04** | Rules | Anti-shuttle is unreachable: `pieceId` is derived from the FROM square (changes every move, shared between pieces) and history is not filtered by player. Verified: 24 consecutive shuttle moves never throw. | R15 |
| **M-05** | Rules | `moveRepetition` can never increment — the new hash is compared only against the immediately preceding position, and a legal move always changes the board *and* `current`. Makes the `>= 6` draw and `ai-20`'s `>= 4` branch dead. | R16, ai-20 |
| **M-06** | Rules | `invokeBlockadeIfAny` signals "needs resolution" by returning `{...state, winner: undefined}` — it **erases an already-decided winner**. | R18 |
| **M-07** | Rules | Blockade removal takes the blockaded player's **own** stone, doesn't advance the turn, doesn't re-check `hasAnyLegalMove`, doesn't re-run `checkWin` on the reduced material, doesn't clear `capturedLastMove`. | R19 |
| **M-08** | Rules | `firstMoveMustEnterCenter` is gated on `moveHistory.length === 0` (global), so only the first player is ever constrained; it also silently applies to chain steps. | R20 |
| **M-09** | AI | `applyMoveToState` hand-rolls placement instead of calling the imported-but-unused `applyPlacement`, missing the `stonesToPlace <= 0` turn-end. Latent only because 24 is even. | ai-12 |
| **M-10** | AI | The search calls `applyMove` unguarded, so a candidate that trips `firstMoveMustEnterCenter` or `antiShuttle` **throws out of minimax**, the store toasts "AI move failed", and the turn is lost. | ai-13 |
| **M-11** | AI | `getBestAIMove` ignores `state.winner`, and `winner: null` (draw) is falsy so `gameStore.ts:522` and `:650` miss it too — the AI keeps "playing" a finished game. | ai-14, gs-play-after-win |
| **M-12** | AI | Unseeded `Math.random` for beginner (60 %) / easy (30 %) makes both tiers untestable and lets them abandon capture chains at random. | ai-15 |
| **M-13** | AI | Terminal scores are flat ±10000 with no ply adjustment → cannot prefer a fast win or a slow loss; the root's strict `>` keeps whichever equal-valued line came first. | ai-17 |
| **M-14** | AI | No move ordering, no transposition table, no iterative deepening, no time budget; `JSON` round-trip cloning. Alpha-beta prunes near worst case (`b^d`). | ai-18 |
| **M-15** | State machine | `rejectStalemate` clears the **rejecting player's own** offer, leaving the opponent's live → the next offer instantly ends the game the player thought they refused. | gs-reject-wrong-player |
| **M-16** | State machine | `removeBlockadeStone` always clears the mode and toasts success even when `invokeBlockadeIfAny` changed nothing (variant off) or the player is still blockaded. | gs-blockade-exit-unverified |
| **M-17** | State machine | `blockadeRemovalMode` is set from `!hasAnyLegalMove` alone, ignoring `settings.variant.blockadeOneRemoval`; Controls hides both the no-moves card and End Turn while it is true. | blockade-mode-ignores-variant |
| **M-18** | State machine | `endTurn` hand-builds `{...gameState, current: next}` with zero rules-layer validation: no winner guard, no history append, no hash/repetition update, no `checkWin`/`detectStalemate`. Mutual passes can loop forever. | gs-endturn-no-validation |
| **M-19** | State machine | `chainStep` never recomputes `blockadeRemovalMode`, so a blockade created by the final chain step is missed → same freeze as X-10 without ever entering blockade mode. | gs-chainstep-no-blockade |
| **M-20** | State machine | `loadSavedGame` sets `blockadeRemovalMode` without the `&& !winner` guard used at 363/433/481, and doesn't reset hint state or start a session. | gs-loadsaved-blockade-guard |
| **M-21** | State machine | `endGameSession` records any game abandoned after 30 s as a **completed draw** (`winner: gameState.winner \|\| null`), polluting `PlayerStats` and leaderboard ratings. | gs-abandoned-as-draw |
| **M-22** | State machine | `showToast`'s 3 s timer is untracked; an older timer clears a newer toast (Toast.tsx starts a *second* independent 3000 ms timer). | gs-toast-timer, toast-timer-race |
| **M-23** | State machine | Chain-phase `selectCell` forwards **any** empty-cell click to `chainStep` without checking `movesFor`, surfacing raw English engine errors. | chain-phase-any-empty-cell |
| **M-24** | State machine | Clicking an opponent stone, or an empty cell with no selection, silently does nothing — while `toast.invalidMove` and `toast.selectPieceFirst` exist unused in both locales and every cell shows `cursor: pointer`. | silent-invalid-clicks |
| **M-25** | UI/perf | `Board` recomputes full move generation for all 49 cells on every render (`movesFor` per cell, un-memoized), `Controls` runs `hasAnyLegalMove` per render, and every `mouseleave` fires two store writes. | board-recomputes-moves-per-render |
| **M-26** | UI | Pieces teleport: positional keys (`${r}-${c}`) mean React unmounts/remounts the glyph, so no move, capture or placement is ever animated. | no-move-animation |
| **M-27** | UI | `prefers-reduced-motion` block covers only the custom `.seejeh-*` animations; its one Tailwind selector (`.seejeh-cell .absolute .animate-pulse`) never matches because HintOverlay is a **sibling** of `.seejeh-cell`. `animate-pulse`, `animate-spin`, `animate-in`, Radix dialog zoom and `:hover { transform: scale(1.02) }` all survive. | reduced-motion-gaps |
| **M-28** | UI | Hint overlay contrast: white bold text on `bg-yellow-500/80` ≈ **1.8:1** (AA needs 4.5:1). Plus hardcoded light-only palettes (`bg-green-50`, `bg-purple-50`, `bg-green-100 text-green-800`) with no dark variants, some overriding shadcn Badge foregrounds → purple-on-black. | hint-overlay-contrast |
| **M-29** | UI/build | Three stylesheets define the same tokens; `--accent` is defined 3× in a **364 KB** CSS bundle. All of `theme.css` is scoped to `#spark-app` while the DOM root is `#root` → 60 Radix palettes of pure dead weight, and dark mode (`.dark`, same specificity, emitted first) is unreachable. Cascade order is accidental. | css-triple-root-and-dead-theme |
| **M-30** | a11y | `role="grid"` with no `role="row"` / `role="gridcell"` descendants and no `aria-rowindex`/`aria-colindex`. | role-grid-without-rows |
| **M-31** | a11y | No aria-live region for turn changes, captures or game over. The only live region (Toast) carries **both** `role="alert"` and `aria-live="polite"`, and reuses the same node without a key so identical consecutive messages aren't re-announced. | no-live-region-announcements |
| **M-32** | a11y | 9 icon-only buttons with no accessible name (Controls gear, two modal X's, two Info tooltips, HintsPanel X and Eye, two MoveAnalysisPanel EyeSlash). | icon-buttons-no-accessible-name |
| **M-33** | a11y | Broken label associations in SettingsModal: `htmlFor="language"` points at a nonexistent id; RadioGroup, Slider and LeaderboardModal's Select are all unnamed; no `DialogDescription`. | settings-broken-label-associations |
| **M-34** | i18n/RTL | `→` glyphs and `ArrowRight` icons are not mirrored under `dir="rtl"` (U+2192 is not bidi-mirrored). | board-rtl-arrow-glyph |
| **M-35** | i18n/RTL | 15 sites use physical `mr-*`/`ml-*` instead of logical `me-*`/`ms-*` → the icon gap lands on the wrong side in Arabic. | rtl-physical-margins |
| **M-36** | i18n/RTL | Numeric composites with neutral separators reorder visually in RTL: `12-8` renders as `8-12`, `#3` as `3#`, `50%` as `%50`. | rtl-bidi-numeric-runs |
| **M-37** | i18n | Dates/times use the **browser** locale, not the app language; duration suffixes `h`/`m`/`<1m` are hardcoded English. | locale-date-formatting |
| **M-38** | i18n | No plural support at all (single `{{param}}` regex). Arabic has 6 plural categories; every count string is frozen in the 3–10 form → "تم أسر 1 أحجار". English has the same bug ("Captured 1 stones"). | no-pluralization |
| **M-39** | i18n | All AI hint descriptions, analysis reasoning and explanations are hardcoded English in `ai.ts` (28 sites) while all six `hints.descriptions.*` keys exist unused in both locales. | untranslated-ai-analysis |
| **M-40** | i18n | 13 remaining user-visible English literals in JSX (footer, `AI` badge, `You` badge, board/cell aria-labels, LanguageSwitcher aria-label, HintsPanel fallbacks, strength badge, About resources, the entire ErrorFallback UI). | hardcoded-jsx-strings |
| **M-41** | State machine | `makeAIMove`'s chain and movement branches decide from a pre-`await` snapshot of `gameState` (the placement branch correctly re-reads). | gs-stale-chain-snapshot |

### LOW (14)

| ID | Subsystem | Defect | Merged from |
|---|---|---|---|
| **L-01** | Rules | Dead disjunct `winner !== undefined \|\| winner === null`; `detectStalemate` returns the input state unchanged when nothing is detected, so this conflates "stalemate detected" with "game already won". Mechanism of H-01. | R6 |
| **L-02** | Rules | `placementsFor` ignores its `player` argument and `stonesToPlace`; returns 48 phantom placements for an exhausted player. | R21 |
| **L-03** | Rules | Nested state is aliased between old and new states (`moveHistory`, `variant`, `stalemateOffers`, `capturedLastMove`, `chainOrigin`), and `MoveRecord` stores the **caller's** Cell objects. Breaks undo, snapshots and any search assuming immutability. | R22 |
| **L-04** | Rules | Stalemate / insufficient-material / repetition outcomes award a win by material count instead of returning `winner: null`, contradicting the `drawType` labelling and the `// null indicates draw` comment. | R23 |
| **L-05** | Rules | Stalemate offers are never cleared by subsequent play; two offers 30 moves apart still end the game. | R24 |
| **L-06** | AI | `analyzeAIMove` confidence is `min(100, max(10, 50 + delta*10))` — saturated at a clamp almost always; a capturing move reports confidence 10 → rendered as "weak / may be forced". `if (factors.safety < 0)` is unreachable (safety ∈ {0, 0.3, 1}). | ai-19 |
| **L-07** | AI | `shouldAIOfferStalemate` is entirely unreachable (both gates dead) **and** polarity-inverted (refuses when ahead, offers when behind). | ai-20 |
| **L-08** | AI | The two placement branches of `generateAllMoves` are byte-identical, and a placement *turn* (2 stones) is never modelled as one unit — the second stone is chosen with no knowledge of the first, and is scored as an opponent ply. | ai-21 |
| **L-09** | AI | `evaluatePositioning` net-prefers corners (3.0) over near-centre squares (2.5) despite its "closer is better" comment, and triple-pays for the centre alongside `centerControl` and `evaluateSafety`. | ai-22 |
| **L-10** | AI | Dead code: unused imports `Cell`, `applyPlacement`, `hasAnyLegalMove`; unused `currentPlayer`; hardcoded `board[3][3]` instead of `isCenter`; `factors.positioning` overwritten instead of accumulated; inconsistent `AIMove.cells` convention. | ai-24 |
| **L-11** | State machine | `GameResult.totalMoves` uses `moveHistory.length` (excludes all placements, includes pre-session history) and ignores the carefully-tracked `currentSession.moves`. | gs-session-moves-unused |
| **L-12** | State machine | `loadSettings()` is called twice at store creation, and `hintsEnabled` exists in two places kept in sync only by `toggleHints`. | gs-double-loadsettings |
| **L-13** | State machine | `newGame` doesn't reset `lastAIAnalysis` / `showMoveAnalysis` → previous game's analysis panel persists over the fresh board. | gs-newgame-stale-analysis |
| **L-14** | State machine | Hovering a hint row silently clears `selectedCell` and never restores it. | hint-hover-clears-selection |
| **L-15** | UI | Non-composited infinite animations (`background`, `box-shadow`, `border-color`) on ~20 stones simultaneously; keyframes hardcode off-palette blue/pink/green/red literals that clash with the amber/copper theme. | non-composited-animations |
| **L-16** | UI | Stones render a redundant `○`/`●` text glyph on top of the already-circular styled div → bullseye artifact that changes shape between the Cairo and Inter font stacks. | stone-glyph-artifact |
| **L-17** | UI | Hint overlay's `bg-green-500/80 inset-0 z-10` paints over the very stone it is pointing at. | hint-overlay-covers-stone |
| **L-18** | UI | Blockade removal reuses the `isValidMove` prop → cells get both `.valid-move` (white destination dot) and `.removable` (red fill), and announce "- valid action" instead of "remove this stone". | blockade-reuses-isvalidmove |
| **L-19** | i18n | `toast.blockade` says "opponent removes one stone" while the code requires the **blocked player** to remove their own. | blockade-instruction-contradicts-rule |
| **L-20** | i18n | `t()` params typed `Record<string, string>` but called with a number (TS2322), and `params[key] \|\| match` leaves the literal `{{count}}` for falsy values like 0. | leaderboard-number-param-type |
| **L-21** | i18n | 26 translation keys defined in both locales and referenced nowhere — each corresponds to a place where English is hardcoded. | unused-translation-keys |
| **L-22** | All | Unused destructures and imports across the presentation layer + 4 dead CSS animation classes. | unused-bindings |

---

## 2. Subsystem detail with rewrite mandates

Each mandate states the **structural** change that makes the class of bug impossible — not the patch.

### 2.1 Rules engine

> **Mandate R-A — One pure, total, player-parameterised engine.**
> Every query is `f(state, player, …)`; nothing in the engine ever reads `state.current` to decide *whose* stones it is talking about. `state.current` is used only to *validate* that a submitted action belongs to the side to move.
> Kills: X-11, X-12, L-02, and half of ai-01.

> **Mandate R-B — Legality is generated, never thrown.**
> A single `legalActions(state): Action[]` is the only source of truth. `applyAction` asserts membership in that set (`assert(isLegal(state, action))`) and is otherwise total. Variant rules (`firstMoveMustEnterCenter`, `antiShuttle`, chain-must-capture, placement budget) live **in the generator**, not in the applier.
> Kills: H-03, H-04, M-04, M-08, M-10, M-23, M-24, C2 entirely. The UI can then render exactly the legal set, and the AI can never throw out of search.

> **Mandate R-C — Actions are a discriminated union, and a placement turn is one action.**
> `type Action = {k:'place', cells:[Cell] | [Cell,Cell]} | {k:'move', from:Cell, to:Cell} | {k:'chain', to:Cell} | {k:'endChain'} | {k:'pass'} | {k:'blockadeRemove', cell:Cell} | {k:'offerDraw'} | {k:'acceptDraw'} | {k:'resign'}`. A `place` action validates de-duplication, budget and bounds as one atomic unit; there is no `placementCount` to desynchronise.
> Kills: H-02, M-01, M-02, L-08, and lets the AI search placement turns as units.

> **Mandate R-D — One terminal classifier, called once, returning a closed result.**
> `classifyTerminal(state): {over:false} | {over:true, outcome: {kind:'stoneCount'|'blockade'|'agreedDraw'|'repetition'|'resignation', result:'lightWins'|'darkWins'|'draw', detail}}`. It runs **once** at the end of `applyAction`, considers `phase` explicitly, and nothing may overwrite an outcome once set. Draws are `result:'draw'`, never a material tie-break.
> Kills: X-02, X-13, H-01, M-06, L-01, L-04, and C4/C6 as a class. `outcome` must be a **tagged object, never a nullable `winner`** — this alone deletes every `if (winner)`-misses-draw bug.

> **Mandate R-E — Custodian capture is a single scan function used by both apply and preview.**
> `capturesFor(board, mover, from, to): Cell[]` is written once. `previewCaptures` = `capturesFor` on the simulated post-move board. The centre square is a **hard blocker**: the scan `break`s on `isCenter(pos)` — a stone standing there neither is captured nor is transparent.
> Kills: H-05 permanently (preview can never disagree with reality again).

> **Mandate R-F — Chain is a first-class sub-state with a mandatory capture.**
> While `phase === 'chain'`, `legalActions` returns only `{k:'chain', to}` destinations where `capturesFor(...).length > 0`, plus `{k:'endChain'}`. `chainOrigin` is part of a `phase: {tag:'chain', origin: Cell}` variant, so it is structurally impossible for it to survive into a non-chain phase.
> Kills: H-04, M-03, H-07's store workaround.

> **Mandate R-G — Repetition and shuttle are tracked on stable identities and full history.**
> Give every stone an id at placement, carried through moves. Maintain a `Map<PositionHash, count>` over the whole game (hash = board + side-to-move + phase). Repetition draw fires at N occurrences. Anti-shuttle compares `(stoneId, from, to)` pairs.
> Kills: M-04, M-05, L-07's dead branch.

> **Mandate R-H — Blockade is an explicit sub-state with a documented owner, and the turn advances.**
> `phase: {tag:'blockadeRemoval', blocked: Player}`, entered **only** when `variant.blockadeOneRemoval` is on and the side to move has zero legal actions while the opponent has some. The rulebook decision (whose stone is removed) is documented in one place and the locale string is generated from it. After removal, re-run `legalActions` **and** `classifyTerminal`; if still blocked, stay in the sub-state.
> Kills: M-06, M-07, M-16, M-17, X-09's root, L-19.

> **Mandate R-I — States are frozen values.**
> `applyAction` returns a deeply new state (structural sharing where safe, but never aliasing a mutable container across versions); all `Cell`s entering the state are cloned. `Object.freeze` in dev builds.
> Kills: L-03, lb-mutate-prev-state (§2.7), and every "undo/snapshot/search assumed immutability" class.

> **Mandate R-J — The engine speaks error *codes*, never sentences.**
> Illegal actions are unreachable by R-B; if an assertion does fire it carries `{code: 'ILLEGAL_ACTION', action}`, and the UI maps codes → translation keys.
> Kills: H-24's second half, C7.

> **Mandate R-K — Draw-offer state expires.**
> A pending offer is `pendingDrawOffer?: {by: Player, atPly: number}` and is cleared by any action other than accept.
> Kills: L-05, M-15 (there is no per-player boolean pair to clear the wrong one of).

### 2.2 State machine / store

> **Mandate S-A — The store owns zero rules logic.**
> The store's only game mutation is `dispatch(action)` → `engine.applyAction`. `placeStone`, `endTurn`, blockade removal and stalemate handling all become `dispatch`. Nothing in `src/state` may import anything but `legalActions`, `applyAction`, `classifyTerminal` and pure selectors.
> Kills: H-11, M-18, M-20, and C1 for the store.

> **Mandate S-B — Turn ownership is an invariant, enforced by an effect loop, not by timers.**
> Model the turn as `{ toMove: Player, controller: 'human'|'ai', pending: 'idle'|'thinking' }`. A single effect (`useEffect`/subscription) reacts to state: *if the side to move is AI and the game is not over, an AI request is in flight or must be started.* Every AI code path ends by dispatching **an action** — including an explicit `{k:'pass'}` or `{k:'endChain'}`. There is no `return` that leaves the turn owned by nobody, and no `setTimeout(…, 300)` carrying control flow.
> Kills: X-01, X-08, X-09, X-10, H-12, M-19, M-41, and the entire "permanent freeze" class (5 separate bugs).

> **Mandate S-C — AI actions go through the same dispatch as human actions, with the actor passed explicitly.**
> No store action may infer "is this legitimate?" from `isAITurn`. Offer/accept/reject/resign take `by: Player`.
> Kills: X-08, M-15.

> **Mandate S-D — Session lifecycle is a state machine with an idempotent, single-shot finaliser.**
> `session: {id, startedAt, actions} | null` is created on **store init** and on every `newGame`; `finalizeSession` captures the session object, sets `session = null` **synchronously before the first `await`**, and writes only if it captured a non-null session with `outcome.over === true`. Abandoned games are either not written or written with `status:'abandoned'` and excluded from stats.
> Kills: H-13, H-14, H-15, H-16, M-21, L-11.

> **Mandate S-E — The build must typecheck.**
> Remove `--noCheck` from the build; CI runs `tsc --noEmit` and fails on TS2448/TS2305/TS2322. Add `no-shadow` / `no-redeclare` lint rules.
> Kills: X-01, H-21, L-20 — all three were already detected by `tsc` and shipped anyway.

> **Mandate S-F — Toasts are a keyed queue, not a shared slot with orphan timers.**
> `toasts: {id, key, params, level}[]`, one owner of dismissal, `clearTimeout` on replace.
> Kills: M-22, and forces every toast through a translation key (H-24).

### 2.3 AI

> **Mandate A-A — Negamax with the node sign derived from the state, never from ply parity.**
> `score = -negamax(child, -β, -α)` only when `child.current !== node.current`; when the mover retains the move (chain continuation, second placement of a turn — though R-C makes placement one action) the sign does **not** flip. Better: because R-C makes one action = one turn, `state.current` is authoritative and the flip is simply `sign = (state.current === root) ? +1 : -1`.
> Kills: X-03, L-08's second half.

> **Mandate A-B — The evaluator receives a phase-aware, non-terminal-by-accident position.**
> Terminality comes only from `classifyTerminal` (R-D), which is phase-aware. Terminal scores are ply-adjusted (`MATE - ply` / `-MATE + ply`).
> Kills: X-04, M-13.

> **Mandate A-C — Captures are part of the evaluation, not a root-only bonus.**
> Material difference is computed inside `evaluate()` at every leaf; there is no post-hoc capture bonus at any root. If a tiebreak bonus is wanted it is added to the *candidate's* score, never to the running best.
> Kills: X-05, X-06 — and makes the three entry points (`getBestAIMove`, `getOptimalMove`, `getTopMoves`) share one scoring function by construction.

> **Mandate A-D — Draw/stalemate policy is derived from the rulebook's own outcome function.**
> `shouldOfferDraw` / `shouldAcceptDraw` must call `classifyTerminal` on the hypothetical accepted state and compare its `result` to the AI's colour. Polarity cannot be hand-written wrong if it is *computed*.
> Kills: X-07, L-07.

> **Mandate A-E — Search runs in a Web Worker with a wall-clock budget; the main thread only renders.**
> `postMessage` request/response with a cancellation token; iterative deepening with aspiration windows; guaranteed answer within ~250 ms. Board is `Int8Array(49)` + side-to-move + phase; make/unmake instead of clone; `moveHistory` never enters search states.
> Kills: H-08, M-14, and the placement-phase tab freeze.

> **Mandate A-F — The evaluator's safety term must model the actual capture rule.**
> Replace "count friendly neighbours" with **line vulnerability**: for each maximal friendly line, penalise by length when one end is enemy-held and the other is empty and enemy-reachable in one move; mirror it as a bonus for enemy lines. Add a **quiescence** extension on any node with an available capture or an active chain. Corners get an explicit non-capturability credit; the centre is paid for **once** (delete `evaluatePositioning`'s overlapping payments).
> Kills: H-09, H-10, L-09.

> **Mandate A-G — Difficulty = one engine + time budget + seeded blunder rate over the ranked root list.**
> `getBestAction(state, {budgetMs, blunderRate, rng})`. No tier ignores the search. Validate with an automated self-play round-robin asserting each tier beats the one below 65–75 %.
> Kills: M-12, and X-04's "all tiers identical" symptom.

> **Mandate A-H — Move analysis operates on a stored pre-move snapshot.**
> The store keeps `previousState` (or the `MoveRecord` carries it); `analyze(before, action, after)` is pure and never replays.
> Kills: H-06, L-06 (confidence is derived from the root's best-vs-second-best margin, which only exists if the search returns a ranked list).

> **Mandate A-I — The AI returns typed intents with translation keys, not English prose.**
> `{ action, scoreCp, rationale: {key, params}[] }`.
> Kills: M-39, C7 for the AI layer.

### 2.4 UI / rendering / animation

> **Mandate U-A — Selector-scoped subscriptions everywhere; `useTranslation` subscribes only to `settings.language`.**
> Lint rule banning bare `useGameStore()`. Cell is `React.memo` with primitive props.
> Kills: H-19.

> **Mandate U-B — Derived board data is computed once per state, not once per cell per render.**
> `useMemo(() => indexLegalActions(state), [state])` yields `Set<string>` lookups passed down; `Cell` receives booleans.
> Kills: M-25.

> **Mandate U-C — Stones are identity-keyed, absolutely-positioned children of the board.**
> `key={stone.id}` (available from R-G) + FLIP transform animation + fade/scale-out on capture, all gated on `prefers-reduced-motion`. No text glyph inside the styled disc.
> Kills: M-26, L-16.

> **Mandate U-D — One stylesheet, one token source, theme-token colours only.**
> Delete `theme.css` (or mount at `#spark-app`); remove duplicate `@import`s; no literal `rgba()` in keyframes; animations restricted to `transform`/`opacity`; a blanket `prefers-reduced-motion` reset (`*, *::before, *::after`).
> Kills: M-27, M-29, L-15.

> **Mandate U-E — Every visual state has its own prop and its own class.**
> `isRemovable`, `isHintSource`, `isCaptureTarget` are distinct from `isValidMove`; hint markers are outlines/badges, never opaque fills over stones; all colour pairs validated to ≥4.5:1 in both themes.
> Kills: M-28, L-17, L-18.

> **Mandate U-F — Icons are imported from a checked allowlist.**
> No proxy plugin masking nonexistent exports; `tsc --noEmit` in CI (S-E) catches them.
> Kills: H-21.

> **Mandate U-G — Game-over UI is driven by `outcome.over`, not by a truthy winner.**
> Kills: H-22, M-11's UI half.

### 2.5 i18n / translations

> **Mandate I-A — Locale files are generated/validated, not hand-maintained.**
> A build step parses both locales with a **duplicate-key-detecting** parser, asserts key parity, asserts placeholder parity, and fails on unused keys and on missing keys. `t()` is typed against the key union.
> Kills: H-20, L-21, L-20, and any future drift.

> **Mandate I-B — No user-visible string originates outside `src/i18n`.**
> Lint rule: no string literals in JSX text positions, `aria-label`, `title`, or `showToast(...)` arguments. Domain layers emit `{key, params}`.
> Kills: H-24, M-39, M-40, C7.

> **Mandate I-C — ICU message formatting with `Intl.PluralRules`.**
> Adopt a formatter (i18next + ICU, or `@formatjs/intl`) so Arabic's six categories and English's two are handled by the library. Params typed `string | number | Date`; missing params are a build error, not a silent `{{count}}` passthrough.
> Kills: M-38, L-20.

> **Mandate I-D — All numbers, dates and durations go through `Intl` with the app locale.**
> One `useFormatters(locale)` hook exposing `formatNumber`, `formatDate`, `formatDuration`, `formatPercent`. One numeral system per locale, chosen deliberately.
> Kills: M-37, M-36's numeral mixing, and the ar.json Eastern/Western digit clash.

> **Mandate I-E — Logical properties and bidi isolation are the default.**
> `me-*`/`ms-*` only (lint-ban `mr-*`/`ml-*`/`pl-*`/`pr-*`/`left-*`/`right-*`); every numeric composite wrapped in `unicode-bidi: isolate`; direction-bearing glyphs replaced with a logical `ArrowForward` component that mirrors on RTL.
> Kills: M-34, M-35, M-36.

### 2.6 Accessibility

> **Mandate Y-A — The board implements the ARIA grid pattern properly.**
> `role="grid"` → 7 × `role="row"` → 49 × `role="gridcell"` with `aria-rowindex`/`aria-colindex`; roving tabindex (exactly one cell at 0); Arrow/Home/End/PageUp/PageDown handled, with left/right mapped to *visual* direction under RTL.
> Kills: H-23, M-30.

> **Mandate Y-B — One polite live region owned by the game state, announcing turn / capture / phase / outcome.**
> Toast picks exactly one of `role="alert"` or `aria-live="polite"` and is keyed by toast id so repeats re-announce.
> Kills: M-31.

> **Mandate Y-C — Accessible-name lint gate.**
> `eslint-plugin-jsx-a11y` with `control-has-associated-label` and `label-has-associated-control` as errors; a Storybook/axe pass in CI.
> Kills: M-32, M-33, and the "7 unused `accessibility.*` keys" half of L-21.

### 2.7 Persistence / auth / leaderboard

> **Mandate P-A — Versioned, schema-validated, migrated persistence.**
> `{v: 3, payload}`; validate with a runtime schema (zod/valibot) whose type **is** the `GameState` type; a registered migration chain `v1→v2→v3`; on any failure, log, clear the key, and fall back to a fresh initial state. Nothing raw ever reaches the engine or a component.
> Kills: H-17, H-18.

> **Mandate P-B — Settings are always `deepMerge(defaults, validated(parsed))`.**
> Never `parsed || defaults`. Enum fields validated against their unions.
> Kills: H-18, L-12 (defaults are computed once and `hintsEnabled` has exactly one home).

> **Mandate P-C — All persisted writes are pure functions of a *frozen* snapshot.**
> `leaderboardStore.updatePlayerRating` must rebuild every entry object (`map((e,i) => ({...e, rank:i+1}))`) and derive `userEntry` from the rebuilt array — no in-place `entry.rank = …` on objects React has already rendered (`leaderboardStore.ts:80`).
> Kills: lb-mutate-prev-state.

> **Mandate P-D — Result persistence depends only on identity, never on a cached read model.**
> `authStore.addGameResult` must not `return` on `!stats` (`authStore.ts:92`); it writes the result and surfaces a real error on failure. The caller must be able to observe success/failure.
> Kills: auth-silent-drop.

---

## 3. Design invariants for the rewrite

Phrased as executable properties. Each maps directly to a `fast-check` property test or an assertion inside `applyAction` (dev builds).

### 3.1 Action / legality

- **INV-1 (Totality).** `∀ s, ∀ a ∈ legalActions(s): applyAction(s, a)` does not throw.
- **INV-2 (Exclusivity).** `∀ s, ∀ a ∉ legalActions(s): applyAction(s, a)` throws exactly `IllegalAction`, and `s` is unchanged.
- **INV-3 (Non-starvation).** `∀ s where !classifyTerminal(s).over: legalActions(s).length > 0`. *(Passing counts as a legal action. This single invariant makes every "frozen board" bug a test failure.)*
- **INV-4 (Ownership).** `∀ s, ∀ a ∈ legalActions(s):` every board square `a` reads-as-mine belongs to `s.current`.
- **INV-5 (Player symmetry).** `∀ s, ∀ p: legalActionsFor(s, p)` is independent of `s.current`; and `legalActions(s) === legalActionsFor(s, s.current)`. *(Directly encodes the fix for X-11.)*
- **INV-6 (Mirror symmetry).** `legalActionsFor(mirrorColors(s), Light).length === legalActionsFor(s, Dark).length`, and `evaluate(mirrorColors(s), Light) === -evaluate(s, Light)`.
- **INV-7 (Board-symmetry equivariance).** For each of the 8 dihedral symmetries `g` of the 7×7 board (the centre is fixed by all of them): `legalActions(g·s) === g·legalActions(s)`.

### 3.2 Material conservation

- **INV-8 (Placement budget).** `∀ s: 0 ≤ stonesToPlace[p] ≤ STONES_PER_PLAYER`, and `countOnBoard(p) + stonesToPlace[p] + capturedFrom(p) === STONES_PER_PLAYER` at every state, in every phase.
- **INV-9 (Placement atomicity).** A `place` action places exactly `cells.length` distinct stones and decrements the budget by exactly `cells.length`. `cells[0] ≠ cells[1]`.
- **INV-10 (No spontaneous material).** `∀ s, a: countOnBoard(s', p) ≤ countOnBoard(s, p)` for the non-mover, and `=` for the mover — except `place` (+n) and `blockadeRemove` (−1 for exactly one documented side).
- **INV-11 (Capture ⇒ move).** `capturedLastMove.length > 0 ⇒ the last action was a move or chain step`.

### 3.3 Capture rule

- **INV-12 (Centre sanctuary).** A stone on the centre square is never in the output of `capturesFor`, **and** never appears strictly between the mover and a captured stone. Formally: for every returned line, no cell on the scan path up to and including the far anchor is the centre while occupied.
- **INV-13 (Preview ≡ reality).** `∀ s, ∀ a = {k:'move'|'chain'}: previewCaptures(s, a) === applyAction(s, a).capturedLastMove` — as sets. *(Makes the preview/apply divergence class untestable-to-miss.)*
- **INV-14 (Custodianship).** Every captured cell lies on a contiguous straight run of enemy stones starting orthogonally adjacent to `a.to`, terminated by a friendly stone, with no gap, no board edge and no centre-occupant in between.
- **INV-15 (Self-capture impossible).** `capturesFor(...)` never returns a cell occupied by the mover.

### 3.4 Turn / phase machine

- **INV-16 (Progress).** Every `applyAction` either changes `current`, or changes `phase`, or strictly decreases `stonesToPlace[current]`, or removes at least one stone. *(No action is a no-op; forbids infinite same-player loops.)*
- **INV-17 (Chain requires capture).** `phase.tag === 'chain' ⇒ every legal 'chain' action captures ≥ 1 stone`, and taking one leaves `current` unchanged.
- **INV-18 (Chain anchoring).** `phase.tag === 'chain' ⇒ the only legal move-like actions originate from phase.origin`, and `board[phase.origin]` is occupied by `current`.
- **INV-19 (No stale sub-state).** `phase.tag !== 'chain' ⇒ no chain origin exists anywhere in the state` (structural, by the tagged union). Same for `blockadeRemoval`.
- **INV-20 (Free-move impossibility).** In any single turn, a player performs at most one non-capturing board-changing action.
- **INV-21 (Blockade entry).** `phase.tag === 'blockadeRemoval' ⇔ variant.blockadeOneRemoval ∧ legalMoveActionsFor(s, blocked) === [] ∧ ¬terminal(s)`.
- **INV-22 (Blockade exit).** After a `blockadeRemove`, either the blocked player has ≥1 legal move action, or the state remains in `blockadeRemoval`, or the game is terminal. It is never the case that the blocked player is to move with zero legal actions and no sub-state.

### 3.5 Terminal outcomes

- **INV-23 (Monotonicity / immutability of outcome).** `classifyTerminal(s).over === true ⇒ ∀ a: applyAction(s, a)` throws (no actions are legal), and no function anywhere may write a different `outcome`.
- **INV-24 (Phase awareness).** `s.phase.tag === 'placement' ⇒ classifyTerminal(s)` never returns a `stoneCount` outcome.
- **INV-25 (Stone-count correctness).** If both sides are ≤ threshold, the side with **strictly fewer** stones loses; equal counts resolve to `draw` (or the documented explicit tiebreak) — never to a fixed colour ordering.
- **INV-26 (Draw is a first-class result).** `result === 'draw'` for agreed draws, repetition and insufficient material. There is no code path where a draw carries a winning colour, and no boolean test of the outcome value.
- **INV-27 (Determinism).** `classifyTerminal` is a pure function of the position + history counters — never of "what the previous move happened to do" (kills the `capturedLastMove.length === 0` gate).
- **INV-28 (Termination).** Every game terminates: `∀ random-playout: plies ≤ MAX_PLIES`, guaranteed by the repetition counter and a ply cap. *(Run 10 000 random playouts in CI; assert 0 timeouts, 0 throws, and INV-8 at every ply.)*

### 3.6 Repetition & offers

- **INV-29 (Repetition counts real repetitions).** If a playout returns to an identical `(board, current, phase)` k times, `positionCounts.get(hash) === k`. *(The 16-move shuttle scenario that currently yields 0 must yield 4.)*
- **INV-30 (Offer freshness).** A pending draw offer survives at most one ply; `acceptDraw` is legal only while an offer from the *other* player is pending.
- **INV-31 (Anti-shuttle identity).** With `antiShuttle` on, an N-fold repetition of `(stoneId, from, to)` makes that action illegal — i.e. it is absent from `legalActions`, never thrown from `applyAction`.

### 3.7 Purity / immutability

- **INV-32 (No aliasing).** `∀ s, a: applyAction(s, a)` shares no mutable container reference with `s` (`board`, rows, `moveHistory`, `variant`, `capturedLastMove`, offers, cells). Test by deep-freezing `s` and asserting no throw.
- **INV-33 (No caller aliasing).** Mutating the `Cell` objects passed into `applyAction` after the call cannot change the returned state.
- **INV-34 (Referential transparency).** `applyAction(s, a)` twice yields deep-equal states; `hash(s)` is stable across serialize→deserialize round trips.

### 3.8 Search / AI

- **INV-35 (Search never throws).** `∀ reachable s: getBestAction(s, budget)` returns an action ∈ `legalActions(s)`, or an explicit `{k:'none'}` only when `legalActions(s) === []` (which INV-3 forbids for non-terminal states).
- **INV-36 (Search agrees with rules).** The action returned is always legal in the *live* state at dispatch time; the store re-validates before applying.
- **INV-37 (Perspective).** `evaluate` and `negamax` satisfy `score(s, p) === -score(s, opponent(p))`, and the sign at a child is flipped **iff** `child.current !== node.current`.
- **INV-38 (Free material is taken).** In a position with a legal capture of k stones and no compensating threat, `getBestAction(hard)` returns a capturing action. *(Regression test seeded with the exact position from the audit where the capture ranked #10/13.)*
- **INV-39 (Terminal preference).** A mate-in-1 is preferred over a mate-in-3; a loss-in-3 is preferred over a loss-in-1.
- **INV-40 (Draw policy sanity).** `shouldAcceptDraw(s, me) === true ⇒ classifyTerminal(applyAction(s, acceptDraw)).result` is not a loss for `me`. `shouldOfferDraw` obeys the same property.
- **INV-41 (Budget).** `getBestAction` returns within `budgetMs * 1.5` for every position in a 200-position suite, and never blocks the main thread (worker-only API surface).
- **INV-42 (Reproducibility).** With a seeded RNG, `getBestAction` is deterministic for every tier.
- **INV-43 (Ladder).** In self-play round-robin (200 games/pair), each tier scores 65–75 % against the tier below; no pairing produces >5 % identical games.

### 3.9 Store / UI

- **INV-44 (Single writer).** The only function that produces a new `GameState` is `engine.applyAction`. Enforced by lint + a runtime dev assertion comparing `hash(prev)`-to-`hash(next)` against a replay of the dispatched action.
- **INV-45 (No orphaned turn).** After any dispatch settles, exactly one of: the game is over; a human may act (`legalActions` non-empty, input unblocked); or an AI request is in flight. Assert this in a store subscriber in dev.
- **INV-46 (Input honesty).** A cell is clickable ⇔ some legal action references it. `cursor: pointer` is applied on exactly that condition.
- **INV-47 (Session accounting).** Exactly one `GameResult` is written per completed game; `totalMoves === session.actions`; `newGame` during an in-flight finalise never nulls the new session. *(Test by racing 50 `newGame` calls against a stubbed slow persistence layer.)*
- **INV-48 (Post-terminal freeze).** After `outcome.over`, no dispatch, click, timer or AI tick changes the persisted state.

### 3.10 Persistence

- **INV-49 (Round trip).** `∀ reachable s: load(save(s))` deep-equals `s`, and `hash` is preserved.
- **INV-50 (Hostile input).** `∀ arbitrary JSON x: loadGameState(x)` returns either a state satisfying all engine invariants or `null`. It never throws and never returns a partially-shaped object. *(Fuzz with fast-check over arbitrary JSON + field-deletion mutants of valid saves.)*
- **INV-51 (Forward migration).** Every persisted version `v_i` has a migration to the current version, tested with a checked-in fixture per version.
- **INV-52 (Settings completeness).** `loadSettings(anything)` returns an object where every declared key is present and every enum-valued key is a member of its union.

### 3.11 i18n / a11y

- **INV-53 (Key parity + no duplicates).** Both locale files parse with a duplicate-detecting parser to the same flattened key set, with identical placeholder sets per key. Build fails otherwise.
- **INV-54 (No orphan keys, no orphan strings).** Zero keys unreferenced in source; zero user-visible string literals in the presentation or domain layers.
- **INV-55 (Plural coverage).** Every key with a `{{count}}`-style placeholder has all plural categories required by its locale (`Intl.PluralRules(locale).resolvedOptions().pluralCategories`).
- **INV-56 (Render safety).** Rendering every screen in `en` and `ar` produces no `{{` in the DOM and no literal key name in the DOM.
- **INV-57 (Direction).** In an RTL snapshot, no element carries a physical margin/padding/inset utility, and every numeric composite is inside an isolating element.
- **INV-58 (a11y gate).** axe-core reports zero violations on every screen in both locales and both themes; every interactive element has a non-empty accessible name; the board is fully operable by keyboard alone.

---

## 4. Complete i18n gap list

Everything below must be resolved before the rewrite ships. Grouped by nature; every item includes its current location so nothing is missed.

### 4.1 Structural defects in the locale files

| # | Item | Detail |
|---|---|---|
| 1 | **Duplicate `about` key** | `en.json:6` `"about": "About"` vs `en.json:103` `"about": {…}`; identical duplication in `ar.json:6` (`"حول"`) / `ar.json:103`. Last wins → `t('about')` returns a non-string → `useTranslation.ts:27-29` returns the raw key → literal `"about"` in `App.tsx:97` and `AboutModal.tsx:26`. **Fix: rename the nested object to `aboutContent`, or move the label to `about.title`.** |
| 2 | **No schema version / no duplicate detection** | Neither file is validated at build time. |
| 3 | **`t()` params typed `Record<string,string>`** | `LeaderboardModal.tsx:210` passes a number → TS2322. Call sites work around it with `.toString()` at `GameHistory.tsx:94,156` and `Controls.tsx:221,235`. |
| 4 | **Falsy-param fallback** | `useTranslation.ts:34` `params[paramKey] \|\| match` → `count: 0` renders the literal `{{count}}`. |
| 5 | **No plural machinery** | Single regex substitution; no `Intl.PluralRules`. |

### 4.2 Arabic plural / grammar problems

All of these are frozen in the "few" (3–10) form and are wrong for 1, 2, 11+, and 0:

| Key | Arabic | Wrong for |
|---|---|---|
| `toast.captured` | `تم أسر {{count}} أحجار` | 1 → "تم أسر 1 أحجار" ("captured 1 stones") |
| `hints.descriptions.capturesStones` | `يأسر {{count}} أحجار` | 1, 2, 11+ |
| `winReason.stoneCount` | `{{opponent}} انخفض إلى {{count}} أحجار` | 1, 2, 11+ |
| `history.recentGamesDescription` | `آخر {{count}} ألعاب لك` | 1, 2, 11+ |
| `leaderboard.minGamesRequired` | `{{count}} ألعاب` | 1, 2, 11+, 0 |
| `leaderboard.needMoreGames` | `{{count}} ألعاب` | same |
| `history.daysAgo` | `أيام مضت` | 1 → "1 أيام مضت" instead of "يوم واحد" |

**English is equally broken** ("Captured 1 stones"). Every one of these needs `.zero/.one/.two/.few/.many/.other` (ar) and `.one/.other` (en).

### 4.3 Numeral system inconsistency (ar.json)

Static Arabic text uses Eastern Arabic numerals — `٧×٧`, `٤٨`, `٧`, `١٩٧٩` — while every runtime-formatted number renders as Western digits. Both systems appear side by side in the same paragraph. **Decide one system per locale and route all numbers through `Intl.NumberFormat`.**

### 4.4 Semantically wrong string

| Key | Current | Problem |
|---|---|---|
| `toast.blockade` (`en.json:68` / `ar.json:68`, used at `Controls.tsx:39`) | "Player blocked - opponent removes one stone" | The implementation (`rules.ts:429`) requires the **blocked player** to remove their **own** stone, and `Board.tsx:69` highlights the blocked player's own stones. The instruction actively misleads. Reword to match whatever the rewrite decides (and derive the string from the rule, not vice versa). |

### 4.5 Hardcoded English in `src/state/gameStore.ts` (11 toasts)

| Line | String | Existing unused key |
|---|---|---|
| 370 | `` `Captured ${n} stones` `` | `toast.captured` |
| 412 | same, in `chainStep` | `toast.captured` |
| 462 | `'You have available moves'` | — (create) |
| 507 | `'Blockade stone removed'` | — (create) |
| 642 | `'AI move failed'` | `toast.aiMoveError` |
| 695 | `` `Best move: ${optimalMove.description}` `` | — (create; and `description` is itself English from `ai.ts`) |
| 697 | `'No moves available'` | `toast.noMovesAvailable` |
| 700 | `'Could not generate hint'` | — (create) |
| 843 | `'Stalemate accepted - game decided by stone count'` | — (create) |
| 843 | `'Stalemate - game is a draw'` | — (create) |
| 846 | `'Stalemate offered - waiting for opponent response'` | — (create) |
| 867 | `'Stalemate offer rejected - game continues'` | — (create) |
| 886 | `` `${gameState.current} player resigned` `` | — (create; **also leaks the raw enum** `Light`/`Dark` instead of `t('player.Light')`) |

### 4.6 Internal engine `Error` messages shown as toasts

Every catch in `gameStore` does `showToast((error as Error).message)` — at lines **330, 386, 418, 451, 491, 513, 851, 870, 890**. The messages, all developer-facing English from `rules.ts` / `placeStone`:

1. `Not in placement phase`
2. `Already placed 2 stones this turn`
3. `Cell out of bounds`
4. `Cannot place in center during placement phase`
5. `Cell already occupied`
6. `Still in placement phase`
7. `Cells out of bounds`
8. `No piece to move or not your piece`
9. `Destination occupied`
10. `Must move exactly one orthogonal step`
11. `First move must enter center`
12. `Anti-shuttle rule prevents this move`
13. `Not in chain capture mode`
14. `Not in chain mode`
15. `Invalid stone to remove`

**Under Mandate R-B these become unreachable** (illegal actions are never offered). Any residual assertion must carry a code mapped to a key.

### 4.7 Hardcoded English in `src/lib/ai.ts` (28 sites)

**Move descriptions** — lines **463** (`Captures N stone(s)`), **467** (`Secure center position`), **471** (`Improves mobility`), **473** (`Strengthens position`), **480** (`Near center position`), **482** (`Strategic placement`).
All six have **existing unused keys**: `hints.descriptions.capturesStones`, `.secureCenter`, `.improvesMobility`, `.strengthensPosition`, `.nearCenter`, `.strategicPlacement`.

**Analysis reasoning** — lines **624, 631, 640, 650, 652, 663, 673, 682, 691, 717, 720, 723, 726, 746**. No keys exist; all must be created.

**Explanation details** — lines **757, 760, 763, 766, 769, 773, 777, 781**. No keys exist.

**Strength labels** — `MoveAnalysisPanel.tsx:186` does `strength.charAt(0).toUpperCase() + strength.slice(1)` → renders `Weak`/`Good`/`Strong`/`Excellent` untranslated.

Consumers: `HintOverlay.tsx:124`, `HintsPanel.tsx:36-41`, `MoveAnalysisPanel.tsx:99/110/149`, and the "Best move:" toast.

### 4.8 Hardcoded English in JSX

| File:line | String |
|---|---|
| `App.tsx:151` | `Traditional Seejeh with AI Opponents • Made with React & TypeScript` |
| `Controls.tsx:69` | `<Badge>AI</Badge>` |
| `Board.tsx:82` | `aria-label="Seejeh game board"` — key `accessibility.board` exists, unused |
| `Cell.tsx:76` | The whole composed aria-label: `Cell R, C`, `(center, safe)`, `- Light stone`, `- empty`, `- can be moved`, `- can place stone`, `- can move here`, `- valid action`, `- would be captured`. **Seven `accessibility.*` keys exist and are all unused.** |
| `LanguageSwitcher.tsx:22` | `aria-label={'Switch to Arabic' / 'Switch to English'}` |
| `LeaderboardModal.tsx:286` | `<Badge>You</Badge>` |
| `HintsPanel.tsx:117` | `Best move shown by default` |
| `HintsPanel.tsx:165` | `Hover over moves above to preview them on the board` |
| `HintsPanel.tsx:174` | `Hints available on your turn` |
| `MoveAnalysisPanel.tsx:186` | capitalized strength label (see 4.7) |
| `AboutModal.tsx:66-73` | `Additional resources:`, `Wikipedia: Seega` |
| `ErrorFallback.tsx:16-33` | The entire crash UI: `This spark has encountered a runtime error`, `Something unexpected happened…`, `Error Details:`, `Try Again` |

### 4.9 Locale-insensitive formatting

| File:line | Issue |
|---|---|
| `LeaderboardModal.tsx:246` | `new Date(...).toLocaleTimeString()` — browser locale, not app language |
| `GameHistory.tsx:54` | `date.toLocaleDateString()` — same |
| `UserProfile.tsx:27-35` | `formatDuration` hardcodes `h`, `m`, `'<1m'` |
| `GameHistory.tsx:40-43` | duplicate `formatDuration`, same hardcoded suffixes |
| `SettingsModal.tsx:164` | `({Math.round(volume*100)}%)` — no locale, no bidi isolation |
| `LeaderboardModal.tsx:190, 308` | `{(winRate*100).toFixed(0)}%` — same |

### 4.10 RTL / bidi defects

**Direction-bearing glyphs (not bidi-mirrored):**
- `index.css:174` — `.seejeh-cell.valid-piece-move::after { content: '→' }`
- `HintOverlay.tsx:110` — `→` badge
- `Controls.tsx:197` — `<ArrowRight>`
- `MoveAnalysisPanel.tsx:120` — `<ArrowRight>`

**Physical margins that must become logical (`me-*`/`ms-*`):**
`App.tsx:87` (Trophy), `App.tsx:96` (Info), `Controls.tsx:135` (Badge), `Controls.tsx:163` (ArrowClockwise), `Controls.tsx:197` (ArrowRight), `Controls.tsx:269` (Handshake), `Controls.tsx:307` (Flag), `HintsPanel.tsx:59` and `:95` (Lightbulb), `GameHistory.tsx:114` (Robot), `GameHistory.tsx:121` (Circle), `UserProfile.tsx:59` (SignOut), `UserProfile.tsx:199` (Trash), `LoginPrompt.tsx:60` (GithubLogo), `MoveAnalysisPanel.tsx:37` (Eye).

**Numeric runs needing `dir="ltr"` / `unicode-bidi: isolate`:**
`GameHistory.tsx:146` (`{light}-{dark}` → renders reversed), `LeaderboardModal.tsx:100` and `:179` (`#{rank}` → `3#`), `LeaderboardModal.tsx:190` and `:308` (`%` → `%50`), `SettingsModal.tsx:164`, `LeaderboardModal.tsx:131` (trailing `:` after a translated label).

### 4.11 The 26 defined-but-unreferenced keys

Key parity between the two files is currently **exact** (173 flattened keys each, no missing keys, no placeholder mismatches) — the problem is that 26 are dead, and each one marks a spot where English is hardcoded instead:

`accessibility.board`, `accessibility.cell`, `accessibility.centerCell`, `accessibility.emptyCell`, `accessibility.selectedCell`, `accessibility.stone`, `accessibility.validMove`, `analysis.confidence`, `analysis.disable`, `gameMode`, `hints.descriptions.capturesStones`, `hints.descriptions.improvesMobility`, `hints.descriptions.nearCenter`, `hints.descriptions.secureCenter`, `hints.descriptions.strategicPlacement`, `hints.descriptions.strengthensPosition`, `hints.hideHints`, `hints.optimalMove`, `hints.showHints`, `leaderboard.needMoreGames`, `mode.human-vs-human`, `toast.aiMoveError`, `toast.captured`, `toast.invalidMove`, `toast.mustPlaceTwo`, `toast.selectPieceFirst`.

**Every one of these must be either wired to its call site (preferred — most are the correct fix for a §4.5–§4.8 item) or deleted.**

### 4.12 New keys the rewrite must add

Minimum set implied by the above: `toast.blockadeEntered` (correctly worded), `toast.blockadeRemoved`, `toast.stillBlockaded`, `toast.hasAvailableMoves`, `toast.hintFailed`, `toast.bestMove`, `toast.drawOffered`, `toast.drawRejected`, `toast.drawAccepted`, `toast.gameDrawn`, `toast.resigned` (with `{{player}}` resolved via `player.Light` / `player.Dark`), `player.Light`, `player.Dark`, `badge.ai`, `badge.you`, `footer.tagline`, `about.resources`, `about.wikipedia`, `error.title`, `error.body`, `error.details`, `error.retry`, `hints.fallback.default`, `hints.fallback.hover`, `hints.fallback.notYourTurn`, `analysis.strength.weak|good|strong|excellent`, `a11y.switchLanguage.toArabic|toEnglish`, `a11y.settings`, `a11y.close`, `a11y.disableHints`, `a11y.clearHints`, `a11y.hideAnalysis`, `a11y.volumeSlider`, `a11y.difficultyGroup`, `a11y.leaderboardFilter`, `a11y.removeStone`, `duration.hours`, `duration.minutes`, `duration.lessThanMinute`, plus the full plural-category expansion of the seven §4.2 keys and one key per `ai.ts` reasoning/explanation line (≈28).

---

## 5. Suggested build order for the rewrite

1. **Engine first, headless.** `Action` union → `legalActions` → `applyAction` → `classifyTerminal`, with INV-1…INV-34 as property tests. No React, no store, no strings. Delete whichever of `src/lib/rules.ts` / `src/engine/rules.ts` does not survive.
2. **Persistence + schema/migrations** (P-A/P-B) against the new state type, with the hostile-input fuzz (INV-50).
3. **Store as a thin dispatcher + turn-ownership effect loop** (S-A/S-B/S-D), with INV-45/47/48 asserted in dev.
4. **i18n infrastructure** (I-A…I-E) before any UI, so no English literal ever gets written.
5. **UI** against the indexed legal-action set (U-A…U-G), then a11y gates (Y-A…Y-C) in the same pass — retrofitting the grid pattern later is far more expensive.
6. **AI last, in a worker** (A-A…A-I), validated by the self-play ladder (INV-43) and the seeded regression positions (INV-38/39/40) captured from this audit.
7. **CI gates from day one:** `tsc --noEmit` (no `--noCheck`), eslint with `no-shadow` + `jsx-a11y` + the no-literal-strings rule, locale parity/duplicate check, 10 000-playout invariant fuzz, axe pass, and a CSS-bundle size budget (the current 364 KB is ~90 % dead).